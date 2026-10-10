import React, { useEffect, useLayoutEffect, useRef } from 'react';
import { C, FREDOKA, NUNITO, doneOverlay } from './theme';
import { MAX_TASK_MIN, MIN_TASK_MIN, canStep } from '../../lib/routineDraft';

// Controls of the edit mode (Home `edit`), shared by the phone and TV layouts. Normal use
// shows none of them: only the discreet ✏️ button (EditButton). Sizes per layout: the TV
// stage is scaled as a whole, so its numbers are stage pixels.
export const SIZES = {
  phone: { row: 104, slot: 44, btn: 44, btnH: 40, font: 16, small: 12, gap: 6, pad: 10, name: 16, radius: 20 },
  tv: { row: 68, slot: 40, btn: 52, btnH: 48, font: 22, small: 17, gap: 10, pad: 16, name: 22, radius: 28 },
};

// Pill button in the app's style (white, soft shadow); `tone` changes the colors.
export function pillStyle({ tone = 'white', font = 15, h = 40, padX = 14 } = {}) {
  const tones = {
    white: { background: '#fff', color: C.ink, boxShadow: '0 2px 0 rgba(0,0,0,.18)' },
    sun: { background: C.sun, color: C.ink, boxShadow: `0 3px 0 ${C.sunShadow}` },
    soft: { background: 'rgba(255,255,255,.55)', color: C.ink, boxShadow: `inset 0 0 0 2px ${C.toggleBg}` },
    danger: { background: '#fff', color: C.red, boxShadow: `inset 0 0 0 2px ${C.red}` },
  };
  return {
    minHeight: h, padding: `0 ${padX}px`, borderRadius: 999, border: 0, cursor: 'pointer', whiteSpace: 'nowrap',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, font: `900 ${font}px ${NUNITO}`,
    boxSizing: 'border-box', flex: 'none', ...tones[tone],
  };
}

// Three bars: a hamburger that looks the same whatever fonts the device has.
export function HamburgerIcon({ size = 18, color = C.ink }) {
  const bar = { display: 'block', width: size, height: Math.max(2, Math.round(size / 7)), borderRadius: 999, background: color };
  return (
    <span aria-hidden="true" style={{ display: 'inline-flex', flexDirection: 'column', justifyContent: 'space-between', height: Math.round(size * 0.8), flex: 'none' }}>
      <span style={bar} /><span style={bar} /><span style={bar} />
    </span>
  );
}

export function EditButton({ onEdit, label = true, font = 15, h = 44 }) {
  return (
    <button type="button" className="fita-btn" onClick={onEdit} aria-label="Editar rotina" title="Editar rotina (ordem, minutos, tarefas e horário final)"
      style={{ ...pillStyle({ tone: 'soft', font, h, padX: label ? 16 : 0 }), ...(label ? {} : { width: h }) }}>
      <span aria-hidden="true">✏️</span>{label && <span>Editar</span>}
    </button>
  );
}

export function EditBar({ onCancel, onSave, font = 15, h = 40, glyphs = true }) {
  return (
    <div style={{ display: 'flex', gap: 8, flex: 'none' }}>
      <button type="button" className="fita-btn" onClick={onCancel} style={pillStyle({ font, h, padX: glyphs ? 14 : 13 })} title="Descartar as alterações e voltar">
        {glyphs && <span aria-hidden="true">✕</span>}Cancelar
      </button>
      <button type="button" className="fita-btn" onClick={onSave} style={pillStyle({ tone: 'sun', font, h, padX: glyphs ? 14 : 15 })} title="Guardar as alterações neste aparelho e no link">
        {glyphs && <span aria-hidden="true">✓</span>}Salvar
      </button>
    </div>
  );
}

function SmallBtn({ label, title, onClick, disabled, s, children, dataAction, wide }) {
  return (
    <button
      type="button"
      className="fita-btn"
      aria-label={label}
      title={title || label}
      data-action={dataAction}
      disabled={disabled}
      onClick={onClick}
      style={{
        width: wide ? s.btn + 8 : s.btn, height: s.btnH, flex: 'none', borderRadius: 12, border: 0, padding: 0, cursor: disabled ? 'not-allowed' : 'pointer',
        background: '#fff', color: C.ink, font: `900 ${s.font}px ${NUNITO}`, boxShadow: disabled ? 'none' : '0 2px 0 rgba(0,0,0,.18)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.38 : 1,
      }}
    >
      {children}
    </button>
  );
}

const nameOf = (task, i) => (task.name && String(task.name).trim()) || `Tarefa ${i + 1}`;

function insertLabel(items, at) {
  if (!items.length) return 'Inserir tarefa';
  if (at === 0) return `Inserir tarefa no início, antes de ${nameOf(items[0].task, 0)}`;
  if (at === items.length) return `Inserir tarefa no fim, depois de ${nameOf(items[at - 1].task, at - 1)}`;
  return `Inserir tarefa entre ${nameOf(items[at - 1].task, at - 1)} e ${nameOf(items[at].task, at)}`;
}

function InsertSlot({ items, at, s, size, onInsert }) {
  return (
    <div data-testid="edit-slot" data-at={at} style={{ position: 'relative', height: s.slot, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div aria-hidden="true" style={{ position: 'absolute', left: 14, right: 14, top: '50%', borderTop: `2px dashed ${C.muted}66` }} />
      <button
        type="button"
        className="fita-btn"
        aria-label={insertLabel(items, at)}
        title={insertLabel(items, at)}
        onClick={(e) => onInsert(at, e.currentTarget)}
        style={{ ...pillStyle({ font: size === 'tv' ? 20 : 15, h: s.slot - 6, padX: size === 'tv' ? 18 : 14 }), position: 'relative', background: C.bg, boxShadow: `inset 0 0 0 2px ${C.muted}88` }}
      >
        <span aria-hidden="true" style={{ fontSize: size === 'tv' ? 24 : 20, lineHeight: 1 }}>+</span>
        {size === 'tv' && <span style={{ color: C.muted }}>inserir</span>}
      </button>
    </div>
  );
}

// Rows of the edit mode: name, ↑/↓ (swap with the neighbour), −1/+1 minute with the minutes
// shown (and typed), ⋯ for icon/color/removal; a + slot between rows (and at both ends)
// inserts a task exactly there. `blocks` are the preview's view blocks (same order).
export function EditTaskList({ items, blocks, timeLabel, size = 'phone', onMove, onStep, onChange, onInsert, onDetails }) {
  const s = SIZES[size];
  const scrollRef = useRef(null);
  const anchor = useRef(null);

  // A moved row stays under the finger/pointer: the list scrolls by exactly how far the row
  // moved, so tapping the same arrow again keeps moving the same task. When the arrow that
  // was used becomes disabled (first/last), focus goes to the other arrow of that row.
  useLayoutEffect(() => {
    const a = anchor.current;
    const list = scrollRef.current;
    if (!a || !list) return;
    anchor.current = null;
    const row = list.querySelector(`[data-key="${a.key}"]`);
    if (!row) return;
    list.scrollTop += row.getBoundingClientRect().top - a.top;
    const used = row.querySelector(`[data-action="${a.dir < 0 ? 'up' : 'down'}"]`);
    if (a.focus) (used && !used.disabled ? used : row.querySelector(`[data-action="${a.dir < 0 ? 'down' : 'up'}"]`))?.focus();
  });

  const move = (e, i, dir) => {
    const row = e.currentTarget.closest('[data-key]');
    anchor.current = { key: items[i].key, dir, top: row.getBoundingClientRect().top, focus: document.activeElement === e.currentTarget };
    onMove(i, dir);
  };

  const rows = [];
  items.forEach((it, i) => {
    const t = it.task;
    const b = blocks[i] || {};
    const name = nameOf(t, i);
    const done = it.mark !== undefined;
    rows.push(<InsertSlot key={`slot-${it.key}`} items={items} at={i} s={s} size={size} onInsert={onInsert} />);
    rows.push(
      <div
        key={it.key}
        data-key={it.key}
        data-testid="edit-row"
        data-done={done ? 'true' : undefined}
        role="group"
        aria-label={`${i + 1}. ${name}`}
        style={{
          position: 'relative', flex: 'none', minHeight: s.row, boxSizing: 'border-box', borderRadius: 16, padding: `8px ${s.pad}px`,
          background: t.color || '#CCCCCC', display: 'flex', flexDirection: size === 'tv' ? 'row' : 'column', justifyContent: 'center',
          alignItems: size === 'tv' ? 'center' : 'stretch', gap: s.gap,
          boxShadow: [done && doneOverlay(0.62), b.isCurrent && 'inset 0 0 0 4px #fff'].filter(Boolean).join(',') || 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: s.gap, flex: size === 'tv' ? 1 : 'none', minWidth: 0 }}>
          {size === 'tv' && <Arrows i={i} n={items.length} name={name} s={s} move={move} />}
          <span aria-hidden="true" style={{ fontSize: size === 'tv' ? 34 : 22, lineHeight: 1, flex: 'none', whiteSpace: 'nowrap', opacity: done ? 0.55 : 1 }}>{t.icon}</span>
          <input
            type="text"
            aria-label={`Nome da tarefa ${i + 1}`}
            value={t.name ?? ''}
            onChange={(e) => onChange(i, { name: e.target.value })}
            style={{ flex: 1, minWidth: 0, width: '100%', boxSizing: 'border-box', border: 0, borderRadius: 10, padding: size === 'tv' ? '8px 12px' : '6px 9px', background: 'rgba(255,255,255,.92)', color: C.ink, font: `800 ${s.name}px ${NUNITO}` }}
          />
          {size !== 'tv' && b.startMs !== undefined && (
            <span style={{ flex: 'none', font: `800 ${s.small}px ${NUNITO}`, color: done ? C.doneInk : '#fff', textShadow: done ? 'none' : '0 1px 2px rgba(0,0,0,.35)', whiteSpace: 'nowrap' }}>{timeLabel(b.startMs)}</span>
          )}
          {done && (
            <span title="Marcada como feita; a marca continua com a tarefa" style={{ flex: 'none', background: '#fff', color: C.check, borderRadius: 999, padding: size === 'tv' ? '6px 12px' : '3px 8px', font: `900 ${s.small}px ${NUNITO}`, whiteSpace: 'nowrap' }}>✓ feita</span>
          )}
          <SmallBtn label={`Mais opções de ${name}`} title="Ícone, cor ou remover" s={s} onClick={(e) => onDetails(i, e.currentTarget)}>⋯</SmallBtn>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: s.gap, flex: 'none' }}>
          {size !== 'tv' && <Arrows i={i} n={items.length} name={name} s={s} move={move} />}
          <span style={{ flex: 1, minWidth: 0, font: `800 ${s.small}px ${NUNITO}`, color: done ? C.doneInk : '#fff', textShadow: done ? 'none' : '0 1px 2px rgba(0,0,0,.35)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'right', paddingRight: 6 }}>
            {size === 'tv' && b.startMs !== undefined ? `às ${timeLabel(b.startMs)}` : ''}
          </span>
          <SmallBtn label={`Menos 1 minuto em ${name}`} s={s} disabled={!canStep(t, -1)} onClick={() => onStep(i, -1)}>−1</SmallBtn>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 3, flex: 'none', background: '#fff', borderRadius: 10, padding: '0 6px 0 2px', height: s.btnH, boxSizing: 'border-box', font: `800 ${s.small}px ${NUNITO}`, color: C.muted }}>
            <input
              type="number"
              inputMode="numeric"
              min={MIN_TASK_MIN}
              max={MAX_TASK_MIN}
              aria-label={`Minutos de ${name}`}
              value={Number.isFinite(t.minutes) ? t.minutes : ''}
              onChange={(e) => onChange(i, { minutes: parseInt(e.target.value, 10) })}
              style={{ width: size === 'tv' ? 54 : 40, border: 0, background: 'transparent', textAlign: 'center', font: `900 ${s.font}px ${NUNITO}`, color: C.ink, padding: 0, }}
              className="no-spin"
            />
            min
          </label>
          <SmallBtn label={`Mais 1 minuto em ${name}`} s={s} disabled={!canStep(t, 1)} onClick={() => onStep(i, 1)}>+1</SmallBtn>
        </div>
      </div>
    );
  });
  rows.push(<InsertSlot key="slot-end" items={items} at={items.length} s={s} size={size} onInsert={onInsert} />);

  return (
    <div
      ref={scrollRef}
      data-testid="edit-list"
      role="region"
      aria-label="Tarefas em edição"
      className="no-scrollbar"
      style={{ position: 'relative', flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', borderRadius: s.radius, background: C.track, padding: '0 8px', display: 'flex', flexDirection: 'column' }}
    >
      {rows}
    </div>
  );
}

function Arrows({ i, n, name, s, move }) {
  return (
    <span style={{ display: 'inline-flex', gap: 4, flex: 'none' }}>
      <SmallBtn label="Mover tarefa para cima" title={`Mover ${name} para cima`} dataAction="up" s={s} disabled={i === 0} onClick={(e) => move(e, i, -1)}>▲</SmallBtn>
      <SmallBtn label="Mover tarefa para baixo" title={`Mover ${name} para baixo`} dataAction="down" s={s} disabled={i === n - 1} onClick={(e) => move(e, i, 1)}>▼</SmallBtn>
    </span>
  );
}

// −5/+5 on the final milestone: they move the END TIME of the routine (the deadline), never
// the duration of the last task.
export function EndTimeEditor({ edit, size = 'phone' }) {
  const tv = size === 'tv';
  const btn = { ...pillStyle({ font: tv ? 21 : 15, h: tv ? 52 : 44, padX: tv ? 0 : 12 }), ...(tv ? { width: 62 } : {}) };
  const off = (on) => (on ? {} : { opacity: 0.38, cursor: 'not-allowed', boxShadow: 'none' });
  return (
    <div data-testid="end-time-editor" role="group" aria-label="Horário final da rotina" style={{ display: 'flex', gap: 6, flex: 'none' }}>
        <button type="button" className="fita-btn" aria-label="Terminar a rotina 5 minutos mais cedo" title="Antecipa o horário final (não muda a última tarefa)" disabled={!edit.canEarlier} onClick={edit.onEarlier} style={{ ...btn, ...off(edit.canEarlier) }}>−5{!tv && ' min'}</button>
        <button type="button" className="fita-btn" aria-label="Terminar a rotina 5 minutos mais tarde" title="Adia o horário final (não muda a última tarefa)" disabled={!edit.canLater} onClick={edit.onLater} style={{ ...btn, ...off(edit.canLater) }}>+5{!tv && ' min'}</button>
    </div>
  );
}

// What −5/+5 mean, and whether the end time still leaves room for the tasks.
export function EndTimeNote({ edit, endLabel, size = 'phone' }) {
  const tv = size === 'tv';
  const st = edit.status;
  const warn = st.kind === 'overdue'
    ? { bg: C.redBg, ink: C.red, text: `⏰ ${endLabel} já passou. Use +5 para dar mais tempo.` }
    : st.kind === 'tight'
    ? { bg: C.amberBg, ink: C.amberInk, text: `⚠️ Apertado: faltam ${st.needed} min de tarefas e só há ${st.available} min até ${endLabel}.` }
    : null;
  return (
    <div data-testid="end-time-note" style={{ display: 'flex', flexDirection: 'column', gap: tv ? 10 : 4, font: `700 ${tv ? 19 : 12}px/1.3 ${NUNITO}`, color: C.muted }}>
      <div>
        <strong style={{ color: C.ink }}>−5/+5 mudam o horário final da rotina</strong>, não a duração da última tarefa.
        {edit.endChanged && <> Antes: <strong style={{ color: C.ink }}>{edit.originalEnd}</strong>.</>}
      </div>
      {warn && <div role="status" data-kind={st.kind} style={{ background: warn.bg, color: warn.ink, borderRadius: 12, padding: tv ? '10px 14px' : '5px 9px', font: `800 ${tv ? 19 : 13}px/1.3 ${NUNITO}` }}>{warn.text}</div>}
    </div>
  );
}

// Big end time of the routine, on the final milestone (phone footer, TV closing controls).
export function EndTime({ label, size = 'phone', light = false, caption = 'FIM', inline = false }) {
  const tv = size === 'tv';
  return (
    <div data-testid="end-time" style={{ display: 'flex', flexDirection: inline ? 'row' : 'column', alignItems: inline ? 'baseline' : tv ? 'center' : 'flex-end', gap: inline ? 5 : 2, lineHeight: 1, flex: 'none' }}>
      <span style={{ font: `900 ${tv ? 15 : 10}px ${NUNITO}`, letterSpacing: tv ? 2.5 : 1.5, color: light ? 'rgba(255,255,255,.95)' : C.muted }}>{caption}</span>
      <span style={{ fontFamily: FREDOKA, fontWeight: 600, fontSize: tv ? 46 : 26, letterSpacing: tv ? -1 : 0, fontVariantNumeric: 'tabular-nums', color: light ? '#fff' : C.ink, textShadow: light ? '0 1px 3px rgba(0,0,0,.3)' : 'none' }}>{label}</span>
    </div>
  );
}

// Dialog to insert a task between two others, or to change one (icon, color, removal).
// Escape or the backdrop close it; focus goes back to the button that opened it.
export function TaskDialog({ dialog, catalog, onClose, onSubmit, onRemove }) {
  const [form, setForm] = React.useState(() => ({ ...dialog.task }));
  const panelRef = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const isNew = dialog.mode === 'insert';
  const titleId = React.useId();

  useEffect(() => {
    panelRef.current?.focus();
    const opener = dialog.opener;
    const onKey = (e) => { if (e.key === 'Escape') closeRef.current(); };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); if (opener?.isConnected) opener.focus(); };
  }, [dialog.opener]);

  const minutes = Number.isFinite(form.minutes) ? form.minutes : '';
  const step = (d) => setForm((f) => ({ ...f, minutes: Math.min(MAX_TASK_MIN, Math.max(MIN_TASK_MIN, (Number(f.minutes) || 0) + d)) }));
  const valid = String(form.name || '').trim() && Number(form.minutes) >= MIN_TASK_MIN && Number(form.minutes) <= MAX_TASK_MIN;
  const field = { border: `2px solid ${C.toggleBg}`, borderRadius: 12, padding: '8px 10px', font: `700 16px ${NUNITO}`, color: C.ink, boxSizing: 'border-box', background: '#fff' };
  const label = { display: 'flex', flexDirection: 'column', gap: 4, font: `800 13px ${NUNITO}`, color: C.muted };
  const pick = (id, item) => setForm((f) => ({ ...f, name: item.name, icon: item.icon, color: item.color, catalogIds: [id] }));

  return (
    // The backdrop is a mouse convenience; Escape and the buttons do the same from the keyboard.
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(42,33,24,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        style={{ width: '100%', maxWidth: 460, maxHeight: 'calc(100dvh - 24px)', overflowY: 'auto', boxSizing: 'border-box', background: C.bg, borderRadius: 24, padding: 18, display: 'flex', flexDirection: 'column', gap: 14, boxShadow: '0 12px 40px rgba(42,33,24,.3)', outline: 'none', fontFamily: NUNITO, color: C.ink }}
      >
        <div>
          <h2 id={titleId} style={{ margin: 0, fontFamily: FREDOKA, fontWeight: 600, fontSize: 24 }}>{isNew ? 'Nova tarefa' : 'Editar tarefa'}</h2>
          <div style={{ font: `700 14px ${NUNITO}`, color: C.muted }}>{dialog.where}</div>
        </div>
        {isNew && (
          <div role="group" aria-label="Sugestões" style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {Object.entries(catalog).map(([id, item]) => (
              <button key={id} type="button" className="fita-btn" aria-pressed={form.catalogIds?.[0] === id && form.name === item.name} onClick={() => pick(id, item)}
                style={{ ...pillStyle({ font: 13, h: 36, padX: 10 }), ...(form.catalogIds?.[0] === id && form.name === item.name ? { boxShadow: `inset 0 0 0 3px ${C.sun}` } : {}) }}>
                <span aria-hidden="true">{item.icon}</span>{item.name}
              </button>
            ))}
          </div>
        )}
        <form
          onSubmit={(e) => { e.preventDefault(); if (valid) onSubmit({ ...form, minutes: Number(form.minutes) }); }}
          style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
        >
          <label style={label}>
            Nome
            <input type="text" value={form.name ?? ''} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} style={field} />
          </label>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <label style={label}>
              Ícone
              <input type="text" value={form.icon ?? ''} onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))} style={{ ...field, width: 84, textAlign: 'center' }} />
            </label>
            <label style={label}>
              Cor
              <input type="color" value={/^#[0-9a-f]{6}$/i.test(form.color || '') ? form.color : '#cccccc'} onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))} style={{ ...field, width: 64, height: 44, padding: 4 }} />
            </label>
            <div style={label}>
              <span id={`${titleId}-min`}>Duração</span>
              <div role="group" aria-labelledby={`${titleId}-min`} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button type="button" className="fita-btn" aria-label="Menos 1 minuto" disabled={!(Number(form.minutes) > MIN_TASK_MIN)} onClick={() => step(-1)} style={{ ...pillStyle({ h: 44, padX: 0 }), width: 44 }}>−1</button>
                <input type="number" inputMode="numeric" min={MIN_TASK_MIN} max={MAX_TASK_MIN} aria-label="Minutos" value={minutes} onChange={(e) => setForm((f) => ({ ...f, minutes: parseInt(e.target.value, 10) }))} style={{ ...field, width: 64, textAlign: 'center' }} />
                <button type="button" className="fita-btn" aria-label="Mais 1 minuto" disabled={!(Number(form.minutes) < MAX_TASK_MIN)} onClick={() => step(1)} style={{ ...pillStyle({ h: 44, padX: 0 }), width: 44 }}>+1</button>
                <span style={{ font: `800 14px ${NUNITO}` }}>min</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end', marginTop: 4 }}>
            {!isNew && <button type="button" className="fita-btn" onClick={onRemove} style={{ ...pillStyle({ tone: 'danger', h: 44 }), marginRight: 'auto' }}>Remover tarefa</button>}
            <button type="button" className="fita-btn" onClick={onClose} style={pillStyle({ h: 44 })}>Voltar</button>
            <button type="submit" className="fita-btn" disabled={!valid} style={pillStyle({ tone: 'sun', h: 44 })}>{isNew ? 'Adicionar tarefa' : 'Aplicar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
