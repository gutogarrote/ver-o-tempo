import React from 'react';
import { clamp } from '../lib/timeline';
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

  const widthScale = clamp((current?.duration || 5) / 5, 1, 4); // 5→1×, 20→4×
  const barBasePx = 220; // px for 5 min
  const barWidthPx = Math.round(barBasePx * widthScale);
  const barHeightPx = 30; // fixed height

  return (
    <section className="mt-6 px-4">
      <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div 
            className="size-16 md:size-20 rounded-2xl flex items-center justify-center text-3xl md:text-4xl"
            style={{ backgroundColor: (current?.color || '#gray') + "22" }}
          >
            <span>{current?.icon || '⭕'}</span>
          </div>
          <div className="min-w-0">
            <div className="text-slate-500 text-xs uppercase tracking-wide">Agora</div>
            <h2 className="text-2xl md:text-3xl font-bold leading-tight text-gray-800">{current?.name || 'Task'}</h2>
            <div className="mt-1 text-sm text-slate-600">
              Faltam <span className="font-semibold">{Math.ceil(inTaskRemaining)} min</span> desta tarefa
            </div>
          </div>
        </div>

        <div className="mt-4">
          <div className="mx-auto" style={{ width: barWidthPx + "px", maxWidth: "100%" }}>
            <div 
              className="w-full rounded-full bg-slate-100 overflow-hidden" 
              style={{ height: `${barHeightPx}px` }}
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
          <div className="mt-2 flex justify-between text-xs text-slate-500">
            <span>Agora: {formatTime(currentTime)}</span>
            <span>Rotina termina: {formatTime(endsAt)}</span>
          </div>
        </div>

        {/* Control buttons */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button 
            onClick={() => setIsPlaying(!isPlaying)} 
            className="rounded-full px-4 py-2 text-sm font-semibold shadow bg-slate-900 text-white hover:bg-slate-800 transition"
          >
            {isPlaying ? "Pausar" : "Retomar"}
          </button>
          <button 
            onClick={startNow} 
            className="rounded-full px-4 py-2 text-sm font-semibold bg-white border border-slate-200 hover:bg-slate-50 transition"
          >
            Começar agora
          </button>
          {startAtDefault && (
            <button 
              onClick={startAtDefault} 
              className="rounded-full px-4 py-2 text-sm font-semibold bg-white border border-slate-200 hover:bg-slate-50 transition"
            >
              Começar no horário
            </button>
          )}
          <div className="ml-auto text-sm text-slate-600">
            Progresso total: <span className="font-semibold">{Math.round(totalPct * 100)}%</span>
          </div>
        </div>
      </div>
    </section>
  );
}

export default AgoraCard;