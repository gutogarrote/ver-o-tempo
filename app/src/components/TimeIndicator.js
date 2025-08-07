import React from 'react';

const TimeIndicator = () => {
  return (
    <div
      className="absolute top-0 bottom-0 w-1 bg-red-500"
      style={{ left: '25%' }}
    >
      <div className="absolute -top-2 -left-2 w-4 h-4 bg-red-500 rounded-full"></div>
    </div>
  );
};

export default TimeIndicator;
