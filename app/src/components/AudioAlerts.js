import React, { useEffect, useRef } from 'react';

const AudioAlerts = ({ routine, currentTime }) => {
  const audioRef = useRef(null);

  const playSound = (soundFile) => {
    if (audioRef.current) {
      audioRef.current.src = soundFile;
      audioRef.current.play();
    }
  };

  useEffect(() => {
    if (!routine) return;

    const routineEndTime = new Date();
    const [endHour, endMinute] = routine.endTime.split(':').map(Number);
    routineEndTime.setHours(endHour, endMinute, 0, 0);

    let accumulatedDuration = 0;
    for (const task of routine.tasks) {
      const taskEndTime = new Date(routineEndTime.getTime() - accumulatedDuration * 60 * 1000);
      const taskStartTime = new Date(taskEndTime.getTime() - task.minutes * 60 * 1000);

      const fiveMinutesBeforeEnd = new Date(taskEndTime.getTime() - 5 * 60 * 1000);
      const oneMinuteBeforeEnd = new Date(taskEndTime.getTime() - 1 * 60 * 1000);

      if (task.minutes > 10) {
        if (currentTime.getTime() > fiveMinutesBeforeEnd.getTime() && currentTime.getTime() < fiveMinutesBeforeEnd.getTime() + 1000) {
          playSound('/sounds/5-minutes-remaining.mp3');
        }
      }

      if (currentTime.getTime() > oneMinuteBeforeEnd.getTime() && currentTime.getTime() < oneMinuteBeforeEnd.getTime() + 1000) {
        playSound('/sounds/1-minute-remaining.mp3');
      }

      if (currentTime.getTime() > taskEndTime.getTime() && currentTime.getTime() < taskEndTime.getTime() + 1000) {
        playSound('/sounds/task-complete.mp3');
      }

      accumulatedDuration += task.minutes;
    }
  }, [routine, currentTime]);

  return <audio ref={audioRef} />;
};

export default AudioAlerts;
