import React, { StrictMode } from 'react';
import { vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import useScreenWakeLock, { WAKE_LOCK_KEY } from './useScreenWakeLock';

function Harness({ eligible = true, completed = false }) {
  const lock = useScreenWakeLock(eligible, completed);
  return <><label><input type="checkbox" checked={lock.enabled} onChange={(e) => lock.toggle(e.target.checked)} />Manter tela ligada</label><p role="status">{lock.message}</p>{lock.storageFailed && <p>Preferência não salva</p>}</>;
}
function sentinel() {
  const lock = new EventTarget();
  lock.released = false;
  lock.release = vi.fn(async () => { lock.released = true; lock.dispatchEvent(new Event('release')); });
  return lock;
}
const toggle = () => fireEvent.click(screen.getByRole('checkbox'));
const visibility = (value) => {
  Object.defineProperty(document, 'visibilityState', { configurable: true, value });
  fireEvent(document, new Event('visibilitychange'));
};
let request;
beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('isSecureContext', true);
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
  request = vi.fn(async () => sentinel());
  Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { request } });
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

test('off by default, persists only a separate preference, reloads and opts out', async () => {
  const utils = render(<Harness />);
  expect(screen.getByRole('checkbox')).not.toBeChecked();
  expect(request).not.toHaveBeenCalled();
  toggle();
  expect(await screen.findByText(/Ativo:/)).toBeInTheDocument();
  expect(request).toHaveBeenCalledWith('screen');
  expect(localStorage.getItem(WAKE_LOCK_KEY)).toBe('true');
  expect(localStorage.getItem('routines')).toBeNull();
  const lock = await request.mock.results[0].value;
  utils.unmount();
  expect(lock.release).toHaveBeenCalledTimes(1);
  render(<Harness />);
  expect(screen.getByRole('checkbox')).toBeChecked();
  expect(await screen.findByText(/Ativo:/)).toBeInTheDocument();
  toggle();
  expect(screen.getByText(/Desativado:/)).toBeInTheDocument();
  expect(localStorage.getItem(WAKE_LOCK_KEY)).toBe('false');
});

test.each(['absent', 'insecure'])('%s API is honest and safe', (kind) => {
  if (kind === 'absent') Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: undefined });
  else vi.stubGlobal('isSecureContext', false);
  render(<Harness />);
  toggle();
  expect(screen.getByText(kind === 'absent' ? /sem suporte/ : /requer HTTPS/)).toBeInTheDocument();
  expect(screen.getByRole('checkbox')).toBeChecked();
  expect(request).not.toHaveBeenCalled();
});

test('rejection stays inactive with no timer or render retry', async () => {
  request.mockRejectedValue(new Error('NotAllowedError'));
  const utils = render(<Harness />);
  toggle();
  expect(await screen.findByText(/Não adquirido:/)).toBeInTheDocument();
  utils.rerender(<Harness />);
  expect(request).toHaveBeenCalledTimes(1);
  toggle(); toggle();
  await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
});

test('system release updates status without immediately retrying', async () => {
  const lock = sentinel(); request.mockResolvedValue(lock);
  render(<Harness />); toggle();
  expect(await screen.findByText(/Ativo:/)).toBeInTheDocument();
  act(() => { lock.released = true; lock.dispatchEvent(new Event('release')); });
  expect(screen.getByText(/navegador liberou/)).toBeInTheDocument();
  expect(request).toHaveBeenCalledTimes(1);
});

test('hidden and pagehide release; visible and pageshow reacquire', async () => {
  render(<Harness />); toggle();
  expect(await screen.findByText(/Ativo:/)).toBeInTheDocument();
  const first = await request.mock.results[0].value;
  visibility('hidden');
  expect(first.release).toHaveBeenCalledTimes(1);
  expect(screen.getByText(/fora de vista/)).toBeInTheDocument();
  visibility('visible');
  expect(await screen.findByText(/Ativo:/)).toBeInTheDocument();
  const second = await request.mock.results[1].value;
  fireEvent(window, new Event('pagehide'));
  expect(second.release).toHaveBeenCalledTimes(1);
  fireEvent(window, new Event('pageshow'));
  expect(await screen.findByText(/Ativo:/)).toBeInTheDocument();
  expect(request).toHaveBeenCalledTimes(3);
});

test.each(['off', 'unmount', 'hidden', 'pagehide', 'editor'])('late resolution after %s releases without becoming active', async (transition) => {
  let resolve;
  request.mockImplementation(() => new Promise((r) => { resolve = r; }));
  const utils = render(<Harness />); toggle();
  await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
  if (transition === 'off') toggle();
  if (transition === 'unmount') utils.unmount();
  if (transition === 'hidden') visibility('hidden');
  if (transition === 'pagehide') fireEvent(window, new Event('pagehide'));
  if (transition === 'editor') utils.rerender(<Harness eligible={false} />);
  const lock = sentinel();
  await act(async () => { resolve(lock); });
  expect(lock.release).toHaveBeenCalledTimes(1);
  expect(screen.queryByText(/Ativo:/)).not.toBeInTheDocument();
});

test('StrictMode and rapid off/on serialize in-flight requests and releases', async () => {
  localStorage.setItem(WAKE_LOCK_KEY, 'true');
  let resolve;
  request.mockImplementationOnce(() => new Promise((r) => { resolve = r; }));
  const utils = render(<StrictMode><Harness /></StrictMode>);
  await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
  toggle(); toggle();
  expect(request).toHaveBeenCalledTimes(1);
  const stale = sentinel();
  await act(async () => { resolve(stale); });
  expect(stale.release).toHaveBeenCalledTimes(1);
  expect(await screen.findByText(/Ativo:/)).toBeInTheDocument();
  expect(request).toHaveBeenCalledTimes(2);
  const held = await request.mock.results[1].value;
  utils.unmount();
  expect(held.release).toHaveBeenCalledTimes(1);
});

test('full editor and explicit completion suspend; returning/restarting reacquires', async () => {
  const utils = render(<Harness />); toggle();
  expect(await screen.findByText(/Ativo:/)).toBeInTheDocument();
  const lock = await request.mock.results[0].value;
  utils.rerender(<Harness eligible={false} />);
  expect(lock.release).toHaveBeenCalledTimes(1);
  expect(screen.getByText(/fora da tela/)).toBeInTheDocument();
  utils.rerender(<Harness />);
  expect(await screen.findByText(/Ativo:/)).toBeInTheDocument();
  utils.rerender(<Harness eligible={false} completed />);
  expect(screen.getByText(/todas as tarefas/)).toBeInTheDocument();
  utils.rerender(<Harness />);
  expect(await screen.findByText(/Ativo:/)).toBeInTheDocument();
});

test.each(['garbage', '1', 'false', '{"enabled":true}'])('malformed/nonboolean preference %s defaults off', (value) => {
  localStorage.setItem(WAKE_LOCK_KEY, value);
  render(<Harness />);
  expect(screen.getByRole('checkbox')).not.toBeChecked();
  expect(request).not.toHaveBeenCalled();
});

test('blocked storage does not prevent opting in for the session', async () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
  render(<Harness />); toggle();
  expect(await screen.findByText(/Ativo:/)).toBeInTheDocument();
  expect(screen.getByText('Preferência não salva')).toBeInTheDocument();
});

test('another tab can change or clear preference', async () => {
  render(<Harness />);
  localStorage.setItem(WAKE_LOCK_KEY, 'true');
  fireEvent(window, new StorageEvent('storage', { key: WAKE_LOCK_KEY }));
  expect(await screen.findByText(/Ativo:/)).toBeInTheDocument();
  localStorage.clear();
  fireEvent(window, new StorageEvent('storage', { key: null }));
  expect(screen.getByRole('checkbox')).not.toBeChecked();
});

test('a pending release finishes before a new acquisition', async () => {
  let finishRelease;
  const lock = sentinel();
  lock.release.mockImplementation(() => new Promise((resolve) => { finishRelease = resolve; }));
  request.mockResolvedValueOnce(lock);
  render(<Harness />); toggle();
  expect(await screen.findByText(/Ativo:/)).toBeInTheDocument();
  toggle(); toggle();
  expect(lock.release).toHaveBeenCalledTimes(1);
  expect(request).toHaveBeenCalledTimes(1);
  await act(async () => { finishRelease(); });
  expect(await screen.findByText(/Ativo:/)).toBeInTheDocument();
  expect(request).toHaveBeenCalledTimes(2);
});

test('synchronous request failure is handled; failed release does not crash or block restoration', async () => {
  request.mockImplementationOnce(() => { throw new Error('denied'); });
  render(<Harness />); toggle();
  expect(await screen.findByText(/Não adquirido:/)).toBeInTheDocument();
  const lock = sentinel();
  lock.release.mockRejectedValue(new Error('already released'));
  request.mockResolvedValueOnce(lock);
  toggle(); toggle();
  expect(await screen.findByText(/Ativo:/)).toBeInTheDocument();
  visibility('hidden'); visibility('visible');
  expect(await screen.findByText(/Ativo:/)).toBeInTheDocument();
  expect(lock.release).toHaveBeenCalledTimes(1);
  expect(request).toHaveBeenCalledTimes(3);
});

test('rapid hidden/visible events reacquire even if React batches the visibility updates', async () => {
  render(<Harness />); toggle();
  expect(await screen.findByText(/Ativo:/)).toBeInTheDocument();
  const lock = await request.mock.results[0].value;
  act(() => { visibility('hidden'); visibility('visible'); });
  expect(lock.release).toHaveBeenCalledTimes(1);
  await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
  expect(await screen.findByText(/Ativo:/)).toBeInTheDocument();
});
