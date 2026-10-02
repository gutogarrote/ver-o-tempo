import React, { useEffect, useMemo, useState } from 'react';
import RoutineTV from '../components/fita/RoutineTV';
import RoutinePhone from '../components/fita/RoutinePhone';
import ParentMenu from '../components/fita/ParentMenu';
import DefaultRoutineEditor from '../components/DefaultRoutineEditor';
import RoutineEditor from '../components/RoutineEditor';
import { computeElapsed, hhmm, sumMinutes, toToday } from '../lib/timeline';
import { serializeRoutineUrl } from '../lib/routineUrl';
import { DEFAULT_BUFFER_MIN, buildRoutineView, closingFor } from '../lib/routineView';

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

  // Reset when routine changes
  useEffect(() => {
    setUseDeadline(true);
    setDeadlineStr(routine.endTime || '23:59');
    // Default start time aligns with deadline - total
    const dl = toToday(routine.endTime || '23:59');
    const startsAt = new Date(dl.getTime() - totalMinutes * 60000);
    setStartTime(startsAt);
  }, [routineId, routine.endTime, totalMinutes]);

  const mode = useDeadline ? 'deadline' : 'start';
  const now = currentTime instanceof Date ? currentTime : new Date();

  const { elapsed, endsAt } = computeElapsed({ mode, startTime, deadline: toToday(deadlineStr), now, totalMinutes });

  const startsAt = new Date(endsAt.getTime() - totalMinutes * 60000);
  const closing = closingFor(routineId, routine);
  const bufferMin = routine.bufferMinutes ?? DEFAULT_BUFFER_MIN;
  const view = buildRoutineView({
    tasks,
    elapsed,
    startMin: startsAt.getHours() * 60 + startsAt.getMinutes() + startsAt.getSeconds() / 60,
    closing,
  });

  const isPhone = useIsPhone();

  // Edit states
  const [isEditingDefaults, setIsEditingDefaults] = useState(false);
  const [isEditingCurrent, setIsEditingCurrent] = useState(false);

  function onJump(i) {
    const minsBefore = tasks.slice(0, i).reduce((s, t) => s + (t.minutes ?? 0), 0);
    if (useDeadline) {
      const remaining = totalMinutes - minsBefore;
      const newDeadline = new Date(now.getTime() + remaining * 60000);
      const hh = String(newDeadline.getHours()).padStart(2, '0');
      const mm = String(newDeadline.getMinutes()).padStart(2, '0');
      setDeadlineStr(`${hh}:${mm}`);
    } else {
      const newStart = new Date(now.getTime() - minsBefore * 60000);
      setStartTime(newStart);
    }
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
      setDeadlineStr={setDeadlineStr}
      onSaveEndTime={() => saveCurrent({ ...routine, endTime: deadlineStr })}
      useDeadline={useDeadline}
      setUseDeadline={setUseDeadline}
    />
  );

  const shared = {
    v: view,
    closing,
    clock: hhmm(now),
    isMorning: routineId !== 'evening',
    onPick: setRoutineId,
    onJump,
    onReset: () => onJump(0),
    badge,
  };

  return <>
    {saveError && <div role="alert" className="p-4">{saveError}</div>}
    {isPhone
      ? <RoutinePhone {...shared} />
      : <RoutineTV {...shared} bufferMin={bufferMin} startLabel={hhmm(startsAt)} endLabel={hhmm(endsAt)} />}
  </>;
}
