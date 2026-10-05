import { act, fireEvent, render, screen } from '@testing-library/react';
import Home from '../../pages/Home';
import { DOT_HIT, MIN_ROW_H, PX_PER_MIN } from './RoutinePhone';
import { DOT, DOT_GAP, MANUAL_HOLD_MS, NOW_X, PX_PER_MIN as TV_PX_PER_MIN, RIBBON_W, WINDOW_MIN } from './RoutineTV';

// marca-feito-scroll(-fix): blocks/rows follow the PLANNED (redistributed) minutes. TV: the
// NOW marker is an overlay fixed at 25% of the visible ribbon, the track (40 min per
// window, exact) scrolls under it; the NOW label is just the time.

const at = (h, m, s = 0) => {
  const d = new Date();
  d.setHours(h, m, s, 0);
  return d;
};

// 70 min ending 20:30 → starts 19:20. A 19:20–19:40, B –20:00, C –20:10, D –20:20, E –20:30.
const routines = {
  monday: {
    morning: {
      name: 'Manhã', endTime: '20:30',
      tasks: [
        { id: 1, name: 'A', icon: '🛁', color: '#38bdf8', minutes: 20 },
        { id: 2, name: 'B', icon: '🍽️', color: '#fb923c', minutes: 20 },
        { id: 3, name: 'C', icon: '🪥', color: '#a78bfa', minutes: 10 },
        { id: 4, name: 'D', icon: '🧸', color: '#22c55e', minutes: 10 },
        { id: 5, name: 'E', icon: '📖', color: '#f59e0b', minutes: 10 },
      ],
    },
  },
};

const px = (v) => parseFloat(v);
const dot = (name) => screen.getByRole('button', { name: new RegExp(`^(Marcar ${name} como feita|${name}: feita)`) });
const PPM = TV_PX_PER_MIN; // TV px per minute

function setPhone(phone) {
  window.matchMedia = phone ? () => ({ matches: true, addEventListener() {}, removeEventListener() {} }) : undefined;
}

function renderAt(now, phone) {
  setPhone(phone);
  const props = { routines, setRoutines: () => {} };
  const utils = render(<Home {...props} currentTime={now} />);
  return { ...utils, tick: (t) => utils.rerender(<Home {...props} currentTime={t} />) };
}

// jsdom has no layout: give the TV track the box a browser would (visible width = ribbon,
// content width = blocks) and a scrollLeft clamped like a browser does.
const scrollPos = new WeakMap();
const isTrack = (el) => el.dataset?.testid === 'tv-track';
const contentW = (el) => Math.max(RIBBON_W, px(el.firstChild.style.width));
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get() { return isTrack(this) ? RIBBON_W : 0; } });
  Object.defineProperty(HTMLElement.prototype, 'scrollWidth', { configurable: true, get() { return isTrack(this) ? contentW(this) : 0; } });
  Object.defineProperty(HTMLElement.prototype, 'scrollLeft', {
    configurable: true,
    get() { return scrollPos.get(this) || 0; },
    set(v) { scrollPos.set(this, isTrack(this) ? Math.max(0, Math.min(v, contentW(this) - RIBBON_W)) : 0); },
  });
});
afterAll(() => {
  delete HTMLElement.prototype.clientWidth;
  delete HTMLElement.prototype.scrollWidth;
  delete HTMLElement.prototype.scrollLeft;
  setPhone(false);
});

describe('TV: fixed NOW marker over a 40-minute window (70-minute routine)', () => {
  const track = () => screen.getByTestId('tv-track');
  const line = () => screen.getByTestId('tv-now-line');
  const flag = () => screen.getByTestId('tv-now-flag');
  const widths = () => screen.getAllByTestId('tv-block').map((b) => px(b.style.width));
  const lead = () => px(screen.getAllByTestId('tv-block')[0].parentElement.style.left);
  // Minute of the plan (from 19:20) under the marker, read from the DOM geometry.
  const underMin = () => (track().scrollLeft + NOW_X - lead()) / PPM;
  const lineX = () => px(line().style.left) + px(line().style.width) / 2;
  const blockUnder = () => {
    const x = underMin() * PPM;
    let acc = 0;
    return widths().findIndex((w) => { const hit = w > 0 && x >= acc - 1e-6 && x < acc + w - 1e-6; acc += w; return hit; });
  };
  const expectMarkerFixed = () => {
    expect(lineX()).toBeCloseTo(RIBBON_W * 0.25, 6);
    expect(line().parentElement).toBe(track().parentElement); // overlay, not inside the track
    expect(track().contains(line())).toBe(false);
    expect(track().contains(flag())).toBe(false);
  };

  test('blocks are exactly their minutes; the window is 40 minutes; the start sits under the marker', () => {
    renderAt(at(19, 20), false);
    widths().forEach((w, i) => expect(w).toBeCloseTo([20, 20, 10, 10, 10][i] * PPM, 6));
    expect(RIBBON_W / PPM).toBeCloseTo(WINDOW_MIN, 9);
    expectMarkerFixed();
    expect(track().scrollLeft).toBe(0);
    expect(underMin()).toBeCloseTo(0, 6);
    expect(blockUnder()).toBe(0);
    expect(screen.getByTestId('tv-more-right')).toBeInTheDocument();
    expect(screen.queryByTestId('tv-more-left')).toBeNull();
    expect(line().dataset.mode).toBe('now');
  });

  test.each([
    ['before the start', at(19, 12), -8, -1, '19:12'],
    ['start', at(19, 20), 0, 0, '19:20'],
    ['middle', at(19, 47, 30), 27.5, 1, '19:47'],
    ['last task', at(20, 25), 65, 4, '20:25'],
    ['last second', at(20, 29, 59), 70 - 1 / 60, 4, '20:29'],
    ['deadline', at(20, 30), 70, -1, '20:30'],
    ['overtime', at(20, 52), 92, -1, '20:52'],
  ])('%s: marker fixed at 25%%, track scrolled so the minute under it is now', (_, now, min, block, label) => {
    renderAt(now, false);
    expectMarkerFixed();
    expect(underMin()).toBeCloseTo(min, 6);
    expect(blockUnder()).toBe(block);
    expect(flag().textContent).toBe(label);
    expect(line().dataset.mode).toBe('now');
    // The follow position is reachable (never clamped by the end of the content).
    expect(track().scrollLeft).toBeLessThanOrEqual(track().scrollWidth - RIBBON_W + 1e-6);
    if (min > 70) expect(screen.getByTestId('tv-overtime')).toBeInTheDocument();
  });

  test('follows the clock tick by tick; at the end the last block (and dot) is on screen', () => {
    const { tick } = renderAt(at(19, 20), false);
    for (let s = 0; s <= 75 * 60; s += 37) {
      tick(new Date(at(19, 20).getTime() + s * 1000));
      expectMarkerFixed();
      expect(underMin()).toBeCloseTo(s / 60, 6);
    }
    tick(at(20, 29));
    const left = track().scrollLeft;
    expect(lead() + 60 * PPM).toBeGreaterThanOrEqual(left);
    expect(lead() + 70 * PPM).toBeLessThanOrEqual(left + RIBBON_W);
    const e = dot('E');
    expect(px(e.style.left)).toBeGreaterThanOrEqual(left);
    expect(px(e.style.left) + DOT).toBeLessThanOrEqual(left + RIBBON_W);
  });

  test('far before the start the marker waits 30 min before the first block (⏳)', () => {
    renderAt(at(7, 0), false);
    expectMarkerFixed();
    expect(track().scrollLeft).toBe(0);
    expect(underMin()).toBeCloseTo(-30, 6);
    expect(line().dataset.mode).toBe('early');
    expect(flag().textContent).toBe('⏳ 07:00');
    expect(screen.getByText(/começa às 19:20/)).toBeInTheDocument();
  });

  test('manual scroll: follow pauses, the marker stays put and shows the time under it, not "now"', () => {
    jest.useFakeTimers();
    try {
      const { tick } = renderAt(at(19, 25), false);
      track().scrollLeft = 30 * PPM; // look at 19:50 (Jantar)
      fireEvent.scroll(track());
      expectMarkerFixed();
      expect(line().dataset.mode).toBe('browse');
      expect(underMin()).toBeCloseTo(30, 6);
      expect(flag().textContent).toBe('👀 19:50');
      expect(flag().getAttribute('aria-label')).toBe('Olhando 19:50 — agora são 19:25');
      // The clock goes on; the view stays where the user put it.
      tick(at(19, 26));
      expect(track().scrollLeft).toBeCloseTo(30 * PPM, 6);
      expect(flag().textContent).toBe('👀 19:50');
      // "Agora" brings it back at once.
      fireEvent.click(screen.getByRole('button', { name: 'Voltar para agora (19:26)' }));
      expect(line().dataset.mode).toBe('now');
      expect(underMin()).toBeCloseTo(6, 6);
      expect(flag().textContent).toBe('19:26');
      // Or it comes back by itself 10 s after the last manual scroll.
      track().scrollLeft = 10;
      fireEvent.scroll(track());
      expect(line().dataset.mode).toBe('browse');
      act(() => { jest.advanceTimersByTime(MANUAL_HOLD_MS - 100); });
      expect(line().dataset.mode).toBe('browse');
      act(() => { jest.advanceTimersByTime(200); });
      expect(line().dataset.mode).toBe('now');
      expect(underMin()).toBeCloseTo(6, 6);
    } finally {
      jest.useRealTimers();
    }
  });

  test('the mouse wheel scrolls sideways and counts as manual', () => {
    renderAt(at(19, 25), false);
    fireEvent.wheel(track(), { deltaY: 200 });
    fireEvent.scroll(track());
    expect(track().scrollLeft).toBeCloseTo(5 * PPM + 200, 6);
    expect(line().dataset.mode).toBe('browse');
    expectMarkerFixed();
  });

  test('a task marked done ahead of time takes no time on screen: still 40 min per window, dot kept', () => {
    const { tick } = renderAt(at(19, 25), false);
    fireEvent.click(dot('C'));
    // 10 min shared 20:20:10:10 → A 23:20, B 23:20, D 11:40, E 11:40, C 0
    const w = widths();
    [70 / 3, 70 / 3, 0, 35 / 3, 35 / 3].forEach((m, i) => expect(w[i]).toBeCloseTo(m * PPM, 6));
    expect(w.reduce((a, b) => a + b, 0)).toBeCloseTo(70 * PPM, 6); // same scale as before
    expect(screen.getByTestId('tv-zero-seam')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pular para A' })).toHaveAttribute('title', 'A — 23 min');
    expect(screen.getByText('Termina às 19:43')).toBeInTheDocument();
    expect(screen.getByText('TERMINA 20:30')).toBeInTheDocument();
    // The C dot sits on its seam (between B and D), whole, apart from the others.
    const centers = ['A', 'B', 'C', 'D', 'E'].map((n) => px(dot(n).style.left) + DOT / 2 - lead());
    expect(Math.abs(centers[2] - (140 / 3) * PPM)).toBeLessThan(DOT_GAP);
    for (let i = 1; i < 5; i++) expect(centers[i] - centers[i - 1]).toBeGreaterThanOrEqual(DOT_GAP - 1e-6);
    // Time under the marker is still exact, in and after the zero block.
    for (const [now, min, block] of [[at(19, 43), 23, 0], [at(20, 6, 30), 46.5, 1], [at(20, 7), 47, 3], [at(20, 25), 65, 4]]) {
      tick(now);
      expectMarkerFixed();
      expect(underMin()).toBeCloseTo(min, 6);
      expect(blockUnder()).toBe(block);
    }
    // And its dot still unmarks it.
    tick(at(19, 30));
    fireEvent.click(dot('C'));
    expect(dot('C')).toHaveAttribute('aria-pressed', 'false');
    expect(widths()[2]).toBeGreaterThan(0);
  });

  test('a dot right under the NOW marker is on top and clickable', () => {
    // A's dot is DOT_INSET(14)+DOT/2 from A's right edge: it is under the marker near 19:39.
    const crossing = new Date(at(19, 40).getTime() - ((14 + DOT / 2) / PPM) * 60000);
    renderAt(crossing, false);
    const d = dot('A');
    const dotCenter = px(d.style.left) + DOT / 2 - track().scrollLeft;
    expect(Math.abs(dotCenter - lineX())).toBeLessThan(1);
    expect(line().style.pointerEvents).toBe('none');
    expect(screen.getByTestId('tv-now-tag').style.pointerEvents).toBe('none');
    expect(Number(d.style.zIndex)).toBeGreaterThan(Number(line().style.zIndex));
    fireEvent.click(d);
    expect(dot('A')).toHaveAttribute('aria-pressed', 'true');
  });

  test('resizing the window rescales the stage only: marker and window unchanged', () => {
    renderAt(at(19, 47, 30), false);
    const before = [lineX(), underMin(), track().scrollLeft];
    for (const [w, h] of [[1920, 1080], [1024, 768], [2560, 1080]]) {
      window.innerWidth = w;
      window.innerHeight = h;
      act(() => { window.dispatchEvent(new Event('resize')); });
      expect([lineX(), underMin(), track().scrollLeft]).toEqual(before);
      expect(line().dataset.mode).toBe('now');
    }
  });
});

describe('phone: rows follow the redistributed minutes', () => {
  const nowY = () => px(screen.getByTestId('phone-now-line').style.top);
  const heights = () => screen.getAllByTestId('phone-row').map((r) => px(r.style.height));

  test('marking a future task: heights change, NOW stays on the real geometry, dots stay tappable', () => {
    const { tick } = renderAt(at(19, 25), true);
    expect(heights()).toEqual([20, 20, 10, 10, 10].map((m) => m * PX_PER_MIN));
    expect(nowY()).toBeCloseTo(5 * PX_PER_MIN, 6);

    fireEvent.click(dot('C'));
    const h = heights();
    [70 / 3, 70 / 3, null, 35 / 3, 35 / 3].forEach((m, i) => m && expect(h[i]).toBeCloseTo(m * PX_PER_MIN, 6));
    expect(h[2]).toBe(MIN_ROW_H);
    expect(nowY()).toBeCloseTo(5 * PX_PER_MIN, 6); // A keeps its start: same spot

    tick(at(19, 50)); // B runs 19:43:20 → 20:06:40
    expect(nowY()).toBeCloseTo(h[0] + (20 / 3) * PX_PER_MIN, 6);
    tick(at(20, 10)); // past the done C row: D runs 20:06:40 → 20:18:20
    expect(nowY()).toBeCloseTo(h[0] + h[1] + h[2] + (10 / 3) * PX_PER_MIN, 6);

    for (const name of ['A', 'B', 'C', 'D', 'E']) {
      const b = dot(name);
      expect(px(b.style.width)).toBe(DOT_HIT);
      expect(px(b.style.height)).toBeLessThanOrEqual(px(b.parentElement.style.height));
      expect(Number(b.style.zIndex)).toBeGreaterThan(Number(screen.getByTestId('phone-now-line').style.zIndex));
    }
    // C is behind us now: its dot means "redo it" (jump back to C).
    fireEvent.click(dot('C'));
    expect(dot('C')).toHaveAttribute('aria-pressed', 'false');
  });
});
