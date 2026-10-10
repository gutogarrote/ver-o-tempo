import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import fixture from './fixtures/fantasia-nina.json';
import { parseRoutineUrl, serializeRoutineUrl, READABLE_NAME_ERROR } from './routineUrl';

const base = 'https://example.test/';
const tasksFrom = parsed => parsed.routine.tasks.map(({ name, minutes }) => ({ name, minutes }));
const normalized = (link, layers) => {
  let url = new URL(link);
  for (let i = 0; i < layers; i++) {
    url = new URL(url.origin + url.pathname + decodeURIComponent(url.search) + url.hash);
  }
  return url;
};

test('observed adventure still rejects as v1; v2 survives real URL normalization twice', () => {
  const incoming = decodeURIComponent(new URL(fixture.url.replace(/1430$/, '1429')).search);
  expect(incoming).toContain('%F0');
  expect(incoming).toContain('Asa%2Ddelta');
  expect(parseRoutineUrl(incoming)).toMatchObject({ status: 'invalid', failure: { stage: 'custom-name', entry: 1 } });
  const link = serializeRoutineUrl(base, 'evening', fixture.tasks, '14:29');
  expect(link).not.toContain('%25');
  for (const layers of [0, 1, 2]) {
    const parsed = parseRoutineUrl(normalized(link, layers).search);
    expect(parsed.status).toBe('valid');
    expect(tasksFrom(parsed)).toEqual(fixture.tasks);
    expect(parsed.routine.endTime).toBe('14:29');
  }
});

test.each([
  'pré-treino', 'Asa-delta', '0.5 litros', '🍄 Cogumelos mágicos',
  'A+B & C', '50% e %FF e %ZZ e %20', 'a~2E.b-c',
  '  dois  espaços  ', '<img src=x onerror=alert(1)>',
  '?! / : ; , = # \\ " \' ( ) [ ] { } @ $ * |',
])('readable supported text is lossless under zero/one/two normalization layers: %s', name => {
  const tasks = [{ name, minutes: 5 }];
  const link = serializeRoutineUrl(base, 'evening', tasks, '20:30');
  expect(serializeRoutineUrl(base, 'evening', tasks, '20:30')).toBe(link);
  for (const layers of [0, 1, 2]) {
    const parsed = parseRoutineUrl(normalized(link, layers).search);
    expect(parsed.status).toBe('valid');
    expect(tasksFrom(parsed)).toEqual(tasks);
    expect(parsed.routine.endTime).toBe('20:30');
  }
});

test('IDs, total compound durations and final clock remain editable; names cannot become separators', () => {
  const link = serializeRoutineUrl(base, 'evening', [
    { name: 'Lavar as mãos', minutes: 5 },
    { name: 'Lavar as mãos + Escovar os dentes', minutes: 7, catalogIds: ['ma', 'de'] },
    { name: 'Asa-delta. ma-5.2030', minutes: 3 },
  ], '20:30');
  expect(link).toBe(base + '?rotina=2.n.ma-5.ma-de-7.~Asa-delta~2E_ma-5~2E2030-3.2030');
  const parsed = parseRoutineUrl(new URL(link.replace('ma-5.', 'ma-2.').replace(/2030$/, '1900')).search);
  expect(parsed.routine.tasks.map(task => task.minutes)).toEqual([2, 7, 3]);
  expect(parsed.routine.tasks[1].catalogIds).toEqual(['ma', 'de']);
  expect(parsed.routine.tasks[2].name).toBe('Asa-delta. ma-5.2030');
  expect(parsed.routine.endTime).toBe('19:00');
});

test.each(['literal_underscore', '\uD800', '\uDC00'])('serializer explains unsupported name %s', name => {
  expect(() => serializeRoutineUrl(base, 'morning', [{ name, minutes: 5 }])).toThrow(READABLE_NAME_ERROR);
});

test.each(['', ' ', '\nname', '\tname', 'a\u0000b', 'a\u007Fb', 'a'.repeat(81)])('serializer rejects invalid name without loss: %s', name => {
  expect(() => serializeRoutineUrl(base, 'morning', [{ name, minutes: 5 }])).toThrow();
});

test.each([
  '2.n.~a.b-5', '2.n.~a+b-5', '2.n.~a%20b-5', '2.n.~%25FF-5',
  '2.n.~%FF-5', '2.n.~%C3%28-5', '2.n.~%E0%A4-5', '2.n.~%ZZ-5',
  '2.n.~a~-5', '2.n.~a~2e-5', '2.n.~a~41-5', '2.n.~a~5F-5',
  '2.n.~a~00-5', '2.n.~_-5', '2.n.~\uD800-5', '2.n.~a b-5',
  '2.n.~a/b-5', '2.n.~a=b-5', '2.n.ba-0', '2.n.ba-01',
  '2.n.ba-181', '2.n.ba-1.5', '2.n.ba-5.2400', '2.n.ba-5.1260',
  '2.x.ba-5', '2.n', '2.n.2030', '2.n.2030.ba-5',
  '2.n.' + Array(41).fill('ba-1').join('.'),
  '2.n.' + Array(5).fill('ba-180').join('.'),
  '2.n.' + Array(41).fill('ma').join('-') + '-5',
])('invalid v2 grammar/UTF8/limits rejects atomically: %s', value => {
  expect(parseRoutineUrl('?rotina=' + value).status).toBe('invalid');
});

test('maximum tasks, duration, total and clock boundaries; defaults and query rules', () => {
  for (const time of ['00:00', '23:59']) {
    const link = serializeRoutineUrl(base, 'evening', Array(4).fill({ name: 'Banho', minutes: 180 }), time);
    expect(parseRoutineUrl(new URL(link).search).routine.endTime).toBe(time);
  }
  const forty = serializeRoutineUrl(base, 'morning', Array(40).fill({ name: 'Banho', minutes: 1 }));
  expect(parseRoutineUrl(new URL(forty).search).routine.tasks).toHaveLength(40);
  expect(parseRoutineUrl(new URL(forty).search).routine.endTime).toBe('06:30');
  for (const minutes of [0, 181, 1.5, NaN]) expect(() => serializeRoutineUrl(base, 'morning', [{ name: 'Banho', minutes }])).toThrow();
  expect(parseRoutineUrl('?rotina=2.n.ba-5&rotina=2.n.ba-5').status).toBe('invalid');
  expect(parseRoutineUrl('?rotina=2.n.~' + 'a'.repeat(6000) + '-5').status).toBe('invalid');
  expect(parseRoutineUrl('?rotina=2.n.ba-5', '/bad').status).toBe('valid');
});

test('preserves query duplicates/hash and replaces shortcut; literals and percent bytes can coexist', () => {
  const link = serializeRoutineUrl('https://example.test/2045?utm=a&tag=1&tag=2&rotina=old#familia', 'evening', [{ name: 'pré 🍄 + & %20', minutes: 2 }], '19:00');
  const url = new URL(link);
  expect(url.pathname).toBe('/');
  expect(url.searchParams.getAll('tag')).toEqual(['1', '2']);
  expect(url.searchParams.get('utm')).toBe('a');
  expect(url.searchParams.getAll('rotina')).toHaveLength(1);
  expect(url.hash).toBe('#familia');
  expect(parseRoutineUrl(url.search.replace('%C3%A9', 'é')).routine.tasks[0].name).toBe('pré 🍄 + & %20');
  expect(parseRoutineUrl('?rotina=2.n.~A_B-5').routine.tasks[0].name).toBe('A B');
});

test('v2 documentation JS and Python examples execute through the real parser', () => {
  const doc = fs.readFileSync(path.resolve(process.cwd(), '../docs/url-rotina-v2.md'), 'utf8');
  for (const language of ['python', 'js']) {
    const code = doc.match(new RegExp('```' + language + '\n([\\s\\S]*?)```'))[1];
    const generated = execFileSync(language === 'python' ? 'python3' : 'node', [language === 'python' ? '-c' : '-e', code], { encoding: 'utf8' }).trim().split('\n');
    expect(generated).toHaveLength(2);
    for (const link of generated) expect(parseRoutineUrl(new URL(link).search).status).toBe('valid');
    expect(generated[0]).toBe('http://localhost:3000/?rotina=2.n.ma-5.ma-de-7.2030');
    expect(parseRoutineUrl(new URL(generated[1]).search).routine.tasks[0].name).toBe('pré-treino + 0.5 litros 🍄 & 50%');
  }
});

test('every supported printable ASCII character and Unicode length boundary survive serialization', () => {
  for (let code = 32; code <= 126; code++) {
    if (code === 95) continue; // Literal underscore is the documented unsupported character.
    const name = 'x' + String.fromCharCode(code) + 'y';
    const link = serializeRoutineUrl(base, 'morning', [{ name, minutes: 1 }]);
    for (const layers of [0, 1, 2]) expect(parseRoutineUrl(normalized(link, layers).search).routine.tasks[0].name).toBe(name);
  }
  const name = '🍄'.repeat(40);
  expect(parseRoutineUrl(new URL(serializeRoutineUrl(base, 'morning', [{ name, minutes: 1 }])).search).routine.tasks[0].name).toBe(name);
  expect(() => serializeRoutineUrl(base, 'morning', [{ name: name + '🍄', minutes: 1 }])).toThrow();
  for (const time of ['24:00', '12:60', '7:20', '', '0720']) expect(() => serializeRoutineUrl(base, 'morning', [{ name: 'Banho', minutes: 1 }], time)).toThrow();
  for (const bytes of ['%ED%A0%80', '%C0%AF', '%F4%90%80%80']) expect(parseRoutineUrl('?rotina=2.n.~' + bytes + '-5').status).toBe('invalid');
});
