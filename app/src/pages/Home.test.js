import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import Home from './Home';

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

function setPhone(isPhone) {
  window.matchMedia = isPhone
    ? () => ({ matches: true, addEventListener() {}, removeEventListener() {} })
    : undefined;
}

function renderEvening(now, { phone = false } = {}) {
  setPhone(phone);
  const setRoutines = jest.fn();
  const utils = render(<Home routines={routines} setRoutines={setRoutines} currentTime={now} />);
  // Morning is the default; switch to evening.
  fireEvent.click(phone ? screen.getByLabelText('Noite') : screen.getByRole('button', { name: /Noite/ }));
  return { ...utils, setRoutines };
}

const dot = (name) => screen.getByRole('button', { name: new RegExp(`^(Marcar ${name} como feita|${name}: feita)`) });

beforeEach(() => localStorage.clear());
afterAll(() => setPhone(false));

test('every task has an accessible completion dot, done or not', () => {
  renderEvening(today(19, 45));
  for (const name of ['Banho', 'Jantar', 'Dentes', 'Historinha']) {
    expect(dot(name)).toHaveAttribute('aria-pressed', 'false');
  }
});

test('marking the current task done advances to the next one and keeps 20:30 (dot does not start the task)', () => {
  renderEvening(today(19, 40));
  expect(screen.getByText('TERMINA 20:30')).toBeInTheDocument();
  fireEvent.click(dot('Banho'));
  expect(dot('Banho')).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByText('TERMINA 20:30')).toBeInTheDocument();
  // Jantar is now: 19:40 → 20:05 (20 + its share of the 10 freed minutes)
  expect(screen.getByText('Termina às 20:05')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Pular para Jantar' })).toHaveAttribute('title', 'Jantar — 25 min');
});

test('the dot of a future task marks it; its time goes to the current and pending tasks', () => {
  renderEvening(today(19, 35));
  fireEvent.click(dot('Dentes'));
  expect(dot('Dentes')).toHaveAttribute('aria-pressed', 'true');
  expect(dot('Banho')).toHaveAttribute('aria-pressed', 'false');
  // 10 min shared 20:20:10 → Banho 24 (still in progress, ends 19:54), Jantar 24, Historinha 12
  expect(screen.getByText('Termina às 19:54')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Pular para Banho' })).toHaveAttribute('title', 'Banho — 24 min');
  expect(screen.getByRole('button', { name: 'Pular para Historinha' })).toHaveAttribute('title', 'Historinha — 12 min');
  expect(screen.getByText('TERMINA 20:30')).toBeInTheDocument();
});

test('+5 min pushes the deadline five minutes per click', () => {
  renderEvening(today(19, 40));
  const plus = screen.getByRole('button', { name: 'Mais 5 minutos até Hora de dormir' });
  fireEvent.click(plus);
  expect(screen.getByText('TERMINA 20:35')).toBeInTheDocument();
  fireEvent.click(plus);
  fireEvent.click(plus);
  expect(screen.getByText('TERMINA 20:45')).toBeInTheDocument();
});

test('clicking a task body starts it now and keeps a near deadline', () => {
  renderEvening(today(19, 55));
  fireEvent.click(screen.getByRole('button', { name: 'Pular para Banho' }));
  expect(screen.getByText('TERMINA 20:30')).toBeInTheDocument();
  expect(dot('Jantar')).toHaveAttribute('aria-pressed', 'false');
  // 35 min shared 20:20:10:10 → Banho ends at 20:06:40
  expect(screen.getByText('Termina às 20:06')).toBeInTheDocument();
});

test('morning shows "Hora de sair" with its own +5 button', () => {
  setPhone(false);
  render(<Home routines={routines} setRoutines={jest.fn()} currentTime={today(6, 40)} />);
  expect(screen.getByRole('button', { name: 'Mais 5 minutos até Hora de sair' })).toBeInTheDocument();
  expect(dot('Café')).toBeInTheDocument();
});

test('phone layout: dots and +5 work too; marking does not rewrite saved routines', () => {
  const { setRoutines } = renderEvening(today(19, 40), { phone: true });
  fireEvent.click(dot('Banho'));
  expect(dot('Banho')).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByText('25:00')).toBeInTheDocument(); // Jantar now has 25 min
  fireEvent.click(screen.getByRole('button', { name: 'Mais 5 minutos até Hora de dormir' }));
  expect(screen.getByText('27:30')).toBeInTheDocument(); // + its 20/40 share of 5 min
  expect(setRoutines).not.toHaveBeenCalled();
  expect(localStorage.getItem('routines')).toBeNull();
  expect(routines.monday.evening.tasks.map((t) => t.minutes)).toEqual([20, 20, 10, 10]);
});

// marca-feito-scroll-fix follow-up -------------------------------------------------------

describe('parents menu (✨)', () => {
  const openMenu = () => fireEvent.click(screen.getByRole('button', { name: 'Menu dos pais' }));
  const panel = () => screen.queryByRole('dialog', { name: 'Menu dos pais' });

  test('closes on a click outside it, not when its controls are used', () => {
    renderEvening(today(19, 40));
    openMenu();
    expect(panel()).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Menu dos pais' })).toHaveAttribute('aria-expanded', 'true');
    // Using the controls inside keeps it open.
    fireEvent.pointerDown(screen.getByLabelText('Horário final'));
    fireEvent.change(screen.getByLabelText('Horário final'), { target: { value: '20:45' } });
    fireEvent.pointerDown(panel());
    expect(panel()).toBeInTheDocument();
    // A click anywhere else closes it (no need to hit ✨ again).
    fireEvent.pointerDown(screen.getByText('Rotina da Nina'));
    expect(panel()).toBeNull();
    expect(screen.getByRole('button', { name: 'Menu dos pais' })).toHaveAttribute('aria-expanded', 'false');
    // ✨ still toggles.
    openMenu();
    openMenu();
    expect(panel()).toBeNull();
  });

  test('Escape closes it and gives focus back to ✨; keyboard opening focuses the first item; Tab out closes', () => {
    renderEvening(today(19, 40));
    const badge = screen.getByRole('button', { name: 'Menu dos pais' });
    badge.focus();
    fireEvent.click(badge, { detail: 0 }); // keyboard activation (Enter/Space) has detail 0
    expect(screen.getByRole('button', { name: '✏️ Editar esta rotina' })).toHaveFocus();
    fireEvent.keyDown(document.activeElement, { key: 'Escape' });
    expect(panel()).toBeNull();
    expect(badge).toHaveFocus();
    fireEvent.click(badge, { detail: 0 });
    const outside = screen.getByRole('button', { name: /Noite/ });
    fireEvent.blur(screen.getByRole('button', { name: '✏️ Editar esta rotina' }), { relatedTarget: outside });
    expect(panel()).toBeNull();
  });
});

describe('done marks survive deadline changes and saves', () => {
  const openMenu = () => fireEvent.click(screen.getByRole('button', { name: 'Menu dos pais' }));

  test.each([false, true])('mark → menu → change the deadline: still done (phone: %s)', (phone) => {
    renderEvening(today(19, 35), { phone });
    fireEvent.click(dot('Dentes')); // future task, done ahead of time
    fireEvent.click(dot('Banho')); // the task in progress
    openMenu();
    fireEvent.change(screen.getByLabelText('Horário final'), { target: { value: '20:45' } });
    expect(dot('Dentes')).toHaveAttribute('aria-pressed', 'true');
    expect(dot('Banho')).toHaveAttribute('aria-pressed', 'true');
    expect(dot('Jantar')).toHaveAttribute('aria-pressed', 'false');
    if (!phone) expect(screen.getByText('TERMINA 20:45')).toBeInTheDocument();
    // Fresh schedule for 20:45 (starts 19:45 → Banho would be in progress at 19:35… it is
    // done, so Jantar runs now) with the marked tasks' time given to the others.
    fireEvent.change(screen.getByLabelText('Horário final'), { target: { value: '20:15' } });
    expect(dot('Dentes')).toHaveAttribute('aria-pressed', 'true');
    expect(dot('Banho')).toHaveAttribute('aria-pressed', 'true');
    // Turning the deadline off/on keeps them too.
    fireEvent.click(screen.getByRole('checkbox'));
    expect(dot('Dentes')).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('checkbox'));
    expect(dot('Dentes')).toHaveAttribute('aria-pressed', 'true');
  });

  test('changing the deadline with nothing marked still gives the plain schedule', () => {
    renderEvening(today(19, 40));
    openMenu();
    fireEvent.change(screen.getByLabelText('Horário final'), { target: { value: '20:40' } });
    expect(screen.getByText('TERMINA 20:40')).toBeInTheDocument();
    expect(screen.getByText('Termina às 20:00')).toBeInTheDocument(); // Banho 19:40 → 20:00
  });

  function Stateful({ now }) {
    const [state, setState] = React.useState(routines);
    return <Home routines={state} setRoutines={setState} currentTime={now} />;
  }

  test('mark → edit the routine → save: the task is still done', () => {
    setPhone(false);
    render(<Stateful now={today(19, 40)} />);
    fireEvent.click(screen.getByRole('button', { name: /Noite/ }));
    fireEvent.click(dot('Dentes'));
    openMenu();
    fireEvent.click(screen.getByRole('button', { name: '✏️ Editar esta rotina' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save Routine' }));
    expect(dot('Dentes')).toHaveAttribute('aria-pressed', 'true');
    expect(dot('Banho')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('TERMINA 20:30')).toBeInTheDocument();
  });

  test('mark → change the end time in "Rotinas" → save: the task is still done, new deadline applies', () => {
    setPhone(false);
    render(<Stateful now={today(19, 40)} />);
    fireEvent.click(screen.getByRole('button', { name: /Noite/ }));
    fireEvent.click(dot('Banho'));
    openMenu();
    fireEvent.click(screen.getByRole('button', { name: '⚙️ Rotinas' }));
    const times = screen.getAllByDisplayValue('20:30');
    fireEvent.change(times[0], { target: { value: '20:50' } });
    fireEvent.click(screen.getByRole('button', { name: /Salvar/ }));
    expect(screen.getByText('TERMINA 20:50')).toBeInTheDocument();
    expect(dot('Banho')).toHaveAttribute('aria-pressed', 'true');
  });
});
