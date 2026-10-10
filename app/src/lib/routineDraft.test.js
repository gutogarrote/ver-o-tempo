import { MIN_MS, completeTask, defaultPlan } from './schedule';
import {
  MAX_TASK_MIN, canStep, deadlineStatus, draftTasks, insertTask, invalidItems, isDirty, isValidMinutes, moveItem, nextTaskId,
  parseMinutes, removeTask, savedTasks, shiftClock, startDraft, stepMinutes, typeMinutes, updateTask,
} from './routineDraft';

const T0 = 19 * 60 * MIN_MS; // 19:00 as a plain timestamp
const tasks = [
  { id: 1, name: 'Banho', minutes: 20, icon: '🛁', color: '#38bdf8' },
  { id: 2, name: 'Jantar', duration: 20, icon: '🍽️', color: '#fb923c' },
  { id: 3, name: 'Dentes', minutes: 10, icon: '🪥', color: '#a78bfa' },
];
const names = (d) => draftTasks(d).map((t) => t.name);

describe('startDraft', () => {
  test('normalizes minutes, keeps every field and takes the done marks with their order', () => {
    let plan = defaultPlan(tasks, T0 + 50 * MIN_MS); // 19:00–19:20–19:40–19:50
    plan = completeTask(plan, tasks, 2, T0 + 5 * MIN_MS);
    plan = completeTask(plan, tasks, 0, T0 + 6 * MIN_MS);
    const d = startDraft('evening', tasks, plan, '19:50', T0 + 6 * MIN_MS);
    expect(draftTasks(d)[1]).toEqual({ id: 2, name: 'Jantar', minutes: 20, icon: '🍽️', color: '#fb923c' });
    expect(d.items.map((it) => it.mark)).toEqual([2, undefined, 1]);
    expect(d.items.map((it) => it.key)).toEqual(['t0', 't1', 't2']);
    expect(isDirty(d, tasks, '19:50')).toBe(false);
  });
});

describe('moves, durations, insertions and removals never lose a task or a mark', () => {
  const base = () => {
    const d = startDraft('evening', tasks, defaultPlan(tasks, T0 + 50 * MIN_MS), '19:50', T0);
    d.items[2] = { ...d.items[2], mark: 1 };
    return d;
  };

  test('each move swaps neighbours; the ends do nothing', () => {
    let d = base();
    expect(moveItem(d, 0, -1)).toBe(d);
    expect(moveItem(d, 2, 1)).toBe(d);
    d = moveItem(d, 2, -1);
    expect(names(d)).toEqual(['Banho', 'Dentes', 'Jantar']);
    d = moveItem(d, 1, -1);
    expect(names(d)).toEqual(['Dentes', 'Banho', 'Jantar']);
    expect(d.items[0].mark).toBe(1);
    expect(d.items.filter((it) => it.mark !== undefined)).toHaveLength(1);
    expect(isDirty(d, tasks, '19:50')).toBe(true);
    d = moveItem(moveItem(d, 0, 1), 1, 1);
    expect(names(d)).toEqual(['Banho', 'Jantar', 'Dentes']);
    expect(d.items[2].mark).toBe(1);
  });

  test('−1/+1 keep the duration between 1 and the link limit', () => {
    let d = base();
    for (let k = 0; k < 15; k++) d = stepMinutes(d, 2, -1);
    expect(draftTasks(d)[2].minutes).toBe(1);
    expect(canStep(draftTasks(d)[2], -1)).toBe(false);
    expect(stepMinutes(d, 2, -1)).toBe(d);
    d = stepMinutes(d, 2, 1);
    expect(draftTasks(d)[2].minutes).toBe(2);
    d = updateTask(d, 1, { minutes: MAX_TASK_MIN });
    expect(canStep(draftTasks(d)[1], 1)).toBe(false);
    expect(stepMinutes(d, 1, 1)).toBe(d);
    // An invalid stored value (e.g. NaN from older data) steps up from 0.
    d = updateTask(d, 0, { minutes: NaN });
    expect(draftTasks(stepMinutes(d, 0, 1))[0].minutes).toBe(1);
    expect(d.items[2].mark).toBe(1);
  });

  test('insertion goes exactly between the neighbours, with a new id and no mark', () => {
    let d = base();
    d = insertTask(d, 1, { name: 'Pijama', minutes: 5, icon: '👕', color: '#22c55e' });
    expect(names(d)).toEqual(['Banho', 'Pijama', 'Jantar', 'Dentes']);
    expect(draftTasks(d)[1].id).toBe(4);
    expect(d.items[1].mark).toBeUndefined();
    expect(d.items[3].mark).toBe(1);
    d = insertTask(d, 0, { name: 'Antes', minutes: 1 });
    d = insertTask(d, d.items.length, { name: 'Depois', minutes: 2 });
    expect(names(d)).toEqual(['Antes', 'Banho', 'Pijama', 'Jantar', 'Dentes', 'Depois']);
    expect(new Set(draftTasks(d).map((t) => t.id)).size).toBe(6);
    expect(new Set(d.items.map((it) => it.key)).size).toBe(6);
    expect(nextTaskId(d)).toBe(7);
    d = removeTask(d, 2);
    expect(names(d)).toEqual(['Antes', 'Banho', 'Jantar', 'Dentes', 'Depois']);
    expect(d.items[3].mark).toBe(1);
  });

  // Updated for issue #26: invalid durations are no longer saved as 0 — the draft cannot be
  // saved at all until they are fixed (Salvar is disabled; savedTasks refuses).
  test('saved tasks keep integer minutes, no duration field, and never an invalid duration', () => {
    const d = base();
    expect(savedTasks(d).map((t) => t.minutes)).toEqual([20, 20, 10]);
    expect(savedTasks(d).every((t) => !('duration' in t))).toBe(true);
    expect(() => savedTasks(updateTask(d, 0, { minutes: 0 }))).toThrow();
    expect(() => savedTasks(typeMinutes(d, 0, ''))).toThrow();
  });

  test.each([['0'], ['-1'], [''], ['2.5'], ['181'], ['1e2'], ['abc']])('typed %j is kept as invalid text, never as minutes', (text) => {
    let d = typeMinutes(base(), 1, text);
    expect(d.items[1].minutesText).toBe(text);
    expect(draftTasks(d)[1].minutes).toBe(20); // the preview keeps the last valid duration
    expect(invalidItems(d).map((it) => it.task.name)).toEqual(['Jantar']);
    expect(isDirty(d, tasks, '19:50')).toBe(true);
    // A valid value, or a step, fixes it.
    expect(invalidItems(typeMinutes(d, 1, '7'))).toEqual([]);
    expect(draftTasks(typeMinutes(d, 1, '7'))[1].minutes).toBe(7);
    d = stepMinutes(d, 1, -1);
    expect(d.items[1].minutesText).toBeUndefined();
    expect(draftTasks(d)[1].minutes).toBe(19);
    expect(savedTasks(d).map((t) => t.minutes)).toEqual([20, 19, 10]);
  });

  test('parseMinutes accepts only whole numbers from 1 to 180', () => {
    expect(['1', '07', ' 180 ', '45'].map(parseMinutes)).toEqual([1, 7, 180, 45]);
    expect(['0', '-1', '', '2.5', '181', '1e2', 'x', null, undefined].map(parseMinutes)).toEqual(Array(9).fill(null));
    expect([1, 180, 0, -1, 2.5, 181, NaN].map(isValidMinutes)).toEqual([true, true, false, false, false, false, false]);
  });

  test('a stored invalid duration (older data) blocks saving until fixed', () => {
    const d = startDraft('evening', [{ id: 1, name: 'Velha', minutes: 0 }], null, '19:50');
    expect(invalidItems(d)).toHaveLength(1);
    expect(draftTasks(stepMinutes(d, 0, 1))[0].minutes).toBe(1);
    expect(invalidItems(stepMinutes(d, 0, 1))).toEqual([]);
  });
});

describe('end time', () => {
  test('shiftClock moves by minutes and wraps around midnight', () => {
    expect(shiftClock('20:30', 5)).toBe('20:35');
    expect(shiftClock('20:30', -5)).toBe('20:25');
    expect(shiftClock('23:58', 5)).toBe('00:03');
    expect(shiftClock('00:02', -5)).toBe('23:57');
  });

  test('deadlineStatus: what is left of the tasks against the time until the end', () => {
    const plan = defaultPlan(tasks, T0 + 50 * MIN_MS); // Banho in progress at 19:05
    const now = T0 + 5 * MIN_MS;
    const d = startDraft('evening', tasks, plan, '19:50', now);
    expect(d.items.map((it) => it.left)).toEqual([15, 20, 10]);
    expect(deadlineStatus(d, T0 + 50 * MIN_MS, now)).toEqual({ kind: 'ok', needed: 45, available: 45 });
    expect(deadlineStatus(d, T0 + 45 * MIN_MS, now)).toEqual({ kind: 'tight', needed: 45, available: 40 });
    expect(deadlineStatus(d, now, now).kind).toBe('overdue');
    // An exact fit stays ok as seconds go by (the task in progress counts down too) and
    // within half a minute of rounding.
    expect(deadlineStatus(d, T0 + 50 * MIN_MS, now + 1000).kind).toBe('ok');
    expect(deadlineStatus(d, T0 + 50 * MIN_MS - 20000, now).kind).toBe('ok');
    expect(deadlineStatus(d, T0 + 50 * MIN_MS - 40000, now)).toEqual({ kind: 'tight', needed: 45, available: 44 });
    // Done marks need nothing; a longer task needs more; an inserted one counts whole.
    const marked = { ...d, items: d.items.map((it, i) => (i === 2 ? { ...it, mark: 1 } : it)) };
    expect(deadlineStatus(marked, T0 + 45 * MIN_MS, now).kind).toBe('ok');
    expect(deadlineStatus(stepMinutes(marked, 1, 1), T0 + 40 * MIN_MS, now).needed).toBe(36);
    expect(deadlineStatus(insertTask(marked, 3, { name: 'X', minutes: 4 }), T0 + 45 * MIN_MS, now).needed).toBe(39);
  });
});
