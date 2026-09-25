import React, { useState } from 'react';
import { C, NUNITO } from './theme';

// The ✨ badge doubles as a discreet parents' menu (edit routines, deadline),
// keeping the kid-facing screen identical to the design.
export default function ParentMenu({ size, radius, fontSize, shadow, onEdit, onEditDefaults, deadlineStr, setDeadlineStr, useDeadline, setUseDeadline }) {
  const [open, setOpen] = useState(false);
  const item = { display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', border: 0, borderRadius: 12, background: 'transparent', cursor: 'pointer', font: `800 16px ${NUNITO}`, color: C.ink, whiteSpace: 'nowrap' };

  return (
    <div style={{ position: 'relative', flex: 'none' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Menu dos pais"
        aria-expanded={open}
        style={{ width: size, height: size, borderRadius: radius, background: C.sun, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize, boxShadow: `0 ${shadow}px 0 ${C.sunShadow}`, border: 0, padding: 0, cursor: 'pointer' }}
      >
        ✨
      </button>
      {open && (
        <div style={{ position: 'absolute', top: size + 10, left: 0, zIndex: 20, background: '#fff', borderRadius: 18, padding: 8, minWidth: 240, boxShadow: '0 10px 30px rgba(42,33,24,.18)' }}>
          <button style={item} onClick={() => { setOpen(false); onEdit(); }}>✏️ Editar esta rotina</button>
          <button style={item} onClick={() => { setOpen(false); onEditDefaults(); }}>⚙️ Rotinas</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', font: `700 15px ${NUNITO}`, color: C.muted }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
              <input type="checkbox" checked={useDeadline} onChange={(e) => setUseDeadline(e.target.checked)} />
              Horário limite
            </label>
            <input
              type="time"
              value={deadlineStr}
              onChange={(e) => setDeadlineStr(e.target.value)}
              style={{ border: `2px solid ${C.toggleBg}`, borderRadius: 10, padding: '4px 6px', font: `700 15px ${NUNITO}`, color: C.ink }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
