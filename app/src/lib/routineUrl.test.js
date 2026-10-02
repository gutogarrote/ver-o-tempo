import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import catalog from './taskCatalog.json';
import { applyRoutineUrl, parseRoutineUrl, serializeRoutineUrl } from './routineUrl';

const query = value => '?rotina=' + encodeURIComponent(value);

test('documented Python code generates links decoded by the real parser', () => {
  const doc = fs.readFileSync(path.resolve(process.cwd(), '../docs/url-rotina.md'), 'utf8');
  const snippets = [...doc.matchAll(/```python\n([\s\S]*?)```/g)];
  expect(snippets).toHaveLength(1);
  const runExample = code => execFileSync('python3', ['-c', code], { encoding: 'utf8' }).trim().split('\n');
  const verifyLinks = links => {
    expect(links).toHaveLength(2);
    links.forEach((link, index) => {
      const url = new URL(link);
      expect(url.searchParams.getAll('rotina')).toHaveLength(1);
      const parsed = parseRoutineUrl(url.search);
      expect(parsed.status).toBe('valid');
      expect(parsed.period).toBe('evening');
      expect(parsed.routine.tasks.map(({ name, minutes }) => ({ name, minutes }))).toEqual(index === 0
        ? [{ name: 'Banho', minutes: 15 }, { name: 'Jantar', minutes: 20 }, { name: 'Trocar de roupa', minutes: 10 }]
        : [{ name: 'Abraço, água: sim', minutes: 5 }]);
    });
  };
  const code = snippets[0][1];
  const links = runExample(code);
  verifyLinks(links);
  links.forEach(link => expect(new URL(link).origin).toBe('http://localhost:3000'));
  // Run the same example with a base containing existing query values and a fragment.
  const base = 'https://example.org/app/?utm=family&empty=&rotina=old&rotina=older#fita';
  const arbitraryLinks = runExample(code.replace("base = 'http://localhost:3000/'", `base = '${base}'`));
  verifyLinks(arbitraryLinks);
  arbitraryLinks.forEach(link => {
    const url = new URL(link);
    expect(url.origin).toBe('https://example.org');
    expect(url.pathname).toBe('/app/');
    expect(url.hash).toBe('#fita');
    expect([...url.searchParams].filter(([key]) => key !== 'rotina')).toEqual([['utm', 'family'], ['empty', '']]);
  });
});

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

test('every Markdown example link and catalog table agree with the real parser', () => {
  const doc = fs.readFileSync(path.resolve(process.cwd(), '../docs/url-rotina.md'), 'utf8');
  const links = [...doc.matchAll(/\]\((http:\/\/localhost:3000\/\?rotina=[^)]+)\)/g)].map(match => match[1]);
  expect(links).toHaveLength(6);
  const expected = [
    ['Banho', 'Jantar', 'Trocar de roupa'],
    ['Banho', 'Jantar', 'Trocar de roupa', 'Brincar'],
    ['Banho', 'Jantar', 'Trocar de roupa', 'Brincar', 'Ler livro', 'Dormir'],
    ['Café da manhã', 'Escovar os dentes'], ['Abraço, água: sim'],
    ['Banho', 'Jantar', 'Trocar de roupa'],
  ];
  const minutes = [[15, 20, 10], [15, 20, 10, 20], [15, 20, 10, 20, 10, 5], [20, 5], [5], [15, 20, 10]];
  links.forEach((link, i) => {
    const result = parseRoutineUrl(new URL(link).search);
    expect(result.status).toBe('valid');
    expect(result.period).toBe(i === 3 ? 'morning' : 'evening');
    expect(result.routine.tasks.map(t => t.name)).toEqual(expected[i]);
    expect(result.routine.tasks.map(t => t.minutes)).toEqual(minutes[i]);
    expect(serializeRoutineUrl('http://localhost:3000/', result.period, result.routine.tasks)).toBe(link);
  });
  Object.entries(catalog).forEach(([id, { name, icon }]) => {
    expect(doc).toContain(`| ${id} | ${name} | ${icon} |`);
  });
});
