import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import Home from './Home';
import { registerPwa } from '../pwa/registerPwa';

vi.mock('../pwa/registerPwa', () => ({ registerPwa: vi.fn() }));
const routines = { monday: { morning: { name: 'Manhã', endTime: '07:20', tasks: [
  { id: 1, name: 'Café', minutes: 20, color: '#FFB703', icon: '☕️' },
] } } };
let announce;
let worker;

beforeEach(() => {
  worker = { state: 'installed', postMessage: vi.fn() };
  registerPwa.mockImplementation(options => { announce = () => options.onUpdate(worker); return () => {}; });
  localStorage.setItem('unrelated', 'keep');
  window.history.replaceState(null, '', '/');
});

test.each([
  ['Editar esta rotina', 'Save Routine'],
  ['Rotinas', 'Salvar Alterações'],
])('real editor %s keeps draft and storage intact while an update waits', (editor, save) => {
  const setRoutines = vi.fn();
  render(<Home routines={routines} setRoutines={setRoutines} currentTime={new Date()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Menu dos pais' }));
  fireEvent.click(screen.getByRole('button', { name: new RegExp(editor) }));
  fireEvent.change(screen.getByDisplayValue('Café'), { target: { value: 'Café editado' } });
  act(() => announce());
  expect(screen.getByRole('button', { name: 'Atualizar agora' })).toBeDisabled();
  expect(screen.getByDisplayValue('Café editado')).toBeInTheDocument();
  expect(localStorage.getItem('unrelated')).toBe('keep');
  expect(worker.postMessage).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: save }));
  expect(JSON.parse(localStorage.getItem('routines')).monday.morning.tasks[0].name).toBe('Café editado');
  expect(localStorage.getItem('unrelated')).toBe('keep');
  expect(screen.getByRole('button', { name: 'Atualizar agora' })).toBeEnabled();
  expect(setRoutines).toHaveBeenCalled();
});
