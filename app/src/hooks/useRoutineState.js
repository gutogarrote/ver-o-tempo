import { useState, useEffect } from 'react';
import { createDateFromTimeString } from '../lib/time';
import { computeElapsed, locateTask, jumpToTask } from '../lib/timeline';

export function useRoutineState(routine, currentTime) {
  const [mode, setMode] = useState('start'); // 'start' or 'deadline'
  const [deadlineStr, setDeadlineStr] = useState('21:00');
  const [useDeadline, setUseDeadline] = useState(false);
  const [startTime, setStartTime] = useState(new Date());
  const [isPlaying, setIsPlaying] = useState(true);

  const totalMinutes = routine?.tasks?.reduce((sum, task) => sum + (task?.duration || 0), 0) || 0;

  useEffect(() => {
    if (!routine) return;

    if (useDeadline) {
      setMode('deadline');
    } else {
      setMode('start');
      // Calculate start time based on total duration
      const now = new Date();
      const calculatedStartTime = new Date(now.getTime() - totalMinutes * 60000);
      setStartTime(calculatedStartTime);
    }
  }, [useDeadline, routine, totalMinutes]);

  useEffect(() => {
    if (routine?.endTime) {
      setDeadlineStr(routine.endTime);
    }
  }, [routine]);

  const deadline = createDateFromTimeString(deadlineStr, currentTime);
  
  // Use current time for calculations (pause functionality would need stored time)
  const effectiveTime = currentTime;
  
  const { elapsed, endsAt } = computeElapsed({
    mode: useDeadline ? 'deadline' : 'start',
    startTime,
    deadline,
    now: effectiveTime,
    totalMinutes
  });

  const currentTaskInfo = locateTask(elapsed, routine?.tasks || []);
  const totalPct = totalMinutes > 0 ? Math.min(elapsed / totalMinutes, 1) : 0;
  const currentPct = currentTaskInfo.inTaskElapsed / (routine?.tasks?.[currentTaskInfo.index]?.duration || 1);

  // Jump to task function
  const handleJumpToTask = (taskIndex) => {
    jumpToTask(
      taskIndex, 
      routine?.tasks || [], 
      useDeadline, 
      currentTime, 
      totalMinutes, 
      setStartTime, 
      setDeadlineStr
    );
    setIsPlaying(true); // Resume playing after jump
  };

  // Control functions
  const startNow = () => {
    setStartTime(new Date());
    setUseDeadline(false);
    setIsPlaying(true);
  };

  const startAtDefault = () => {
    if (routine?.endTime) {
      const defaultStart = new Date();
      const [endHour, endMinute] = routine.endTime.split(':').map(Number);
      defaultStart.setHours(endHour, endMinute, 0, 0);
      defaultStart.setTime(defaultStart.getTime() - totalMinutes * 60000);
      setStartTime(defaultStart);
      setUseDeadline(false);
      setIsPlaying(true);
    }
  };

  return {
    mode,
    deadlineStr,
    setDeadlineStr,
    useDeadline,
    setUseDeadline,
    startTime,
    endsAt,
    elapsed,
    totalPct,
    currentTaskInfo,
    currentPct,
    totalMinutes,
    isPlaying,
    setIsPlaying,
    handleJumpToTask,
    startNow,
    startAtDefault
  };
}