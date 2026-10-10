// Draft of the routine being edited on the main screen (Home edit mode). Pure helpers.
// A draft is { routineId, endTime: 'HH:MM', items: [{ key, mark, task }], nextKey }:
//  - key: identity of the task inside the draft (React key, focus and scroll anchoring);
//  - mark: the task's completion mark when editing started (its doneSeq, see markSeq), or
//    undefined. It travels with the task through moves, duration changes and insertions,
//    so done marks are never lost or moved to another task by an edit;
//  - task: the routine task exactly as it will be saved;
//  - left: minutes of it still to do when editing started (0 once done or behind the NOW
//    line, what was left of the task in progress, all of it for the following ones). Only
//    used to warn about an end time that leaves too little time (deadlineStatus).
// Nothing here touches storage or the session: Home saves the draft, or drops it on Cancel.
import { MIN_MS, isTaskDone, markSeq } from './schedule';

export const MIN_TASK_MIN = 1;
// Same per-task limit as routine links (routineUrl), so a stepped duration always fits one.
export const MAX_TASK_MIN = 180;
export const END_STEP_MIN = 5;
export const NEW_TASK_MIN = 5;

const minutesOf = (task) => {
  const m = Number(task?.minutes ?? task?.duration);
  return Number.isFinite(m) ? m : 0;
};

export function startDraft(routineId, tasks, plan, endTime, nowMs) {
  const items = (tasks || []).map((task, i) => {
    const { duration, ...rest } = task;
    const seg = plan?.segs?.[i];
    const past = !plan || !seg || nowMs === undefined ? false : isTaskDone(plan, i, nowMs);
    const used = seg && nowMs > seg.start ? (nowMs - seg.start) / MIN_MS : 0;
    return {
      key: `t${i}`, mark: plan?.done?.[i] ? markSeq(plan, i) : undefined, task: { ...rest, minutes: minutesOf(task) },
      left: past ? 0 : Math.max(0, minutesOf(task) - used),
    };
  });
  return { routineId, endTime, items, nextKey: items.length };
}

export const draftTasks = (draft) => draft.items.map((it) => it.task);

// Swap item i with its neighbour (delta -1: up/earlier, +1: down/later).
export function moveItem(draft, i, delta) {
  const j = i + delta;
  if (i < 0 || j < 0 || i >= draft.items.length || j >= draft.items.length) return draft;
  const items = draft.items.slice();
  [items[i], items[j]] = [items[j], items[i]];
  return { ...draft, items };
}

// A changed duration changes what is left of the task by the same amount.
export function updateTask(draft, i, patch) {
  if (i < 0 || i >= draft.items.length) return draft;
  const items = draft.items.slice();
  const it = items[i];
  const task = { ...it.task, ...patch };
  const grew = Math.max(0, minutesOf(task)) - Math.max(0, minutesOf(it.task));
  const left = it.left === undefined ? undefined : it.mark === undefined && it.left > 0 ? Math.max(0, it.left + grew) : it.left;
  items[i] = { ...it, task, left };
  return { ...draft, items };
}

export const canStep = (task, delta) => {
  const m = minutesOf(task);
  return delta < 0 ? m > MIN_TASK_MIN : m < MAX_TASK_MIN;
};

// −1/+1 minute, never below 1 nor above the link limit.
export function stepMinutes(draft, i, delta) {
  const task = draft.items[i]?.task;
  if (!task || !canStep(task, delta)) return draft;
  const m = Math.min(MAX_TASK_MIN, Math.max(MIN_TASK_MIN, Math.round(minutesOf(task)) + delta));
  return updateTask(draft, i, { minutes: m });
}

// Next numeric id not used by any task of the draft.
export function nextTaskId(draft) {
  return draft.items.reduce((m, it) => Math.max(m, Number.isFinite(Number(it.task.id)) ? Number(it.task.id) : 0), 0) + 1;
}

// Insert a new task at position `at` (0 = before the first, items.length = after the last).
export function insertTask(draft, at, task) {
  const pos = Math.max(0, Math.min(at, draft.items.length));
  const items = draft.items.slice();
  items.splice(pos, 0, { key: `t${draft.nextKey}`, mark: undefined, task: { ...task, id: nextTaskId(draft) }, left: minutesOf(task) });
  return { ...draft, items, nextKey: draft.nextKey + 1 };
}

export function removeTask(draft, i) {
  if (i < 0 || i >= draft.items.length) return draft;
  return { ...draft, items: draft.items.filter((_, j) => j !== i) };
}

// 'HH:MM' moved by deltaMin, wrapping around midnight.
export function shiftClock(hhmm, deltaMin) {
  const [h, m] = String(hhmm || '00:00').split(':').map(Number);
  const t = ((((h || 0) * 60 + (m || 0) + deltaMin) % 1440) + 1440) % 1440;
  return String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0');
}

// Tasks as saved: minutes as numbers (invalid → 0, as the previous editors did).
export const savedTasks = (draft) => draft.items.map(({ task }) => {
  const { duration, ...rest } = task;
  return { ...rest, minutes: Number(rest.minutes) || 0 };
});

export function isDirty(draft, tasks, endTime) {
  if (draft.endTime !== endTime || draft.items.length !== (tasks || []).length) return true;
  return draft.items.some((it, i) => it.key !== `t${i}` || JSON.stringify(it.task) !== JSON.stringify(startDraft('', [tasks[i]], null, '').items[0].task));
}

// How the end time of the draft compares with what is left to do.
//  - overdue: the end time is not in the future;
//  - tight: what is left of the tasks (see `left`; inserted tasks count whole, done marks
//    count nothing) needs more minutes than there are until the end;
//  - ok otherwise. `needed`/`available` are whole minutes.
export function deadlineStatus(draft, endMs, nowMs) {
  const needed = Math.ceil(draft.items.reduce((s, it) => s + (it.mark !== undefined ? 0 : it.left ?? Math.max(0, minutesOf(it.task))), 0) - 1e-9);
  const available = Math.floor((endMs - nowMs) / MIN_MS);
  if (endMs <= nowMs) return { kind: 'overdue', needed, available: 0 };
  return { kind: needed > available ? 'tight' : 'ok', needed, available };
}
