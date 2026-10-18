import React from 'react';
import { vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import Home from './Home';
import { WAKE_LOCK_KEY } from '../hooks/useScreenWakeLock';

const routines = { monday: { morning: { name: 'Manhã', endTime: '07:00', tasks: [
  { id: 1, name: 'Café', icon: '☕', color: '#f97316', minutes: 20 },
  { id: 2, name: 'Mochila', icon: '🎒', color: '#0ea5e9', minutes: 10 },
] } } };
const now = (hour, minute) => { const time = new Date(); time.setHours(hour, minute, 0, 0); return time; };
let request;
const menu = () => fireEvent.click(screen.getByRole('button', { name: 'Menu dos pais' }));
beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('isSecureContext', true);
  request = vi.fn(async () => {
    const lock = new EventTarget();
    lock.release = vi.fn(async () => { lock.dispatchEvent(new Event('release')); });
    return lock;
  });
  Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { request } });
});
afterEach(() => vi.unstubAllGlobals());

test('menu separates preference and actual status; full editor releases, cancel restores; inline edit keeps lock', async () => {
  const initialUrl = window.location.href;
  render(<Home routines={routines} setRoutines={vi.fn()} currentTime={now(6, 35)} />);
  menu();
  const option = screen.getByRole('checkbox', { name: 'Manter tela ligada' });
  expect(option).not.toBeChecked();
  expect(option).toHaveAccessibleDescription('Desativado: a tela pode apagar.');
  fireEvent.click(option);
  expect(await screen.findByText(/Ativo:/)).toBeInTheDocument();
  expect(screen.getByRole('dialog', { name: 'Menu dos pais' })).toBeInTheDocument();
  expect(window.location.href).toBe(initialUrl);
  expect(localStorage.getItem('routines')).toBeNull();
  const first = await request.mock.results[0].value;
  fireEvent.click(screen.getByRole('button', { name: '⚙️ Rotinas' }));
  expect(first.release).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
  await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
  menu();
  expect(await screen.findByText(/Ativo:/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '✏️ Editar esta rotina' }));
  expect(request).toHaveBeenCalledTimes(2);
  const second = await request.mock.results[1].value;
  expect(second.release).not.toHaveBeenCalled();
});

test('only explicit completion of every task releases; restarting reacquires', async () => {
  localStorage.setItem(WAKE_LOCK_KEY, 'true');
  render(<Home routines={routines} setRoutines={vi.fn()} currentTime={now(6, 35)} />);
  menu();
  expect(await screen.findByText(/Ativo:/)).toBeInTheDocument();
  const lock = await request.mock.results[0].value;
  menu();
  fireEvent.click(screen.getByRole('button', { name: 'Marcar Café como feita' }));
  expect(lock.release).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Marcar Mochila como feita' }));
  expect(lock.release).toHaveBeenCalledTimes(1);
  menu();
  expect(screen.getByText(/todas as tarefas/)).toBeInTheDocument();
  menu();
  fireEvent.click(screen.getByRole('button', { name: 'Pular para Café' }));
  await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
});

test('overtime alone does not release the visible routine', async () => {
  localStorage.setItem(WAKE_LOCK_KEY, 'true');
  const utils = render(<Home routines={routines} setRoutines={vi.fn()} currentTime={now(6, 35)} />);
  menu();
  expect(await screen.findByText(/Ativo:/)).toBeInTheDocument();
  const lock = await request.mock.results[0].value;
  utils.rerender(<Home routines={routines} setRoutines={vi.fn()} currentTime={now(7, 10)} />);
  expect(screen.getByText(/Ativo:/)).toBeInTheDocument();
  expect(lock.release).not.toHaveBeenCalled();
  expect(request).toHaveBeenCalledTimes(1);
});
