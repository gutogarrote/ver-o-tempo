import React, { useEffect, useMemo, useRef, useState } from 'react';
import RoutineTV from '../components/fita/RoutineTV';
import RoutinePhone from '../components/fita/RoutinePhone';
import ParentMenu from '../components/fita/ParentMenu';
import DefaultRoutineEditor from '../components/DefaultRoutineEditor';
import PwaUpdateNotice from '../components/PwaUpdateNotice';
import { TaskDialog } from '../components/fita/EditControls';
import { OVERTIME_WINDOW_MIN, computeElapsed, hhmm, sumMinutes, toToday } from '../lib/timeline';
import { serializeRoutineUrl } from '../lib/routineUrl';
import { buildPlanView, closingFor } from '../lib/routineView';
import { MIN_MS, defaultPlan, extendDeadline, jumpTo, markSeq, restartPlan, toggleTaskDone } from '../lib/schedule';
import {
  END_STEP_MIN, NEW_TASK_MIN, deadlineStatus, draftTasks, insertTask, isDirty, moveItem, removeTask, savedTasks,
  shiftClock, startDraft, stepMinutes, updateTask,
} from '../lib/routineDraft';
import catalog from '../lib/taskCatalog.json';

// Phones and portrait screens get the vertical ribbon (2a); landscape gets the TV stage (1a).
const PHONE_QUERY = '(max-width: 767px), (max-aspect-ratio: 1/1)';
const EMPTY_TASKS = [];
const taskKey = (t, i) => (t && t.id != null ? `id:${t.id}` : `#${i}`);

function useIsPhone() {
  const [isPhone, setIsPhone] = useState(() => window.matchMedia?.(PHONE_QUERY).matches ?? false);
  useEffect(() => {
    const mq = window.matchMedia?.(PHONE_QUERY);
    if (!mq) return;
    const onChange = () => setIsPhone(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return isPhone;
}

export default function Home({ routines, setRoutines, currentTime, initialRoutineId = 'morning' }) {
  // Map routines to morning/evening for today (using 'monday' as in current data)
  const todayKey = 'monday';
  const available = routines?.[todayKey] || {};

  const [routineId, setRoutineId] = useState(initialRoutineId);
  const routine = available[routineId] || { name: 'Rotina', tasks: [] };

  const tasks = routine.tasks || EMPTY_TASKS;
  const totalMinutes = useMemo(() => sumMinutes(tasks), [tasks]);

  // Modes: start | deadline
  const [useDeadline, setUseDeadline] = useState(true);
  const [deadlineStr, setDeadlineStr] = useState(routine.endTime || '23:59');
  const [startTime, setStartTime] = useState(() => new Date(currentTime));
  // Adjusted schedule of the current run (done marks, early finishes, +5 min, jumps).
  // In memory only, like the deadline itself; null = plain schedule from the deadline.
  const [session, setSession] = useState(null);
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;

  // Reset when routine changes. A session rebuilt for these very tasks when the routine was
  // saved (saveDefaults/saveCurrent, keeping done marks) survives; anything else starts clean.
  useEffect(() => {
    setSession((s) => (s && s.routineId === routineId && s.tasks === tasksRef.current ? s : null));
    setUseDeadline(true);
    setDeadlineStr(routine.endTime || '23:59');
    // Default start time aligns with deadline - total
    const dl = toToday(routine.endTime || '23:59');
    const startsAt = new Date(dl.getTime() - totalMinutes * 60000);
    setStartTime(startsAt);
  }, [routineId, routine.endTime, totalMinutes]);

  const mode = useDeadline ? 'deadline' : 'start';
  const now = currentTime instanceof Date ? currentTime : new Date();

  const { endsAt } = computeElapsed({ mode, startTime, deadline: toToday(deadlineStr), now, totalMinutes });
  const nowMs = now.getTime();

  // A session only applies to the routine/tasks it was made for, and expires like the
  // deadline does (after the overtime window) so the next day starts clean.
  const sessionLive = session && session.routineId === routineId && session.tasks === tasks
    && nowMs - session.plan.endMs <= OVERTIME_WINDOW_MIN * MIN_MS;
  const livePlan = sessionLive ? session.plan : defaultPlan(tasks, endsAt.getTime());

  const isPhone = useIsPhone();

  // Edit states. The full editor ("Rotinas") replaces the screen; the edit mode keeps it and
  // works on a draft (see lib/routineDraft) that only Salvar persists and Cancelar drops.
  const [isEditingDefaults, setIsEditingDefaults] = useState(false);
  const [draft, setDraft] = useState(null);
  const [dialog, setDialog] = useState(null);
  const editing = !!draft && draft.routineId === routineId;
  const updateNotice = <PwaUpdateNotice editing={isEditingDefaults || editing} />;

  const endFor = ({ deadline = deadlineStr, deadlineMode = useDeadline, start = startTime, total = totalMinutes } = {}) =>
    computeElapsed({ mode: deadlineMode ? 'deadline' : 'start', startTime: start, deadline: toToday(deadline), now, totalMinutes: total }).endsAt.getTime();
  // End of the routine for an 'HH:MM' end time, by the same rules as the deadline (a time more
  // than OVERTIME_WINDOW_MIN behind us is the next occurrence).
  const endAt = (time) => endFor({ deadline: time, deadlineMode: true });

  // While editing, the screens show the draft as it would be after Salvar: a fresh schedule
  // for its end time keeping the done marks (restartPlan, as a save does). An untouched draft
  // shows the live schedule, so entering the edit mode never moves anything.
  const shownTasks = editing ? draftTasks(draft) : tasks;
  const dirty = editing && isDirty(draft, tasks, draft.baseEnd);
  const draftEndMs = editing ? endAt(draft.endTime) : 0;
  const plan = editing && dirty
    ? restartPlan(shownTasks, draftEndMs, nowMs, (t, i) => draft.items[i].mark)
    : livePlan;

  const closing = closingFor(routineId, routine);
  const view = buildPlanView({ tasks: shownTasks, plan, nowMs, closing, label: (ms) => hhmm(new Date(ms)) });

  function applyPlan(next) {
    if (next === plan) return;
    setSession({ routineId, tasks, plan: next });
    // Keep the parents' menu showing the deadline in effect.
    if (useDeadline && next.endMs !== plan.endMs) setDeadlineStr(hhmm(new Date(next.endMs)));
  }

  // Session actions are paused while editing (their buttons are disabled too).
  const live = (fn) => (...args) => { if (!editing) fn(...args); };
  const onJump = live((i) => applyPlan(jumpTo(plan, tasks, i, nowMs, { keepDeadline: useDeadline })));
  const onToggleDone = live((i) => applyPlan(toggleTaskDone(plan, tasks, i, nowMs, { keepDeadline: useDeadline })));
  const onExtend = live(() => applyPlan(extendDeadline(plan, tasks, nowMs)));

  // Parents changing the deadline/mode by hand (or saving the routine) start from a fresh
  // schedule for the new deadline, but tasks they marked done stay done, in the order they
  // were marked (restartPlan).
  const marks = new Map(livePlan.done.map((d, i) => (d ? [taskKey(tasks[i], i), markSeq(livePlan, i)] : null)).filter(Boolean));
  function restartFor(nextRoutineId, nextTasks, endMs, markOf = (t, i) => marks.get(taskKey(t, i))) {
    if (!nextTasks.some((t, i) => markOf(t, i) !== undefined)) return null;
    return { routineId: nextRoutineId, tasks: nextTasks, plan: restartPlan(nextTasks, endMs, nowMs, markOf) };
  }
  const setDeadlineByHand = (v) => { setSession(restartFor(routineId, tasks, endFor({ deadline: v }))); setDeadlineStr(v); };
  const setUseDeadlineByHand = (v) => { setSession(restartFor(routineId, tasks, endFor({ deadlineMode: v }))); setUseDeadline(v); };
  // After a save, Home re-renders with the saved routine: same deadline rules as the reset
  // effect above when its end time or length changed, the current ones otherwise.
  function keepMarksAfterSave(saved) {
    const nextTasks = saved?.tasks || EMPTY_TASKS;
    const total = sumMinutes(nextTasks);
    const reset = saved?.endTime !== routine.endTime || total !== totalMinutes;
    const endMs = reset
      ? endFor({ deadline: saved?.endTime || '23:59', deadlineMode: true, total })
      : endFor({ total });
    return restartFor(routineId, nextTasks, endMs);
  }

  const [saveError, setSaveError] = useState('');

  // `sessionAfter`: schedule of the run once saved (default: keepMarksAfterSave).
  function persistRoutine(updated, sessionAfter) {
    try {
      const saved = updated?.[todayKey]?.[routineId];
      const url = serializeRoutineUrl(window.location.href, routineId, saved?.tasks, saved?.endTime || '23:59');
      window.history.replaceState(window.history.state, '', url);
      setSaveError('');
    } catch (error) {
      setSaveError('Alterações salvas no aparelho, mas não foi possível atualizar o link. Confira nomes, tarefas, durações e horário nos limites do formato de URL.' + (error.linkMessage ? ' ' + error.linkMessage : ''));
    }
    try {
      localStorage.setItem('routines', JSON.stringify(updated));
    } catch (_) {}
    setSession(sessionAfter !== undefined ? sessionAfter : keepMarksAfterSave(updated?.[todayKey]?.[routineId]));
    setRoutines(updated);
  }

  function saveDefaults(updated) {
    // Keep local routines that were not changed in the full editor, including shortcut loads.
    let next = updated;
    try {
      const stored = JSON.parse(localStorage.getItem('routines'));
      if (stored && typeof stored === 'object' && !Array.isArray(stored)) {
        next = { ...stored };
        for (const day of new Set([...Object.keys(routines), ...Object.keys(updated)])) {
          next[day] = { ...stored[day] };
          for (const period of new Set([...Object.keys(routines[day] || {}), ...Object.keys(updated[day] || {})])) {
            const saved = updated[day]?.[period];
            if (JSON.stringify(saved) !== JSON.stringify(routines[day]?.[period]) || (day === todayKey && period === routineId)) {
              if (saved) next[day][period] = saved;
              else delete next[day][period];
            } else if (!next[day][period]) next[day][period] = saved;
          }
          if (!updated[day]) delete next[day];
        }
      }
    } catch (_) {}
    persistRoutine(next);
    setIsEditingDefaults(false);
  }

  function saveCurrent(updatedRoutine, sessionAfter) {
    // Path shortcuts display defaults, but saving one period must preserve other local routines.
    let savedRoutines;
    try {
      const stored = JSON.parse(localStorage.getItem('routines'));
      if (stored && typeof stored === 'object' && !Array.isArray(stored)) savedRoutines = stored;
    } catch (_) {}
    const next = {
      ...routines,
      ...savedRoutines,
      [todayKey]: {
        ...(routines?.[todayKey] || {}),
        ...(savedRoutines?.[todayKey] || {}),
        [routineId]: updatedRoutine,
      },
    };
    persistRoutine(next, sessionAfter);
  }

  // Edit mode --------------------------------------------------------------------------------
  // Starts from what the screen shows: the tasks, their done marks and the end time in effect.
  function startEdit() {
    const endTime = useDeadline ? deadlineStr : hhmm(new Date(livePlan.endMs));
    setDraft({ ...startDraft(routineId, tasks, livePlan, endTime, nowMs), baseEnd: endTime });
  }
  function cancelEdit() {
    setDialog(null);
    setDraft(null);
  }
  // One write (storage + link, like the other editors), then the run continues from the saved
  // routine with the same done marks, on the same schedule the preview showed.
  function saveEdit() {
    if (!editing) return;
    if (dirty) {
      const nextTasks = savedTasks(draft);
      const markOf = (t, i) => draft.items[i].mark;
      saveCurrent({ ...routine, tasks: nextTasks, endTime: draft.endTime }, restartFor(routineId, nextTasks, draftEndMs, markOf));
      setDeadlineStr(draft.endTime);
      setUseDeadline(true);
    }
    cancelEdit();
  }
  const nameAt = (i) => String(draft?.items[i]?.task.name || '').trim() || `Tarefa ${i + 1}`;
  function whereLabel(at) {
    const n = draft.items.length;
    if (!n) return 'Primeira tarefa da rotina';
    if (at === 0) return `No início, antes de ${nameAt(0)}`;
    if (at === n) return `No fim, depois de ${nameAt(n - 1)}`;
    return `Entre ${nameAt(at - 1)} e ${nameAt(at)}`;
  }
  // −5/+5 move the end time; never to a time already behind us (nor wrap to another day).
  const canShiftEnd = (d, delta) => {
    if (!d) return false;
    const e = endAt(shiftClock(d.endTime, delta));
    const cur = endAt(d.endTime);
    return delta < 0 ? e > nowMs && e < cur : e > cur;
  };
  const shiftEnd = (delta) => setDraft((d) => (canShiftEnd(d, delta) ? { ...d, endTime: shiftClock(d.endTime, delta) } : d));

  const edit = editing ? {
    items: draft.items,
    timeLabel: (ms) => hhmm(new Date(ms)),
    onMove: (i, delta) => setDraft((d) => moveItem(d, i, delta)),
    onStep: (i, delta) => setDraft((d) => stepMinutes(d, i, delta)),
    onChange: (i, patch) => setDraft((d) => updateTask(d, i, patch)),
    onInsert: (at, opener) => setDialog({ mode: 'insert', at, opener, where: whereLabel(at), seq: Date.now(),
      task: { name: '', icon: '✨', color: '#CCCCCC', minutes: NEW_TASK_MIN } }),
    onDetails: (i, opener) => setDialog({ mode: 'details', i, opener, where: nameAt(i), seq: Date.now(), task: draft.items[i].task }),
    canEarlier: canShiftEnd(draft, -END_STEP_MIN),
    canLater: canShiftEnd(draft, END_STEP_MIN),
    onEarlier: () => shiftEnd(-END_STEP_MIN),
    onLater: () => shiftEnd(END_STEP_MIN),
    status: deadlineStatus(draft, draftEndMs, nowMs),
    endChanged: draft.endTime !== draft.baseEnd,
    originalEnd: draft.baseEnd,
    onCancel: cancelEdit,
    onSave: saveEdit,
  } : null;

  const taskDialog = editing && dialog && (
    <TaskDialog
      key={dialog.seq}
      dialog={dialog}
      catalog={catalog}
      onClose={() => setDialog(null)}
      onSubmit={(task) => {
        setDraft((d) => (dialog.mode === 'insert' ? insertTask(d, dialog.at, task) : updateTask(d, dialog.i, task)));
        setDialog(null);
      }}
      onRemove={() => { setDraft((d) => removeTask(d, dialog.i)); setDialog(null); }}
    />
  );

  if (isEditingDefaults) {
    return (
      <>{updateNotice}
      <div className="mx-auto max-w-6xl px-4 py-6">
        <DefaultRoutineEditor
          routines={routines}
          onSave={saveDefaults}
          onCancel={() => setIsEditingDefaults(false)}
        />
      </div>
      </>
    );
  }

  const badge = (dims) => (
    <ParentMenu
      {...dims}
      disabled={editing}
      onEdit={startEdit}
      onEditDefaults={() => setIsEditingDefaults(true)}
      deadlineStr={deadlineStr}
      setDeadlineStr={setDeadlineByHand}
      onSaveEndTime={() => saveCurrent({ ...routine, endTime: deadlineStr })}
      useDeadline={useDeadline}
      setUseDeadline={setUseDeadlineByHand}
    />
  );

  const shared = {
    v: view,
    closing,
    clock: hhmm(now),
    isMorning: routineId !== 'evening',
    onPick: setRoutineId,
    onJump,
    onToggleDone,
    onExtend,
    onReset: () => onJump(0),
    badge,
    edit,
    onEdit: startEdit,
    endLabel: hhmm(new Date(view.endMs)),
  };

  return <>
    {updateNotice}
    {saveError && <div role="alert" className="p-4">{saveError}</div>}
    {isPhone
      ? <RoutinePhone {...shared} />
      : <RoutineTV {...shared} startLabel={hhmm(new Date(view.startMs))} />}
    {taskDialog}
  </>;
}
