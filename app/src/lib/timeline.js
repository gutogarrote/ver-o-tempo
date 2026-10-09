// Pure helpers for time/timeline math (minutes-based)

export function sumMinutes(tasks) {
  return tasks.reduce((s, t) => s + (t.minutes ?? t.duration ?? 0), 0);
}

// How long after the deadline we keep showing the routine as "overtime"
// (closing zone lit, counting up) before rolling over to the next occurrence.
export const OVERTIME_WINDOW_MIN = 180;

// Compute elapsed minutes and routine end time based on mode.
// Elapsed can exceed totalMinutes (overtime) — callers decide how to show it.
export function computeElapsed({ mode, startTime, deadline, now, totalMinutes, overtimeWindow = OVERTIME_WINDOW_MIN }) {
  const nowMs = now.getTime();
  if (mode === 'deadline') {
    const dl = new Date(deadline.getTime());
    // Past the deadline but still inside the overtime window → keep today's deadline.
    if (nowMs - dl.getTime() > overtimeWindow * 60000) dl.setDate(dl.getDate() + 1);
    const remaining = Math.min(totalMinutes, (dl.getTime() - nowMs) / 60000);
    return { elapsed: totalMinutes - remaining, endsAt: dl };
  }
  const elapsed = Math.max(0, (nowMs - startTime.getTime()) / 60000);
  const endsAt = new Date(startTime.getTime() + totalMinutes * 60000);
  return { elapsed, endsAt };
}

export function toToday(hhmmStr) {
  const [h, m] = String(hhmmStr || '00:00').split(':').map(Number);
  const d = new Date();
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}

export function hhmm(date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

