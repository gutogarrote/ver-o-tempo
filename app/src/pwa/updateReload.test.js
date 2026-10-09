import { prepareUpdateReload, consumeUpdateReload } from './updateReload';

beforeEach(() => window.history.replaceState(null, '', '/?rotina=custom'));

test('explicit update reload preserves previous history state and adds no storage or session data', () => {
  const before = JSON.stringify({ ...localStorage });
  window.history.replaceState({ previous: 'keep' }, '', window.location.href);
  prepareUpdateReload();
  expect(JSON.stringify(window.history.state)).not.toContain('routines');
  expect(consumeUpdateReload()).toBe(true);
  expect(window.history.state).toEqual({ previous: 'keep' });
  expect(consumeUpdateReload()).toBe(false);
  expect(JSON.stringify({ ...localStorage })).toBe(before);
});

test('a marker cannot change initialization of a different link', () => {
  prepareUpdateReload();
  window.history.replaceState(window.history.state, '', '/0720');
  expect(consumeUpdateReload()).toBe(false);
  expect(window.history.state).toBeNull();
});
