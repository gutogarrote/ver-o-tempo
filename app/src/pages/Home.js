import React, { useEffect, useMemo, useState } from 'react';
import RoutineTV from '../components/fita/RoutineTV';
import RoutinePhone from '../components/fita/RoutinePhone';
import ParentMenu from '../components/fita/ParentMenu';
import DefaultRoutineEditor from '../components/DefaultRoutineEditor';
import RoutineEditor from '../components/RoutineEditor';
import { OVERTIME_WINDOW_MIN, computeElapsed, hhmm, sumMinutes, toToday } from '../lib/timeline';
import { buildPlanView, closingFor } from '../lib/routineView';
import { MIN_MS, defaultPlan, extendDeadline, jumpTo, toggleTaskDone } from '../lib/schedule';

// Phones and portrait screens get the vertical ribbon (2a); landscape gets the TV stage (1a).
const PHONE_QUERY = '(max-width: 767px), (max-aspect-ratio: 1/1)';
const EMPTY_TASKS = [];

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

export default function Home({ routines, setRoutines, currentTime }) {
  // Map routines to morning/evening for today (using 'monday' as in current data)
  const todayKey = 'monday';
  const available = routines?.[todayKey] || {};

  const [routineId, setRoutineId] = useState('morning');
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

  // Reset when routine changes
  useEffect(() => {
    setSession(null);
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

  // Parents changing the deadline/mode by hand start from a clean schedule.
  const setDeadlineByHand = (v) => { setSession(null); setDeadlineStr(v); };
  const setUseDeadlineByHand = (v) => { setSession(null); setUseDeadline(v); };

  function saveDefaults(updated) {
    try {
      localStorage.setItem('routines', JSON.stringify(updated));
    } catch (_) {}
    setRoutines(updated);
    setIsEditingDefaults(false);
  }

  function saveCurrent(updatedRoutine) {
    const next = {
      ...routines,
      [todayKey]: {
        ...(routines?.[todayKey] || {}),
        [routineId]: updatedRoutine,
      },
    };
    try {
      localStorage.setItem('routines', JSON.stringify(next));
    } catch (_) {}
    setRoutines(next);
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

  return isPhone
    ? <RoutinePhone {...shared} />
    : <RoutineTV {...shared} startLabel={hhmm(new Date(view.startMs))} endLabel={hhmm(new Date(view.endMs))} />;
}
