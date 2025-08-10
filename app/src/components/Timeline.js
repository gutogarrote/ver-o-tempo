import React from 'react';
import TimeIndicator from './TimeIndicator';

const Timeline = ({ routine, endTime, currentTime }) => {
  const totalDuration = routine.tasks.reduce((sum, task) => sum + task.duration, 0);

  const routineEndTime = new Date();
  const [endHour, endMinute] = endTime.split(':').map(Number);
  routineEndTime.setHours(endHour, endMinute, 0, 0);

  const routineStartTime = new Date(routineEndTime.getTime() - totalDuration * 60 * 1000);

  const timeElapsed = (currentTime - routineStartTime) / 1000 / 60; // in minutes
  const percentageElapsed = (timeElapsed / totalDuration) * 100;

  return (
    <div className="relative w-full h-24 bg-gray-200 rounded-lg overflow-hidden">
      <div
        className="absolute top-0 left-0 h-full flex"
        style={{ transform: `translateX(-${percentageElapsed}%)` }}
      >
        {routine.tasks.map(task => (
          <div
            key={task.id}
            className="h-full flex items-center justify-center"
            style={{
              width: `${(task.duration / totalDuration) * 100}vw`,
              backgroundColor: task.color,
            }}
          >
            <span className="text-white font-bold text-sm">{task.icon} {task.name}</span>
          </div>
        ))}
      </div>
      <TimeIndicator />
    </div>
  );
};


export default Timeline;
