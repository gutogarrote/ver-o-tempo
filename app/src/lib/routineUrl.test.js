import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import catalog from './taskCatalog.json';
import { applyRoutineUrl, parseRoutineUrl, serializeRoutineUrl } from './routineUrl';

const query = value => '?rotina=' + encodeURIComponent(value);

test('catalog is complete, stable and has usable presentation', () => {
  expect(Object.keys(catalog)).toEqual(['ac', 'cf', 'ma', 'de', 'ro', 'mo', 'xi', 'sa', 'ba', 'ja', 'co', 'do', 'br', 'li', 'bo', 'ca']);
  Object.entries(catalog).forEach(([id, task]) => {
    expect(id).toMatch(/^[a-z]{2}$/);
    expect(task.name.trim()).toBeTruthy();
    expect(task.icon).toBeTruthy();
    expect(task.color).toMatch(/^#[0-9a-f]{6}$/i);
    expect(parseRoutineUrl(query(`1|m|${id}:1`)).routine.tasks[0].name).toBe(task.name);
  });
});

test('order, minutes, repeated tasks and periods', () => {
  const parsed = parseRoutineUrl(query('1|n|ba:15,ja:20,ba:5'));
  expect(parsed.status).toBe('valid');
  expect(parsed.period).toBe('evening');
  expect(parsed.routine.endTime).toBe('21:00');
  expect(parsed.routine.tasks.map(t => [t.id, t.name, t.minutes])).toEqual([[1, 'Banho', 15], [2, 'Jantar', 20], [3, 'Banho', 5]]);
  expect(parseRoutineUrl(query('1|m|ac:10')).routine.endTime).toBe('06:30');
});

test.each([
  '', '2|n|ba:5', '1|x|ba:5', '1|constructor|ba:5', '1|n|',
  '1|n|unknown:5', '1|n|__proto__:5', '1|n|ba:0', '1|n|ba:-1',
  '1|n|ba:NaN', '1|n|ba:Infinity', '1|n|ba:1.5', '1|n|ba:1e2',
  '1|n|ba:01', '1|n|ba:181', '1|n|ba:5,', '1|n|ba:5:6',
  '1|n|ba:5|extra', '1|n|~:5', '1|n|~%20:5', '1|n|~%00:5',
  '1|n|~%FF:5', '1|n|~%ZZ:5', '1|n|~' + 'a'.repeat(81) + ':5',
  '1|n|' + Array(41).fill('ba:1').join(','),
  '1|n|' + Array(5).fill('ba:180').join(','),
])('rejects invalid value %s atomically', value => {
  const parsed = parseRoutineUrl(query(value));
  expect(parsed.status).toBe('invalid');
  const original = { monday: { morning: { tasks: [] } } };
  expect(applyRoutineUrl(original, parsed)).toBe(original);
});

test('strict outer encoding, duplicates and size limit; irrelevant parameters are ignored', () => {
  ['?rotina=%FF', '?rotina=%ZZ', '?rotina=1%7Cn%7Cba%3A5&rotina=1%7Cm%7Cac%3A1', '?rotina=' + 'a'.repeat(6001)].forEach(search => {
    expect(parseRoutineUrl(search).status).toBe('invalid');
  });
  expect(parseRoutineUrl('?utm=%ZZ&irrelevant=yes').status).toBe('absent');
  expect(parseRoutineUrl('?utm=%FF&%72otina=1%7Cn%7Cba%3A5').status).toBe('valid');
});

test('serializer is deterministic, preserves arbitrary base and round trips custom text', () => {
  const tasks = [{ name: 'Banho', minutes: 15 }, { name: 'Abraço, água: sim | + & % 😴', minutes: 5 }];
  const base = 'https://example.org/app/?utm=family&rotina=old#fita';
  const link = serializeRoutineUrl(base, 'evening', tasks);
  expect(serializeRoutineUrl(base, 'evening', tasks)).toBe(link);
  const url = new URL(link);
  expect(url.pathname).toBe('/app/');
  expect(url.hash).toBe('#fita');
  expect(url.searchParams.get('utm')).toBe('family');
  expect(parseRoutineUrl(url.search).routine.tasks.map(({ name, minutes }) => ({ name, minutes }))).toEqual(tasks);
  expect(() => serializeRoutineUrl(base, 'evening', [{ name: 'Banho', minutes: NaN }])).toThrow();
  expect(() => serializeRoutineUrl(base, 'evening', [])).toThrow();
});

test('replaces only transported period without mutating local data', () => {
  const morning = { name: 'Minha manhã', tasks: [] };
  const original = { monday: { morning, evening: { tasks: [] } }, tuesday: {} };
  const next = applyRoutineUrl(original, parseRoutineUrl(query('1|n|ba:15')));
  expect(next.monday.morning).toBe(morning);
  expect(next.tuesday).toBe(original.tuesday);
  expect(original.monday.evening.tasks).toEqual([]);
  expect(next.monday.evening.tasks).toHaveLength(1);
});

test('all Markdown links and executable JS/Python examples parse and round trip', () => {
  const doc = fs.readFileSync(path.resolve(process.cwd(), '../docs/url-rotina.md'), 'utf8');
  const links = [...doc.matchAll(/\]\((http:\/\/localhost:3000\/[^)]+)\)/g)].map(match => match[1]);
  expect(links).toHaveLength(9);
  links.forEach(link => {
    const url = new URL(link);
    const parsed = parseRoutineUrl(url.search, url.pathname);
    expect(parsed.status).toBe('valid');
    if (parsed.source === 'query') {
      expect(serializeRoutineUrl('http://localhost:3000/', parsed.period, parsed.routine.tasks,
        /\.\d{4}$/.test(url.search) ? parsed.routine.endTime : undefined)).toBe(link);
    }
  });
  for (const language of ['python', 'js']) {
    const code = doc.match(new RegExp('```' + language + '\n([\\s\\S]*?)```'))[1];
    const generated = execFileSync(language === 'python' ? 'python3' : 'node', [language === 'python' ? '-c' : '-e', code], { encoding: 'utf8' }).trim().split('\n');
    expect(generated).toHaveLength(2);
    expect(generated[0]).toBe('http://localhost:3000/?rotina=1.n.ba-20.ja-25.ma-de-5.1930');
    expect(parseRoutineUrl(new URL(generated[1]).search).routine.tasks[0].name).toBe('Água. música-quente');
    const alternate = code.replace(/http:\/\/localhost:3000\//g, 'https://example.org/app/?utm=family&rotina=old&rotina=older#fita');
    execFileSync(language === 'python' ? 'python3' : 'node', [language === 'python' ? '-c' : '-e', alternate], { encoding: 'utf8' }).trim().split('\n').forEach(link => {
      const url = new URL(link);
      expect(url.searchParams.getAll('rotina')).toHaveLength(1);
      expect(url.searchParams.get('utm')).toBe('family');
      expect(url.hash).toBe('#fita');
      expect(parseRoutineUrl(url.search).status).toBe('valid');
    });
  }
  Object.entries(catalog).forEach(([id, { name, icon }]) => expect(doc).toContain(`| ${id} | ${name} | ${icon} |`));
});

test('clean compound total, presentation, repeated IDs and lossless serialization', () => {
  const parsed = parseRoutineUrl('?rotina=1.n.ma-de-5.ma-ma-10.1930');
  expect(parsed.routine.endTime).toBe('19:30');
  expect(parsed.routine.tasks[0]).toMatchObject({ minutes: 5, name: 'Lavar as mãos + Escovar os dentes', icon: '🧼🪥', catalogIds: ['ma', 'de'] });
  expect(parsed.routine.tasks[1].icon).toBe('🧼🧼');
  expect(serializeRoutineUrl('http://localhost:3000/', parsed.period, parsed.routine.tasks, parsed.routine.endTime)).toBe('http://localhost:3000/?rotina=1.n.ma-de-5.ma-ma-10.1930');
  const changed = { ...parsed.routine.tasks[0], name: 'Nova. tarefa-combinada' };
  expect(parseRoutineUrl(new URL(serializeRoutineUrl('http://localhost:3000/', 'evening', [changed])).search).routine.tasks[0].name).toBe(changed.name);
});

test.each(['0000', '0720', '1200', '1930', '2045', '2359'])('valid clock %s for query and exact pathname', time => {
  const result = parseRoutineUrl('', '/' + time);
  expect(result.status).toBe('valid');
  expect(result.period).toBe(Number(time.slice(0, 2)) < 12 ? 'morning' : 'evening');
  expect(result.endTime).toBe(time.slice(0, 2) + ':' + time.slice(2));
  expect(parseRoutineUrl('?rotina=1.m.xi-5.' + time).routine.endTime).toBe(result.endTime);
});

test.each(['2400', '1260', '9999', '720', '07200', '0720/', 'foo/0720'])('invalid pathname %s', time => {
  expect(parseRoutineUrl('', '/' + time).status).toBe('invalid');
});

test.each(['1.n.ma-unknown-5', '1.n.ma-de-0', '1.n.ma-de-181', '1.n.ma-de-05', '1.n.ma-de-5.2400', '1.n.ma-de-5.1260', '1.n.1930.ma-de-5', '1.n.~a-b-5', '1.n.~a.b-5', '1.n.~%ZZ-5', '1.n.~%FF-5', '1.n.musica-10', '1.n', '1.n.1930', '1.n.' + Array(41).fill('ma').join('-') + '-5'])('invalid clean value %s', value => expect(parseRoutineUrl(query(value)).status).toBe('invalid'));

test('query precedence and optional clock', () => {
  expect(parseRoutineUrl('?rotina=1.n.ba-5', '/0720')).toMatchObject({ status: 'valid', source: 'query', period: 'evening', routine: { endTime: '21:00' } });
  expect(parseRoutineUrl('?rotina=1.m.xi-5', '/bad').status).toBe('valid');
  expect(parseRoutineUrl('?rotina=bad', '/0720').status).toBe('invalid');
  expect(parseRoutineUrl('?utm=test').status).toBe('absent');
});

test('bundled fallback stays identical to the public default data', () => {
  const bundled = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'src/lib/defaultRoutines.json'), 'utf8'));
  const publicDefaults = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'public/routines.json'), 'utf8'));
  expect(bundled).toEqual(publicDefaults);
});

test('clean format validates limits, all catalog IDs and hostile custom text', () => {
  Object.keys(catalog).forEach(id => expect(parseRoutineUrl(query(`1.m.${id}-1`)).status).toBe('valid'));
  ['1.n.' + Array(41).fill('ba-1').join('.'), '1.n.' + Array(5).fill('ba-180').join('.'), '1.n.~%00-5', '1.n.~%7F-5', '1.n.~%20-5', '1.n.~' + 'a'.repeat(81) + '-5'].forEach(value => expect(parseRoutineUrl(query(value)).status).toBe('invalid'));
  const name = '<img src=x onerror=alert(1)> . - + & % 😴';
  const result = parseRoutineUrl(new URL(serializeRoutineUrl('http://localhost:3000/', 'evening', [{ name, minutes: 5 }])).search);
  expect(result.routine.tasks[0].name).toBe(name);
  ['24:00', '12:60', '7:20', '', '0720'].forEach(time => expect(() => serializeRoutineUrl('http://localhost:3000/', 'morning', [{ name: 'Acordar', minutes: 5 }], time)).toThrow());
});
