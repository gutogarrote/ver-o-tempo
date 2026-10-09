import React, { useEffect, useMemo, useRef, useState } from 'react';
import RoutineTV from '../components/fita/RoutineTV';
import RoutinePhone from '../components/fita/RoutinePhone';
import ParentMenu from '../components/fita/ParentMenu';
import DefaultRoutineEditor from '../components/DefaultRoutineEditor';
import RoutineEditor from '../components/RoutineEditor';
import { OVERTIME_WINDOW_MIN, computeElapsed, hhmm, sumMinutes, toToday } from '../lib/timeline';
import { serializeRoutineUrl } from '../lib/routineUrl';
import { buildPlanView, closingFor } from '../lib/routineView';
import { MIN_MS, defaultPlan, extendDeadline, jumpTo, markSeq, restartPlan, toggleTaskDone } from '../lib/schedule';

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
  const plan = sessionLive ? session.plan : defaultPlan(tasks, endsAt.getTime());

  const closing = closingFor(routineId, routine);
  const view = buildPlanView({ tasks, plan, nowMs, closing, label: (ms) => hhmm(new Date(ms)) });

  const isPhone = useIsPhone();

  // Edit states
  const [isEditingDefaults, setIsEditingDefaults] = useState(false);
  const [isEditingCurrent, setIsEditingCurrent] = useState(false);

  function applyPlan(next) {
    if (next === plan) return;
    setSession({ routineId, tasks, plan: next });
    // Keep the parents' menu showing the deadline in effect.
    if (useDeadline && next.endMs !== plan.endMs) setDeadlineStr(hhmm(new Date(next.endMs)));
  }

  const onJump = (i) => applyPlan(jumpTo(plan, tasks, i, nowMs, { keepDeadline: useDeadline }));
  const onToggleDone = (i) => applyPlan(toggleTaskDone(plan, tasks, i, nowMs, { keepDeadline: useDeadline }));
  const onExtend = () => applyPlan(extendDeadline(plan, tasks, nowMs));

  // Parents changing the deadline/mode by hand (or saving the routine) start from a fresh
  // schedule for the new deadline, but tasks they marked done stay done, in the order they
  // were marked (restartPlan).
  const marks = new Map(plan.done.map((d, i) => (d ? [taskKey(tasks[i], i), markSeq(plan, i)] : null)).filter(Boolean));
  function restartFor(nextRoutineId, nextTasks, endMs) {
    if (!marks.size) return null;
    return { routineId: nextRoutineId, tasks: nextTasks, plan: restartPlan(nextTasks, endMs, nowMs, (t, i) => marks.get(taskKey(t, i))) };
  }
  const endFor = ({ deadline = deadlineStr, deadlineMode = useDeadline, start = startTime, total = totalMinutes } = {}) =>
    computeElapsed({ mode: deadlineMode ? 'deadline' : 'start', startTime: start, deadline: toToday(deadline), now, totalMinutes: total }).endsAt.getTime();
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
    setSession(restartFor(routineId, nextTasks, endMs));
  }

  const [saveError, setSaveError] = useState('');

  function persistRoutine(updated) {
    try {
      const saved = updated?.[todayKey]?.[routineId];
      const url = serializeRoutineUrl(window.location.href, routineId, saved?.tasks, saved?.endTime || '23:59');
      window.history.replaceState(window.history.state, '', url);
      setSaveError('');
    } catch (_) {
      setSaveError('Alterações salvas no aparelho, mas não foi possível atualizar o link. Confira nomes, tarefas, durações e horário nos limites do formato de URL.');
    }
    try {
      localStorage.setItem('routines', JSON.stringify(updated));
    } catch (_) {}
    keepMarksAfterSave(updated?.[todayKey]?.[routineId]);
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

  function saveCurrent(updatedRoutine) {
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
    persistRoutine(next);
    setIsEditingCurrent(false);
  }

  if (isEditingDefaults) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-6">
        <DefaultRoutineEditor
          routines={routines}
          onSave={saveDefaults}
          onCancel={() => setIsEditingDefaults(false)}
        />
      </div>
    );
  }

  if (isEditingCurrent) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="bg-white p-4 rounded-lg shadow-md">
          <RoutineEditor routine={routine} onSave={saveCurrent} />
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => setIsEditingCurrent(false)}
              className="px-4 py-2 rounded bg-gray-500 text-white hover:bg-gray-600"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    );
  }

  const badge = (dims) => (
    <ParentMenu
      {...dims}
      onEdit={() => setIsEditingCurrent(true)}
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
  };

  return <>
    {saveError && <div role="alert" className="p-4">{saveError}</div>}
    {isPhone
      ? <RoutinePhone {...shared} />
      : <RoutineTV {...shared} startLabel={hhmm(new Date(view.startMs))} endLabel={hhmm(new Date(view.endMs))} />}
  </>;
}
