// View model for the "Fita" timeline (TV 1a / phone 2a).
// Pure: give it tasks + elapsed minutes, get back everything the UI renders.

export const DEFAULT_BUFFER_MIN = 25;

// What "the end of the routine" looks like. Routines may override with a `closing` object.
const CLOSINGS = {
  morning: {
    name: 'Hora de sair', icon: '🚗', color: '#ef4444', sub: 'porta pra fora',
    title: 'É hora de estar saindo pra escola',
    note: 'Se ainda falta algo, pega no caminho — o importante é já estar indo.',
  },
  evening: {
    name: 'Hora de dormir', icon: '🛏️', color: '#60a5fa', sub: 'luz apagada',
    title: 'É hora de estar dormindo',
    note: 'Se ainda está de pé, é só deitar e apagar a luz. Sem pressa, sem susto.',
  },
};

export function closingFor(routineId, routine) {
  return { ...(CLOSINGS[routineId] || CLOSINGS.morning), ...(routine?.closing || {}) };
}

export function hhmmFromMinutes(mins) {
  const m = ((Math.round(mins) % 1440) + 1440) % 1440;
  return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
}

// 3.5 → "3:30"
export function mmss(v) {
  const secs = Math.floor(Math.max(0, v) * 60);
  return Math.floor(secs / 60) + ':' + String(secs % 60).padStart(2, '0');
}

const minutesOf = (t) => t.minutes ?? t.duration ?? 0;

// startMin: routine start as minutes since midnight (for "às hh:mm" labels).
export function buildRoutineView({ tasks, elapsed, startMin, closing }) {
  const total = tasks.reduce((s, t) => s + minutesOf(t), 0);
  const e = Math.max(0, elapsed);
  const overtime = tasks.length > 0 && e >= total;
  const over = e - total;

  let acc = 0;
  let curIdx = 0;
  const blocks = tasks.map((t, i) => {
    const minutes = minutesOf(t);
    const start = acc;
    acc += minutes;
    const state = e >= acc ? 'done' : e >= start ? 'current' : 'future';
    if (state === 'current') curIdx = i;
    return { ...t, minutes, start, state, done: state === 'done', isCurrent: state === 'current' };
  });
  if (overtime) curIdx = Math.max(0, tasks.length - 1);

  const task = blocks[curIdx] || { name: '-', icon: '⏱️', color: '#999999', start: 0, minutes: 1 };
  const current = overtime
    ? { name: closing.name, icon: closing.icon, color: closing.color, start: total }
    : task;
  const remaining = overtime ? over : task.start + task.minutes - e;
  const urgent = !overtime && remaining <= 2;
  const currentPct = overtime ? 100 : ((e - task.start) / Math.max(task.minutes, 0.001)) * 100;

  const nextUp = overtime ? [] : blocks.slice(curIdx + 1, curIdx + 3).map((t) => ({
    ...t, at: hhmmFromMinutes(startMin + t.start),
  }));

  return {
    total, overtime, over, urgent, blocks, current, currentPct, nextUp,
    // Now position along the task track, 0..1 (buffer excluded)
    nowFrac: total ? Math.min(e / total, 1) : 0,
    elapsedOnTrack: Math.min(e, total),
    countdown: overtime ? '+' + mmss(over) : mmss(remaining),
    countLabel: overtime ? 'DEPOIS DA HORA' : 'RESTANTES',
    leftLabel: overtime
      ? `JÁ PASSOU ${Math.ceil(over)} MIN DO HORÁRIO`
      : `FALTAM ${Math.ceil(total - e)} MIN PARA ACABAR`,
    statusText: overtime
      ? '🚦 Devíamos estar nessa etapa agora'
      : urgent
      ? '⏰ Quase acabando — corre!'
      : `Termina às ${hhmmFromMinutes(startMin + task.start + task.minutes)}`,
    nextHeading: overtime ? 'FECHANDO O DIA' : 'A SEGUIR',
    closeSub: overtime ? 'estamos aqui' : closing.sub,
  };
}
