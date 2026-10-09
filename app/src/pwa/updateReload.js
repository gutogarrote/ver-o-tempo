const MARKER = '__verOTempoUpdateReload';

// A one-use history marker, with no routine/session data or new storage key.
// Normal links keep their precedence; only our explicit update reload uses the
// configuration already saved on this origin instead of re-decoding its URL.
export function prepareUpdateReload() {
  window.history.replaceState({
    [MARKER]: { href: window.location.href, previousState: window.history.state },
  }, '', window.location.href);
}

export function consumeUpdateReload() {
  const marker = window.history.state?.[MARKER];
  if (!marker) return false;
  window.history.replaceState(marker.previousState, '', window.location.href);
  return marker.href === window.location.href;
}
