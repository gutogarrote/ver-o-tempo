import React, { useEffect, useId, useRef, useState } from 'react';
import { C, NUNITO } from './theme';

// The ✨ badge doubles as a discreet parents' menu (edit routines, deadline),
// keeping the kid-facing screen identical to the design.
// The panel closes on a click/tap outside it, on Escape (focus goes back to ✨) and when
// focus leaves it with Tab; using its controls never closes it. Opening it with the
// keyboard focuses its first item.
export default function ParentMenu({ size, radius, fontSize, shadow, onEdit, onEditDefaults, deadlineStr, setDeadlineStr, useDeadline, setUseDeadline, onSaveEndTime }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const panelRef = useRef(null);
  const byKeyboard = useRef(false);
  const panelId = useId();
  const item = { display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', border: 0, borderRadius: 12, background: 'transparent', cursor: 'pointer', font: `800 16px ${NUNITO}`, color: C.ink, whiteSpace: 'nowrap' };

  useEffect(() => {
    if (!open) return undefined;
    if (byKeyboard.current) panelRef.current?.querySelector('button, input')?.focus();
    const onPointerDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('mousedown', onPointerDown, true);
    document.addEventListener('touchstart', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('mousedown', onPointerDown, true);
      document.removeEventListener('touchstart', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  // Tab out of the menu (focus moves to something outside it) closes it too.
  const onBlur = (e) => {
    if (e.relatedTarget && rootRef.current && !rootRef.current.contains(e.relatedTarget)) setOpen(false);
  };

  return (
    <div ref={rootRef} onBlur={onBlur} style={{ position: 'relative', flex: 'none' }}>
      <button
        ref={buttonRef}
        onClick={(e) => { byKeyboard.current = e.detail === 0; setOpen((o) => !o); }}
        aria-label="Menu dos pais"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={open ? panelId : undefined}
        style={{ width: size, height: size, borderRadius: radius, background: C.sun, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize, boxShadow: `0 ${shadow}px 0 ${C.sunShadow}`, border: 0, padding: 0, cursor: 'pointer' }}
      >
        ✨
      </button>
      {open && (
        <div
          ref={panelRef}
          id={panelId}
          role="dialog"
          aria-label="Menu dos pais"
          style={{ position: 'absolute', top: size + 10, left: 0, zIndex: 20, background: '#fff', borderRadius: 18, padding: 8, minWidth: 240, boxShadow: '0 10px 30px rgba(42,33,24,.18)' }}
        >
          <button style={item} onClick={() => { setOpen(false); onEdit(); }}>✏️ Editar esta rotina</button>
          <button style={item} onClick={() => { setOpen(false); onEditDefaults(); }}>⚙️ Rotinas</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', font: `700 15px ${NUNITO}`, color: C.muted }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
              <input type="checkbox" checked={useDeadline} onChange={(e) => setUseDeadline(e.target.checked)} />
              Horário limite
            </label>
            <input
              aria-label="Horário final"
              type="time"
              value={deadlineStr}
              onChange={(e) => setDeadlineStr(e.target.value)}
              style={{ border: `2px solid ${C.toggleBg}`, borderRadius: 10, padding: '4px 6px', font: `700 15px ${NUNITO}`, color: C.ink }}
            />
          </div>
          <button style={item} onClick={onSaveEndTime}>Salvar horário</button>
        </div>
      )}
    </div>
  );
}
