import React, { useEffect, useRef } from 'react';
import { C, FREDOKA, NUNITO, agoraColors, doneOverlay, hatch, statusStyle } from './theme';

const PX_PER_MIN = 11;
const FOLLOW_AT = 0.42; // keep NOW ~40% down the visible track
const MANUAL_HOLD_MS = 10000; // manual scroll pauses auto-follow for this long

function IconToggle({ on, onClick, label, children }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      aria-label={label}
      style={{
        width: 38, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 999,
        fontSize: 19, cursor: 'pointer', border: 0, padding: 0,
        ...(on ? { background: '#fff', boxShadow: '0 2px 0 rgba(0,0,0,.12)' } : { background: 'transparent', opacity: 0.45 }),
      }}
    >
      {children}
    </button>
  );
}

function TaskRow({ t, i, count, v, onJump, onToggleDone }) {
  const cur = t.isCurrent && !v.overtime;
  const radius = i === 0 ? '20px 20px 0 0' : i === count - 1 ? '0 0 20px 20px' : '0';
  // Row and completion dot are sibling buttons, so tapping the dot never starts the task.
  return (
    <div
      style={{
        position: 'relative', overflow: 'hidden', flex: 'none', height: t.minutes * PX_PER_MIN, width: '100%',
        background: t.color, borderRadius: radius,
        boxShadow: [`inset 0 -2px 0 ${C.bg}`, t.done && doneOverlay(0.68)].filter(Boolean).join(','),
        ...(cur ? { outline: '4px solid #fff', outlineOffset: -4, zIndex: 1 } : {}),
      }}
    >
      <button
        onClick={() => onJump(i)}
        aria-label={`Pular para ${t.name}`}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', background: 'transparent', border: 0, padding: 0, cursor: 'pointer', font: 'inherit', textAlign: 'left' }}
      >
        <div style={{ position: 'absolute', inset: '0 0 auto 0', height: `${t.isCurrent ? v.currentPct : 0}%`, background: 'rgba(0,0,0,.2)' }} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 9, height: '100%', padding: '0 46px 0 12px', boxSizing: 'border-box' }}>
          <div style={{ fontSize: cur ? 26 : 20, lineHeight: 1, flex: 'none', animation: cur ? 'bob 1.8s ease-in-out infinite' : 'none', opacity: t.done ? 0.55 : 1 }}>{t.icon}</div>
          <div style={{ flex: 1, minWidth: 0, font: `${cur ? 900 : 800} ${cur ? 18 : 16}px ${NUNITO}`, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: t.done ? C.doneInk : '#fff', textShadow: t.done ? 'none' : '0 1px 3px rgba(0,0,0,.35)' }}>{t.name}</div>
          <div style={{ font: `700 13px ${NUNITO}`, whiteSpace: 'nowrap', color: t.done ? 'rgba(58,48,38,.8)' : 'rgba(255,255,255,.9)' }}>{t.shownMinutes} min</div>
        </div>
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onToggleDone(i); }}
        aria-pressed={t.done}
        aria-label={t.done ? `${t.name}: feita (desmarcar)` : `Marcar ${t.name} como feita`}
        style={{
          position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', width: 26, height: 26, borderRadius: 999,
          padding: 0, cursor: 'pointer', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', font: `900 15px ${NUNITO}`,
          ...(t.done
            ? { background: '#fff', color: C.check, border: 0 }
            : { background: 'rgba(255,255,255,.18)', color: 'transparent', border: '3px solid rgba(255,255,255,.92)' }),
        }}
      >
        ✓
      </button>
    </div>
  );
}

export default function RoutinePhone({ v, closing, clock, isMorning, onPick, onJump, onToggleDone, onExtend, onReset, badge }) {
  const ot = v.overtime;
  const agora = agoraColors({ urgent: v.urgent, overtime: ot, color: v.current.color });
  const nowY = v.elapsedOnTrack * PX_PER_MIN;

  const trackRef = useRef(null);
  const manualUntil = useRef(0);
  const autoScrolling = useRef(false);

  // Auto-follow NOW unless the user scrolled recently.
  useEffect(() => {
    const el = trackRef.current;
    if (!el || Date.now() < manualUntil.current) return;
    const target = Math.max(0, Math.min(nowY - el.clientHeight * FOLLOW_AT, el.scrollHeight - el.clientHeight));
    if (Math.abs(el.scrollTop - target) > 1) {
      autoScrolling.current = true;
      el.scrollTop = target;
      requestAnimationFrame(() => { autoScrolling.current = false; });
    }
  });

  const onScroll = () => {
    if (!autoScrolling.current) manualUntil.current = Date.now() + MANUAL_HOLD_MS;
  };

  return (
    <div style={{ width: '100%', height: '100dvh', boxSizing: 'border-box', background: C.bg, color: C.ink, fontFamily: NUNITO, display: 'flex', flexDirection: 'column', padding: '16px 14px 14px', gap: 10 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          {badge({ size: 34, radius: 12, fontSize: 18, shadow: 3 })}
          <h1 style={{ margin: 0, fontFamily: FREDOKA, fontSize: 22, fontWeight: 600, whiteSpace: 'nowrap' }}>Rotina da Nina</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', gap: 3, background: C.toggleBg, padding: 3, borderRadius: 999 }}>
            <IconToggle on={isMorning} onClick={() => onPick('morning')} label="Manhã">☀️</IconToggle>
            <IconToggle on={!isMorning} onClick={() => onPick('evening')} label="Noite">🌙</IconToggle>
          </div>
          <div style={{ fontFamily: FREDOKA, fontSize: 26, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{clock}</div>
        </div>
      </div>

      {/* AGORA card */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9, background: agora.bg, border: `3px solid ${agora.border}`, borderRadius: 20, padding: '12px 13px', boxShadow: '0 4px 0 rgba(0,0,0,.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 54, height: 54, flex: 'none', borderRadius: 17, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, background: `${v.current.color}2e` }}>{v.current.icon}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ font: `900 11px ${NUNITO}`, letterSpacing: 2, color: C.muted }}>AGORA</div>
            <div style={{ fontFamily: FREDOKA, fontSize: 26, fontWeight: 600, lineHeight: 1.15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.current.name}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: FREDOKA, fontWeight: 600, fontSize: 34, lineHeight: 1.1, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', color: agora.count }}>{v.countdown}</div>
            <div style={{ font: `800 10px ${NUNITO}`, letterSpacing: 1.5, color: C.muted, whiteSpace: 'nowrap' }}>{v.countLabel}</div>
          </div>
        </div>
        <div style={{ alignSelf: 'flex-start', ...statusStyle({ urgent: v.urgent, overtime: ot }, { size: 14, pad: '4px 12px' }) }}>{v.statusText}</div>
        <div style={{ height: 14, borderRadius: 999, background: C.barBg, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${v.currentPct}%`, borderRadius: 999, background: agora.bar }} />
        </div>
      </div>

      {/* Scrolling vertical ribbon + pinned closing zone */}
      <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div ref={trackRef} onScroll={onScroll} className="no-scrollbar" style={{ position: 'relative', flex: 1, minHeight: 0, borderRadius: 20, background: C.track, overflowY: 'auto', overflowX: 'hidden' }}>
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', height: v.total * PX_PER_MIN }}>
            {v.blocks.map((t, i) => (
              <TaskRow key={t.id ?? i} t={t} i={i} count={v.blocks.length} v={v} onJump={onJump} onToggleDone={onToggleDone} />
            ))}
            {!ot && (
              <div style={{ position: 'absolute', zIndex: 3, left: 0, right: 0, top: nowY, height: 5, transform: 'translateY(-2px)', background: C.ink, borderRadius: 999, boxShadow: '0 0 0 2px rgba(255,246,233,.85)', pointerEvents: 'none' }} />
            )}
          </div>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, flex: 'none', boxSizing: 'border-box', borderRadius: 20, padding: '9px 11px', transition: 'background .4s',
          background: ot ? hatch(closing.color, 14) : 'transparent',
          border: `3px dashed ${ot ? '#fff' : 'rgba(154,134,107,.4)'}`,
        }}>
          <div style={{ fontSize: ot ? 32 : 24, lineHeight: 1, flex: 'none', animation: 'bob 2.6s ease-in-out infinite', opacity: ot ? 1 : 0.5 }}>{closing.icon}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ font: `900 ${ot ? 18 : 16}px/1.1 ${NUNITO}`, color: ot ? '#fff' : C.muted, textShadow: ot ? '0 1px 3px rgba(0,0,0,.3)' : 'none' }}>{closing.name}</div>
            <div style={{ font: `700 13px ${NUNITO}`, whiteSpace: 'nowrap', color: ot ? 'rgba(255,255,255,.95)' : C.muted }}>{v.closeSub}</div>
          </div>
          <button onClick={onExtend} aria-label={`Mais 5 minutos até ${closing.name}`} style={{ flex: 'none', background: '#fff', color: C.ink, padding: '6px 12px', borderRadius: 999, border: 0, font: `900 14px ${NUNITO}`, whiteSpace: 'nowrap', cursor: 'pointer', boxShadow: '0 2px 0 rgba(0,0,0,.18)' }}>+5 min</button>
          {ot && (
            <button onClick={onReset} style={{ flex: 'none', background: '#fff', color: C.ink, padding: '6px 12px', borderRadius: 999, border: 0, font: `900 14px ${NUNITO}`, whiteSpace: 'nowrap', cursor: 'pointer', boxShadow: '0 2px 0 rgba(0,0,0,.18)' }}>↺ Recomeçar</button>
          )}
        </div>
      </div>

    </div>
  );
}
