import { act, fireEvent, render, screen } from '@testing-library/react';
import Home from '../../pages/Home';
import { CLOSE_MIN_H, DOT_HIT, PX_PER_MIN } from './RoutinePhone';
import { DONE_MIN_W, DOT, DOT_GAP, FADE_W, MANUAL_HOLD_MS, NOW_X, PX_PER_MIN as TV_PX_PER_MIN, RIBBON_W, WINDOW_MIN } from './RoutineTV';

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

function renderAt(now, phone, rs = routines) {
  setPhone(phone);
  const props = { routines: rs, setRoutines: () => {} };
  const utils = render(<Home {...props} currentTime={now} />);
  return { ...utils, tick: (t) => utils.rerender(<Home {...props} currentTime={t} />) };
}

// jsdom has no layout: give the TV track the box a browser would (visible width = ribbon,
// content width = blocks) and a scrollLeft clamped like a browser does.
const scrollPos = new WeakMap();
const isTrack = (el) => el.dataset?.testid === 'tv-track';
// eslint-disable-next-line testing-library/no-node-access -- Geometry requires the containing box/DOM order; jsdom has no layout or accessible equivalent.
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
  // eslint-disable-next-line testing-library/no-node-access -- Geometry requires the containing box/DOM order; jsdom has no layout or accessible equivalent.
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
    // eslint-disable-next-line testing-library/no-node-access -- Geometry requires the containing box/DOM order; jsdom has no layout or accessible equivalent.
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
    expect(screen.queryByTestId('tv-overtime') !== null).toBe(min >= 70);
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
      fireEvent.pointerDown(track()); // the user grabs the track…
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
      fireEvent.keyDown(track(), { key: 'ArrowLeft' });
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

  test('a scroll the user did not make (browser clamping/restoring) is undone: the marker stays on now', () => {
    renderAt(at(19, 25), false);
    const follow = track().scrollLeft;
    track().scrollLeft = follow + 900; // e.g. the browser moved it while the window changed
    fireEvent.scroll(track());
    expect(track().scrollLeft).toBeCloseTo(follow, 6);
    expect(line().dataset.mode).toBe('now');
    expect(underMin()).toBeCloseTo(5, 6);
  });

  // marca-feito-scroll-fix follow-up: a task marked done ahead of time is shown behind the
  // marker, with its name/icon, whole inside the window (between the left fade and the
  // marker); the elapsed part of the task in progress is compressed when needed; from the
  // marker on the ribbon keeps the exact 40-min scale; undoing puts it back in place.
  const order = () => screen.getAllByTestId('tv-block').map((b) => Number(b.dataset.index));
  const blockX = (i) => {
    const b = screen.getAllByTestId('tv-block').find((el) => Number(el.dataset.index) === i);
    // eslint-disable-next-line testing-library/no-node-access -- Geometry requires the containing box/DOM order; jsdom has no layout or accessible equivalent.
    return { x: px(b.parentElement.style.left), w: px(b.style.width), el: b };
  };
  // Plan minute under the marker, measured from the block of a pending task whose plan start
  // is known (exact part: valid from the marker on).
  const underFrom = (i, planStart) => planStart + (track().scrollLeft + NOW_X - blockX(i).x) / PPM;
  const nowOnTrack = () => track().scrollLeft + NOW_X;

  test('a task marked done ahead of time stays whole right behind the marker, keeps name/icon; the rest is exact', () => {
    const { tick } = renderAt(at(19, 25), false);
    fireEvent.click(dot('C'));
    // C first (done), then A (in progress), B, D, E.
    expect(order()).toEqual([2, 0, 1, 3, 4]);
    const c = blockX(2);
    expect(c.el.dataset.done).toBe('true');
    expect(c.el.dataset.early).toBe('true');
    // Its 10 min do not fit between the fade and the marker: narrowed to that room, not a 0-px line.
    expect(c.w).toBeCloseTo(NOW_X - FADE_W, 6);
    expect(c.w).toBeGreaterThanOrEqual(DONE_MIN_W);
    expect(c.el).toHaveTextContent('C');
    expect(c.el).toHaveTextContent('🪥');
    expect(c.el).toHaveTextContent('✓ 10 min');
    // Inside the visible window, clear of the left fade, entirely behind the marker.
    expect(c.x - track().scrollLeft).toBeGreaterThanOrEqual(FADE_W - 1e-6);
    expect(c.x + c.w).toBeLessThanOrEqual(nowOnTrack() + 1e-6);
    // A touches it (no overlap); A's 5 elapsed minutes are drawn compressed (striped).
    const a = blockX(0);
    expect(a.x).toBeCloseTo(c.x + c.w, 6);
    expect(screen.getByTestId('tv-elapsed').dataset.squeezed).toBe('true');
    // 10 min shared 20:20:10:10 → A 23:20, B 23:20, D 11:40, E 11:40. From the marker on: exact.
    expect(a.x + a.w - nowOnTrack()).toBeCloseTo((70 / 3 - 5) * PPM, 6);
    [[1, 70 / 3], [3, 35 / 3], [4, 35 / 3]].forEach(([i, m]) => expect(blockX(i).w).toBeCloseTo(m * PPM, 6));
    expectMarkerFixed();
    expect(underFrom(1, 70 / 3)).toBeCloseTo(5, 6);
    expect(px(screen.getByTestId('tv-deadline').style.left) + 2 - nowOnTrack()).toBeCloseTo(65 * PPM, 6); // deadline: same place
    expect(screen.getByText('Termina às 19:43')).toBeInTheDocument();
    expect(screen.getByText('TERMINA 20:30')).toBeInTheDocument(); // deadline untouched
    // Dots: whole, apart, in display order; C's dot inside the window.
    const centers = [2, 0, 1, 3, 4].map((i) => px(dot('ABCDE'[i]).style.left) + DOT / 2);
    for (let k = 1; k < 5; k++) expect(centers[k] - centers[k - 1]).toBeGreaterThanOrEqual(DOT_GAP - 1e-6);
    expect(centers[0] - DOT / 2 - track().scrollLeft).toBeGreaterThanOrEqual(FADE_W);
    // Time goes on: the marker follows the exact part.
    for (const [now, i, start, min] of [[at(19, 43), 1, 70 / 3, 23], [at(19, 44), 3, 140 / 3, 24], [at(20, 6, 30), 3, 140 / 3, 46.5], [at(20, 7), 3, 140 / 3, 47], [at(20, 25), 4, 175 / 3, 65]]) {
      tick(now);
      expectMarkerFixed();
      expect(underFrom(i, start)).toBeCloseTo(min, 6);
    }
    // Once the plan passed C's slot (D in progress) it is a plain past task: nothing compressed.
    expect(screen.getByTestId('tv-elapsed').dataset.squeezed).toBeUndefined();
    // Undo (while A is still in progress): back in its original place and size.
    tick(at(19, 30));
    fireEvent.click(dot('C'));
    expect(dot('C')).toHaveAttribute('aria-pressed', 'false');
    expect(order()).toEqual([0, 1, 2, 3, 4]);
    [20, 20, 10, 10, 10].forEach((m, i) => expect(blockX(i).w).toBeCloseTo(m * PPM, 6));
    expect(underMin()).toBeCloseTo(10, 6);
    expect(screen.getByTestId('tv-elapsed').dataset.squeezed).toBeUndefined();
    expect(px(screen.getByTestId('tv-elapsed').style.width)).toBeCloseTo(10 * PPM, 6);
    expect(screen.getByText('TERMINA 20:30')).toBeInTheDocument();
  });

  // Adverse order: a 60-min task at its minute 35, four 5-min tasks marked 4, 3, 2, 1 (the
  // last one marked has the lowest index). Only ~2 done blocks fit between the fade and the
  // marker: the one just marked must be one of them, whole, right behind the marker.
  describe('several tasks marked ahead, in adverse order', () => {
    // 80 min ending 20:00 → starts 18:40; now 19:15.
    const R = { monday: { morning: { name: 'Manhã', endTime: '20:00', tasks: [
      { id: 1, name: 'Longa', icon: '🧩', color: '#38bdf8', minutes: 60 },
      ...['P', 'Q', 'R', 'S'].map((name, k) => ({ id: k + 2, name, icon: ['🥤', '🧼', '🪥', '🧺'][k], color: '#a78bfa', minutes: 5 })),
    ] } } };
    const names = ['Longa', 'P', 'Q', 'R', 'S'];
    const expectWholeBehindMarker = (i) => {
      const b = blockX(i);
      expect(b.el.dataset.done).toBe('true');
      expect(b.w).toBeGreaterThanOrEqual(DONE_MIN_W - 1e-6);
      expect(b.x - track().scrollLeft).toBeGreaterThanOrEqual(FADE_W - 1e-6);
      expect(b.x + b.w).toBeLessThanOrEqual(nowOnTrack() + 1e-6);
      expect(blockX(0).x).toBeCloseTo(b.x + b.w, 6); // touches the task in progress, no overlap
      expect(b.el).toHaveTextContent(names[i]);
      // Its dot is inside the clear part of the window, left of the marker.
      const c = px(dot(names[i]).style.left) + DOT / 2 - track().scrollLeft;
      expect(c - DOT / 2).toBeGreaterThanOrEqual(FADE_W - 1e-6);
      expect(c).toBeLessThanOrEqual(NOW_X);
    };
    const rightSide = () => [px(screen.getByTestId('tv-deadline').style.left) + 2 - nowOnTrack(), screen.getByText(/^TERMINA /).textContent];

    test('marking 4, 3, 2, 1: the one just marked is always whole next to the marker; pending order kept; undo; deadline edit; TV → phone → TV', () => {
      // A matchMedia that can change, like a window being resized (TV → phone → TV).
      const listeners = new Set();
      let phone = false;
      window.matchMedia = () => ({ get matches() { return phone; }, addEventListener: (_, f) => listeners.add(f), removeEventListener: (_, f) => listeners.delete(f) });
      const flip = (v) => act(() => { phone = v; listeners.forEach((f) => f()); });
      const props = { routines: R, setRoutines: () => {} };
      const { rerender } = render(<Home {...props} currentTime={at(19, 15)} />);
      const tick = (t) => rerender(<Home {...props} currentTime={t} />);
      const right0 = rightSide();
      [4, 3, 2, 1].forEach((i, k) => {
        fireEvent.click(dot(names[i]));
        expect(dot(names[i])).toHaveAttribute('aria-pressed', 'true');
        expectWholeBehindMarker(i);
        expectMarkerFixed();
        expect(rightSide()).toEqual(right0); // deadline: same place, same time
        // Done ones ahead in the order they were marked (oldest leftmost); pending in task order.
        const marked = [4, 3, 2, 1].slice(0, k + 1);
        expect(order()).toEqual([...marked, 0, ...[1, 2, 3, 4].filter((j) => !marked.includes(j))]);
      });
      // The task in progress got all 20 min: exactly 45 min left, from the marker on.
      expect(blockX(0).x + blockX(0).w - nowOnTrack()).toBeCloseTo(45 * PPM, 6);
      expect(screen.getByText('Termina às 20:00')).toBeInTheDocument();
      // A minute later it is still whole there.
      tick(at(19, 16));
      expectWholeBehindMarker(1);
      // Deadline edited by hand: marks AND their order survive; P still the one next to NOW.
      fireEvent.click(screen.getByRole('button', { name: 'Menu dos pais' }));
      fireEvent.change(screen.getByLabelText('Horário final'), { target: { value: '20:10' } });
      expect(screen.getByText('TERMINA 20:10')).toBeInTheDocument();
      expect(order()).toEqual([4, 3, 2, 1, 0]);
      expectWholeBehindMarker(1);
      expectMarkerFixed();
      // TV → phone → TV: same.
      flip(true);
      expect(screen.queryByTestId('tv-track')).toBeNull();
      // Phone: same order (P, the last marked, right above the task in progress).
      expect(screen.getAllByTestId('phone-row').map((r) => Number(r.dataset.index))).toEqual([4, 3, 2, 1, 0]);
      tick(at(19, 16, 20));
      flip(false);
      expect(order()).toEqual([4, 3, 2, 1, 0]);
      expectWholeBehindMarker(1);
      expectMarkerFixed();
      // Undo P: back to its original place, pending again; Q is now the most recent mark.
      fireEvent.click(dot('P'));
      expect(dot('P')).toHaveAttribute('aria-pressed', 'false');
      expect(order()).toEqual([4, 3, 2, 0, 1]);
      expectWholeBehindMarker(2);
      // Mark it again: most recent again.
      fireEvent.click(dot('P'));
      expect(order()).toEqual([4, 3, 2, 1, 0]);
      expectWholeBehindMarker(1);
    });

    test('undoing every mark gives the original order and the original deadline', () => {
      renderAt(at(19, 15), false, R);
      const right0 = rightSide();
      [4, 3, 2, 1].forEach((i) => fireEvent.click(dot(names[i])));
      [1, 2, 3, 4].forEach((i) => fireEvent.click(dot(names[i])));
      expect(order()).toEqual([0, 1, 2, 3, 4]);
      expect(rightSide()).toEqual(right0);
      expect(screen.getByTestId('tv-elapsed').dataset.squeezed).toBeUndefined();
      expectMarkerFixed();
    });
  });

  test('marking a task reached by scrolling ahead by hand brings the ribbon back to now, with it in view', () => {
    renderAt(at(19, 35), false);
    const follow = track().scrollLeft;
    fireEvent.wheel(track(), { deltaY: 600 }); // scroll ahead to reach D's dot
    fireEvent.scroll(track());
    expect(line().dataset.mode).toBe('browse');
    fireEvent.click(dot('D'));
    expect(line().dataset.mode).toBe('now');
    expect(track().scrollLeft).not.toBeCloseTo(follow + 600, 0);
    const d = blockX(3);
    expect(d.x - track().scrollLeft).toBeGreaterThanOrEqual(FADE_W - 1e-6);
    expect(d.x + d.w).toBeLessThanOrEqual(nowOnTrack() + 1e-6);
    expect(underFrom(1, 20 + 10 / 3)).toBeCloseTo(15, 6); // A got 10·20/60 of D's 10 min; minute 15 under the marker
  });

  test('closing shown once: in the ribbon only; the side keeps just its controls', () => {
    renderAt(at(20, 40), false);
    expect(screen.getByTestId('tv-closing')).toHaveTextContent('Hora de sair');
    const side = screen.getByTestId('tv-closing-controls');
    expect(side).not.toHaveTextContent('Hora de sair');
    expect(side).not.toHaveTextContent('🚗');
    expect(screen.getByRole('button', { name: 'Mais 5 minutos até Hora de sair' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '↺ Recomeçar' })).toBeInTheDocument();
  });

  test('done tasks never shrink below a readable width, even a 1-minute one finished at once', () => {
    renderAt(at(19, 25), false);
    fireEvent.click(dot('A')); // A ends now, after 5 of its 20 min
    fireEvent.click(dot('B')); // B is current and ends at once
    const a = blockX(0);
    const b = blockX(1);
    expect(order()).toEqual([0, 1, 2, 3, 4]);
    expect(a.w).toBeCloseTo(20 * PPM, 6); // max(planned 5, original 20)
    expect(b.w).toBeCloseTo(20 * PPM, 6);
    expect(b.w).toBeGreaterThanOrEqual(DONE_MIN_W);
    expect(underFrom(2, 5)).toBeCloseTo(5, 6); // C runs from 19:25
  });

  describe('closing ("Hora de dormir"/"Hora de sair") right after the last task', () => {
    const closingBox = () => screen.getByTestId('tv-closing');
    const lastEnd = () => { const e = blockX(4); return e.x + e.w; };
    const inClosing = () => {
      const x = track().scrollLeft + NOW_X;
      return x >= px(closingBox().style.left) - 1e-6;
    };

    test.each([
      ['in progress', at(19, 50), false],
      ['last second of the last task', at(20, 29, 59), false],
      ['deadline', at(20, 30), true],
      ['overtime', at(20, 52), true],
    ])('%s: adjacent to the last task, the marker enters it as soon as the last task ends', (_, now, inside) => {
      renderAt(now, false);
      expect(px(closingBox().style.left)).toBeCloseTo(lastEnd(), 6);
      expect(inClosing()).toBe(inside);
      expectMarkerFixed();
      expect(closingBox()).toHaveTextContent('Hora de sair');
    });

    test('all done before the deadline: the closing starts where the last task ended, the marker is inside it', () => {
      const { tick } = renderAt(at(20, 0), false);
      for (const n of ['C', 'D', 'E']) fireEvent.click(dot(n)); // C was in progress
      // Everything is done; the free time until 20:30 belongs to the closing.
      expect(order()).toEqual([0, 1, 2, 3, 4]);
      expect(closingBox().dataset.lit).toBe('true');
      expect(px(closingBox().style.left)).toBeCloseTo(lastEnd(), 6);
      expect(inClosing()).toBe(true);
      expect(px(closingBox().style.left)).toBeCloseTo(track().scrollLeft + NOW_X, 6); // just entered
      expect(screen.getByText('TERMINA 20:30')).toBeInTheDocument();
      // The deadline line is inside the closing, after the marker; then overtime.
      expect(px(screen.getByTestId('tv-deadline').style.left) + 2).toBeCloseTo(track().scrollLeft + NOW_X + 30 * PPM, 6);
      tick(at(20, 40));
      expect(inClosing()).toBe(true);
      expect(screen.getByTestId('tv-overtime')).toBeInTheDocument();
      expect(px(closingBox().style.left)).toBeCloseTo(lastEnd(), 6);
    });
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

  test('TV → phone → TV without reload: the marker is back on now, never in the closing gap', () => {
    // A matchMedia that can change, like a window being resized.
    const listeners = new Set();
    let phone = false;
    window.matchMedia = () => ({ get matches() { return phone; }, addEventListener: (_, f) => listeners.add(f), removeEventListener: (_, f) => listeners.delete(f) });
    const props = { routines, setRoutines: () => {} };
    const { rerender } = render(<Home {...props} currentTime={at(19, 47, 30)} />);
    const flip = (v) => act(() => { phone = v; listeners.forEach((f) => f()); });
    const before = [lineX(), underMin(), track().scrollLeft];
    for (let k = 0; k < 3; k++) {
      flip(true);
      expect(screen.queryByTestId('tv-track')).toBeNull();
      expect(screen.getByTestId('phone-now-line')).toBeInTheDocument();
      rerender(<Home {...props} currentTime={at(19, 47, 30)} />);
      flip(false);
      expectMarkerFixed();
      expect([lineX(), underMin(), track().scrollLeft]).toEqual(before);
      expect(blockUnder()).toBe(1);
      expect(line().dataset.mode).toBe('now');
    }
    // Same near the end: inside E, then inside the closing, never before it.
    rerender(<Home {...props} currentTime={at(20, 29)} />);
    flip(true);
    flip(false);
    expect(blockUnder()).toBe(4);
    rerender(<Home {...props} currentTime={at(20, 31)} />);
    flip(true);
    flip(false);
    const closingLeft = px(screen.getByTestId('tv-closing').style.left);
    expect(track().scrollLeft + NOW_X).toBeGreaterThanOrEqual(closingLeft);
    // eslint-disable-next-line testing-library/no-node-access -- Geometry requires the containing box/DOM order; jsdom has no layout or accessible equivalent.
    expect(closingLeft).toBeCloseTo(px(screen.getAllByTestId('tv-block')[4].parentElement.style.left) + px(screen.getAllByTestId('tv-block')[4].style.width), 6);
    setPhone(false);
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
  const rows = () => screen.getAllByTestId('phone-row');
  const heights = () => rows().map((r) => px(r.style.height));
  const order = () => rows().map((r) => Number(r.dataset.index));
  const closingRow = () => screen.getByTestId('phone-closing');

  test('marking a future task: it moves above the task in progress (sized by its minutes), NOW stays on the real geometry', () => {
    const { tick } = renderAt(at(19, 25), true);
    expect(heights()).toEqual([20, 20, 10, 10, 10].map((m) => m * PX_PER_MIN));
    expect(nowY()).toBeCloseTo(5 * PX_PER_MIN, 6);

    fireEvent.click(dot('C'));
    expect(order()).toEqual([2, 0, 1, 3, 4]);
    const h = heights();
    expect(h[0]).toBeCloseTo(10 * PX_PER_MIN, 6); // C: its original 10 min, done, above
    expect(rows()[0]).toHaveTextContent('C');
    expect(rows()[0].dataset.early).toBe('true');
    [70 / 3, 70 / 3, 35 / 3, 35 / 3].forEach((m, k) => expect(h[k + 1]).toBeCloseTo(m * PX_PER_MIN, 6));
    expect(nowY()).toBeCloseTo(h[0] + 5 * PX_PER_MIN, 6); // A keeps its start; C is above NOW

    tick(at(19, 50)); // B runs 19:43:20 → 20:06:40; A (23:20 planned) is done, above it with C
    expect(order()).toEqual([0, 2, 1, 3, 4]);
    expect(nowY()).toBeCloseTo((70 / 3) * PX_PER_MIN + h[0] + (20 / 3) * PX_PER_MIN, 6);
    tick(at(20, 10)); // D runs 20:06:40 → 20:18:20
    const h2 = heights();
    expect(order()).toEqual([0, 1, 2, 3, 4]); // all three done rows in their original order
    expect(nowY()).toBeCloseTo(h2[0] + h2[1] + h2[2] + (10 / 3) * PX_PER_MIN, 6);

    for (const name of ['A', 'B', 'C', 'D', 'E']) {
      const b = dot(name);
      expect(px(b.style.width)).toBe(DOT_HIT);
      // eslint-disable-next-line testing-library/no-node-access -- Geometry requires the containing box/DOM order; jsdom has no layout or accessible equivalent.
      expect(px(b.style.height)).toBeLessThanOrEqual(px(b.parentElement.style.height));
      expect(Number(b.style.zIndex)).toBeGreaterThan(Number(screen.getByTestId('phone-now-line').style.zIndex));
    }
  });

  test('undoing the mark puts the row back in its place and size', () => {
    const { tick } = renderAt(at(19, 25), true);
    fireEvent.click(dot('C'));
    tick(at(19, 30));
    fireEvent.click(dot('C'));
    expect(order()).toEqual([0, 1, 2, 3, 4]);
    expect(heights()).toEqual([20, 20, 10, 10, 10].map((m) => m * PX_PER_MIN));
    expect(nowY()).toBeCloseTo(10 * PX_PER_MIN, 6);
  });

  test.each([
    ['in progress', at(20, 25), false],
    ['deadline', at(20, 30), true],
    ['overtime', at(20, 52), true],
  ])('closing row right after the last row (%s); NOW enters it when the last task ends', (_, now, inside) => {
    renderAt(now, true);
    const total = heights().reduce((a, b) => a + b, 0);
    // eslint-disable-next-line testing-library/no-node-access -- Geometry requires the containing box/DOM order; jsdom has no layout or accessible equivalent.
    expect(closingRow().previousSibling).toBe(rows()[4]);
    expect(px(closingRow().style.height)).toBeGreaterThanOrEqual(CLOSE_MIN_H);
    expect(nowY() >= total).toBe(inside);
    expect(nowY()).toBeLessThanOrEqual(total + px(closingRow().style.height));
  });

  test('all done before the deadline: NOW goes straight into the closing row', () => {
    renderAt(at(20, 0), true);
    for (const n of ['C', 'D', 'E']) fireEvent.click(dot(n));
    const total = heights().reduce((a, b) => a + b, 0);
    expect(closingRow().dataset.lit).toBe('true');
    expect(nowY()).toBeCloseTo(total, 6);
  });
});
