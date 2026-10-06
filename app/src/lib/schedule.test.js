import {
  MIN_MS, completeTask, currentIndex, defaultPlan, extendDeadline, jumpTo, originalMs, restartPlan,
  splitCapped, splitProportional, toggleTaskDone,
} from './schedule';
import { buildPlanView, closingFor } from './routineView';

const at = (h, m, s = 0) => new Date(2026, 9, 1, h, m, s).getTime();
const mins = (ms) => ms / MIN_MS;

// Evening: 19:30 → 20:30 (60 min)
const tasks = [
  { id: 1, name: 'Banho', minutes: 20 },
  { id: 2, name: 'Jantar', minutes: 20 },
  { id: 3, name: 'Dentes', minutes: 10 },
  { id: 4, name: 'Historinha', minutes: 10 },
];
const D = at(20, 30);
const fresh = () => defaultPlan(tasks, D);
const durations = (plan) => plan.segs.map((s) => mins(s.end - s.start));
const contiguousFrom = (plan, i) => plan.segs.slice(i + 1).every((s, k) => s.start === plan.segs[i + k].end);

describe('splitProportional', () => {
  test('uses the weights and keeps the exact total', () => {
    expect(splitProportional(50 * MIN_MS, [20, 10, 10])).toEqual([25, 12.5, 12.5].map((m) => m * MIN_MS));
    const parts = splitProportional(1000, [1, 1, 1]);
    expect(parts.reduce((a, b) => a + b)).toBe(1000);
    expect(Math.max(...parts) - Math.min(...parts)).toBeLessThanOrEqual(1);
  });
  test('handles odd totals, empty, zero and invalid weights without NaN', () => {
    const parts = splitProportional(7 * MIN_MS + 3, [7, 3, 0, NaN, -2]);
    expect(parts.reduce((a, b) => a + b)).toBe(7 * MIN_MS + 3);
    expect(parts.slice(2)).toEqual([0, 0, 0]);
    expect(splitProportional(1000, [])).toEqual([]);
    expect(splitProportional(1000, [0, NaN])).toEqual([0, 0]);
    expect(splitProportional(-5, [1, 2])).toEqual([0, 0]);
    expect(splitProportional(NaN, [1, 2])).toEqual([0, 0]);
  });
});

describe('finishing early', () => {
  test('bath done 10 min early: deadline stays 20:30, the 10 min go to the next tasks by original weight', () => {
    const p = completeTask(fresh(), tasks, 0, at(19, 40));
    expect(p.endMs).toBe(D);
    expect(p.done).toEqual([true, false, false, false]);
    expect(durations(p)).toEqual([10, 25, 12.5, 12.5]);
    expect(p.segs[1].start).toBe(at(19, 40));
    expect(p.segs[3].end).toBe(D);
    expect(currentIndex(p, at(19, 40))).toBe(1);
  });

  test('a finished task never absorbs pending time later on', () => {
    let p = completeTask(fresh(), tasks, 0, at(19, 40));
    p = completeTask(p, tasks, 1, at(19, 50));
    p = extendDeadline(p, tasks, at(19, 51));
    expect(durations(p).slice(0, 2)).toEqual([10, 10]);
    // 40 min + 5 shared 10:10 between Dentes and Historinha
    expect(durations(p).slice(2)).toEqual([22.5, 22.5]);
    expect(p.endMs).toBe(D + 5 * MIN_MS);
  });

  test('finishing the last task early leaves free time, without inventing time for done tasks', () => {
    let p = jumpTo(fresh(), tasks, 3, at(20, 15));
    p = completeTask(p, tasks, 3, at(20, 20));
    expect(p.endMs).toBe(D);
    expect(p.segs[3].end).toBe(at(20, 20));
    expect(currentIndex(p, at(20, 21))).toBe(-1);
    const v = buildPlanView({ tasks, plan: p, nowMs: at(20, 21), closing: closingFor('evening'), label: String });
    expect(v.allDone).toBe(true);
    expect(v.overtime).toBe(false);
    expect(v.blocks.every((b) => b.done)).toBe(true);
    expect(v.countdown).toBe('9:00');
    expect(v.nextUp[0].name).toBe('Hora de dormir');
  });

  test('marking a future task done shares its time with the current task and the other pending ones', () => {
    const p = completeTask(fresh(), tasks, 2, at(19, 35));
    expect(p.endMs).toBe(D);
    expect(p.segs[0].start).toBe(fresh().segs[0].start); // current keeps its start (elapsed)
    // 10 freed min shared 20:20:10 by Banho (current), Jantar and Historinha
    expect(durations(p)).toEqual([24, 24, 0, 12]);
    expect(p.segs[3].end).toBe(D);
    expect(contiguousFrom(p, 0)).toBe(true);
  });

  test('the completion dot undoes a future mark (time goes back) and redoes a past task', () => {
    const marked = completeTask(fresh(), tasks, 2, at(19, 35));
    const undone = toggleTaskDone(marked, tasks, 2, at(19, 36));
    expect(undone.done).toEqual([false, false, false, false]);
    expect(durations(undone)).toEqual([20, 20, 10, 10]);

    const p = completeTask(fresh(), tasks, 0, at(19, 40));
    const redo = toggleTaskDone(p, tasks, 0, at(19, 45)); // = jump back to Banho
    expect(redo.done).toEqual([false, false, false, false]);
    expect(currentIndex(redo, at(19, 45))).toBe(0);
    expect(redo.endMs).toBe(D);
  });
});

describe('redistributing a task marked done (current + every pending task)', () => {
  // Atual 10 + A 10 + B 10, deadline 20:30 → 20:00–20:10–20:20–20:30
  const abc = [
    { id: 1, name: 'Atual', minutes: 10 },
    { id: 2, name: 'A', minutes: 10 },
    { id: 3, name: 'B', minutes: 10 },
  ];
  const T0 = at(20, 0);

  test('10/10/10: marking B gives 5 min to the current task and 5 to A (15 each)', () => {
    const p = completeTask(defaultPlan(abc, D), abc, 2, T0);
    expect(durations(p)).toEqual([15, 15, 0]);
    expect(p.segs[0]).toEqual({ start: T0, end: at(20, 15) });
    expect(p.segs[1]).toEqual({ start: at(20, 15), end: D });
    expect(p.endMs).toBe(D);
    expect(currentIndex(p, T0)).toBe(0);
  });

  test('the time already elapsed in the current task stays with it', () => {
    const now = at(20, 4);
    const p = completeTask(defaultPlan(abc, D), abc, 2, now);
    expect(p.segs[0].start).toBe(T0); // 4 min elapsed, not lost
    expect(mins(now - p.segs[0].start)).toBe(4);
    expect(mins(p.segs[0].end - now)).toBe(11); // 6 left + 5 received
    expect(durations(p)).toEqual([15, 15, 0]);
  });

  test('the only pending task takes all the freed time (10 + 30 → 40)', () => {
    const two = [{ id: 1, name: 'X', minutes: 30 }, { id: 2, name: 'Y', minutes: 10 }];
    // X is in progress and is finished right at its start: its 30 min go to Y.
    const p = completeTask(defaultPlan(two, D), two, 0, at(19, 50));
    expect(durations(p)).toEqual([0, 40]);
    expect(p.segs[1]).toEqual({ start: at(19, 50), end: D });
    // Current 10 with a 30-min future task marked: the current task gets everything.
    const rev = [{ id: 1, name: 'C', minutes: 10 }, { id: 2, name: 'F', minutes: 30 }];
    const q = completeTask(defaultPlan(rev, D), rev, 1, at(19, 50));
    expect(durations(q)).toEqual([40, 0]);
    expect(q.segs[0]).toEqual({ start: at(19, 50), end: D });
  });

  test('shares are proportional to the ORIGINAL minutes of the receivers', () => {
    const t5 = [20, 5, 15, 10, 30].map((m, i) => ({ id: i, name: 'T' + i, minutes: m }));
    const p0 = defaultPlan(t5, D);
    const p = completeTask(p0, t5, 4, p0.segs[0].start);
    const gain = durations(p).map((d, i) => d - durations(p0)[i]);
    // 30 freed min over weights 20:5:15:10 (total 50)
    expect(gain.slice(0, 4)).toEqual([12, 3, 9, 6]);
    expect(durations(p)[4]).toBe(0);
  });

  test('rounding is exact (integer ms) and the deadline never moves', () => {
    const odd = [7, 3, 11, 5, 13].map((m, i) => ({ id: i, name: 'T' + i, minutes: m }));
    let p = defaultPlan(odd, D);
    const t = p.segs[0].start + 1234567; // ~20.6 min in: T2 in progress after the first mark
    p = completeTask(p, odd, 4, p.segs[0].start + 1234);
    expect(currentIndex(p, t)).toBe(2);
    p = completeTask(p, odd, 2, t);
    for (const s of p.segs) {
      expect(Number.isInteger(s.start)).toBe(true);
      expect(Number.isInteger(s.end)).toBe(true);
    }
    expect(p.endMs).toBe(D);
    expect(p.segs[3].end).toBe(D);
    expect(contiguousFrom(p, 0)).toBe(true);
    expect(durations(p).reduce((a, b) => a + b)).toBe(39);
  });

  test('a second mark transfers what the task HAD (not its original minutes), weights stay original', () => {
    const four = ['C', 'A', 'B', 'E'].map((n, i) => ({ id: i, name: n, minutes: 10 }));
    const start = at(19, 50);
    let p = completeTask(defaultPlan(four, D), four, 3, start); // E's 10 → 10/3 each
    expect(p.segs[2].end - p.segs[2].start).toBe(10 * MIN_MS + Math.round(10 * MIN_MS / 3));
    const bHad = p.segs[2].end - p.segs[2].start; // 13:20
    const before = durations(p);
    p = completeTask(p, four, 2, start); // B had 13:20 → 6:40 each to C and A (1:1)
    expect(before[0] + before[1] + mins(bHad)).toBeCloseTo(40, 9);
    expect(durations(p)).toEqual([20, 20, 0, 0]);
    p = completeTask(p, four, 1, start); // A's 20 → C
    expect(durations(p)).toEqual([40, 0, 0, 0]);
    expect(p.segs[0]).toEqual({ start, end: D });
  });

  test('tasks already done never receive time; finished time is not brought back', () => {
    let p = defaultPlan(abc, D);
    p = completeTask(p, abc, 0, at(20, 4)); // Atual done after 4 min: 6 min go to A and B
    expect(durations(p)).toEqual([4, 13, 13]);
    p = completeTask(p, abc, 2, at(20, 5)); // B (future) → all to A, nothing to Atual
    expect(durations(p)).toEqual([4, 26, 0]);
    expect(p.segs[0]).toEqual({ start: T0, end: at(20, 4) });
    expect(p.segs[1].end).toBe(D);
  });

  test('undoing a mark never takes back time the current task already used', () => {
    const two = [{ id: 1, name: 'C', minutes: 10 }, { id: 2, name: 'F', minutes: 10 }];
    let p = completeTask(defaultPlan(two, D), two, 1, at(20, 10)); // C: 20:10 → 20:30
    expect(durations(p)).toEqual([20, 0]);
    p = toggleTaskDone(p, two, 1, at(20, 29)); // only 1 min of C is still unused
    expect(p.segs[0]).toEqual({ start: at(20, 10), end: at(20, 29) });
    expect(p.segs[1]).toEqual({ start: at(20, 29), end: D });
    expect(p.done).toEqual([false, false]);
  });

  test('no current task: in overtime the mark changes nothing else; all done leaves free time', () => {
    // Past the deadline every task is already behind us: nothing to mark or share.
    const p0 = defaultPlan(abc, D);
    expect(completeTask(p0, abc, 2, at(20, 35))).toBe(p0);

    let p = defaultPlan(abc, D);
    p = completeTask(p, abc, 1, T0);
    p = completeTask(p, abc, 2, T0);
    expect(durations(p)).toEqual([30, 0, 0]);
    p = completeTask(p, abc, 0, at(20, 12)); // no pending task left: 18 min of free time
    expect(p.segs[0]).toEqual({ start: T0, end: at(20, 12) });
    expect(p.endMs).toBe(D);
    expect(currentIndex(p, at(20, 12))).toBe(-1);
    expect(completeTask(p, abc, 1, at(20, 13))).toBe(p); // already done: no-op
  });
});

describe('splitCapped', () => {
  test('respects caps and re-shares the excess, exact integers', () => {
    expect(splitCapped(100, [1, 1, 1], [10, 1000, 1000])).toEqual([10, 45, 45]);
    expect(splitCapped(100, [1, 1], [10, 20])).toEqual([10, 20]);
    expect(splitCapped(7, [2, 1, 0], [100, 100, 100])).toEqual([5, 2, 0]);
    expect(splitCapped(0, [1], [5])).toEqual([0]);
  });
});

describe('jumping to a task (clicking its body)', () => {
  test('going back with time available keeps the deadline and includes the selected task', () => {
    const p = jumpTo(fresh(), tasks, 0, at(19, 55));
    expect(p.endMs).toBe(D);
    expect(p.segs[0].start).toBe(at(19, 55));
    expect(p.segs[3].end).toBe(D);
    const d = durations(p);
    expect(d.reduce((a, b) => a + b)).toBe(35);
    expect(d[0] / d[2]).toBeCloseTo(2, 9); // original 20:20:10:10
    expect(d[0]).toBeCloseTo(d[1], 9);
    expect(p.done).toEqual([false, false, false, false]);
    expect(currentIndex(p, at(19, 55))).toBe(0);
  });

  test('going back clears done marks from the selected task on', () => {
    let p = completeTask(fresh(), tasks, 0, at(19, 40));
    p = completeTask(p, tasks, 1, at(19, 50));
    p = jumpTo(p, tasks, 1, at(19, 52));
    expect(p.done).toEqual([true, false, false, false]);
    expect(currentIndex(p, at(19, 52))).toBe(1);
    expect(durations(p).slice(1)).toEqual([19, 9.5, 9.5]);
  });

  test('jumping forward closes the skipped tasks at now', () => {
    const p = jumpTo(fresh(), tasks, 2, at(19, 45));
    expect(p.segs[0].end).toBe(at(19, 45));
    expect(p.segs[1]).toEqual({ start: at(19, 45), end: at(19, 45) });
    expect(durations(p).slice(2)).toEqual([22.5, 22.5]);
    expect(currentIndex(p, at(19, 45))).toBe(2);
  });

  test('deadline further than twice the ORIGINAL total restarts from the original minutes', () => {
    const p = jumpTo(fresh(), tasks, 1, at(18, 29, 59));
    expect(p.endMs).toBe(at(18, 29, 59) + 40 * MIN_MS);
    expect(durations(p).slice(1)).toEqual([20, 10, 10]);
  });

  test('exactly twice the original total keeps the deadline', () => {
    const p = jumpTo(fresh(), tasks, 1, at(18, 30));
    expect(p.endMs).toBe(D);
    expect(durations(p).slice(1)).toEqual([60, 30, 30]);
  });

  test('the 2x limit uses the whole routine total, not the remaining stretch nor adjusted minutes', () => {
    // From Dentes the remaining stretch is 20 min; the limit is still 2 × 60 = 120.
    const shrunk = completeTask(fresh(), tasks, 2, at(19, 31));
    const p = jumpTo(shrunk, tasks, 2, at(18, 45));
    expect(p.endMs).toBe(D);
    expect(durations(p).slice(2)).toEqual([52.5, 52.5]);
  });

  test('past deadline restarts from now with original minutes (Recomeçar)', () => {
    const p = jumpTo(fresh(), tasks, 0, at(20, 40));
    expect(p.endMs).toBe(at(21, 40));
    expect(durations(p)).toEqual([20, 20, 10, 10]);
  });

  test('without a deadline (start mode) jumping keeps the old behaviour', () => {
    const p = jumpTo(fresh(), tasks, 1, at(19, 55), { keepDeadline: false });
    expect(p.endMs).toBe(at(20, 35));
    expect(durations(p).slice(1)).toEqual([20, 10, 10]);
  });
});

describe('+5 min', () => {
  test('each click pushes the deadline exactly 5 min and spreads it over pending tasks', () => {
    let p = fresh();
    const now = at(19, 40);
    for (let k = 1; k <= 3; k++) {
      p = extendDeadline(p, tasks, now);
      expect(p.endMs).toBe(D + k * 5 * MIN_MS);
      expect(p.segs[3].end).toBe(p.endMs);
    }
    expect(durations(p)).toEqual([25, 25, 12.5, 12.5]);
    expect(p.segs[0].start).toBe(fresh().segs[0].start);
    expect(contiguousFrom(p, 0)).toBe(true);
  });

  test('skips tasks already done and works in overtime', () => {
    const p1 = extendDeadline(completeTask(fresh(), tasks, 0, at(19, 40)), tasks, at(19, 41));
    expect(durations(p1)).toEqual([10, 27.5, 13.75, 13.75]);

    const late = extendDeadline(fresh(), tasks, at(20, 32));
    expect(late.endMs).toBe(at(20, 35));
    expect(late.segs[3].end).toBe(at(20, 35));
    expect(currentIndex(late, at(20, 32))).toBe(3);
  });
});

describe('robustness', () => {
  test('original configured minutes are never modified', () => {
    const snapshot = JSON.stringify(tasks);
    let p = completeTask(fresh(), tasks, 0, at(19, 40));
    p = extendDeadline(p, tasks, at(19, 41));
    p = jumpTo(p, tasks, 0, at(19, 50));
    toggleTaskDone(p, tasks, 2, at(19, 51));
    expect(JSON.stringify(tasks)).toBe(snapshot);
  });

  test('no drift: after many operations pending tasks stay proportional to the originals', () => {
    let p = fresh();
    for (let k = 0; k < 20; k++) p = extendDeadline(p, tasks, at(19, 31));
    p = completeTask(p, tasks, 2, at(19, 32));
    p = toggleTaskDone(p, tasks, 2, at(19, 33));
    p = jumpTo(p, tasks, 1, at(19, 34));
    const d = durations(p);
    expect(d[1] / d[2]).toBeCloseTo(2, 6);
    expect(d[2]).toBeCloseTo(d[3], 6);
    expect(p.segs[3].end).toBe(p.endMs);
  });

  test('invalid durations and empty routines never produce NaN', () => {
    const bad = [{ name: 'a', minutes: 'x' }, { name: 'b', minutes: -3 }, { name: 'c' }, { name: 'd', minutes: 10 }];
    expect(originalMs(bad)).toEqual([0, 0, 0, 10 * MIN_MS]);
    let p = defaultPlan(bad, D);
    p = completeTask(p, bad, 3, at(20, 25));
    p = extendDeadline(p, bad, at(20, 26));
    p = jumpTo(p, bad, 0, at(20, 27));
    p.segs.forEach((s) => { expect(Number.isFinite(s.start)).toBe(true); expect(Number.isFinite(s.end)).toBe(true); });
    const v = buildPlanView({ tasks: bad, plan: p, nowMs: at(20, 27), closing: closingFor('evening'), label: String });
    expect(Number.isNaN(v.nowFrac)).toBe(false);

    const empty = defaultPlan([], D);
    expect(extendDeadline(empty, [], at(20, 0)).endMs).toBe(D + 5 * MIN_MS);
    expect(completeTask(empty, [], 0, at(20, 0))).toBe(empty);
    expect(jumpTo(empty, [], 0, at(20, 0))).toBe(empty);
    const ev = buildPlanView({ tasks: [], plan: empty, nowMs: at(20, 0), closing: closingFor('evening'), label: String });
    expect(ev.countdown).not.toMatch(/NaN/);
  });
});

describe('restartPlan (deadline changed by hand / routine saved): done marks are kept', () => {
  const M = 60000;
  const tasks = [20, 20, 10, 10].map((minutes, i) => ({ id: i + 1, minutes }));
  const total = (p) => p.segs.reduce((s, x) => s + (x.end - x.start), 0);

  test('nothing marked: same as the plain schedule', () => {
    expect(restartPlan(tasks, 100 * M, 50 * M, () => false)).toEqual(defaultPlan(tasks, 100 * M));
  });

  test('a marked future task stays done with no time; the deadline is the new one', () => {
    // New deadline 100 → starts at 40; now 45: task 0 in progress, task 2 marked.
    const p = restartPlan(tasks, 100 * M, 45 * M, (t) => t.id === 3);
    expect(p.done).toEqual([false, false, true, false]);
    expect(p.endMs).toBe(100 * M);
    expect(p.segs[2].end - p.segs[2].start).toBe(0);
    expect(p.segs[0].start).toBe(40 * M); // task 0 keeps its start
    expect(total(p)).toBe(60 * M);
    expect(p.segs[3].end).toBe(100 * M);
  });

  test('a marked task in progress ends now; a marked task already behind stays marked', () => {
    const p = restartPlan(tasks, 100 * M, 65 * M, (t) => t.id === 1 || t.id === 2);
    expect(p.done).toEqual([true, true, false, false]);
    expect(p.segs[1].end).toBe(65 * M); // task 1 was in progress at 65: ends now
    expect(p.segs[3].end).toBe(100 * M);
    expect(total(p)).toBe(60 * M);
  });
});
