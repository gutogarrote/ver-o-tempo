import React from 'react';

const TimeIndicator = ({ currentPercentage, currentTime, routineStartTime }) => {
  // Format current time for display
  const formatTime = (date) => {
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div
      className="absolute top-0 bottom-0 z-20 flex flex-col items-center"
      style={{ left: `${currentPercentage}%`, transform: 'translateX(-50%)' }}
    >
      {/* Current time display - highly visible, centered, no shadow */}
      <div 
        className="absolute -top-16 sm:-top-20 bg-slate-800 text-white px-3 py-1 sm:px-4 sm:py-2 rounded-lg font-mono text-sm sm:text-base md:text-lg font-bold z-30"
        style={{ 
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'linear-gradient(135deg, #1e293b 0%, #334155 50%, #475569 100%)',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}
      >
        {formatTime(currentTime)}
      </div>

      {/* Glowing arrow/triangle marker - same gray gradient as line */}
      <div 
        className="w-0 h-0 border-l-6 border-r-6 border-b-6 border-transparent"
        style={{ 
          borderBottomColor: '#475569',
          filter: `
            drop-shadow(0 0 20px rgba(30, 41, 59, 0.8)) 
            drop-shadow(0 0 40px rgba(30, 41, 59, 0.6))
            drop-shadow(0 4px 12px rgba(0, 0, 0, 0.4))
          `,
          borderLeftWidth: '8px',
          borderRightWidth: '8px',
          borderBottomWidth: '10px'
        }}
      ></div>
      
      {/* Enhanced glowing vertical line with extreme depth */}
      <div 
        className="w-1 h-full relative"
        style={{ 
          background: 'linear-gradient(to bottom, #1e293b 0%, #334155 50%, #475569 100%)',
          boxShadow: `
            0 0 20px rgba(30, 41, 59, 0.8),
            0 0 40px rgba(30, 41, 59, 0.6),
            0 0 60px rgba(30, 41, 59, 0.4),
            inset 0 0 10px rgba(255, 255, 255, 0.1),
            0 8px 32px rgba(0, 0, 0, 0.6)
          `,
          borderRadius: '2px'
        }}
      >
        {/* Inner glow effect */}
        <div 
          className="absolute inset-0 w-full h-full"
          style={{
            background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.2) 0%, transparent 50%, rgba(255, 255, 255, 0.1) 100%)',
            borderRadius: '2px'
          }}
        ></div>
      </div>
      
      {/* Enhanced AGORA label - centered */}
      <div 
        className="absolute -bottom-8 text-xs sm:text-sm font-bold text-slate-800 bg-white px-2 py-1 rounded-lg shadow-2xl border"
        style={{ 
          left: '50%',
          transform: 'translateX(-50%)',
          boxShadow: '0 8px 25px rgba(0, 0, 0, 0.3), 0 0 15px rgba(30, 41, 59, 0.2)',
          background: 'linear-gradient(135deg, #ffffff, #f8fafc)',
          border: '1px solid rgba(30, 41, 59, 0.1)'
        }}
      >
        AGORA
      </div>
    </div>
  );
};

export default TimeIndicator;
