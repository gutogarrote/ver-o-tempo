import { vi } from 'vitest';
import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import Home from './Home';

// Edit mode on the main screen (issues #14, #15, #16, #23, #24, #25, #26): a draft that only
// Salvar persists and Cancelar drops, with marks that travel with their tasks.

const today = (h, m) => {
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
};

const routines = {
  monday: {
    morning: {
      name: 'Manhã', endTime: '07:00',
      tasks: [
        { id: 1, name: 'Café', icon: '☕️', color: '#f97316', minutes: 20 },
        { id: 2, name: 'Mochila', icon: '🎒', color: '#0ea5e9', minutes: 10 },
        { id: 3, name: 'Sapatos', icon: '👟', color: '#ef4444', minutes: 1 },
      ],
    },
    evening: {
      name: 'Noite', endTime: '20:30',
      tasks: [
        { id: 1, name: 'Banho', icon: '🛁', color: '#38bdf8', minutes: 20 },
        { id: 2, name: 'Jantar', icon: '🍽️', color: '#fb923c', minutes: 20 },
        { id: 3, name: 'Dentes', icon: '🪥', color: '#a78bfa', minutes: 10 },
        { id: 4, name: 'Historinha', icon: '📖', color: '#f59e0b', minutes: 10 },
      ],
    },
  },
};
const original = JSON.stringify(routines);

function setPhone(phone) {
  window.matchMedia = phone ? () => ({ matches: true, addEventListener() {}, removeEventListener() {} }) : undefined;
}

// Home with real routines state (saves re-render it, as App does).
function Stateful({ now, period, onSet }) {
  const [state, setState] = React.useState(routines);
  return <Home routines={state} setRoutines={(r) => { onSet(r); setState(r); }} currentTime={now} initialRoutineId={period} />;
}

function renderHome({ phone = false, period = 'evening', now = today(19, 40) } = {}) {
  setPhone(phone);
  window.history.replaceState(null, '', '/');
  const onSet = vi.fn();
  const utils = render(<Stateful now={now} period={period} onSet={onSet} />);
  const rerenderAt = (t) => utils.rerender(<Stateful now={t} period={period} onSet={onSet} />);
  return { ...utils, onSet, rerenderAt };
}

const btn = (name) => screen.getByRole('button', { name });
const enterEdit = () => fireEvent.click(btn('Editar rotina'));
const save = () => fireEvent.click(btn('Salvar'));
const cancel = () => fireEvent.click(btn('Cancelar'));
const names = () => screen.getAllByRole('textbox', { name: /^Nome da tarefa/ }).map((i) => i.value);
const minutes = () => screen.getAllByRole('spinbutton', { name: /^Minutos de/ }).map((i) => Number(i.value));
const ups = () => screen.getAllByRole('button', { name: 'Mover tarefa para cima' });
const downs = () => screen.getAllByRole('button', { name: 'Mover tarefa para baixo' });
const dot = (name) => screen.getByRole('button', { name: new RegExp(`^(Marcar ${name} como feita|${name}: feita)`) });
const marked = (name) => dot(name).getAttribute('aria-pressed') === 'true';
const stored = () => JSON.parse(localStorage.getItem('routines'));
const routineLink = () => new URLSearchParams(window.location.search).get('rotina');
// Final time of the routine on the final milestone (phone footer / TV closing controls).
const endTimes = () => screen.getAllByTestId('end-time').map((e) => e.textContent);

beforeEach(() => localStorage.clear());
afterAll(() => setPhone(false));

describe.each([false, true])('edit mode (phone: %s)', (phone) => {
  test('normal use hides every edit control; ✏️ reveals them; Cancelar hides them again', () => {
    renderHome({ phone });
    expect(screen.queryByRole('button', { name: 'Mover tarefa para cima' })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Inserir tarefa/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Menos 1 minuto/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /5 minutos mais cedo/ })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Salvar' })).toBeNull();
    expect(btn('Mais 5 minutos até Hora de dormir')).toBeEnabled();

    enterEdit();
    expect(ups()).toHaveLength(4);
    expect(downs()).toHaveLength(4);
    expect(screen.getAllByRole('button', { name: /^Inserir tarefa/ })).toHaveLength(5);
    expect(screen.getAllByRole('button', { name: /^Mais 1 minuto em/ })).toHaveLength(4);
    expect(btn('Terminar a rotina 5 minutos mais cedo')).toBeInTheDocument();
    expect(btn('Terminar a rotina 5 minutos mais tarde')).toBeInTheDocument();
    // The normal +5 (this run only) and ✏️ give way to the edit controls.
    expect(screen.queryByRole('button', { name: 'Mais 5 minutos até Hora de dormir' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Editar rotina' })).toBeNull();

    cancel();
    expect(screen.queryByRole('button', { name: 'Mover tarefa para cima' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Salvar' })).toBeNull();
    expect(btn('Editar rotina')).toBeInTheDocument();
  });

  test('first ▲ and last ▼ are disabled; every tap swaps neighbours, also across both ends', () => {
    renderHome({ phone });
    enterEdit();
    expect(ups()[0]).toBeDisabled();
    expect(downs()[3]).toBeDisabled();
    expect(ups().slice(1).every((b) => !b.disabled)).toBe(true);
    expect(downs().slice(0, 3).every((b) => !b.disabled)).toBe(true);

    fireEvent.click(downs()[0]);
    expect(names()).toEqual(['Jantar', 'Banho', 'Dentes', 'Historinha']);
    fireEvent.click(downs()[1]);
    expect(names()).toEqual(['Jantar', 'Dentes', 'Banho', 'Historinha']);
    fireEvent.click(downs()[2]);
    expect(names()).toEqual(['Jantar', 'Dentes', 'Historinha', 'Banho']);
    expect(downs()[3]).toBeDisabled();
    fireEvent.click(ups()[1]);
    expect(names()).toEqual(['Dentes', 'Jantar', 'Historinha', 'Banho']);
    expect(ups()[0]).toBeDisabled();
    // Minutes moved with their task.
    expect(minutes()).toEqual([10, 20, 10, 20]);
  });

  test('Cancelar discards reorder, durations, insertion, names and end time: nothing is written', () => {
    const { onSet } = renderHome({ phone });
    const href = window.location.href;
    const replace = vi.spyOn(window.history, 'replaceState');
    enterEdit();
    fireEvent.click(downs()[0]);
    fireEvent.click(btn('Mais 1 minuto em Jantar'));
    fireEvent.click(btn('Menos 1 minuto em Dentes'));
    fireEvent.change(screen.getAllByRole('textbox', { name: /^Nome da tarefa/ })[3], { target: { value: 'Livro' } });
    fireEvent.click(btn('Inserir tarefa entre Banho e Dentes'));
    fireEvent.change(within(screen.getByRole('dialog')).getByRole('textbox', { name: 'Nome' }), { target: { value: 'Pijama' } });
    fireEvent.click(btn('Adicionar tarefa'));
    fireEvent.click(btn('Terminar a rotina 5 minutos mais tarde'));
    expect(names()).toEqual(['Jantar', 'Banho', 'Pijama', 'Dentes', 'Livro']);
    expect(endTimes()).toContain('FIM20:35');

    cancel();
    expect(replace).not.toHaveBeenCalled();
    expect(window.location.href).toBe(href);
    expect(localStorage.getItem('routines')).toBeNull();
    expect(onSet).not.toHaveBeenCalled();
    expect(JSON.stringify(routines)).toBe(original);
    expect(endTimes().join()).toContain('20:30');
    expect(endTimes().join()).not.toContain('20:35');
    // A new edit starts from the routine, not from the dropped draft.
    enterEdit();
    expect(names()).toEqual(['Banho', 'Jantar', 'Dentes', 'Historinha']);
    expect(minutes()).toEqual([20, 20, 10, 10]);
    replace.mockRestore();
  });

  test('Salvar writes storage and the readable link once, and the screen shows the saved routine', () => {
    const { onSet } = renderHome({ phone });
    const replace = vi.spyOn(window.history, 'replaceState');
    enterEdit();
    fireEvent.click(ups()[2]); // Dentes before Jantar
    fireEvent.click(btn('Mais 1 minuto em Historinha'));
    fireEvent.click(btn('Terminar a rotina 5 minutos mais tarde'));
    expect(replace).not.toHaveBeenCalled();
    save();
    expect(replace).toHaveBeenCalledTimes(1);
    expect(onSet).toHaveBeenCalledTimes(1);
    expect(routineLink()).toBe('2.n.ba-20.~Dentes-10.ja-20.~Historinha-11.2035');
    expect(stored().monday.evening).toMatchObject({ endTime: '20:35' });
    expect(stored().monday.evening.tasks.map((t) => [t.id, t.name, t.minutes])).toEqual([[1, 'Banho', 20], [3, 'Dentes', 10], [2, 'Jantar', 20], [4, 'Historinha', 11]]);
    expect(stored().monday.morning).toEqual(routines.monday.morning);
    expect(screen.queryByRole('button', { name: 'Salvar' })).toBeNull();
    expect(endTimes().join()).toContain('20:35');
    if (!phone) expect(screen.getByText('TERMINA 20:35')).toBeInTheDocument();
    replace.mockRestore();
  });

  test('marks survive reorder, durations, insertion and end time; then undone in reverse order, one at a time', () => {
    renderHome({ phone, now: today(19, 45) }); // Banho 19:30–19:50 in progress
    fireEvent.click(dot('Historinha'));
    fireEvent.click(dot('Banho'));
    fireEvent.click(dot('Dentes'));
    enterEdit();
    // Marks are shown and travel with their rows.
    const doneRows = () => screen.getAllByTestId('edit-row').filter((r) => r.dataset.done).map((r) => within(r).getByRole('textbox').value);
    expect(doneRows()).toEqual(['Banho', 'Dentes', 'Historinha']);
    fireEvent.click(ups()[3]); // Historinha above Dentes
    fireEvent.click(ups()[1]); // Jantar first
    fireEvent.click(btn('Mais 1 minuto em Jantar'));
    fireEvent.click(btn('Menos 1 minuto em Dentes'));
    fireEvent.click(btn('Inserir tarefa entre Banho e Historinha'));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /Escovar os dentes/ }));
    fireEvent.click(btn('Adicionar tarefa'));
    fireEvent.click(btn('Terminar a rotina 5 minutos mais tarde'));
    expect(names()).toEqual(['Jantar', 'Banho', 'Escovar os dentes', 'Historinha', 'Dentes']);
    expect(doneRows()).toEqual(['Banho', 'Historinha', 'Dentes']);
    save();
    expect(stored().monday.evening.tasks.map((t) => [t.name, t.minutes])).toEqual([['Jantar', 21], ['Banho', 20], ['Escovar os dentes', 5], ['Historinha', 10], ['Dentes', 9]]);
    expect(stored().monday.evening.tasks[2]).toMatchObject({ id: 5, catalogIds: ['de'], icon: '🪥' });
    expect(['Banho', 'Historinha', 'Dentes'].map(marked)).toEqual([true, true, true]);
    expect(['Jantar', 'Escovar os dentes'].map(marked)).toEqual([false, false]);
    // Undo in reverse order of marking: only that task changes each time.
    fireEvent.click(dot('Dentes'));
    expect(['Banho', 'Historinha', 'Dentes', 'Jantar', 'Escovar os dentes'].map(marked)).toEqual([true, true, false, false, false]);
    fireEvent.click(dot('Banho'));
    expect(['Banho', 'Historinha', 'Dentes', 'Jantar', 'Escovar os dentes'].map(marked)).toEqual([false, true, false, false, false]);
    fireEvent.click(dot('Historinha'));
    expect(['Banho', 'Historinha', 'Dentes', 'Jantar', 'Escovar os dentes'].map(marked)).toEqual([false, false, false, false, false]);
  });

  test('Cancelar keeps the marks exactly as they were', () => {
    renderHome({ phone, now: today(19, 45) });
    fireEvent.click(dot('Jantar'));
    fireEvent.click(dot('Banho'));
    enterEdit();
    fireEvent.click(downs()[0]);
    fireEvent.click(btn('Terminar a rotina 5 minutos mais cedo'));
    cancel();
    expect(['Banho', 'Jantar', 'Dentes', 'Historinha'].map(marked)).toEqual([true, true, false, false]);
    fireEvent.click(dot('Banho'));
    expect(['Banho', 'Jantar'].map(marked)).toEqual([false, true]);
  });

  test('1-minute tasks: −1 stops at 1, times are recalculated, and the link keeps them', () => {
    renderHome({ phone, period: 'morning', now: today(6, 0) });
    enterEdit();
    expect(names()).toEqual(['Café', 'Mochila', 'Sapatos']);
    expect(btn('Menos 1 minuto em Sapatos')).toBeDisabled();
    expect(btn('Mais 1 minuto em Sapatos')).toBeEnabled();
    for (let k = 0; k < 9; k++) fireEvent.click(btn('Menos 1 minuto em Mochila'));
    expect(minutes()).toEqual([20, 1, 1]);
    expect(btn('Menos 1 minuto em Mochila')).toBeDisabled();
    fireEvent.click(btn('Menos 1 minuto em Mochila'));
    expect(minutes()).toEqual([20, 1, 1]);
    // Times are laid back from 07:00: Café 06:38, Mochila 06:58, Sapatos 06:59.
    if (!phone) expect(screen.getByText('COMEÇOU 06:38')).toBeInTheDocument();
    else expect(screen.getAllByTestId('edit-row').map((r) => within(r).getByText(/^\d\d:\d\d$/).textContent)).toEqual(['06:38', '06:58', '06:59']);
    fireEvent.click(downs()[0]);
    fireEvent.click(downs()[1]);
    expect(names()).toEqual(['Mochila', 'Sapatos', 'Café']);
    save();
    expect(routineLink()).toBe('2.m.~Mochila-1.~Sapatos-1.~Café-20.0700');
    expect(stored().monday.morning.tasks.map((t) => t.minutes)).toEqual([1, 1, 20]);
    expect(stored().monday.evening).toEqual(routines.monday.evening);
  });

  test('+ between two tasks opens a dialog that inserts exactly there; Voltar and Escape add nothing', () => {
    renderHome({ phone });
    enterEdit();
    fireEvent.click(btn('Inserir tarefa entre Jantar e Dentes'));
    const dialog = screen.getByRole('dialog', { name: 'Nova tarefa' });
    expect(within(dialog).getByText('Entre Jantar e Dentes')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Adicionar tarefa' })).toBeDisabled();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Voltar' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(btn('Inserir tarefa no início, antes de Banho'));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(names()).toEqual(['Banho', 'Jantar', 'Dentes', 'Historinha']);

    fireEvent.click(btn('Inserir tarefa entre Jantar e Dentes'));
    const d2 = screen.getByRole('dialog', { name: 'Nova tarefa' });
    fireEvent.change(within(d2).getByRole('textbox', { name: 'Nome' }), { target: { value: 'Pijama' } });
    fireEvent.click(within(d2).getByRole('button', { name: 'Mais 1 minuto' }));
    expect(within(d2).getByRole('spinbutton', { name: 'Minutos' })).toHaveValue(6);
    fireEvent.click(within(d2).getByRole('button', { name: 'Adicionar tarefa' }));
    expect(names()).toEqual(['Banho', 'Jantar', 'Pijama', 'Dentes', 'Historinha']);
    expect(minutes()).toEqual([20, 20, 6, 10, 10]);
    fireEvent.click(btn('Inserir tarefa no fim, depois de Historinha'));
    fireEvent.change(within(screen.getByRole('dialog')).getByRole('textbox', { name: 'Nome' }), { target: { value: 'Luz' } });
    fireEvent.click(btn('Adicionar tarefa'));
    expect(names()).toEqual(['Banho', 'Jantar', 'Pijama', 'Dentes', 'Historinha', 'Luz']);
    save();
    expect(stored().monday.evening.tasks.map((t) => t.id)).toEqual([1, 2, 5, 3, 4, 6]);
    expect(btn('Pular para Pijama')).toBeInTheDocument();
  });

  test('⋯ changes icon/color or removes a task, still only in the draft', () => {
    renderHome({ phone });
    enterEdit();
    fireEvent.click(btn('Mais opções de Jantar'));
    const dialog = screen.getByRole('dialog', { name: 'Editar tarefa' });
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Ícone' }), { target: { value: '🥗' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Aplicar' }));
    fireEvent.click(btn('Mais opções de Dentes'));
    fireEvent.click(btn('Remover tarefa'));
    expect(names()).toEqual(['Banho', 'Jantar', 'Historinha']);
    save();
    expect(stored().monday.evening.tasks.map((t) => [t.name, t.icon])).toEqual([['Banho', '🛁'], ['Jantar', '🥗'], ['Historinha', '📖']]);
  });

  test('−5/+5 change the END TIME immediately (not the last task), with tight and past warnings', () => {
    const { rerenderAt } = renderHome({ phone, now: today(20, 20) }); // Historinha 20:20–20:30 now
    enterEdit();
    const end = () => endTimes().join(' ');
    expect(screen.getByTestId('end-time-note')).toHaveTextContent('−5/+5 mudam o horário final da rotina, não a duração da última tarefa.');
    expect(screen.queryByRole('status')).toBeNull();
    fireEvent.click(btn('Terminar a rotina 5 minutos mais tarde'));
    expect(end()).toContain('20:35');
    if (!phone) expect(screen.getByText('TERMINA 20:35')).toBeInTheDocument();
    expect(minutes()).toEqual([20, 20, 10, 10]); // the last task keeps its 10 min
    expect(screen.getByTestId('end-time-note')).toHaveTextContent('Antes: 20:30.');
    fireEvent.click(btn('Terminar a rotina 5 minutos mais cedo'));
    fireEvent.click(btn('Terminar a rotina 5 minutos mais cedo'));
    expect(end()).toContain('20:25');
    expect(screen.getByRole('status')).toHaveTextContent('Apertado: faltam 10 min de tarefas e só há 5 min até 20:25.');
    // Never to a time that is already past.
    expect(btn('Terminar a rotina 5 minutos mais cedo')).toBeDisabled();
    // Time goes by while editing: the same end time becomes past.
    rerenderAt(today(20, 26));
    expect(screen.getByRole('status')).toHaveTextContent('20:25 já passou. Use +5 para dar mais tempo.');
    fireEvent.click(btn('Terminar a rotina 5 minutos mais tarde'));
    fireEvent.click(btn('Terminar a rotina 5 minutos mais tarde'));
    expect(end()).toContain('20:35');
    expect(screen.queryByRole('status')).toBeNull();
    save();
    expect(stored().monday.evening.endTime).toBe('20:35');
    expect(stored().monday.evening.tasks.map((t) => t.minutes)).toEqual([20, 20, 10, 10]);
    expect(routineLink()).toMatch(/\.2035$/);
  });

  test('normal +5 is unchanged: this run only, final time updated at once, nothing saved', () => {
    const { onSet } = renderHome({ phone });
    const href = window.location.href;
    expect(endTimes().join(' ')).toContain('20:30');
    fireEvent.click(btn('Mais 5 minutos até Hora de dormir'));
    expect(endTimes().join(' ')).toContain('20:35');
    expect(endTimes().join(' ')).not.toContain('20:30');
    if (!phone) expect(screen.getByText('TERMINA 20:35')).toBeInTheDocument();
    expect(localStorage.getItem('routines')).toBeNull();
    expect(window.location.href).toBe(href);
    expect(onSet).not.toHaveBeenCalled();
    // The edit mode starts from the end time in effect.
    enterEdit();
    expect(endTimes().join(' ')).toContain('20:35');
    expect(screen.getByTestId('end-time-note')).not.toHaveTextContent('Antes:');
  });

  test('entering and saving with no change writes nothing and keeps the run', () => {
    const { onSet } = renderHome({ phone, now: today(19, 45) });
    fireEvent.click(dot('Jantar'));
    enterEdit();
    fireEvent.click(downs()[0]);
    fireEvent.click(ups()[1]); // back where it was
    save();
    expect(onSet).not.toHaveBeenCalled();
    expect(localStorage.getItem('routines')).toBeNull();
    expect(marked('Jantar')).toBe(true);
  });

  // Issue #26: durations are whole numbers from 1 to 180; invalid typing never reaches storage.
  test.each([['0'], ['-1'], [''], ['2.5'], ['181']])('typed %j: field marked invalid, Salvar disabled, nothing written; a valid value then saves', (text) => {
    const { onSet } = renderHome({ phone });
    const href = window.location.href;
    enterEdit();
    const field = () => screen.getByRole('spinbutton', { name: 'Minutos de Jantar' });
    fireEvent.change(field(), { target: { value: text } });
    expect(field()).toHaveAttribute('aria-invalid', 'true');
    expect(field()).toHaveValue(text === '' ? null : Number(text));
    expect(screen.getByRole('alert')).toHaveTextContent('Duração inválida em Jantar. Use um número inteiro de 1 a 180 minutos.');
    expect(field()).toHaveAccessibleDescription(/Duração inválida em Jantar/);
    expect(btn('Salvar')).toBeDisabled();
    fireEvent.click(btn('Salvar'));
    expect(onSet).not.toHaveBeenCalled();
    expect(localStorage.getItem('routines')).toBeNull();
    expect(window.location.href).toBe(href);
    expect(btn('Cancelar')).toBeEnabled();
    // Fix it by typing, then save: exactly the typed valid value is stored.
    fireEvent.change(field(), { target: { value: '7' } });
    expect(field()).not.toHaveAttribute('aria-invalid');
    expect(screen.queryByRole('alert')).toBeNull();
    save();
    expect(onSet).toHaveBeenCalledTimes(1);
    expect(stored().monday.evening.tasks.map((t) => t.minutes)).toEqual([20, 7, 10, 10]);
  });

  test('invalid typing then Cancelar discards it; −1/+1 also fix an invalid field', () => {
    renderHome({ phone });
    enterEdit();
    const field = () => screen.getByRole('spinbutton', { name: 'Minutos de Dentes' });
    fireEvent.change(field(), { target: { value: '0' } });
    cancel();
    expect(localStorage.getItem('routines')).toBeNull();
    enterEdit();
    expect(field()).toHaveValue(10);
    fireEvent.change(field(), { target: { value: '-1' } });
    fireEvent.click(btn('Mais 1 minuto em Dentes')); // from the last valid duration (10)
    expect(field()).toHaveValue(11);
    expect(btn('Salvar')).toBeEnabled();
    fireEvent.change(field(), { target: { value: '' } });
    fireEvent.click(btn('Menos 1 minuto em Dentes'));
    expect(field()).toHaveValue(10);
    fireEvent.change(field(), { target: { value: '1' } });
    expect(btn('Menos 1 minuto em Dentes')).toBeDisabled();
    save();
    expect(stored().monday.evening.tasks.map((t) => t.minutes)).toEqual([20, 20, 1, 10]);
  });

  test('insertion/details dialog: 0, −1, empty, 2.5 and 181 cannot be added or applied', () => {
    renderHome({ phone });
    enterEdit();
    fireEvent.click(btn('Inserir tarefa entre Banho e Jantar'));
    const dialog = screen.getByRole('dialog', { name: 'Nova tarefa' });
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Nome' }), { target: { value: 'Pijama' } });
    const minutesField = within(dialog).getByRole('spinbutton', { name: 'Minutos' });
    for (const text of ['0', '-1', '', '2.5', '181']) {
      fireEvent.change(minutesField, { target: { value: text } });
      expect(minutesField).toHaveAttribute('aria-invalid', 'true');
      expect(within(dialog).getByRole('alert')).toHaveTextContent('Use um número inteiro de 1 a 180 minutos.');
      expect(within(dialog).getByRole('button', { name: 'Adicionar tarefa' })).toBeDisabled();
    }
    fireEvent.click(within(dialog).getByRole('button', { name: 'Adicionar tarefa' }));
    expect(names()).toEqual(['Banho', 'Jantar', 'Dentes', 'Historinha']);
    fireEvent.change(minutesField, { target: { value: '3' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Adicionar tarefa' }));
    expect(names()).toEqual(['Banho', 'Pijama', 'Jantar', 'Dentes', 'Historinha']);
    expect(minutes()).toEqual([20, 3, 20, 10, 10]);
    fireEvent.click(btn('Mais opções de Historinha'));
    const details = screen.getByRole('dialog', { name: 'Editar tarefa' });
    fireEvent.change(within(details).getByRole('spinbutton', { name: 'Minutos' }), { target: { value: '0' } });
    expect(within(details).getByRole('button', { name: 'Aplicar' })).toBeDisabled();
    fireEvent.click(within(details).getByRole('button', { name: 'Voltar' }));
    expect(minutes()).toEqual([20, 3, 20, 10, 10]);
    save();
    expect(stored().monday.evening.tasks.map((t) => t.minutes)).toEqual([20, 3, 20, 10, 10]);
  });

  test('session actions and the menu are paused while editing', () => {
    renderHome({ phone });
    enterEdit();
    if (phone) {
      expect(screen.queryByRole('button', { name: 'Menu dos pais' })).toBeNull();
    } else {
      expect(btn('Menu dos pais')).toBeDisabled();
      expect(btn('Pular para Banho')).toBeDisabled();
      expect(dot('Banho')).toBeDisabled();
    }
    cancel();
    expect(btn('Menu dos pais')).toBeEnabled();
  });

  test('the menu item "Editar esta rotina" opens this same edit mode', () => {
    renderHome({ phone, period: 'morning', now: today(6, 30) });
    fireEvent.click(btn('Menu dos pais'));
    fireEvent.click(btn('✏️ Editar esta rotina'));
    expect(names()).toEqual(['Café', 'Mochila', 'Sapatos']);
    fireEvent.click(downs()[0]);
    save();
    expect(stored().monday.morning.tasks.map((t) => t.name)).toEqual(['Mochila', 'Café', 'Sapatos']);
    expect(stored().monday.evening).toEqual(routines.monday.evening);
  });
});

describe('final time and menu badge', () => {
  test('phone: the final milestone (pinned and in the ribbon) shows the end time', () => {
    renderHome({ phone: true });
    expect(screen.getByTestId('phone-final')).toHaveTextContent('Hora de dormir');
    expect(screen.getByTestId('phone-final')).toHaveTextContent('20:30');
    expect(screen.getByTestId('phone-closing')).toHaveTextContent('20:30');
    fireEvent.click(btn('Mais 5 minutos até Hora de dormir'));
    expect(screen.getByTestId('phone-final')).toHaveTextContent('20:35');
    expect(screen.getByTestId('phone-closing')).toHaveTextContent('20:35');
  });

  test('TV: end time above +5 min and in the closing; ☰ Menu instead of ✨', () => {
    renderHome({ phone: false });
    expect(endTimes()).toEqual(['FIM20:30']);
    expect(screen.getByTestId('tv-closing')).toHaveTextContent('às 20:30');
    const menu = btn('Menu dos pais');
    expect(menu).toHaveTextContent('Menu');
    expect(menu).not.toHaveTextContent('✨');
  });

  test('phone: ☰ alone (no text), still the parents menu', () => {
    renderHome({ phone: true });
    const menu = btn('Menu dos pais');
    expect(menu).toHaveTextContent(/^$/);
    fireEvent.click(menu);
    expect(screen.getByRole('dialog', { name: 'Menu dos pais' })).toBeInTheDocument();
  });
});

describe('full editor (⚙️ Rotinas) uses the same duration rule', () => {
  test.each([['0'], ['-1'], [''], ['2.5'], ['181']])('typed %j blocks Salvar Alterações; a valid value saves', (text) => {
    const { onSet } = renderHome({ phone: false });
    fireEvent.click(btn('Menu dos pais'));
    fireEvent.click(btn('⚙️ Rotinas'));
    const field = () => screen.getAllByRole('spinbutton', { name: 'Minutos' })[1]; // morning: Mochila
    fireEvent.change(field(), { target: { value: text } });
    expect(field()).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Duração inválida em Manhã: Mochila. Use um número inteiro de 1 a 180 minutos.');
    expect(btn('Salvar Alterações')).toBeDisabled();
    fireEvent.click(btn('Salvar Alterações'));
    expect(onSet).not.toHaveBeenCalled();
    expect(localStorage.getItem('routines')).toBeNull();
    fireEvent.change(field(), { target: { value: '12' } });
    expect(screen.queryByRole('alert')).toBeNull();
    fireEvent.click(btn('Salvar Alterações'));
    expect(stored().monday.morning.tasks.map((t) => t.minutes)).toEqual([20, 12, 1]);
    expect(stored().monday.morning.tasks.every((t) => Number.isInteger(t.minutes))).toBe(true);
  });
});
