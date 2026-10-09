import React from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import PwaUpdateNotice from './PwaUpdateNotice';
import { registerPwa } from '../pwa/registerPwa';

vi.mock('../pwa/registerPwa', () => ({ registerPwa: vi.fn() }));
let callbacks;
let reload;
let worker;

beforeEach(() => {
  reload = vi.fn();
  worker = { state: 'installed', postMessage: vi.fn() };
  registerPwa.mockImplementation(options => { callbacks = options; return () => {}; });
});

function announce() { act(() => callbacks.onUpdate(worker)); }

test('initial activation and an update accepted by another tab never reload this tab', () => {
  localStorage.setItem('preserved', 'value');
  render(<PwaUpdateNotice editing={false} reload={reload} />);
  act(() => callbacks.onActivated());
  announce();
  act(() => callbacks.onActivated());
  expect(reload).not.toHaveBeenCalled();
  expect(localStorage.getItem('preserved')).toBe('value');
});

test('blocks update throughout editing and permits it after save/cancel', async () => {
  const { rerender } = render(<PwaUpdateNotice editing reload={reload} />);
  announce();
  expect(screen.getByRole('button', { name: 'Atualizar agora' })).toBeDisabled();
  expect(screen.getByText('Salve ou cancele a edição antes de atualizar.')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Atualizar agora' }));
  expect(worker.postMessage).not.toHaveBeenCalled();
  rerender(<PwaUpdateNotice editing={false} reload={reload} />);
  await userEvent.click(screen.getByRole('button', { name: 'Atualizar agora' }));
  expect(worker.postMessage).toHaveBeenCalledWith({ type: 'APPLY_UPDATE' });
  expect(reload).not.toHaveBeenCalled();
  act(() => callbacks.onActivated());
  expect(reload).toHaveBeenCalledTimes(1);
});

test('editing started while activation is in flight requires another explicit action', async () => {
  const { rerender } = render(<PwaUpdateNotice editing={false} reload={reload} />);
  announce();
  await userEvent.click(screen.getByRole('button', { name: 'Atualizar agora' }));
  rerender(<PwaUpdateNotice editing reload={reload} />);
  act(() => callbacks.onActivated());
  expect(reload).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Atualizar agora' })).toBeDisabled();
  rerender(<PwaUpdateNotice editing={false} reload={reload} />);
  expect(reload).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole('button', { name: 'Atualizar agora' }));
  expect(reload).toHaveBeenCalledTimes(1);
});

test.each(['activated', 'redundant'])('an update already %s in another tab can be explicitly loaded', async state => {
  render(<PwaUpdateNotice editing={false} reload={reload} />);
  announce();
  worker.state = state;
  await userEvent.click(screen.getByRole('button', { name: 'Atualizar agora' }));
  expect(reload).toHaveBeenCalledTimes(1);
  expect(worker.postMessage).not.toHaveBeenCalled();
});

test('registration failure explains how to retry without clearing stored data', () => {
  localStorage.setItem('preserved', 'saved');
  render(<PwaUpdateNotice editing reload={reload} />);
  act(() => callbacks.onError(new Error('network')));
  expect(screen.getByRole('status')).toHaveTextContent('Reconecte e recarregue quando terminar a edição.');
  expect(screen.queryByRole('button', { name: 'Atualizar agora' })).not.toBeInTheDocument();
  expect(reload).not.toHaveBeenCalled();
  expect(localStorage.getItem('preserved')).toBe('saved');
});

test('postponing an update leaves storage and worker untouched and a later detection can show it again', async () => {
  localStorage.setItem('preserved', 'saved');
  render(<PwaUpdateNotice editing={false} reload={reload} />);
  announce();
  await userEvent.click(screen.getByRole('button', { name: 'Depois' }));
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  expect(worker.postMessage).not.toHaveBeenCalled();
  expect(reload).not.toHaveBeenCalled();
  expect(localStorage.getItem('preserved')).toBe('saved');
  announce();
  expect(screen.getByRole('button', { name: 'Atualizar agora' })).toBeEnabled();
});
