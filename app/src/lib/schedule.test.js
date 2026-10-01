import {
  MIN_MS, completeTask, currentIndex, defaultPlan, extendDeadline, jumpTo, originalMs,
  splitProportional, toggleTaskDone,
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

  test('marking a future task done gives its time to the pending tasks after the current one', () => {
    const p = completeTask(fresh(), tasks, 2, at(19, 35));
    expect(p.endMs).toBe(D);
    expect(p.segs[0]).toEqual(fresh().segs[0]); // current untouched
    expect(durations(p)).toEqual([20, 26 + 2 / 3, 0, 13 + 1 / 3].map((x) => expect.closeTo(x, 6)));
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
