import React from 'react';
import { formatTime } from '../lib/time';

export function Timeline({ 
  tasks, 
  totalMinutes, 
  currentIdx, 
  totalPct, 
  onJump, 
  deadlineStr, 
  setDeadlineStr, 
  useDeadline, 
  setUseDeadline, 
  startTime, 
  endsAt 
}) {
  if (!tasks || tasks.length === 0) return null;

  return (
    <section className="w-full px-3 md:px-6 pt-4">
      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">

        {/* Legend ABOVE */}
        <div className="mb-3 flex flex-wrap gap-3 text-xs justify-center">
          {tasks.map((t, i) => (
            <div key={i} className="flex items-center gap-2">
              <span 
                className="inline-block size-3 rounded" 
                style={{ backgroundColor: t.color }} 
              />
              <span className="text-slate-600">{t.icon} {t.name}</span>
            </div>
          ))}
        </div>

        {/* Header + deadline control */}
        <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
          <div className="text-slate-500 text-xs uppercase tracking-wide">Linha do tempo</div>
          <div className="flex items-center gap-2 text-xs">
            <label className="text-slate-600">Horário limite:</label>
            <input 
              type="time" 
              className="rounded-lg border border-slate-300 px-2 py-1 text-slate-700" 
              value={deadlineStr} 
              onChange={e => setDeadlineStr(e.target.value)} 
            />
            <label className="inline-flex items-center gap-1 text-slate-700">
              <input 
                type="checkbox" 
                checked={useDeadline} 
                onChange={e => setUseDeadline(e.target.checked)} 
              />
              Ativar
            </label>
          </div>
        </div>

        {/* Taller blocks; full-bleed width */}
        <div className="relative w-full overflow-hidden rounded-2xl">
          <div className="flex w-full">
            {tasks.map((t, i) => {
              const widthPct = ((t?.duration || 0) / totalMinutes) * 100;
              const isCurrent = i === currentIdx;
              return (
                <button
                  key={i}
                  onClick={() => onJump && onJump(i)}
                  className="relative flex-none h-40 md:h-48 focus:outline-none transition active:scale-[0.99] focus-visible:ring-4 focus-visible:ring-offset-2 focus-visible:ring-blue-500 hover:brightness-110"
                  style={{ width: `${widthPct}%`, backgroundColor: t?.color || '#gray' }}
                  title={`${t?.name || 'Task'} — ${t?.duration || 0} min`}
                  aria-label={`Pular para ${t?.name || 'Task'}`}
                >
                  <div className="absolute inset-0 p-2 md:p-4">
                    <div className="flex h-full w-full flex-col items-center justify-center text-white/95 drop-shadow-sm text-center">
                      <div className="text-2xl md:text-3xl leading-none mb-1">{t?.icon || '⭕'}</div>
                      <div className="w-full">
                        <div className="text-[11px] md:text-sm font-semibold leading-tight whitespace-normal break-words px-1">
                          {t?.name || 'Task'}
                        </div>
                        <div className="text-[10px] md:text-xs opacity-90 mt-1">{t?.duration || 0} min</div>
                      </div>
                    </div>
                  </div>
                  {isCurrent && <div className="absolute inset-0 ring-4 ring-white/70 pointer-events-none" />}
                </button>
              );
            })}
          </div>

          {/* Now marker */}
          <div 
            className="pointer-events-none absolute top-0 bottom-0 w-0.5 bg-white shadow [filter:drop-shadow(0_0_4px_rgba(0,0,0,0.4))]" 
            style={{ left: `${Math.min(totalPct * 100, 100)}%` }} 
          />
        </div>

        {/* Start/End labels */}
        <div className="mt-2 flex justify-between text-xs text-slate-500">
          <span>Início: {startTime ? formatTime(startTime) : '--:--'}</span>
          <span>Previsto: {endsAt ? formatTime(endsAt) : '--:--'}</span>
        </div>
      </div>
    </section>
  );
}


export default Timeline;
