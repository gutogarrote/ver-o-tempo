// Timeline calculation helpers

export function locateTask(elapsedMinutes, tasks) {
  if (!tasks || tasks.length === 0) {
    return { index: 0, inTaskElapsed: 0, clampedElapsed: 0, total: 0 };
  }
  
  let acc = 0;
  const total = tasks.reduce((s, t) => s + (t?.minutes || 0), 0);
  const clamp = Math.min(Math.max(0, elapsedMinutes), total);
  
  for (let i = 0; i < tasks.length; i++) {
    const d = tasks[i]?.minutes || 0;
    if (clamp < acc + d) {
      return { 
        index: i, 
        inTaskElapsed: clamp - acc, 
        clampedElapsed: clamp, 
        total 
      };
    }
    acc += d;
  }
  
  const last = Math.max(0, tasks.length - 1);
  return { 
    index: last, 
    inTaskElapsed: tasks[last]?.minutes || 0, 
    clampedElapsed: total, 
    total 
  };
}

export function jumpToTask(taskIndex, tasks, useDeadline, now, totalMinutes, setStartTime, setDeadlineStr) {
  if (!tasks || tasks.length === 0) return;
  
  const minsBefore = tasks.slice(0, taskIndex).reduce((s, t) => s + (t?.minutes || 0), 0);
  
  if (useDeadline) {
    // In deadline mode: adjust deadline so routine ends at correct time
    const dl = new Date(now.getTime() + (totalMinutes - minsBefore) * 60000);
    setDeadlineStr(dl.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    }));
  } else {
    // In start mode: adjust start time to begin from target task
    const newStartTime = new Date(now.getTime() - minsBefore * 60000);
    setStartTime(newStartTime);
  }
}

export function computeElapsed({ mode, startTime, deadline, now, totalMinutes }) {
  if (mode === "deadline") {
    // If deadline < now, treat as tomorrow
    const dl = new Date(deadline);
    if (dl < now) dl.setDate(dl.getDate() + 1);
    const remaining = Math.max(0, Math.min(totalMinutes, (dl.getTime() - now.getTime()) / 60000));
    return { elapsed: totalMinutes - remaining, endsAt: dl };
  } else {
    const elapsed = Math.max(0, (now.getTime() - startTime.getTime()) / 60000);
    const endsAt = new Date(startTime.getTime() + totalMinutes * 60000);
    return { elapsed, endsAt };
  }
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}