import { buildRoutineView, closingFor, mmss } from './routineView';
import { computeElapsed } from './timeline';

const tasks = [
  { id: 1, name: 'Acordar', icon: '🌞', color: '#06b6d4', minutes: 10 },
  { id: 2, name: 'Café', icon: '☕️', color: '#f97316', minutes: 20 },
  { id: 3, name: 'Sair', icon: '👟', color: '#ef4444', minutes: 5 },
];
const closing = closingFor('morning');
const build = (elapsed) => buildRoutineView({ tasks, elapsed, startMin: 6 * 60 - 35, closing });

test('marks done/current/future and counts down the current task', () => {
  const v = build(12.5);
  expect(v.blocks.map((b) => b.state)).toEqual(['done', 'current', 'future']);
  expect(v.current.name).toBe('Café');
  expect(v.countdown).toBe('17:30');
  expect(v.overtime).toBe(false);
  expect(v.nextUp.map((n) => [n.name, n.at])).toEqual([['Sair', '05:55']]);
});

test('flags the last 2 minutes as urgent', () => {
  expect(build(28.5).urgent).toBe(true);
  expect(build(27).urgent).toBe(false);
});

test('overtime parks on the closing zone and counts up', () => {
  const v = build(35 + 16.75);
  expect(v.overtime).toBe(true);
  expect(v.current.name).toBe('Hora de sair');
  expect(v.countdown).toBe('+16:45');
  expect(v.countLabel).toBe('DEPOIS DA HORA');
  expect(v.leftLabel).toBe('JÁ PASSOU 17 MIN DO HORÁRIO');
  expect(v.blocks.every((b) => b.done)).toBe(true);
  expect(v.nextUp).toEqual([]);
});

test('evening closing and routine overrides', () => {
  expect(closingFor('evening').name).toBe('Hora de dormir');
  expect(closingFor('morning', { closing: { name: 'Partiu!' } }).name).toBe('Partiu!');
});

test('mmss formats fractional minutes', () => {
  expect(mmss(3.5)).toBe('3:30');
  expect(mmss(0)).toBe('0:00');
});

describe('computeElapsed (deadline mode)', () => {
  const deadline = new Date(2026, 8, 25, 6, 30);
  const at = (h, m) => computeElapsed({ mode: 'deadline', deadline, now: new Date(2026, 8, 25, h, m), totalMinutes: 35, startTime: null });

  test('before start clamps to the beginning', () => {
    expect(at(5, 0).elapsed).toBe(0);
  });
  test('inside the routine', () => {
    expect(at(6, 10).elapsed).toBe(15);
  });
  test('past the deadline keeps counting (overtime)', () => {
    expect(at(6, 45).elapsed).toBe(50);
  });
  test('rolls over to tomorrow after the overtime window', () => {
    const r = at(10, 0);
    expect(r.elapsed).toBe(0);
    expect(r.endsAt.getDate()).toBe(26);
  });
});
