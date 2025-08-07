import React from 'react';

const RoutineSelector = ({ routines, onSelectRoutine }) => {
  if (!routines) {
    return <div>Loading routines...</div>;
  }

  const today = 'monday'; // We'll make this dynamic later

  return (
    <div className="flex justify-center space-x-4">
      {Object.keys(routines[today]).map(routineKey => (
        <button
          key={routineKey}
          onClick={() => onSelectRoutine(routines[today][routineKey])}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          {routines[today][routineKey].name}
        </button>
      ))}
    </div>
  );
};

export default RoutineSelector;
