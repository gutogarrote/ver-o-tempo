import React, { useState } from 'react';

const EndTimeSetter = ({ defaultEndTime, onSetEndTime }) => {
  const [endTime, setEndTime] = useState(defaultEndTime);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSetEndTime(endTime);
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md text-center">
      <h2 className="text-xl font-semibold mb-4">Set Routine End Time</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="time"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
          className="border p-2 rounded text-2xl"
        />
        <button type="submit" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded ml-4">
          Start Routine
        </button>
      </form>
    </div>
  );
};

export default EndTimeSetter;
