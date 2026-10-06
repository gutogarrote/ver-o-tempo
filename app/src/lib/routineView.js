// View model for the "Fita" timeline (TV 1a / phone 2a).
// Pure: give it tasks + elapsed minutes (or a session plan), get back everything the UI renders.
import { MIN_MS, defaultPlan, markSeq } from './schedule';

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

const minutesOf = (t) => {
  const m = Number(t.minutes ?? t.duration ?? 0);
  return Number.isFinite(m) && m > 0 ? m : 0;
};

// startMin: routine start as minutes since midnight (for "às hh:mm" labels).
// Plain back-to-back schedule; kept for callers/tests that think in elapsed minutes.
export function buildRoutineView({ tasks, elapsed, startMin, closing }) {
  const total = tasks.reduce((s, t) => s + minutesOf(t), 0);
  const plan = defaultPlan(tasks, (startMin + total) * MIN_MS);
  return buildPlanView({
    tasks, plan, closing,
    nowMs: (startMin + Math.max(0, elapsed)) * MIN_MS,
    label: (ms) => hhmmFromMinutes(ms / MIN_MS),
  });
}

// View for a session plan (see lib/schedule). Each block carries three quantities:
//   minutes      — original configured minutes (also `start`, offset in original minutes);
//   planMinutes  — duration allocated in the current plan (grows/shrinks as tasks are
//                  marked done); `planStart` is its offset from the plan start, in minutes;
//   elapsed      — real progress, see `planElapsed` (minutes since the plan start).
// Block sizes on screen follow planMinutes/planStart, so the NOW line (planElapsed) moves
// on the real geometry. label(ms) formats a plan timestamp as "hh:mm".
export function buildPlanView({ tasks, plan, nowMs, closing, label }) {
  const total = tasks.reduce((s, t) => s + minutesOf(t), 0);
  const n = tasks.length;
  const t = n ? Math.max(nowMs, plan.segs[0].start) : nowMs;
  const overtime = n > 0 && nowMs >= plan.endMs;
  const over = (nowMs - plan.endMs) / MIN_MS;

  let acc = 0;
  let curIdx = -1;
  const blocks = tasks.map((task, i) => {
    const minutes = minutesOf(task);
    const start = acc;
    acc += minutes;
    const seg = plan.segs[i];
    const done = overtime || !!plan.done[i] || t >= seg.end;
    const isCurrent = !done && curIdx < 0;
    if (isCurrent) curIdx = i;
    const planMinutes = (seg.end - seg.start) / MIN_MS;
    return {
      ...task, minutes, start, done, isCurrent,
      state: done ? 'done' : isCurrent ? 'current' : 'future',
      startMs: seg.start, endMs: seg.end, planMinutes, markSeq: markSeq(plan, i),
      planStart: (seg.start - plan.segs[0].start) / MIN_MS,
      shownMinutes: done ? minutes : Math.round(planMinutes),
    };
  });
  // Everything finished before the deadline: free time until the closing.
  const allDone = n > 0 && !overtime && curIdx < 0;
  const task = blocks[curIdx];

  const current = overtime || allDone || !task
    ? (n ? { name: closing.name, icon: closing.icon, color: closing.color, start: total } : { name: '-', icon: '⏱️', color: '#999999', start: 0, minutes: 1 })
    : task;
  const remaining = overtime ? over : task ? (task.endMs - t) / MIN_MS : Math.max(0, (plan.endMs - t) / MIN_MS);
  const urgent = !!task && remaining <= 2;
  const frac = task ? Math.min(1, Math.max(0, (t - task.startMs) / Math.max(task.endMs - task.startMs, 1))) : 1;
  const currentPct = frac * 100;

  const nextUp = overtime ? [] : allDone
    ? [{ id: 'closing', name: closing.name, icon: closing.icon, color: closing.color, at: label(plan.endMs), shownMinutes: Math.max(0, Math.ceil((plan.endMs - t) / MIN_MS)) }]
    : blocks.slice(curIdx + 1).filter((b) => !b.done).slice(0, 2).map((b) => ({ ...b, at: label(b.startMs) }));

  const nowFrac = !total ? 0 : task ? (task.start + frac * task.minutes) / total : 1;

  return {
    total, overtime, over, urgent, allDone, blocks, current, currentPct, nextUp,
    // Now position along the task track, 0..1 (buffer excluded)
    nowFrac,
    elapsedOnTrack: nowFrac * total,
    // Real progress along the plan, in minutes since its start (0 before the start).
    planElapsed: n ? (t - plan.segs[0].start) / MIN_MS : 0,
    // Same, not clamped at the start (negative before it), and the deadline on that scale.
    nowElapsed: n ? (nowMs - plan.segs[0].start) / MIN_MS : 0,
    planEndMin: n ? (plan.endMs - plan.segs[0].start) / MIN_MS : 0,
    startMs: n ? plan.segs[0].start : plan.endMs,
    endMs: plan.endMs,
    countdown: overtime ? '+' + mmss(over) : mmss(remaining),
    countLabel: overtime ? 'DEPOIS DA HORA' : 'RESTANTES',
    leftLabel: overtime
      ? `JÁ PASSOU ${Math.ceil(over)} MIN DO HORÁRIO`
      : `FALTAM ${Math.ceil(Math.max(0, plan.endMs - t) / MIN_MS)} MIN PARA ACABAR`,
    statusText: overtime
      ? '🚦 Devíamos estar nessa etapa agora'
      : allDone
      ? '🎉 Tudo feito!'
      : urgent
      ? '⏰ Quase acabando — corre!'
      : task
      ? `Termina às ${label(task.endMs)}`
      : '',
    nextHeading: overtime ? 'FECHANDO O DIA' : 'A SEGUIR',
    closeSub: overtime ? 'estamos aqui' : closing.sub,
  };
}
