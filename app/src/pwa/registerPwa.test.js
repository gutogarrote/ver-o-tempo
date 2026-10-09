import { vi } from 'vitest';
import { registerPwa } from './registerPwa';

function environment(controlled = true) {
  const waiting = new EventTarget();
  const registration = Object.assign(new EventTarget(), { waiting, installing: null, update: vi.fn().mockResolvedValue() });
  const serviceWorker = Object.assign(new EventTarget(), {
    controller: controlled ? {} : null,
    register: vi.fn().mockResolvedValue(registration),
  });
  const callbacks = { onUpdate: vi.fn(), onActivated: vi.fn(), onError: vi.fn() };
  return { waiting, registration, serviceWorker, callbacks };
}

const flush = () => new Promise(resolve => queueMicrotask(resolve));

test('development and browsers without service worker never register', () => {
  const env = environment();
  registerPwa({ ...env.callbacks, serviceWorker: env.serviceWorker, enabled: false })();
  registerPwa({ ...env.callbacks, serviceWorker: null, enabled: true })();
  expect(env.serviceWorker.register).not.toHaveBeenCalled();
});

test('uses root scope and bypasses HTTP cache for update checks', async () => {
  const env = environment();
  const dispose = registerPwa({ ...env.callbacks, serviceWorker: env.serviceWorker, enabled: true });
  await flush();
  expect(env.serviceWorker.register).toHaveBeenCalledWith('/sw.js', { scope: '/', updateViaCache: 'none' });
  expect(env.callbacks.onUpdate).toHaveBeenCalledWith(env.waiting);
  window.dispatchEvent(new Event('online'));
  expect(env.registration.update).toHaveBeenCalledTimes(1);
  expect(env.callbacks.onUpdate).toHaveBeenCalledTimes(2);
  dispose();
  window.dispatchEvent(new Event('online'));
  env.serviceWorker.dispatchEvent(new Event('controllerchange'));
  expect(env.registration.update).toHaveBeenCalledTimes(1);
  expect(env.callbacks.onActivated).not.toHaveBeenCalled();
});

test('first installation is never advertised as an update', async () => {
  const env = environment(false);
  const dispose = registerPwa({ ...env.callbacks, serviceWorker: env.serviceWorker, enabled: true });
  await flush();
  expect(env.callbacks.onUpdate).not.toHaveBeenCalled();
  dispose();
});

test('detects an installation becoming waiting and cleans up listeners', async () => {
  const env = environment();
  env.registration.waiting = null;
  const worker = Object.assign(new EventTarget(), { state: 'installing' });
  const dispose = registerPwa({ ...env.callbacks, serviceWorker: env.serviceWorker, enabled: true });
  await flush();
  env.registration.installing = worker;
  env.registration.dispatchEvent(new Event('updatefound'));
  env.registration.waiting = worker;
  worker.state = 'installed';
  worker.dispatchEvent(new Event('statechange'));
  expect(env.callbacks.onUpdate).toHaveBeenCalledWith(worker);
  dispose();
  worker.dispatchEvent(new Event('statechange'));
  expect(env.callbacks.onUpdate).toHaveBeenCalledTimes(1);
});

test('reports registration failure but ignores a disposed registration', async () => {
  const env = environment();
  env.serviceWorker.register.mockRejectedValue(new Error('offline'));
  const dispose = registerPwa({ ...env.callbacks, serviceWorker: env.serviceWorker, enabled: true });
  await flush();
  await flush();
  expect(env.callbacks.onError).toHaveBeenCalledWith(expect.any(Error));
  dispose();
  const pending = environment();
  const stop = registerPwa({ ...pending.callbacks, serviceWorker: pending.serviceWorker, enabled: true });
  stop();
  await flush();
  expect(pending.callbacks.onUpdate).not.toHaveBeenCalled();
});

test('a failed installation is reported even after installing is cleared; a replaced activated worker is not a failure', async () => {
  const env = environment();
  env.registration.waiting = null;
  const worker = Object.assign(new EventTarget(), { state: 'installing' });
  const dispose = registerPwa({ ...env.callbacks, serviceWorker: env.serviceWorker, enabled: true });
  await flush();
  env.registration.installing = worker;
  env.registration.dispatchEvent(new Event('updatefound'));
  env.registration.installing = null;
  worker.state = 'redundant';
  worker.dispatchEvent(new Event('statechange'));
  expect(env.callbacks.onError).toHaveBeenCalledTimes(1);
  const successful = Object.assign(new EventTarget(), { state: 'installing' });
  env.registration.installing = successful;
  env.registration.dispatchEvent(new Event('updatefound'));
  for (const state of ['installed', 'activated', 'redundant']) {
    successful.state = state;
    successful.dispatchEvent(new Event('statechange'));
  }
  expect(env.callbacks.onError).toHaveBeenCalledTimes(1);
  dispose();
});
