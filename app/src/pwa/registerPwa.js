export function registerPwa({ enabled, onUpdate, onActivated, onError, serviceWorker = navigator.serviceWorker }) {
  if (!enabled || !serviceWorker) return () => {};
  let disposed = false;
  let registration;
  const watched = new Map();
  const checkWaiting = () => {
    if (!disposed && registration?.waiting && serviceWorker.controller) onUpdate(registration.waiting);
  };
  const watchInstalling = () => {
    const worker = registration.installing;
    if (worker && !watched.has(worker)) {
      let installed = worker.state === 'installed' || worker.state === 'activating' || worker.state === 'activated';
      const onState = () => {
        if (worker.state === 'installed') installed = true;
        if (!disposed && !installed && worker.state === 'redundant') onError(new Error('Offline installation failed'));
        checkWaiting();
      };
      watched.set(worker, onState);
      worker.addEventListener('statechange', onState);
    }
    checkWaiting();
  };
  const onController = () => { if (!disposed) onActivated(); };
  const checkForUpdate = () => {
    if (registration && !disposed && document.visibilityState === 'visible') {
      checkWaiting();
      registration.update().catch(() => {});
    }
  };
  serviceWorker.addEventListener('controllerchange', onController);
  document.addEventListener('visibilitychange', checkForUpdate);
  window.addEventListener('online', checkForUpdate);
  serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).then(next => {
    if (disposed) return;
    registration = next;
    registration.addEventListener('updatefound', watchInstalling);
    watchInstalling();
  }).catch(error => { if (!disposed) onError(error); });
  return () => {
    disposed = true;
    serviceWorker.removeEventListener('controllerchange', onController);
    document.removeEventListener('visibilitychange', checkForUpdate);
    window.removeEventListener('online', checkForUpdate);
    registration?.removeEventListener('updatefound', watchInstalling);
    for (const [worker, onState] of watched) worker.removeEventListener('statechange', onState);
  };
}
