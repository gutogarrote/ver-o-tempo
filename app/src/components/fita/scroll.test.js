import { fireEvent, render, screen } from '@testing-library/react';
import Home from '../../pages/Home';
import { DOT_HIT, MIN_ROW_H, PX_PER_MIN } from './RoutinePhone';
import { DOT, MIN_BLOCK_W, RIBBON_W, WINDOW_MIN } from './RoutineTV';

// marca-feito-scroll: blocks/rows follow the PLANNED (redistributed) minutes, the TV ribbon
// shows a 40-min window and scrolls with the clock, the NOW label is just the time.

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
const PPM = RIBBON_W / WINDOW_MIN; // TV px per minute

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

describe('TV: 40-minute window over a 70-minute routine', () => {
  const track = () => screen.getByTestId('tv-track');
  const nowX = () => px(screen.getByTestId('tv-now-line').style.left);

  test('shows the first 40 minutes; the rest is to the right', () => {
    renderAt(at(19, 20), false);
    const widths = screen.getAllByTestId('tv-block').map((b) => px(b.style.width));
    widths.forEach((w, i) => expect(w).toBeCloseTo([20, 20, 10, 10, 10][i] * PPM, 6));
    expect(track().scrollWidth).toBeCloseTo(70 * PPM, 6);
    expect(track().clientWidth / PPM).toBeCloseTo(40, 6);
    expect(track().scrollLeft).toBe(0);
    expect(screen.getByTestId('tv-more-right')).toBeInTheDocument();
    expect(screen.queryByTestId('tv-more-left')).toBeNull();
  });

  test('follows the clock (NOW ~25% from the left) and reaches the end of the track', () => {
    const { tick } = renderAt(at(19, 20), false);
    tick(at(19, 50));
    expect(nowX()).toBeCloseTo(30 * PPM, 6);
    expect(track().scrollLeft).toBeCloseTo(30 * PPM - RIBBON_W * 0.25, 6);
    expect(screen.getByTestId('tv-more-left')).toBeInTheDocument();
    tick(at(20, 25));
    expect(track().scrollLeft).toBeCloseTo(30 * PPM, 6); // clamped: end of the track
    expect(screen.queryByTestId('tv-more-right')).toBeNull();
    // The last block (and its dot) is inside the visible window.
    const left = track().scrollLeft;
    expect(60 * PPM).toBeGreaterThanOrEqual(left);
    expect(70 * PPM).toBeLessThanOrEqual(left + track().clientWidth + 1e-6);
  });

  test('manual scrolling pauses the follow', () => {
    const { tick } = renderAt(at(19, 20), false);
    track().scrollLeft = 500;
    fireEvent.scroll(track());
    tick(at(19, 50));
    expect(track().scrollLeft).toBe(500);
  });

  test('the NOW label is just the time, beside the line, and the line sits on the real position', () => {
    const { tick } = renderAt(at(19, 47, 30), false);
    const flag = screen.getByTestId('tv-now-flag');
    expect(flag.textContent).toMatch(/^\d{2}:\d{2}$/);
    expect(flag.textContent).toBe('19:47');
    expect(track().textContent).not.toMatch(/AGORA/);
    expect(px(flag.style.left)).toBe(nowX());
    expect(flag.style.transform).toBe('translateX(8px)');
    expect(nowX()).toBeCloseTo(27.5 * PPM, 6);
    tick(at(20, 29, 30)); // near the end: label flips to the left of the line
    expect(screen.getByTestId('tv-now-flag').style.transform).toMatch(/^translateX\(calc\(-100% - 8px\)\)$/);
  });

  test('marking a future task resizes the blocks to the redistributed minutes; NOW stays inside the current block', () => {
    const { tick } = renderAt(at(19, 25), false);
    fireEvent.click(dot('C'));
    // 10 min shared 20:20:10:10 → A 23:20, B 23:20, D 11:40, E 11:40
    const widths = screen.getAllByTestId('tv-block').map((b) => px(b.style.width));
    [70 / 3, 70 / 3, null, 35 / 3, 35 / 3].forEach((m, i) => m && expect(widths[i]).toBeCloseTo(m * PPM, 6));
    expect(widths[2]).toBe(MIN_BLOCK_W); // done, zero minutes: still holds its dot
    expect(screen.getByRole('button', { name: 'Pular para A' })).toHaveAttribute('title', 'A — 23 min');
    expect(screen.getByText('Termina às 19:43')).toBeInTheDocument();
    tick(at(19, 43)); // A now ends at 19:43:20
    expect(nowX()).toBeCloseTo(23 * PPM, 6);
    expect(nowX()).toBeLessThan(widths[0]);
    expect(screen.getByText('TERMINA 20:30')).toBeInTheDocument();
  });

  test('a dot right under the NOW line is still on top and clickable', () => {
    // The dot of A is DOT_INSET(14)+DOT/2 from A's right edge: NOW crosses it near 19:39.
    const crossing = new Date(at(19, 40).getTime() - ((14 + DOT / 2) / PPM) * 60000);
    renderAt(crossing, false);
    const line = screen.getByTestId('tv-now-line');
    const d = dot('A');
    expect(Math.abs(nowX() - (20 * PPM - 14 - DOT / 2))).toBeLessThan(1);
    expect(line.style.pointerEvents).toBe('none');
    expect(Number(d.style.zIndex)).toBeGreaterThan(Number(screen.getByTestId('tv-now-flag').style.zIndex));
    fireEvent.click(d);
    expect(dot('A')).toHaveAttribute('aria-pressed', 'true');
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
