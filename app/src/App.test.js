import { act, fireEvent, render, screen } from '@testing-library/react';
import App from './App';

const defaults = { monday: {
  morning: { name: 'Manhã local', endTime: '06:30', tasks: [{ id: 1, name: 'Café local', minutes: 5, icon: '☕', color: '#123456' }] },
  evening: { name: 'Noite local', endTime: '21:00', tasks: [{ id: 1, name: 'Jantar local', minutes: 5, icon: '🍽️', color: '#123456' }] },
} };
const stored = () => JSON.parse(localStorage.getItem('routines'));
const open = search => window.history.replaceState({}, '', '/' + search);
const edit = () => {
  fireEvent.click(screen.getByRole('button', { name: 'Menu dos pais' }));
  fireEvent.click(screen.getByRole('button', { name: /Editar esta rotina/ }));
};
beforeEach(() => {
  localStorage.clear();
  open('');
  global.fetch = jest.fn(() => Promise.resolve({ json: () => Promise.resolve(defaults) }));
});
afterEach(() => { jest.restoreAllMocks(); jest.useRealTimers(); });

test('shows loading state while routines load', () => {
  global.fetch = jest.fn(() => new Promise(() => {}));
  render(<App />);
  expect(screen.getByText(/carregando rotinas/i)).toBeInTheDocument();
});

test('URL beats local, selects evening, preserves morning and edits across ticks/plain reentry; reload restores URL', async () => {
  jest.useFakeTimers();
  localStorage.setItem('routines', JSON.stringify(defaults));
  open('?rotina=1%7Cn%7Cba%3A15%2Cja%3A20');
  const view = render(<App />);
  expect(await screen.findByRole('button', { name: 'Pular para Banho' })).toBeInTheDocument();
  expect(global.fetch).not.toHaveBeenCalled();
  expect(stored().monday.morning).toEqual(defaults.monday.morning);
  edit();
  fireEvent.change(screen.getByDisplayValue('Banho'), { target: { value: 'Banho editado' } });
  fireEvent.change(screen.getByDisplayValue('15'), { target: { value: '12' } });
  fireEvent.click(screen.getAllByRole('button', { name: 'Mover tarefa para baixo' })[0]);
  fireEvent.click(screen.getByRole('button', { name: 'Save Routine' }));
  act(() => jest.advanceTimersByTime(3000));
  view.rerender(<App />);
  expect(screen.getByRole('button', { name: 'Pular para Banho editado' })).toBeInTheDocument();
  expect(stored().monday.evening.tasks.map(t => [t.name, t.minutes])).toEqual([['Jantar', 20], ['Banho editado', 12]]);
  view.unmount();
  jest.useRealTimers();
  open('?utm=irrelevant');
  const plain = render(<App />);
  fireEvent.click(await screen.findByRole('button', { name: /Noite/ }));
  expect(screen.getByRole('button', { name: 'Pular para Banho editado' })).toBeInTheDocument();
  plain.unmount();
  open('?rotina=1%7Cn%7Cba%3A15%2Cja%3A20');
  render(<App />);
  expect(await screen.findByRole('button', { name: 'Pular para Banho' })).toBeInTheDocument();
  expect(stored().monday.evening.tasks[0].minutes).toBe(15);
});

test('URL beats fetched defaults on a fresh browser', async () => {
  open('?rotina=1%7Cn%7Cba%3A15');
  render(<App />);
  expect(await screen.findByRole('button', { name: 'Pular para Banho' })).toBeInTheDocument();
  expect(stored().monday.morning).toEqual(defaults.monday.morning);
  expect(stored().monday.evening.tasks[0]).toMatchObject({ name: 'Banho', minutes: 15 });
});

test.each(['?rotina=2%7Cn%7Cba%3A15', '?rotina=%FF', '?rotina=1%7Cn%7Cba%3A0'])('invalid link %s preserves storage byte for byte', async search => {
  const original = JSON.stringify(defaults);
  localStorage.setItem('routines', original);
  open(search);
  render(<App />);
  expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível carregar');
  expect(await screen.findByRole('button', { name: 'Pular para Café local' })).toBeInTheDocument();
  expect(localStorage.getItem('routines')).toBe(original);
});

test('invalid link falls back to defaults without writing storage', async () => {
  open('?rotina=bad');
  render(<App />);
  expect(await screen.findByRole('button', { name: 'Pular para Café local' })).toBeInTheDocument();
  expect(localStorage.getItem('routines')).toBeNull();
});

test('irrelevant query loads defaults then keeps local config', async () => {
  open('?utm=%FF');
  const view = render(<App />);
  expect(await screen.findByRole('button', { name: 'Pular para Café local' })).toBeInTheDocument();
  expect(stored()).toEqual(defaults);
  view.unmount();
  global.fetch.mockClear();
  render(<App />);
  expect(await screen.findByRole('button', { name: 'Pular para Café local' })).toBeInTheDocument();
  expect(global.fetch).not.toHaveBeenCalled();
});

test('custom HTML-looking name renders as text', async () => {
  const name = '<img src=x onerror=alert(1)>';
  open('?' + new URLSearchParams({ rotina: '1|n|~' + encodeURIComponent(name) + ':5' }));
  const { container } = render(<App />);
  expect(await screen.findByRole('button', { name: 'Pular para ' + name })).toBeInTheDocument();
  expect(container.querySelector('img[src="x"]')).toBeNull();
});

test('URL works if storage and default fetch fail', async () => {
  jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  global.fetch = jest.fn(() => Promise.reject(new Error('offline')));
  open('?rotina=1%7Cn%7Cba%3A15');
  render(<App />);
  expect(await screen.findByRole('button', { name: 'Pular para Banho' })).toBeInTheDocument();
});
