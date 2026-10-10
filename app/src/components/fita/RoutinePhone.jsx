import React, { useEffect, useRef } from 'react';
import { C, FREDOKA, NUNITO, agoraColors, doneOverlay, hatch, statusStyle } from './theme';
import { ribbonColumn } from '../../lib/trackLayout';
import { EditBar, EditButton, EditTaskList, EndTime, EndTimeEditor, EndTimeNote, pillStyle } from './EditControls';

export const PX_PER_MIN = 11;
// Touch target of the completion dot; rows never get shorter than it, so short
// (1–2 min) tasks still show the whole dot. The NOW line follows the same geometry.
export const DOT_HIT = 44;
const DOT = 26;
export const MIN_ROW_H = DOT_HIT;
const FOLLOW_AT = 0.42; // keep NOW ~40% down the visible track
const MANUAL_HOLD_MS = 10000; // manual scroll pauses auto-follow for this long
// Room left under the last row, so the NOW line stays visible once the last task is over
// (the closing itself is the pinned footer, not a row of the ribbon).
export const END_PAD = 16;

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

function TaskRow({ t, i, first, early, v, height, onJump, onToggleDone }) {
  const cur = t.isCurrent && !v.overtime;
  // The closing row follows the last one, so only the first row is rounded.
  const radius = first ? '20px 20px 0 0' : '0';
  // Row and completion dot are sibling buttons, so tapping the dot never starts the task.
  return (
    <div
      data-testid="phone-row"
      data-index={i}
      data-done={t.done ? 'true' : undefined}
      data-early={early ? 'true' : undefined}
      style={{
        position: 'relative', overflow: 'hidden', flex: 'none', height, width: '100%',
        background: t.color, borderRadius: radius,
        boxShadow: [`inset 0 -2px 0 ${C.bg}`, t.done && doneOverlay(0.68)].filter(Boolean).join(','),
        // No zIndex here: it would trap the dot under the NOW line.
        ...(cur ? { outline: '4px solid #fff', outlineOffset: -4 } : early ? { outline: `3px dashed ${t.color}`, outlineOffset: -6 } : {}),
      }}
    >
      <button
        onClick={() => onJump(i)}
        aria-label={`Pular para ${t.name}`}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', background: 'transparent', border: 0, padding: 0, cursor: 'pointer', font: 'inherit', textAlign: 'left' }}
      >
        <div style={{ position: 'absolute', inset: '0 0 auto 0', height: `${t.isCurrent ? v.currentPct : 0}%`, background: 'rgba(0,0,0,.2)' }} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 9, height: '100%', padding: `0 ${DOT_HIT + 8}px 0 12px`, boxSizing: 'border-box' }}>
          <div style={{ fontSize: cur ? 26 : 20, lineHeight: 1, flex: 'none', animation: cur ? 'bob 1.8s ease-in-out infinite' : 'none', opacity: t.done ? 0.55 : 1 }}>{t.icon}</div>
          <div style={{ flex: 1, minWidth: 0, font: `${cur ? 900 : 800} ${cur ? 18 : 16}px ${NUNITO}`, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: t.done ? C.doneInk : '#fff', textShadow: t.done ? 'none' : '0 1px 3px rgba(0,0,0,.35)' }}>{t.name}</div>
          <div style={{ font: `700 13px ${NUNITO}`, whiteSpace: 'nowrap', color: t.done ? 'rgba(58,48,38,.8)' : 'rgba(255,255,255,.9)' }}>{t.done ? '✓ ' : ''}{t.shownMinutes} min</div>
        </div>
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onToggleDone(i); }}
        aria-pressed={t.done}
        aria-label={t.done ? `${t.name}: feita (desmarcar)` : `Marcar ${t.name} como feita`}
        style={{
          // Transparent DOT_HIT square around the visible dot; zIndex keeps it over the NOW line (3).
          position: 'absolute', zIndex: 4, right: 1, top: '50%', transform: 'translateY(-50%)', width: DOT_HIT, height: DOT_HIT,
          padding: 0, cursor: 'pointer', background: 'transparent', border: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: DOT, height: DOT, borderRadius: 999, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', font: `900 15px ${NUNITO}`,
            ...(t.done
              ? { background: '#fff', color: C.check, border: 0 }
              : { background: 'rgba(255,255,255,.18)', color: 'transparent', border: '3px solid rgba(255,255,255,.92)' }),
          }}
        >
          ✓
        </span>
      </button>
    </div>
  );
}

const footBtn = (font = 14) => pillStyle({ font, h: 44, padX: 14 });

export default function RoutinePhone({ v, closing, clock, isMorning, onPick, onJump, onToggleDone, onExtend, onReset, badge, edit, onEdit, endLabel }) {
  const ot = v.overtime;
  const agora = agoraColors({ urgent: v.urgent, overtime: ot, color: v.current.color });
  // Done rows first (sized by max(planned, original) minutes), then the task in progress
  // and the pending ones (PLANNED minutes), then the closing row; see ribbonItems.
  const col = ribbonColumn(v.blocks, { perMin: PX_PER_MIN, minSize: MIN_ROW_H });
  const trackRef = useRef(null);
  // Past the last task, NOW sits right after it (the closing is the footer below the list).
  const nowY = col.yOf(v.planElapsed, 0);
  const closingLit = ot || v.allDone;

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
    // Fills the phone shell (Home): the shell is the window, this column never outgrows it.
    <div style={{ width: '100%', flex: '1 1 auto', minHeight: 0, boxSizing: 'border-box', background: C.bg, color: C.ink, fontFamily: NUNITO, display: 'flex', flexDirection: 'column', padding: '16px 14px 14px', gap: 10 }}>

      {/* Header (edit mode: what is being edited, Cancelar and Salvar) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          {/* The menu is unavailable while editing (Home disables it); on the phone it makes room. */}
          {!edit && badge({ size: 34, radius: 12, fontSize: 18, shadow: 3 })}
          {edit
            ? <h1 style={{ margin: 0, fontFamily: FREDOKA, fontSize: 20, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{isMorning ? '☀️' : '🌙'} Editando</h1>
            : <h1 style={{ margin: 0, fontFamily: FREDOKA, fontSize: 'min(22px, 5.6vw)', fontWeight: 600, whiteSpace: 'nowrap' }}>Rotina da Nina</h1>}
        </div>
        {edit ? <EditBar onCancel={edit.onCancel} onSave={edit.onSave} blocked={edit.invalid.length > 0 || edit.noTasks} font={15} h={42} glyphs={false} /> : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', gap: 3, background: C.toggleBg, padding: 3, borderRadius: 999 }}>
            <IconToggle on={isMorning} onClick={() => onPick('morning')} label="Manhã">☀️</IconToggle>
            <IconToggle on={!isMorning} onClick={() => onPick('evening')} label="Noite">🌙</IconToggle>
          </div>
          <div style={{ fontFamily: FREDOKA, fontSize: 26, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{clock}</div>
        </div>
        )}
      </div>

      {/* AGORA card (hidden while editing: the rows show their times instead) */}
      {edit ? (
        <div style={{ font: `700 13px/1.3 ${NUNITO}`, color: C.muted, padding: '0 4px' }}>
          ▲▼ mudam a ordem · −1/+1 ajustam minutos · + insere uma tarefa ali. Nada é gravado até <strong style={{ color: C.ink }}>Salvar</strong>.
        </div>
      ) : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9, background: agora.bg, border: `3px solid ${agora.border}`, borderRadius: 20, padding: '12px 13px', boxShadow: '0 4px 0 rgba(0,0,0,.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 54, height: 54, flex: 'none', borderRadius: 17, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30 / Math.sqrt(v.current.catalogIds?.length || 1), whiteSpace: 'nowrap', background: `${v.current.color}2e` }}>{v.current.icon}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ font: `900 11px ${NUNITO}`, letterSpacing: 2, color: C.muted }}>AGORA</div>
            <div style={{ fontFamily: FREDOKA, fontSize: 26, fontWeight: 600, lineHeight: 1.15, ...(v.current.catalogIds?.length > 1 ? { fontSize: 20, overflowWrap: 'anywhere' } : { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }) }}>{v.current.name}</div>
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
      )}

      {/* Scrolling vertical ribbon + pinned closing zone. While editing, the edit rows take the
          ribbon's place (the ribbon stays mounted, hidden, so its size tracking survives). */}
      <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {edit && (
          <EditTaskList items={edit.items} blocks={v.blocks} timeLabel={edit.timeLabel} size="phone"
            onMove={edit.onMove} onStep={edit.onStep} onChange={edit.onChange} onMinutes={edit.onMinutes} invalid={edit.invalid} noTasks={edit.noTasks} onInsert={edit.onInsert} onDetails={edit.onDetails} />
        )}
        <div ref={trackRef} data-testid="phone-track" onScroll={onScroll} className="no-scrollbar" style={{ position: 'relative', flex: 1, minHeight: 0, borderRadius: 20, background: C.track, overflowY: 'auto', overflowX: 'hidden', overscrollBehavior: 'contain', display: edit ? 'none' : 'block' }}>
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', height: col.closeY + END_PAD }}>
            {col.rows.map((r, k) => (
              <TaskRow key={v.blocks[r.i].id ?? r.i} t={v.blocks[r.i]} i={r.i} first={k === 0} early={r.early} v={v} height={r.h} onJump={onJump} onToggleDone={onToggleDone} />
            ))}
            {/* NOW: in the row of the task in progress, or right after the last row once it is over. */}
            <div data-testid="phone-now-line" style={{ position: 'absolute', zIndex: 3, left: 0, right: 0, top: nowY, height: 5, transform: 'translateY(-2px)', background: C.ink, borderRadius: 999, boxShadow: '0 0 0 2px rgba(255,246,233,.85)', pointerEvents: 'none' }} />
          </div>
        </div>

        {/* Final milestone, pinned: closing, end time of the routine and its controls. Normal use:
            +5 min (this run only), ↺ Recomeçar in overtime, ✏️ to edit. Edit mode: −5/+5 move the
            routine's end time. */}
        <div data-testid="phone-final" data-lit={closingLit ? 'true' : 'false'} style={{
          display: 'flex', flexWrap: 'wrap', alignItems: 'center', columnGap: 10, rowGap: 6, flex: 'none', boxSizing: 'border-box', borderRadius: 20, padding: '8px 10px', transition: 'background .4s',
          background: ot && !edit ? hatch(closing.color, 14) : edit ? '#fff' : closingLit ? `${closing.color}2e` : 'transparent',
          border: `3px dashed ${ot && !edit ? '#fff' : 'rgba(154,134,107,.4)'}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: '1 1 auto', minWidth: 0 }}>
            <div style={{ fontSize: ot ? 30 : 24, lineHeight: 1, flex: 'none', animation: 'bob 2.6s ease-in-out infinite', opacity: ot || edit ? 1 : 0.5 }}>{closing.icon}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ font: `900 ${ot ? 17 : 15}px/1.1 ${NUNITO}`, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: ot && !edit ? '#fff' : closingLit && !edit ? C.ink : C.muted, textShadow: ot && !edit ? '0 1px 3px rgba(0,0,0,.3)' : 'none' }}>
                {closing.name}
                {/* Reached (all done / past the end): where we are now, compactly. */}
                {closingLit && !edit && <span style={{ font: `700 13px ${NUNITO}` }}> · {v.closeSub}</span>}
              </div>
              <EndTime label={endLabel} light={ot && !edit} caption={edit ? 'FIM' : 'ÀS'} inline />
            </div>
          </div>
          {edit ? <EndTimeEditor edit={edit} size="phone" /> : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 'none', marginLeft: 'auto' }}>
              <button className="fita-btn" onClick={onExtend} aria-label={`Mais 5 minutos até ${closing.name}`} style={footBtn()}>+5 min</button>
              {ot && <button className="fita-btn" onClick={onReset} style={footBtn()}>↺ Recomeçar</button>}
              <EditButton onEdit={onEdit} label={false} />
            </div>
          )}
          {edit && <div style={{ flex: '1 1 100%' }}><EndTimeNote edit={edit} endLabel={endLabel} size="phone" /></div>}
        </div>
      </div>

    </div>
  );
}
