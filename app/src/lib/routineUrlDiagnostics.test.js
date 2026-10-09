import fixture from './fixtures/fantasia-nina.json';
import { parseRoutineUrl, serializeRoutineUrl } from './routineUrl';

test('original fantasia regression keeps seven exact tasks, durations and deadline; removed layers still reject', () => {
  const search = new URL(fixture.url).search;
  const parsed = parseRoutineUrl(search);
  expect(parsed.status).toBe('valid');
  expect(parsed.routine.tasks.map(({ name, minutes }) => ({ name, minutes }))).toEqual(fixture.tasks);
  expect(parsed.routine.endTime).toBe(fixture.end);
  expect(parsed.routine.tasks.reduce((sum, task) => sum + task.minutes, 0)).toBe(fixture.total);
  expect(serializeRoutineUrl(new URL(fixture.url).origin, parsed.period, parsed.routine.tasks, parsed.routine.endTime)).toBe(fixture.url);
  for (const removed of [decodeURIComponent(search), decodeURIComponent(decodeURIComponent(search))]) {
    expect(parseRoutineUrl(removed)).toMatchObject({ status: 'invalid', failure: { stage: 'custom-name', reason: 'invalid-encoded-name', entry: 1 } });
  }
});

test.each(['Texto%20literal', '50% e %FF e %ZZ', 'A+B & C', 'Água. música-quente 🍄', 'a.b-c', '😴 ação'])('canonical custom text roundtrips exactly: %s', name => {
  const tasks = [{ name, minutes: 5 }];
  const url = serializeRoutineUrl('https://example.test/', 'morning', tasks, '07:20');
  const parsed = parseRoutineUrl(new URL(url).search);
  expect(parsed.routine.tasks.map(({ name, minutes }) => ({ name, minutes }))).toEqual(tasks);
  expect(serializeRoutineUrl('https://example.test/', parsed.period, parsed.routine.tasks, parsed.routine.endTime)).toBe(url);
});

test('removed encoding layer is indistinguishable from another canonical name: preserve canonical interpretation', () => {
  const literal = new URL(serializeRoutineUrl('https://example.test/', 'evening', [{ name: 'Texto%20literal', minutes: 5 }]));
  const space = new URL(serializeRoutineUrl('https://example.test/', 'evening', [{ name: 'Texto literal', minutes: 5 }]));
  expect(decodeURIComponent(literal.search)).toBe(space.search);
  expect(parseRoutineUrl(literal.search).routine.tasks[0].name).toBe('Texto%20literal');
  expect(parseRoutineUrl(space.search).routine.tasks[0].name).toBe('Texto literal');
});

test.each([
  ['?rotina=%ZZ', 'outer-decode', 'malformed-percent-or-utf8'],
  ['?rotina=%FF', 'outer-decode', 'malformed-percent-or-utf8'],
  ['?rotina=%C3%28', 'outer-decode', 'malformed-percent-or-utf8'],
  ['?rotina=%E0%A4', 'outer-decode', 'malformed-percent-or-utf8'],
  ['?rotina=1.n.~%25FF-5', 'custom-name-decode', 'malformed-percent-or-utf8'],
  ['?rotina=1.n.~%25C3%2528-5', 'custom-name-decode', 'malformed-percent-or-utf8'],
  ['?rotina=1.n.~%25ZZ-5', 'custom-name', 'invalid-encoded-name'],
  ['?rotina=1.n.~a%252Db-5', null, null],
  ['?rotina=1.n.ba-5&%72otina=1.n.ba-5', 'query', 'duplicate-routine'],
  ['?rotina=' + 'a'.repeat(6001), 'query', 'value-too-long'],
  ['?rotina=2.n.ba-5', 'format', 'unsupported-version'],
  ['?rotina=1.x.ba-5', 'format', 'invalid-period'],
  ['?rotina=1.n', 'entries', 'missing-tasks'],
  ['?rotina=1.n.ba-0', 'duration', 'invalid-minutes'],
  ['?rotina=1.n.ba-181', 'duration', 'task-too-long'],
  ['?rotina=1.n.unknown-5', 'catalog', 'invalid-ids'],
  ['?rotina=1.n.~%2500-5', 'custom-name', 'invalid-name'],
  ['?rotina=1.n.ba-5.2400', 'end-time', 'invalid-clock'],
])('failure stage/reason for %s', (search, stage, reason) => {
  const parsed = parseRoutineUrl(search);
  if (stage === null) expect(parsed.status).toBe('valid');
  else expect(parsed).toMatchObject({ status: 'invalid', failure: { stage, reason } });
});

test('invalid path failure is distinct from query failure', () => {
  expect(parseRoutineUrl('', '/2400')).toMatchObject({ status: 'invalid', failure: { stage: 'pathname', reason: 'invalid-clock' } });
});
