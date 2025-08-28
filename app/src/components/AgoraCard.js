import React from 'react';
import { formatTime } from '../lib/time';

export function AgoraCard({ 
  current, 
  currentPct, 
  endsAt, 
  inTaskRemaining, 
  isPlaying, 
  setIsPlaying, 
  startNow, 
  startAtDefault, 
  totalPct,
  currentTime 
}) {
  if (!current) return null;

  // Removed unused variables for mobile-responsive design

  return (
    <section className="mt-6 px-4">
      <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div 
            className="size-20 md:size-24 rounded-2xl flex items-center justify-center text-4xl md:text-5xl flex-shrink-0"
            style={{ backgroundColor: (current?.color || '#gray') + "22" }}
          >
            <span>{current?.icon || '⭕'}</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-slate-500 text-xs uppercase tracking-wide">Agora</div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold leading-tight text-gray-800 break-words">{current?.name || 'Task'}</h2>
            <div className="mt-1 text-base md:text-sm text-slate-600">
              Faltam <span className="font-semibold text-lg md:text-base">{Math.ceil(inTaskRemaining)} min</span> desta tarefa
            </div>
          </div>
        </div>

        <div className="mt-4">
          <div className="mx-auto" style={{ maxWidth: "100%" }}>
            <div 
              className="w-full rounded-full bg-slate-100 overflow-hidden" 
              style={{ height: "40px" }}
            >
              <div 
                className="h-full rounded-full transition-all duration-1000" 
                style={{ 
                  width: `${Math.min(currentPct * 100, 100)}%`, 
                  backgroundColor: current?.color || '#gray'
                }} 
              />
            </div>
          </div>
          <div className="mt-3 flex flex-col sm:flex-row sm:justify-between gap-2 text-sm sm:text-xs text-slate-500">
            <span>Agora: <span className="font-medium">{formatTime(currentTime)}</span></span>
            <span>Rotina termina: <span className="font-medium">{formatTime(endsAt)}</span></span>
          </div>
        </div>

        {/* Control buttons */}
        <div className="mt-5 space-y-3">
          {/* Mobile: Stack buttons vertically */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-2">
            <button 
              onClick={() => setIsPlaying(!isPlaying)} 
              className="min-h-[44px] flex-1 sm:flex-none rounded-lg px-6 py-3 text-base sm:text-sm font-semibold shadow bg-slate-900 text-white hover:bg-slate-800 transition touch-manipulation"
            >
              {isPlaying ? "⏸️ Pausar" : "▶️ Retomar"}
            </button>
            <button 
              onClick={startNow} 
              className="min-h-[44px] flex-1 sm:flex-none rounded-lg px-6 py-3 text-base sm:text-sm font-semibold bg-white border border-slate-200 hover:bg-slate-50 transition touch-manipulation"
            >
              🕐 Começar agora
            </button>
            {startAtDefault && (
              <button 
                onClick={startAtDefault} 
                className="min-h-[44px] flex-1 sm:flex-none rounded-lg px-6 py-3 text-base sm:text-sm font-semibold bg-white border border-slate-200 hover:bg-slate-50 transition touch-manipulation"
              >
                📅 Começar no horário
              </button>
            )}
          </div>
          
          {/* Progress indicator */}
          <div className="text-center sm:text-right text-base sm:text-sm text-slate-600">
            Progresso total: <span className="font-semibold text-lg sm:text-base">{Math.round(totalPct * 100)}%</span>
          </div>
        </div>
      </div>
    </section>
  );
}

export default AgoraCard;