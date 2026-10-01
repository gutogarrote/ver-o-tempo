// Session schedule ("plan") for one run of a routine.
// A plan is { endMs, segs: [{ start, end }] (ms timestamps per task), done: [bool] }.
// Every redistribution uses the ORIGINAL configured minutes as weights, so repeated
// adjustments never compound, and the configured routine itself is never modified.

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

// Plan with the original durations laid back-to-back, ending at endMs.
export function defaultPlan(tasks, endMs) {
  const orig = originalMs(tasks);
  let t = endMs - sum(orig);
  const segs = orig.map((d) => {
    const s = { start: t, end: t + d };
    t += d;
    return s;
  });
  return { endMs, segs, done: orig.map(() => false) };
}

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

// Mark task i done. Current task: it ends now and the time left until the (unchanged)
// deadline is shared by the pending tasks after it. Future task: its time goes to the
// pending tasks after the current one; the current task is left as is.
export function completeTask(plan, tasks, i, nowMs) {
  if (i < 0 || i >= plan.segs.length || isTaskDone(plan, i, nowMs)) return plan;
  const done = plan.done.slice();
  done[i] = true;
  if (isOvertime(plan, nowMs)) return { ...plan, done };
  const orig = originalMs(tasks);
  const c = currentIndex(plan, nowMs);
  if (i === c) {
    const segs = plan.segs.slice();
    const end = Math.min(Math.max(nowMs, segs[i].start), segs[i].end);
    segs[i] = { start: segs[i].start, end };
    return replan({ ...plan, segs, done }, orig, i + 1, end);
  }
  return replan({ ...plan, done }, orig, c + 1, plan.segs[c].end);
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
  const dist = plan.endMs - nowMs;
  const keep = keepDeadline && dist > 0 && dist <= 2 * sum(orig);
  const endMs = keep ? plan.endMs : nowMs + sum(orig.slice(i));
  return replan({ endMs, segs, done }, orig, i, nowMs);
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

// The completion dot: marks a pending task done; on a done task it undoes the mark.
// Undoing a marked future task just returns it to the queue after the current task;
// undoing a task that is already behind us means "redo it": same as jumping to it.
export function toggleTaskDone(plan, tasks, i, nowMs, opts) {
  if (i < 0 || i >= plan.segs.length) return plan;
  if (!isTaskDone(plan, i, nowMs)) return completeTask(plan, tasks, i, nowMs);
  const c = isOvertime(plan, nowMs) ? -1 : currentIndex(plan, nowMs);
  if (plan.done[i] && c >= 0 && i > c) {
    const done = plan.done.slice();
    done[i] = false;
    return replan({ ...plan, done }, originalMs(tasks), c + 1, plan.segs[c].end);
  }
  return jumpTo(plan, tasks, i, nowMs, opts);
}
