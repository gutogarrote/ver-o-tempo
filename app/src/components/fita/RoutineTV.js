import React, { useEffect, useRef, useState } from 'react';
import { C, FREDOKA, NUNITO, agoraColors, doneOverlay, hatch, statusStyle } from './theme';
import { layoutForWindow, planSpans, positionOnTrack } from '../../lib/trackLayout';

const STAGE_W = 1440;
const STAGE_H = 810;
const PAD_X = 30;
const CLOSE_W = 148;
const RIBBON_GAP = 5;
const RIBBON_H = 300;
// The stage never changes size (it is scaled as a whole), so the ribbon width is fixed.
export const RIBBON_W = STAGE_W - 2 * PAD_X - CLOSE_W - RIBBON_GAP;
export const DOT = 40;
const DOT_INSET = 14;
// Narrowest block: room for the completion dot plus a margin on each side.
export const MIN_BLOCK_W = DOT + 16;
// Minutes shown across the visible ribbon (~31 px/min: a 10-min block is ~307 px, wide
// enough for icon + name at the TV font sizes). Longer plans scroll to the right; shorter
// ones are stretched to fill the ribbon as before. Adjust here if legibility asks for it.
export const WINDOW_MIN = 40;
const FOLLOW_AT = 0.25; // keep NOW ~25% from the left edge of the visible ribbon
const MANUAL_HOLD_MS = 10000; // manual scroll pauses auto-follow for this long
const FLAG_GAP = 8; // time label sits this far to the side of the NOW line
const FLAG_FLIP = 110; // closer than this to the end of the track: label goes on the left

// Scale the fixed 1440×810 stage to fit any TV / window, letterboxed.
function useStageScale() {
  const calc = () => Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H);
  const [scale, setScale] = useState(calc);
  useEffect(() => {
    const onResize = () => setScale(calc());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return scale;
}

// The time label of the NOW line lives at the top of the ribbon; completion dots live at the
// bottom of the blocks (DOT_INSET from the bottom edge), so the two never meet wherever NOW is.
export const FLAG_TOP = 10;
const flag = {
  position: 'absolute', top: FLAG_TOP, background: C.ink, color: '#fff',
  padding: '7px 16px', borderRadius: 999, font: `900 20px ${NUNITO}`, whiteSpace: 'nowrap',
  boxShadow: `0 0 0 4px ${C.bg}`, zIndex: 2,
};

function Pill({ on, onClick, children }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      style={{
        padding: '10px 26px', borderRadius: 999, whiteSpace: 'nowrap', border: 0, cursor: 'pointer',
        ...(on
          ? { background: '#fff', color: C.ink, font: `600 24px ${FREDOKA}`, boxShadow: '0 3px 0 rgba(0,0,0,.1)' }
          : { background: 'transparent', color: C.muted, font: `500 24px ${FREDOKA}` }),
      }}
    >
      {children}
    </button>
  );
}

function TaskBlock({ t, i, count, v, width, onJump, onToggleDone }) {
  const ring = t.isCurrent && !v.overtime;
  const radius = i === 0 ? '30px 0 0 30px' : i === count - 1 ? '0 30px 30px 0' : '0';
  const narrow = width < 100;
  // The block and its completion dot are sibling buttons (no nested buttons), so tapping
  // the dot never starts the task.
  return (
    <div
      data-testid="tv-block"
      style={{
        position: 'relative', overflow: 'hidden', flex: 'none', width,
        background: t.color, borderRadius: radius,
        boxShadow: [`inset -3px 0 0 ${C.bg}`, t.done && doneOverlay(0.62), ring && 'inset 0 0 0 7px #fff'].filter(Boolean).join(','),
        transition: 'box-shadow .3s',
      }}
    >
      <button
        onClick={() => onJump(i)}
        aria-label={`Pular para ${t.name}`}
        title={`${t.name} — ${t.shownMinutes} min`}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', background: 'transparent', border: 0, padding: 0, cursor: 'pointer', font: 'inherit' }}
      >
        <div style={{ position: 'absolute', inset: '0 auto 0 0', width: `${t.isCurrent ? v.currentPct : 0}%`, background: 'rgba(0,0,0,.22)' }} />
        <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 7, padding: 8, textAlign: 'center', boxSizing: 'border-box' }}>
          <div style={{ fontSize: t.isCurrent ? 62 : 44, lineHeight: 1, animation: t.isCurrent ? 'bob 1.8s ease-in-out infinite' : 'none', opacity: t.done ? 0.5 : 1 }}>{t.icon}</div>
          <div style={{ font: `900 ${width < 90 ? 18 : 21}px/1.12 ${NUNITO}`, color: t.done ? C.doneInk : '#fff', textShadow: t.done ? 'none' : '0 2px 5px rgba(0,0,0,.3)' }}>{t.name}</div>
          <div style={{ font: `700 17px ${NUNITO}`, whiteSpace: 'nowrap', color: t.done ? 'rgba(58,48,38,.8)' : 'rgba(255,255,255,.92)' }}>{t.shownMinutes} min</div>
        </div>
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onToggleDone(i); }}
        aria-pressed={t.done}
        aria-label={t.done ? `${t.name}: feita (desmarcar)` : `Marcar ${t.name} como feita`}
        title={t.done ? 'Feita' : 'Marcar como feita'}
        style={{
          // zIndex: painted over the NOW line, which may cross the dot.
          position: 'absolute', zIndex: 3, bottom: DOT_INSET, right: narrow ? '50%' : DOT_INSET, transform: narrow ? 'translateX(50%)' : 'none',
          width: DOT, height: DOT, borderRadius: 999, padding: 0, cursor: 'pointer', boxSizing: 'border-box',
          display: 'flex', alignItems: 'center', justifyContent: 'center', font: `900 ${DOT * 0.6}px ${NUNITO}`,
          ...(t.done
            ? { background: '#fff', color: C.check, border: 0, boxShadow: '0 3px 0 rgba(0,0,0,.15)' }
            : { background: 'rgba(255,255,255,.18)', color: 'transparent', border: '4px solid rgba(255,255,255,.92)' }),
        }}
      >
        ✓
      </button>
    </div>
  );
}

// Horizontal scroll of the ribbon: follows NOW (kept FOLLOW_AT from the left, so what is
// left of the routine shows on the right) unless the user scrolled by hand recently.
// The mouse wheel scrolls it sideways. Returns [ref, onScroll, onWheel, more] where more
// tells which sides have hidden blocks.
function useRibbonScroll(nowX) {
  const ref = useRef(null);
  const manualUntil = useRef(0);
  const auto = useRef(false);
  const [more, setMore] = useState({ left: false, right: false });
  const measure = () => {
    const el = ref.current;
    if (!el) return;
    const next = { left: el.scrollLeft > 1, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 1 };
    setMore((m) => (m.left === next.left && m.right === next.right ? m : next));
  };
  useEffect(() => {
    const el = ref.current;
    if (el && Date.now() >= manualUntil.current) {
      const target = Math.max(0, Math.min(nowX - el.clientWidth * FOLLOW_AT, el.scrollWidth - el.clientWidth));
      if (Math.abs(el.scrollLeft - target) > 1) {
        auto.current = true;
        el.scrollLeft = target;
        requestAnimationFrame(() => { auto.current = false; });
      }
    }
    measure();
  });
  const onScroll = () => {
    if (!auto.current) manualUntil.current = Date.now() + MANUAL_HOLD_MS;
    measure();
  };
  const onWheel = (e) => {
    const el = ref.current;
    if (el && Math.abs(e.deltaY) > Math.abs(e.deltaX)) el.scrollLeft += e.deltaY;
  };
  return [ref, onScroll, onWheel, more];
}

const fade = (side) => ({
  position: 'absolute', top: 0, bottom: 0, [side]: 0, width: 36, zIndex: 5, pointerEvents: 'none',
  borderRadius: side === 'left' ? '30px 0 0 30px' : '0 30px 30px 0',
  background: `linear-gradient(to ${side === 'left' ? 'right' : 'left'}, ${C.bg}, rgba(255,246,233,0))`,
  display: 'flex', alignItems: 'center', justifyContent: side === 'left' ? 'flex-start' : 'flex-end',
  padding: '0 6px', boxSizing: 'border-box', font: `900 34px ${NUNITO}`, color: C.ink,
});

export default function RoutineTV({ v, closing, clock, startLabel, endLabel, isMorning, onPick, onJump, onToggleDone, onExtend, onReset, badge }) {
  const scale = useStageScale();
  const ot = v.overtime;
  const agora = agoraColors({ urgent: v.urgent, overtime: ot, color: v.current.color });
  // Blocks follow the PLANNED minutes, on a 40-min window (see WINDOW_MIN).
  const layout = layoutForWindow(v.blocks.map((b) => b.planMinutes), { length: RIBBON_W, windowMin: WINDOW_MIN, minSize: MIN_BLOCK_W });
  const nowX = positionOnTrack(layout, planSpans(v.blocks), v.planElapsed);
  const [trackRef, onTrackScroll, onTrackWheel, more] = useRibbonScroll(nowX);
  const flagLeft = nowX > layout.total - FLAG_FLIP;

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: STAGE_W * scale, height: STAGE_H * scale, flex: 'none' }}>
        <div style={{ width: STAGE_W, height: STAGE_H, transform: `scale(${scale})`, transformOrigin: '0 0', boxSizing: 'border-box', background: C.bg, color: C.ink, fontFamily: NUNITO, display: 'flex', flexDirection: 'column', padding: `26px ${PAD_X}px`, gap: 16 }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              {badge({ size: 58, radius: 20, fontSize: 30, shadow: 4 })}
              <h1 style={{ margin: 0, fontFamily: FREDOKA, fontSize: 42, fontWeight: 600, letterSpacing: -0.5, whiteSpace: 'nowrap' }}>Rotina da Nina</h1>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
              <div style={{ display: 'flex', gap: 6, background: C.toggleBg, padding: 6, borderRadius: 999 }}>
                <Pill on={isMorning} onClick={() => onPick('morning')}>☀️ Manhã</Pill>
                <Pill on={!isMorning} onClick={() => onPick('evening')}>🌙 Noite</Pill>
              </div>
              <div style={{ fontFamily: FREDOKA, fontSize: 46, fontWeight: 600, fontVariantNumeric: 'tabular-nums', letterSpacing: -1 }}>{clock}</div>
            </div>
          </div>

          {/* Start / remaining / end */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', font: `800 17px ${NUNITO}`, color: C.muted, letterSpacing: 1.5, whiteSpace: 'nowrap' }}>
            <span>COMEÇOU {startLabel}</span><span>{v.leftLabel}</span><span>TERMINA {endLabel}</span>
          </div>

          {/* Ribbon + closing zone */}
          <div style={{ display: 'flex', alignItems: 'stretch', gap: RIBBON_GAP, height: RIBBON_H }}>
            <div style={{ position: 'relative', flex: 'none', width: RIBBON_W }}>
              <div
                ref={trackRef}
                data-testid="tv-track"
                className="no-scrollbar"
                onScroll={onTrackScroll}
                onWheel={onTrackWheel}
                style={{ height: '100%', width: '100%', overflowX: 'auto', overflowY: 'hidden', borderRadius: 30, background: C.track, boxShadow: '0 8px 0 rgba(0,0,0,.07)' }}
              >
                <div style={{ position: 'relative', display: 'flex', height: '100%', width: layout.total, minWidth: '100%' }}>
                  {v.blocks.map((t, i) => (
                    <TaskBlock key={t.id ?? i} t={t} i={i} count={v.blocks.length} v={v} width={layout.sizes[i]} onJump={onJump} onToggleDone={onToggleDone} />
                  ))}
                  <div style={{ position: 'absolute', top: 0, bottom: 0, left: nowX, width: 6, background: C.ink, transform: 'translateX(-3px)', boxShadow: '0 0 0 2px rgba(255,255,255,.7)', pointerEvents: 'none' }} data-testid="tv-now-line" />
                  {!ot && (
                    <div
                      data-testid="tv-now-flag"
                      style={{ ...flag, left: nowX, transform: flagLeft ? `translateX(calc(-100% - ${FLAG_GAP}px))` : `translateX(${FLAG_GAP}px)`, pointerEvents: 'none' }}
                    >
                      {clock}
                    </div>
                  )}
                </div>
              </div>
              {more.left && <div data-testid="tv-more-left" style={fade('left')}>‹</div>}
              {more.right && <div data-testid="tv-more-right" style={fade('right')}>›</div>}
            </div>

            <div style={{
              position: 'relative', flex: 'none', width: CLOSE_W, boxSizing: 'border-box', borderRadius: 30, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5,
              padding: ot ? '52px 8px 12px' : '12px 8px', textAlign: 'center', transition: 'background .4s',
              background: ot ? hatch(closing.color, 16) : 'transparent',
              border: `4px dashed ${ot ? '#fff' : 'rgba(154,134,107,.4)'}`,
              boxShadow: ot ? '0 8px 0 rgba(0,0,0,.07)' : 'none',
            }}>
              {ot && <div style={{ ...flag, left: '50%', transform: 'translateX(-50%)' }}>{clock}</div>}
              <div style={{ fontSize: ot ? 50 : 38, lineHeight: 1, animation: 'bob 2.6s ease-in-out infinite', opacity: ot ? 1 : 0.5 }}>{closing.icon}</div>
              <div style={{ font: `900 ${ot ? 21 : 19}px/1.12 ${NUNITO}`, color: ot ? '#fff' : C.muted, textShadow: ot ? '0 2px 5px rgba(0,0,0,.3)' : 'none' }}>{closing.name}</div>
              <div style={{ font: `800 15px ${NUNITO}`, color: ot ? 'rgba(255,255,255,.95)' : C.muted }}>{v.closeSub}</div>
              <button onClick={onExtend} aria-label={`Mais 5 minutos até ${closing.name}`} style={{ marginTop: 4, background: '#fff', color: C.ink, padding: '7px 14px', borderRadius: 999, border: 0, font: `900 17px ${NUNITO}`, whiteSpace: 'nowrap', cursor: 'pointer', boxShadow: '0 3px 0 rgba(0,0,0,.18)' }}>+5 min</button>
              {ot && (
                <button onClick={onReset} style={{ marginTop: 4, background: '#fff', color: C.ink, padding: '7px 14px', borderRadius: 999, border: 0, font: `900 17px ${NUNITO}`, whiteSpace: 'nowrap', cursor: 'pointer', boxShadow: '0 3px 0 rgba(0,0,0,.18)' }}>↺ Recomeçar</button>
              )}
            </div>
          </div>

          {/* AGORA card + A seguir */}
          <div style={{ display: 'flex', gap: 18, flex: 1, minHeight: 0 }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: agora.bg, border: `4px solid ${agora.border}`, borderRadius: 28, padding: '20px 26px', boxSizing: 'border-box', boxShadow: '0 6px 0 rgba(0,0,0,.06)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 22, flex: 'none' }}>
                <div style={{ width: 104, height: 104, flex: 'none', borderRadius: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 58, background: `${v.current.color}2e` }}>{v.current.icon}</div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ font: `900 16px ${NUNITO}`, letterSpacing: 3, color: C.muted }}>AGORA</div>
                  <div style={{ fontFamily: FREDOKA, fontSize: 42, fontWeight: 600, lineHeight: 1.12, letterSpacing: -0.5, whiteSpace: 'nowrap' }}>{v.current.name}</div>
                  <div style={{ marginTop: 6, display: 'inline-block', ...statusStyle({ urgent: v.urgent, overtime: ot }, { size: 20, pad: '6px 16px' }), ...(v.urgent || ot ? {} : { padding: '6px 0' }) }}>{v.statusText}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ display: 'block', fontFamily: FREDOKA, fontWeight: 600, fontSize: 74, lineHeight: 1.12, paddingBottom: 6, letterSpacing: -2, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', color: agora.count }}>{v.countdown}</div>
                  <div style={{ font: `800 16px ${NUNITO}`, letterSpacing: 2, color: C.muted, whiteSpace: 'nowrap' }}>{v.countLabel}</div>
                </div>
              </div>
              <div style={{ marginTop: 'auto', height: 26, borderRadius: 999, background: C.barBg, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${v.currentPct}%`, borderRadius: 999, background: agora.bar }} />
              </div>
            </div>

            <div style={{ width: 430, background: '#fff', borderRadius: 28, padding: '20px 22px', boxSizing: 'border-box', boxShadow: '0 6px 0 rgba(0,0,0,.06)', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ font: `900 16px ${NUNITO}`, letterSpacing: 3, color: C.muted }}>{v.nextHeading}</div>
              {ot && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, background: `${closing.color}1f`, border: `3px dashed ${closing.color}80`, borderRadius: 22, padding: '16px 18px' }}>
                  <div style={{ fontSize: 54, lineHeight: 1, animation: 'bob 2.6s ease-in-out infinite' }}>{closing.icon}</div>
                  <div style={{ fontFamily: FREDOKA, fontSize: 32, fontWeight: 600, lineHeight: 1.15 }}>{closing.title}</div>
                  <div style={{ font: `700 19px/1.35 ${NUNITO}`, color: C.muted, textWrap: 'pretty' }}>{closing.note}</div>
                </div>
              )}
              {v.nextUp.map((n, i) => (
                <div key={n.id ?? i} style={{ display: 'flex', alignItems: 'center', gap: 14, background: C.rowBg, borderRadius: 20, padding: '12px 14px' }}>
                  <div style={{ width: 58, height: 58, flex: 'none', borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, background: `${n.color}2e` }}>{n.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ font: `800 24px/1.15 ${NUNITO}` }}>{n.name}</div>
                    <div style={{ font: `700 17px ${NUNITO}`, color: C.muted }}>às {n.at} · {n.shownMinutes} min</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
