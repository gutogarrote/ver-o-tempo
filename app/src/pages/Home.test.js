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

test('the dot of a future task marks it without touching the current one', () => {
  renderEvening(today(19, 35));
  fireEvent.click(dot('Dentes'));
  expect(dot('Dentes')).toHaveAttribute('aria-pressed', 'true');
  expect(dot('Banho')).toHaveAttribute('aria-pressed', 'false');
  expect(screen.getByText('Termina às 19:50')).toBeInTheDocument();
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
