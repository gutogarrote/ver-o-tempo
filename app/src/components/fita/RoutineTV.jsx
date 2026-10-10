import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { C, FREDOKA, NUNITO, agoraColors, doneOverlay, hatch, statusStyle } from './theme';
import { ribbonTrack, spreadDots } from '../../lib/trackLayout';
import { hhmm } from '../../lib/timeline';
import { EditBar, EditButton, EditTaskList, EndTime, EndTimeEditor, EndTimeNote } from './EditControls';

const STAGE_W = 1440;
const STAGE_H = 810;
const PAD_X = 30;
const CLOSE_W = 148;
const RIBBON_GAP = 5;
const RIBBON_H = 300;
// While editing, the ribbon (a live preview) gives room to the edit rows below it.
const RIBBON_H_EDIT = 220;
// The stage never changes size (it is scaled as a whole), so the ribbon width is fixed.
export const RIBBON_W = STAGE_W - 2 * PAD_X - CLOSE_W - RIBBON_GAP;
export const DOT = 40;
const DOT_INSET = 14;
// Blocks narrower than this carry their dot centered instead of in the bottom-right corner.
const NARROW_W = 100;
// Dots never get closer than this (center to center), whatever the block widths.
export const DOT_GAP = DOT + 6;
// Minutes shown across the visible ribbon, always (~31 px/min: a 10-min block is ~307 px,
// wide enough for icon + name at the TV font sizes). Every block is exactly its planned
// minutes wide, so the window is 40 minutes of plan whatever the number of tasks, done
// tasks or routine length. Adjust here if legibility asks for it.
export const WINDOW_MIN = 40;
export const PX_PER_MIN = RIBBON_W / WINDOW_MIN;
// The NOW marker is fixed 25% from the left edge of the visible ribbon (10 minutes of
// what already happened on its left, 30 of what comes on its right); the track scrolls
// under it.
export const FOLLOW_AT = 0.25;
export const NOW_X = RIBBON_W * FOLLOW_AT;
const PRE_MAX_MIN = 30; // before the start: show up to 30 min of wait before the first block
export const MANUAL_HOLD_MS = 10000; // manual scroll pauses auto-follow for this long
// A scroll counts as manual only this soon after the user touched the track (wheel, pointer,
// key); any other scroll (browser clamping/restoring while the window or stage changes) is
// undone, so the marker can never be left over the wrong minute.
const INTENT_MS = 1500;
// Done tasks are a visual record (not an exact clock): each keeps at least this width, so
// its icon and name stay readable even when it took no time on the plan.
export const DONE_MIN_W = 104;
const FLAG_GAP = 8; // time label sits this far to the right of the NOW line
// Width of the fades over the left/right edges of the ribbon ("there is more" hints). A task
// marked done ahead of time is kept whole between the left fade and the marker (ribbonTrack).
export const FADE_W = 36;

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
const flagBox = {
  background: C.ink, color: '#fff',
  padding: '7px 16px', borderRadius: 999, font: `900 20px ${NUNITO}`, whiteSpace: 'nowrap',
  boxShadow: `0 0 0 4px ${C.bg}`,
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

// Done tasks (see ribbonItems) sit before the task in progress, faded, sized by their minutes;
// `early` (done ahead of time, no planned time left) adds a dashed frame. `elapsedW`: px of
// the task in progress already behind the NOW marker (darkened); striped when that part is
// drawn compressed to keep a task just marked done in sight (`squeezed`, see ribbonTrack).
function TaskBlock({ t, i, v, width, radius, early, elapsedW, squeezed, onJump, disabled }) {
  const ring = t.isCurrent && !v.overtime;
  if (width <= 0) return <div data-testid="tv-block" data-index={i} style={{ flex: 'none', width: 0 }} />;
  return (
    <div
      data-testid="tv-block"
      data-index={i}
      data-done={t.done ? 'true' : undefined}
      data-early={early ? 'true' : undefined}
      style={{
        position: 'relative', overflow: 'hidden', flex: 'none', width,
        background: t.color, borderRadius: radius,
        boxShadow: [`inset -3px 0 0 ${C.bg}`, t.done && doneOverlay(0.62), ring && 'inset 0 0 0 7px #fff'].filter(Boolean).join(','),
        outline: early ? `3px dashed ${t.color}` : 'none', outlineOffset: -10,
        transition: 'box-shadow .3s',
      }}
    >
      <button
        onClick={() => onJump(i)}
        disabled={disabled}
        aria-label={`Pular para ${t.name}`}
        title={`${t.name} — ${t.shownMinutes} min`}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', background: 'transparent', border: 0, padding: 0, cursor: disabled ? 'default' : 'pointer', font: 'inherit', color: 'inherit' }}
      >
        <div
          data-testid={t.isCurrent ? 'tv-elapsed' : undefined}
          data-squeezed={t.isCurrent && squeezed ? 'true' : undefined}
          style={{
            position: 'absolute', inset: '0 auto 0 0', width: t.isCurrent ? elapsedW : 0,
            background: t.isCurrent && squeezed ? 'repeating-linear-gradient(135deg, rgba(0,0,0,.26) 0 9px, rgba(0,0,0,.14) 9px 18px)' : 'rgba(0,0,0,.22)',
          }}
        />
        <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 7, padding: 8, textAlign: 'center', boxSizing: 'border-box' }}>
          <div style={{ fontSize: (t.isCurrent ? 62 : 44) / Math.sqrt(t.catalogIds?.length || 1), whiteSpace: 'nowrap', lineHeight: 1, animation: t.isCurrent ? 'bob 1.8s ease-in-out infinite' : 'none', opacity: t.done ? 0.5 : 1 }}>{t.icon}</div>
          <div style={{ font: `900 ${width < 140 ? 18 : 21}px/1.12 ${NUNITO}`, maxWidth: '100%', overflowWrap: 'anywhere', color: t.done ? C.doneInk : '#fff', textShadow: t.done ? 'none' : '0 2px 5px rgba(0,0,0,.3)' }}>{t.name}</div>
          <div style={{ font: `700 17px ${NUNITO}`, whiteSpace: 'nowrap', color: t.done ? 'rgba(58,48,38,.8)' : 'rgba(255,255,255,.92)' }}>{t.done ? '✓ ' : ''}{t.shownMinutes} min</div>
        </div>
      </button>
    </div>
  );
}

// Where each dot wants to be (px, in display order): bottom-right corner of its block,
// centered in narrow blocks. spreadDots then keeps every dot whole and apart, without
// touching the time scale.
export function dotCenters(items) {
  const want = items.map(({ x, w }) => (w >= NARROW_W ? x + w - DOT_INSET - DOT / 2 : x + w / 2));
  return spreadDots(want, DOT_GAP);
}

// The completion dot is a sibling of the block (no nested buttons), so tapping it never
// starts the task. zIndex: painted over the NOW line/label, which may cross it.
function CompletionDot({ t, i, left, zero, onToggleDone, disabled }) {
  return (
    <button
      data-testid="tv-dot"
      disabled={disabled}
      onClick={(e) => { e.stopPropagation(); onToggleDone(i); }}
      aria-pressed={t.done}
      aria-label={t.done ? `${t.name}: feita (desmarcar)` : `Marcar ${t.name} como feita`}
      title={t.done ? (zero ? `${t.name} — feita antes da hora` : 'Feita') : 'Marcar como feita'}
      style={{
        position: 'absolute', zIndex: 3, bottom: DOT_INSET, left: left - DOT / 2,
        width: DOT, height: DOT, borderRadius: 999, padding: 0, cursor: disabled ? 'default' : 'pointer', boxSizing: 'border-box',
        display: 'flex', alignItems: 'center', justifyContent: 'center', font: `900 ${DOT * 0.6}px ${NUNITO}`,
        ...(t.done
          ? { background: '#fff', color: C.check, border: zero ? `4px solid ${t.color}` : 0, boxShadow: '0 3px 0 rgba(0,0,0,.15)' }
          : { background: 'rgba(255,255,255,.18)', color: 'transparent', border: '4px solid rgba(255,255,255,.92)' }),
      }}
    >
      ✓
    </button>
  );
}

// Horizontal scroll of the ribbon. Following: the track is scrolled so that the marker
// (fixed at NOW_X) shows the current time. When the user scrolls by hand (wheel, drag,
// keys) the follow pauses: `browse` holds that scrollLeft until MANUAL_HOLD_MS after the
// last manual scroll or until "Agora" is pressed. Only scrolls right after user input on the
// track count as manual (INTENT_MS); any other scroll while following is put back, and the
// position is re-applied before paint on every render and again after the window resizes
// (TV ↔ phone ↔ TV, rotation) or the page is shown again; a resize also ends browsing.
// Returns { ref, scrollLeft, browse, ... }.
function useRibbonScroll(target) {
  const ref = useRef(null);
  const [browse, setBrowse] = useState(null);
  const targetRef = useRef(target);
  targetRef.current = target;
  const browseRef = useRef(browse);
  browseRef.current = browse;
  const intentAt = useRef(-Infinity);
  const put = useCallback((force) => {
    const el = ref.current;
    if (el && browseRef.current === null && (force || Math.abs(el.scrollLeft - targetRef.current) > 0.5)) el.scrollLeft = targetRef.current;
  }, []);
  useLayoutEffect(() => put(false));
  useEffect(() => {
    let raf = 0;
    const again = () => {
      browseRef.current = null;
      setBrowse(null);
      put(true);
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => put(true));
    };
    const onVisible = () => { if (document.visibilityState !== 'hidden') again(); };
    window.addEventListener('resize', again);
    window.addEventListener('pageshow', again);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', again);
      window.removeEventListener('pageshow', again);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [put]);
  useEffect(() => {
    if (browse === null) return undefined;
    const id = setTimeout(() => setBrowse(null), MANUAL_HOLD_MS);
    return () => clearTimeout(id);
  }, [browse]);
  const intent = () => { intentAt.current = performance.now(); };
  const onScroll = () => {
    const sl = ref.current.scrollLeft;
    const off = Math.abs(sl - targetRef.current) > 2;
    if (browseRef.current === null && performance.now() - intentAt.current > INTENT_MS) {
      if (off) put(true); // not the user: back to the clock
      return;
    }
    setBrowse(off ? sl : null);
  };
  const onWheel = (e) => {
    intent();
    const el = ref.current;
    if (el && Math.abs(e.deltaY) > Math.abs(e.deltaX)) el.scrollLeft += e.deltaY;
  };
  return {
    ref, onScroll, onWheel, onPointerDown: intent, onTouchStart: intent, onKeyDown: intent,
    browse, scrollLeft: browse ?? target, follow: () => setBrowse(null),
  };
}

const ctrlBtn = {
  width: '100%', background: '#fff', color: C.ink, padding: '12px 8px', borderRadius: 999, border: 0,
  font: `900 19px ${NUNITO}`, whiteSpace: 'nowrap', cursor: 'pointer', boxShadow: '0 3px 0 rgba(0,0,0,.18)',
};

const fade = (side) => ({
  position: 'absolute', top: 0, bottom: 0, [side]: 0, width: FADE_W, zIndex: 5, pointerEvents: 'none',
  borderRadius: side === 'left' ? '30px 0 0 30px' : '0 30px 30px 0',
  background: `linear-gradient(to ${side === 'left' ? 'right' : 'left'}, ${C.bg}, rgba(255,246,233,0))`,
  display: 'flex', alignItems: 'center', justifyContent: side === 'left' ? 'flex-start' : 'flex-end',
  padding: '0 6px', boxSizing: 'border-box', font: `900 34px ${NUNITO}`, color: C.ink,
});

export default function RoutineTV({ v, closing, clock, startLabel, endLabel, isMorning, onPick, onJump, onToggleDone, onExtend, onReset, badge, edit, onEdit }) {
  const scale = useStageScale();
  const ot = v.overtime;
  const agora = agoraColors({ urgent: v.urgent, overtime: ot, color: v.current.color });
  // Done tasks first (visual record), then the task in progress and the pending ones on an
  // exact scale (PLANNED minutes), then the closing; the marker stays at NOW_X.
  const win = ribbonTrack({ blocks: v.blocks, viewW: RIBBON_W, windowMin: WINDOW_MIN, followAt: FOLLOW_AT, planMin: v.planEndMin, nowMin: v.nowElapsed, preMaxMin: PRE_MAX_MIN, doneMinPx: DONE_MIN_W, edgePx: FADE_W });
  const nowX = win.xOf(v.nowElapsed);
  const scroll = useRibbonScroll(win.scrollFor(win.markMin));
  // Marking a task (often reached by scrolling ahead by hand) brings the ribbon back to now:
  // the task just marked is shown right behind the marker, so it has to be in view.
  const toggleDone = (i) => { scroll.follow(); onToggleDone(i); };
  const shown = win.items.filter((it) => it.w > 0);
  const dots = dotCenters(shown);
  const firstShown = shown.length ? shown[0].i : -1;
  // The closing starts where the last task ends: lit once it is reached (all done, overtime).
  const closingLit = ot || v.allDone;
  const closingW = win.contentW - win.closeX;
  // The marker never moves on screen. Following, it shows the clock. While the user looks
  // elsewhere it shows the time under it (dashed, 👀) and offers to come back: the real
  // progress stays visible in the blocks (current block ring + darkened part).
  const browsing = scroll.browse !== null;
  const underMin = win.minAt(scroll.scrollLeft);
  const underLabel = hhmm(new Date(v.startMs + underMin * 60000));
  const mode = browsing ? 'browse' : win.early ? 'early' : 'now';
  const more = {
    left: shown.length > 0 && scroll.scrollLeft > win.margin + 1,
    right: shown.length > 0 && win.closeX > scroll.scrollLeft + RIBBON_W + 1,
  };

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: STAGE_W * scale, height: STAGE_H * scale, flex: 'none' }}>
        <div style={{ width: STAGE_W, height: STAGE_H, transform: `scale(${scale})`, transformOrigin: '0 0', boxSizing: 'border-box', background: C.bg, color: C.ink, fontFamily: NUNITO, display: 'flex', flexDirection: 'column', padding: `26px ${PAD_X}px`, gap: 16 }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              {badge({ size: 58, radius: 20, fontSize: 26, shadow: 4, withLabel: true })}
              <h1 style={{ margin: 0, fontFamily: FREDOKA, fontSize: 42, fontWeight: 600, letterSpacing: -0.5, whiteSpace: 'nowrap' }}>Rotina da Nina</h1>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
              {edit ? (
                <>
                  <div style={{ font: `600 28px ${FREDOKA}`, color: C.muted, whiteSpace: 'nowrap' }}>✏️ Editando {isMorning ? '☀️ Manhã' : '🌙 Noite'}</div>
                  <EditBar onCancel={edit.onCancel} onSave={edit.onSave} blocked={edit.invalid.length > 0} font={22} h={58} />
                </>
              ) : (
                <div style={{ display: 'flex', gap: 6, background: C.toggleBg, padding: 6, borderRadius: 999 }}>
                  <Pill on={isMorning} onClick={() => onPick('morning')}>☀️ Manhã</Pill>
                  <Pill on={!isMorning} onClick={() => onPick('evening')}>🌙 Noite</Pill>
                </div>
              )}
              <div style={{ fontFamily: FREDOKA, fontSize: 46, fontWeight: 600, fontVariantNumeric: 'tabular-nums', letterSpacing: -1 }}>{clock}</div>
            </div>
          </div>

          {/* Start / remaining / end */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', font: `800 17px ${NUNITO}`, color: C.muted, letterSpacing: 1.5, whiteSpace: 'nowrap' }}>
            <span>COMEÇOU {startLabel}</span><span>{v.leftLabel}</span><span>TERMINA {endLabel}</span>
          </div>

          {/* Ribbon + closing zone */}
          <div style={{ display: 'flex', alignItems: 'stretch', gap: RIBBON_GAP, height: edit ? RIBBON_H_EDIT : RIBBON_H }}>
            <div style={{ position: 'relative', flex: 'none', width: RIBBON_W }}>
              <div
                ref={scroll.ref}
                data-testid="tv-track"
                className="no-scrollbar"
                tabIndex={0}
                role="region"
                aria-label="Linha do tempo da rotina"
                onScroll={scroll.onScroll}
                onWheel={scroll.onWheel}
                onPointerDown={scroll.onPointerDown}
                onTouchStart={scroll.onTouchStart}
                onKeyDown={scroll.onKeyDown}
                style={{ height: '100%', width: '100%', overflowX: 'auto', overflowY: 'hidden', borderRadius: 30, background: C.track, boxShadow: '0 8px 0 rgba(0,0,0,.07)' }}
              >
                <div data-testid="tv-content" style={{ position: 'relative', height: '100%', width: win.contentW }}>
                  {v.nowElapsed < 0 && (
                    <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: win.xOf(0) - 48, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', font: `800 20px ${NUNITO}`, color: C.muted, whiteSpace: 'nowrap', pointerEvents: 'none' }}>
                      começa às {startLabel} ›
                    </div>
                  )}
                  {/* Closing ("Hora de dormir"/"Hora de sair"): right after the last task, to the end. */}
                  <div
                    data-testid="tv-closing"
                    data-lit={closingLit ? 'true' : 'false'}
                    style={{ position: 'absolute', top: 0, bottom: 0, left: win.closeX, width: closingW, background: closingLit ? `${closing.color}66` : `${closing.color}2e`, transition: 'background .4s' }}
                  >
                    <div style={{ position: 'sticky', left: NOW_X + 28, display: 'inline-flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5, height: '100%', padding: '0 28px', boxSizing: 'border-box', textAlign: 'center', pointerEvents: 'none' }}>
                      <div style={{ fontSize: closingLit ? 54 : 44, lineHeight: 1, animation: 'bob 2.6s ease-in-out infinite', opacity: closingLit ? 1 : 0.6 }}>{closing.icon}</div>
                      <div style={{ font: `900 21px/1.12 ${NUNITO}`, whiteSpace: 'nowrap', color: closingLit ? C.ink : C.muted }}>{closing.name}</div>
                      <div style={{ font: `800 17px ${NUNITO}`, whiteSpace: 'nowrap', color: C.muted }}>{v.closeSub}</div>
                      <div style={{ font: `600 26px ${FREDOKA}`, whiteSpace: 'nowrap', color: closingLit ? C.ink : C.muted, fontVariantNumeric: 'tabular-nums' }}>às {endLabel}</div>
                    </div>
                  </div>
                  {ot && (
                    <div data-testid="tv-overtime" style={{ position: 'absolute', top: 0, bottom: 0, left: win.xOf(v.planEndMin), width: win.xOf(v.nowElapsed) - win.xOf(v.planEndMin), background: hatch(closing.color, 16), opacity: 0.55, pointerEvents: 'none' }} />
                  )}
                  <div data-testid="tv-deadline" style={{ position: 'absolute', top: 0, bottom: 0, left: win.xOf(v.planEndMin) - 2, width: 0, borderLeft: `4px dashed ${C.muted}`, pointerEvents: 'none' }} />
                  {shown.map((it) => (
                    <div key={v.blocks[it.i].id ?? it.i} style={{ position: 'absolute', top: 0, bottom: 0, left: it.x, display: 'flex' }}>
                      <TaskBlock t={v.blocks[it.i]} i={it.i} v={v} width={it.w} radius={it.i === firstShown ? '30px 0 0 30px' : 0} early={it.early} elapsedW={Math.min(it.w, Math.max(0, nowX - it.x))} squeezed={win.squeeze > 0} onJump={onJump} disabled={!!edit} />
                    </div>
                  ))}
                  {shown.map((it, k) => (
                    <CompletionDot key={v.blocks[it.i].id ?? it.i} t={v.blocks[it.i]} i={it.i} left={dots[k]} zero={it.early} onToggleDone={toggleDone} disabled={!!edit} />
                  ))}
                </div>
              </div>
              {/* NOW marker: an overlay over the scrolling track, fixed at NOW_X. */}
              <div
                data-testid="tv-now-line"
                data-mode={mode}
                style={{
                  position: 'absolute', top: 0, bottom: 0, left: NOW_X - 3, width: 6, zIndex: 2, pointerEvents: 'none', boxSizing: 'border-box',
                  ...(mode === 'browse'
                    ? { borderLeft: `6px dashed ${C.ink}`, opacity: 0.55 }
                    : { background: C.ink, boxShadow: '0 0 0 2px rgba(255,255,255,.7)' }),
                }}
              />
              <div data-testid="tv-now-tag" style={{ position: 'absolute', top: FLAG_TOP, left: NOW_X + FLAG_GAP, zIndex: 2, display: 'flex', gap: 8, pointerEvents: 'none' }}>
                {mode === 'browse' ? (
                  <>
                    <div data-testid="tv-now-flag" aria-label={`Olhando ${underLabel} — agora são ${clock}`} style={{ ...flagBox, background: '#fff', color: C.ink, boxShadow: `0 0 0 3px ${C.muted}` }}>👀 {underLabel}</div>
                    <button onClick={scroll.follow} aria-label={`Voltar para agora (${clock})`} style={{ ...flagBox, border: 0, cursor: 'pointer', pointerEvents: 'auto' }}>↩ Agora</button>
                  </>
                ) : (
                  <div data-testid="tv-now-flag" style={flagBox}>{mode === 'early' ? `⏳ ${clock}` : clock}</div>
                )}
              </div>
              {more.left && <div data-testid="tv-more-left" style={fade('left')}>‹</div>}
              {more.right && <div data-testid="tv-more-right" style={fade('right')}>›</div>}
            </div>

            {/* Controls of the closing, under the routine's end time. The closing itself (icon,
                name) lives only in the ribbon, right after the last task, so it is never shown
                twice. Edit mode: −5/+5 move the end time instead. */}
            <div style={{ flex: 'none', width: CLOSE_W, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <EndTime label={endLabel} size="tv" caption="FIM" />
              {edit ? <EndTimeEditor edit={edit} size="tv" /> : (
                <div
                  data-testid="tv-closing-controls"
                  role="group"
                  aria-label={`Controles de ${closing.name}`}
                  style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}
                >
                  <button className="fita-btn" onClick={onExtend} aria-label={`Mais 5 minutos até ${closing.name}`} style={ctrlBtn}>+5 min</button>
                  {ot && <button className="fita-btn" onClick={onReset} style={ctrlBtn}>↺ Recomeçar</button>}
                </div>
              )}
              {!edit && <EditButton onEdit={onEdit} font={19} h={48} />}
            </div>
          </div>

          {/* Edit mode: the rows to edit + what the end time means. Otherwise AGORA + A seguir. */}
          {edit ? (
            <div style={{ display: 'flex', gap: 18, flex: 1, minHeight: 0 }}>
              <EditTaskList items={edit.items} blocks={v.blocks} timeLabel={edit.timeLabel} size="tv"
                onMove={edit.onMove} onStep={edit.onStep} onChange={edit.onChange} onMinutes={edit.onMinutes} invalid={edit.invalid} onInsert={edit.onInsert} onDetails={edit.onDetails} />
              <div style={{ width: 430, flex: 'none', background: '#fff', borderRadius: 28, padding: '20px 22px', boxSizing: 'border-box', boxShadow: '0 6px 0 rgba(0,0,0,.06)', display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>
                <div style={{ font: `900 16px ${NUNITO}`, letterSpacing: 3, color: C.muted }}>FIM DA ROTINA</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ fontSize: 44, lineHeight: 1 }}>{closing.icon}</div>
                  <div style={{ fontFamily: FREDOKA, fontSize: 30, fontWeight: 600 }}>{closing.name} às {endLabel}</div>
                </div>
                <EndTimeNote edit={edit} endLabel={endLabel} size="tv" />
              </div>
            </div>
          ) : (
          <div style={{ display: 'flex', gap: 18, flex: 1, minHeight: 0 }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: agora.bg, border: `4px solid ${agora.border}`, borderRadius: 28, padding: '20px 26px', boxSizing: 'border-box', boxShadow: '0 6px 0 rgba(0,0,0,.06)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 22, flex: 'none' }}>
                <div style={{ width: 104, height: 104, flex: 'none', borderRadius: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 58 / Math.sqrt(v.current.catalogIds?.length || 1), whiteSpace: 'nowrap', background: `${v.current.color}2e` }}>{v.current.icon}</div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ font: `900 16px ${NUNITO}`, letterSpacing: 3, color: C.muted }}>AGORA</div>
                  <div style={{ fontFamily: FREDOKA, fontSize: 42, fontWeight: 600, lineHeight: 1.12, letterSpacing: -0.5, overflowWrap: 'anywhere' }}>{v.current.name}</div>
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
                  <div style={{ width: 58, height: 58, flex: 'none', borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 / Math.sqrt(n.catalogIds?.length || 1), whiteSpace: 'nowrap', background: `${n.color}2e` }}>{n.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ font: `800 24px/1.15 ${NUNITO}` }}>{n.name}</div>
                    <div style={{ font: `700 17px ${NUNITO}`, color: C.muted }}>às {n.at} · {n.shownMinutes} min</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}
