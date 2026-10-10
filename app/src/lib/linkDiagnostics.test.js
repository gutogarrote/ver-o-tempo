import { vi } from 'vitest';
import { captureEnvironment, captureLinkContext, copyLinkDiagnostics, formatLinkDiagnostics } from './linkDiagnostics';

const browser = () => ({
  location: {
    href: 'https://example.test/bad?rotina=1.n.~%2520%2B-5&tag=%FF#family',
    search: '?rotina=1.n.~%2520%2B-5&tag=%FF',
    pathname: '/bad',
  },
  document: { querySelector: vi.fn(() => ({ src: 'https://example.test/assets/index-hash.js' })) },
  navigator: { serviceWorker: { controller: { scriptURL: 'https://example.test/sw.js', state: 'activated' } } },
  matchMedia: vi.fn(() => ({ matches: true })),
});

test('keeps raw location and initial environment unchanged after URL/controller changes', () => {
  const target = browser();
  const context = captureLinkContext(target);
  const original = { ...target.location };
  target.location.search = '?rotina=changed';
  target.navigator.serviceWorker.controller = null;
  const failure = { stage: 'custom-name', reason: 'invalid-encoded-name', entry: 1 };
  const diagnostic = JSON.parse(formatLinkDiagnostics(context, failure, target));
  expect(diagnostic.received).toEqual(original);
  expect(diagnostic.parser).toEqual(failure);
  expect(diagnostic.atLoad.build.module).toContain('index-hash.js');
  expect(diagnostic.atLoad.serviceWorker.controller).toEqual({ scriptURL: 'https://example.test/sw.js', state: 'activated' });
  expect(diagnostic.atDisplay.serviceWorker.controller).toBeNull();
  expect(diagnostic.atLoad.displayMode).toEqual({ standalone: true, iosStandalone: false });
});

test('works without worker, clipboard, matchMedia or a module and records iOS standalone', () => {
  const target = browser();
  target.navigator = { standalone: true };
  delete target.matchMedia;
  target.document.querySelector.mockReturnValue(null);
  expect(captureEnvironment(target)).toMatchObject({
    build: { module: null },
    serviceWorker: { supported: false, controller: null },
    displayMode: { standalone: false, iosStandalone: true },
  });
});

test('clipboard receives the exact text, without invoking legacy copy', async () => {
  const target = browser();
  target.navigator.clipboard = { writeText: vi.fn().mockResolvedValue(undefined) };
  target.document.execCommand = vi.fn();
  expect(await copyLinkDiagnostics('raw %2520 + & 🍄', null, target)).toBe(true);
  expect(target.navigator.clipboard.writeText).toHaveBeenCalledWith('raw %2520 + & 🍄');
  expect(target.document.execCommand).not.toHaveBeenCalled();
});

test.each(['missing', 'rejected'])('legacy copy selects exact text when clipboard is %s', async state => {
  const target = browser();
  if (state === 'rejected') target.navigator.clipboard = { writeText: vi.fn().mockRejectedValue(new Error('denied')) };
  target.document.execCommand = vi.fn(() => true);
  const textarea = { focus: vi.fn(), select: vi.fn(), setSelectionRange: vi.fn() };
  expect(await copyLinkDiagnostics('raw %2520', textarea, target)).toBe(true);
  expect(textarea.focus).toHaveBeenCalled();
  expect(textarea.select).toHaveBeenCalled();
  expect(textarea.setSelectionRange).toHaveBeenCalledWith(0, 9);
  expect(target.document.execCommand).toHaveBeenCalledWith('copy');
});

test.each(['missing', 'false', 'throws'])('leaves text selected for manual copy when legacy copy is %s', async state => {
  const target = browser();
  if (state !== 'missing') target.document.execCommand = vi.fn(() => {
    if (state === 'throws') throw new Error('unsupported');
    return false;
  });
  const textarea = { focus: vi.fn(), select: vi.fn(), setSelectionRange: vi.fn() };
  expect(await copyLinkDiagnostics('abc', textarea, target)).toBe(false);
  expect(textarea.select).toHaveBeenCalled();
});
