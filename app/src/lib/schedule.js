// Session schedule ("plan") for one run of a routine.
// A plan is { endMs, segs: [{ start, end }] (ms timestamps per task), done: [bool],
// doneSeq: [int] }. doneSeq is only the ORDER in which the marks were made (1, 2, 3…; 0 =
// not marked, or a mark from before doneSeq existed): never a time, never used to compute
// durations — it only tells the screens which mark is the most recent (see ribbonItems).
// Three different quantities, never mixed up:
//  - original minutes: what the parents configured; only ever used as WEIGHTS, so repeated
//    adjustments never compound, and the configured routine itself is never modified;
//  - planned duration: seg.end - seg.start, the time currently allocated to the task in
//    this run; this is what gets MOVED around when a task is marked done;
//  - elapsed: now - seg.start of the task in progress. It belongs to that task for good:
//    no redistribution moves its start or pulls its end back before now.

export const MIN_MS = 60000;
export const EXTEND_MS = 5 * MIN_MS;

const validMinutes = (t) => {
  const m = Number(t?.minutes ?? t?.duration);
  return Number.isFinite(m) && m > 0 ? m : 0;
};

// Original durations in whole milliseconds; invalid/negative → 0.
export function originalMs(tasks) {
  return (tasks || []).map((t) => Math.round(validMinutes(t) * MIN_MS));
}

const sum = (xs) => xs.reduce((s, x) => s + x, 0);

// Split totalMs into integer parts proportional to weights, summing exactly to totalMs
// (largest-remainder rounding). If every weight is zero/invalid nothing is allocated:
// we never invent time for tasks with no configured duration.
export function splitProportional(totalMs, weights) {
  const w = (weights || []).map((x) => (Number.isFinite(x) && x > 0 ? x : 0));
  const W = sum(w);
  const total = Number.isFinite(totalMs) ? Math.max(0, Math.round(totalMs)) : 0;
  if (!w.length || W <= 0) return w.map(() => 0);
  const exact = w.map((x) => (total * x) / W);
  const out = exact.map(Math.floor);
  let rest = total - sum(out);
  const order = exact
    .map((x, i) => [x - out[i], i])
    .filter(([, i]) => w[i] > 0)
    .sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  for (let k = 0; rest > 0 && order.length; k++, rest--) out[order[k % order.length][1]]++;
  // Guard against floating-point overshoot.
  for (let k = 0; rest < 0 && order.length; k++) {
    const i = order[order.length - 1 - (k % order.length)][1];
    if (out[i] > 0) { out[i]--; rest++; }
  }
  return out;
}

// Like splitProportional, but part i never exceeds caps[i] (water-filling: parts that hit
// their cap are frozen and the rest is shared again among the others). Returns integer
// parts summing to min(totalMs, what the caps allow among positive weights).
export function splitCapped(totalMs, weights, caps) {
  const out = weights.map(() => 0);
  let rest = Math.max(0, Math.round(totalMs) || 0);
  let active = weights.map((_, k) => k).filter((k) => weights[k] > 0 && caps[k] > 0);
  while (rest > 0 && active.length) {
    const parts = splitProportional(rest, active.map((k) => weights[k]));
    let given = 0;
    active.forEach((k, j) => {
      const g = Math.min(parts[j], caps[k] - out[k]);
      out[k] += g;
      given += g;
    });
    rest -= given;
    if (!given) break;
    active = active.filter((k) => out[k] < caps[k]);
  }
  return out;
}

// Plan with the original durations laid back-to-back, ending at endMs.
export function defaultPlan(tasks, endMs) {
  const orig = originalMs(tasks);
  let t = endMs - sum(orig);
  const segs = orig.map((d) => {
    const s = { start: t, end: t + d };
    t += d;
    return s;
  });
  return { endMs, segs, done: orig.map(() => false), doneSeq: orig.map(() => 0) };
}

// Order of the done marks (see doneSeq); plans saved before it existed read as all 0.
export const markSeq = (plan, i) => (plan.done[i] && plan.doneSeq?.[i]) || 0;
const nextSeq = (plan) => plan.done.reduce((m, _, i) => Math.max(m, markSeq(plan, i)), 0) + 1;
const withSeq = (plan, i, seq) => {
  const doneSeq = plan.done.map((_, j) => markSeq(plan, j));
  doneSeq[i] = seq;
  return doneSeq;
};

// "Now" never goes before the first task: before the routine starts, time is paused at its start.
const effectiveNow = (plan, nowMs) => (plan.segs.length ? Math.max(nowMs, plan.segs[0].start) : nowMs);

export const isOvertime = (plan, nowMs) => plan.segs.length > 0 && nowMs >= plan.endMs;

export function isTaskDone(plan, i, nowMs) {
  return !!plan.done[i] || effectiveNow(plan, nowMs) >= plan.segs[i].end;
}

// First task that is neither marked done nor already past; -1 if none.
export function currentIndex(plan, nowMs) {
  for (let i = 0; i < plan.segs.length; i++) if (!isTaskDone(plan, i, nowMs)) return i;
  return -1;
}

// Lay tasks [from..] out from anchorMs to plan.endMs: pending tasks share the interval by
// original weight; tasks marked done get zero length (they never absorb pending time).
function replan(plan, orig, from, anchorMs) {
  const segs = plan.segs.slice();
  const pending = [];
  for (let i = from; i < segs.length; i++) if (!plan.done[i]) pending.push(i);
  const shares = splitProportional(plan.endMs - anchorMs, pending.map((i) => orig[i]));
  let t = anchorMs;
  let k = 0;
  for (let i = from; i < segs.length; i++) {
    const d = plan.done[i] ? 0 : shares[k++];
    segs[i] = { start: t, end: t + d };
    t += d;
  }
  return { ...plan, segs };
}

const durationsOf = (plan) => plan.segs.map((s) => s.end - s.start);

// Lay tasks [from..] back to back from startMs with the given durations.
function layOut(plan, from, startMs, durs) {
  const segs = plan.segs.slice();
  let t = startMs;
  for (let i = from; i < segs.length; i++) {
    segs[i] = { start: t, end: t + durs[i] };
    t += durs[i];
  }
  return segs;
}

// Mark task i done; the deadline never moves.
//  - Current task: it ends now (its elapsed time stays with it) and what was still
//    allocated to it (end - now) is shared by the pending tasks after it. With no pending
//    task left, that time becomes free time until the deadline.
//  - Future task: the duration currently allocated to it (not its original minutes) is
//    shared by the current task and every other pending task. The current task keeps its
//    start (and so its elapsed time) and just ends later.
// Shares use original minutes as weights; tasks already done never receive anything.
// In overtime nothing is left to share: the task is only marked.
export function completeTask(plan, tasks, i, nowMs) {
  if (i < 0 || i >= plan.segs.length || isTaskDone(plan, i, nowMs)) return plan;
  const done = plan.done.slice();
  done[i] = true;
  const doneSeq = withSeq(plan, i, nextSeq(plan));
  if (isOvertime(plan, nowMs)) return { ...plan, done, doneSeq };
  const orig = originalMs(tasks);
  const c = currentIndex(plan, nowMs);
  const durs = durationsOf(plan);
  const cur = plan.segs[c];
  let freed;
  if (i === c) {
    const end = Math.min(Math.max(nowMs, cur.start), cur.end);
    freed = cur.end - end;
    durs[c] = end - cur.start;
  } else {
    freed = durs[i];
    durs[i] = 0;
  }
  const takers = [];
  for (let j = c; j < durs.length; j++) if (!done[j]) takers.push(j);
  const shares = splitProportional(freed, takers.map((j) => orig[j]));
  takers.forEach((j, k) => { durs[j] += shares[k]; });
  return { ...plan, done, doneSeq, segs: layOut(plan, c, cur.start, durs) };
}

// Undo the mark of a future task (i > current): it gets its original minutes back, taken
// from the current task and the other pending tasks by original weight. The current task
// never gives up time it has already used (it cannot end before now); if the others
// together have less than that, the task gets what there is. Deadline unchanged.
function unmarkFuture(plan, tasks, i, c, nowMs) {
  const orig = originalMs(tasks);
  const done = plan.done.slice();
  done[i] = false;
  const durs = durationsOf(plan);
  const cur = plan.segs[c];
  const givers = [];
  for (let j = c; j < durs.length; j++) if (j !== i && !done[j]) givers.push(j);
  const caps = givers.map((j) => (j === c ? cur.end - Math.max(nowMs, cur.start) : durs[j]));
  const taken = splitCapped(orig[i], givers.map((j) => orig[j]), caps);
  givers.forEach((j, k) => { durs[j] -= taken[k]; });
  durs[i] = taken.reduce((a, b) => a + b, 0);
  return { ...plan, done, doneSeq: withSeq(plan, i, 0), segs: layOut(plan, c, cur.start, durs) };
}

// Start task i now ("Pular para"). Everything from i on becomes pending again.
// With keepDeadline, a future deadline no further than twice the routine's original total
// is kept and now→deadline is shared by i and the following tasks; otherwise the deadline
// becomes now + original minutes of i and the following tasks (previous behaviour).
export function jumpTo(plan, tasks, i, nowMs, { keepDeadline = true } = {}) {
  const n = plan.segs.length;
  if (i < 0 || i >= n) return plan;
  const orig = originalMs(tasks);
  const segs = plan.segs.map((s, j) =>
    j < i && s.end > nowMs ? { start: Math.min(s.start, nowMs), end: nowMs } : s
  );
  const done = plan.done.map((d, j) => (j < i ? d : false));
  const doneSeq = plan.done.map((_, j) => (j < i ? markSeq(plan, j) : 0));
  const dist = plan.endMs - nowMs;
  const keep = keepDeadline && dist > 0 && dist <= 2 * sum(orig);
  const endMs = keep ? plan.endMs : nowMs + sum(orig.slice(i));
  return replan({ endMs, segs, done, doneSeq }, orig, i, nowMs);
}

// Push the deadline back by exactly `ms`, shared by the pending tasks (current + unmarked
// following ones; in overtime, every unmarked task) by original weight.
export function extendDeadline(plan, tasks, nowMs, ms = EXTEND_MS) {
  const orig = originalMs(tasks);
  const n = plan.segs.length;
  const c = isOvertime(plan, nowMs) ? 0 : currentIndex(plan, nowMs);
  const pending = [];
  if (c >= 0) for (let i = c; i < n; i++) if (!plan.done[i]) pending.push(i);
  const shares = splitProportional(ms, pending.map((i) => orig[i]));
  const segs = plan.segs.slice();
  let shift = 0;
  let k = 0;
  for (let i = pending.length ? pending[0] : n; i < n; i++) {
    const add = pending[k] === i ? shares[k++] : 0;
    segs[i] = { start: segs[i].start + shift, end: segs[i].end + shift + add };
    shift += add;
  }
  return { ...plan, endMs: plan.endMs + ms, segs };
}

// A fresh schedule ending at endMs (what a deadline changed by hand gives) that keeps the
// tasks the parents marked done (`marked(task, i)`): each is completed again at nowMs, in
// task order, by the same rules as the dot (completeTask), so its time goes to the pending
// tasks; a marked task already behind us just stays marked. Done marks are facts about the
// evening; the deadline is only a plan, so changing it never undoes them. `marked` returns
// false/undefined (not marked), or the mark's doneSeq (a number; true = legacy mark, 0),
// so the order in which the marks were made survives too.
export function restartPlan(tasks, endMs, nowMs, marked) {
  let plan = defaultPlan(tasks, endMs);
  const seqs = (tasks || []).map((t, i) => marked(t, i));
  (tasks || []).forEach((t, i) => {
    if (seqs[i] == null || seqs[i] === false) return;
    if (isTaskDone(plan, i, nowMs)) {
      const done = plan.done.slice();
      done[i] = true;
      plan = { ...plan, done };
    } else {
      plan = completeTask(plan, tasks, i, nowMs);
    }
  });
  return { ...plan, doneSeq: plan.done.map((d, i) => (d && typeof seqs[i] === 'number' ? seqs[i] : 0)) };
}

// The completion dot: marks a pending task done; on a done task it undoes the mark.
// Undoing a marked future task returns it to the queue (see unmarkFuture); undoing a task
// that is already behind us means "redo it", preserving other explicit marks.
export function toggleTaskDone(plan, tasks, i, nowMs, opts) {
  if (i < 0 || i >= plan.segs.length) return plan;
  if (!isTaskDone(plan, i, nowMs)) return completeTask(plan, tasks, i, nowMs);
  const c = isOvertime(plan, nowMs) ? -1 : currentIndex(plan, nowMs);
  if (plan.done[i] && c >= 0 && i > c) return unmarkFuture(plan, tasks, i, c, nowMs);
  const restarted = jumpTo(plan, tasks, i, nowMs, opts);
  const done = plan.done.map((d, j) => j !== i && d);
  const doneSeq = plan.done.map((_, j) => j !== i ? markSeq(plan, j) : 0);
  // A dot undoes only this task; jumping via the task body intentionally resets the tail.
  // Reuse the restart/deadline rules, but allocate time only to tasks still pending.
  return replan({ ...restarted, done, doneSeq }, originalMs(tasks), i, nowMs);
}
