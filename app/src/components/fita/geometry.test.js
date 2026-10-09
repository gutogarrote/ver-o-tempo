import { fireEvent, render, screen } from '@testing-library/react';
import Home from '../../pages/Home';
import { DOT_HIT, MIN_ROW_H } from './RoutinePhone';
import { DOT, DOT_GAP, FLAG_TOP, PX_PER_MIN, RIBBON_W, WINDOW_MIN } from './RoutineTV';

// Regression for the marca-feito audit: short tasks must keep a whole, tappable dot,
// the TV AGORA flag must never sit on a dot, and NOW must stay aligned with the blocks.
// (jsdom has no layout: scrollLeft here is the follow value the component wrote.)

const at = (h, m, s = 0) => {
  const d = new Date();
  d.setHours(h, m, s, 0);
  return d;
};

// 40 + 1 + 2 + 10 = 53 min, ends 20:00 → starts 19:07. Pente 19:47–19:48, Dentes 19:48–19:50.
const routines = {
  monday: {
    morning: {
      name: 'Manhã', endTime: '20:00',
      tasks: [
        { id: 1, name: 'Jantar', icon: '🍽️', color: '#fb923c', minutes: 40 },
        { id: 2, name: 'Pente', icon: '🪮', color: '#f472b6', minutes: 1 },
        { id: 3, name: 'Dentes', icon: '🪥', color: '#a78bfa', minutes: 2 },
        { id: 4, name: 'Historinha', icon: '📖', color: '#f59e0b', minutes: 10 },
      ],
    },
  },
};

function renderAt(now, phone) {
  window.matchMedia = phone ? () => ({ matches: true, addEventListener() {}, removeEventListener() {} }) : undefined;
  return render(<Home routines={routines} setRoutines={() => {}} currentTime={now} />);
}

const px = (v) => parseFloat(v);
const dot = (name) => screen.getByRole('button', { name: new RegExp(`^(Marcar ${name} como feita|${name}: feita)`) });

afterAll(() => { window.matchMedia = undefined; });

describe('phone', () => {
  test('1 and 2 min rows are tall enough for the whole 44px dot target', () => {
    renderAt(at(19, 30), true);
    const rows = screen.getAllByTestId('phone-row');
    expect(rows.map((r) => px(r.style.height))).toEqual([440, MIN_ROW_H, MIN_ROW_H, 110]);
    for (const name of ['Pente', 'Dentes']) {
      const b = dot(name);
      expect(px(b.style.width)).toBe(DOT_HIT);
      expect(px(b.style.height)).toBe(DOT_HIT);
      // eslint-disable-next-line testing-library/no-node-access -- Geometry requires the containing box/DOM order; jsdom has no layout or accessible equivalent.
      expect(px(b.style.height)).toBeLessThanOrEqual(px(b.parentElement.style.height));
      // Over the NOW line (zIndex 3) and the row has no stacking context of its own.
      expect(Number(b.style.zIndex)).toBeGreaterThan(3);
      // eslint-disable-next-line testing-library/no-node-access -- Geometry requires the containing box/DOM order; jsdom has no layout or accessible equivalent.
      expect(b.parentElement.style.zIndex).toBe('');
    }
  });

  test.each([
    [at(19, 20), 13 * 11],        // inside Jantar: unchanged 11 px/min
    [at(19, 47, 30), 440 + 22],   // half of the 1-min Pente row
    [at(19, 48, 30), 484 + 11],   // a quarter into the 2-min Dentes row
    [at(19, 55), 528 + 55],       // half of Historinha
  ])('NOW line at %s sits at %ipx', (now, y) => {
    renderAt(now, true);
    expect(px(screen.getByTestId('phone-now-line').style.top)).toBeCloseTo(y, 6);
  });

  test('the dot of a 1-min task toggles it without starting it', () => {
    renderAt(at(19, 20), true);
    fireEvent.click(dot('Pente'));
    expect(dot('Pente')).toHaveAttribute('aria-pressed', 'true');
    // Jantar is still the task in progress, with its end unchanged.
    expect(screen.getByText('Termina às 19:47')).toBeInTheDocument();
  });
});

describe('TV', () => {
  const perMin = PX_PER_MIN;
  test('short blocks are exactly their minutes (no minimum width); dots stay whole and apart', () => {
    renderAt(at(19, 30), false);
    const widths = screen.getAllByTestId('tv-block').map((b) => px(b.style.width));
    [40, 1, 2, 10].forEach((m, i) => expect(widths[i]).toBeCloseTo(m * perMin, 6));
    expect(perMin * WINDOW_MIN).toBeCloseTo(RIBBON_W, 9);
    const lefts = ['Jantar', 'Pente', 'Dentes', 'Historinha'].map((n) => px(dot(n).style.left));
    for (let i = 1; i < 4; i++) expect(lefts[i] - lefts[i - 1]).toBeGreaterThanOrEqual(DOT_GAP - 1e-6);
    // Each crowded dot stays within one dot of its (narrow) block.
    // eslint-disable-next-line testing-library/no-node-access -- Geometry requires the containing box/DOM order; jsdom has no layout or accessible equivalent.
    const lead = px(screen.getAllByTestId('tv-block')[0].parentElement.style.left);
    expect(Math.abs(lefts[1] + DOT / 2 - lead - 40.5 * perMin)).toBeLessThan(DOT);
    expect(Math.abs(lefts[2] + DOT / 2 - lead - 42 * perMin)).toBeLessThan(DOT);
  });

  test('dots sit at the bottom, far below the time label, and above the NOW line', () => {
    renderAt(at(19, 47, 30), false);
    const tag = screen.getByTestId('tv-now-tag');
    expect(px(tag.style.top)).toBe(FLAG_TOP);
    for (const name of ['Jantar', 'Pente', 'Dentes', 'Historinha']) {
      const b = dot(name);
      expect(b.style.top).toBe('');
      expect(px(b.style.width)).toBe(DOT);
      // Ribbon is 300 tall: the dot occupies [300 - bottom - DOT, 300 - bottom].
      // Even a flag three times its real ~41px height would end before that.
      expect(FLAG_TOP + 3 * 41).toBeLessThan(300 - px(b.style.bottom) - DOT);
      expect(Number(b.style.zIndex)).toBeGreaterThan(Number(tag.style.zIndex));
      expect(Number(b.style.zIndex)).toBeGreaterThan(Number(screen.getByTestId('tv-now-line').style.zIndex));
    }
  });

  test('the minute under the fixed marker is inside the block of the task in progress across the routine', () => {
    for (let s = 0; s < 53 * 60; s += 20) {
      const { unmount } = renderAt(new Date(at(19, 7).getTime() + s * 1000), false);
      const widths = screen.getAllByTestId('tv-block').map((b) => px(b.style.width));
      const i = s < 40 * 60 ? 0 : s < 41 * 60 ? 1 : s < 43 * 60 ? 2 : 3;
      // eslint-disable-next-line testing-library/no-node-access -- Geometry requires the containing box/DOM order; jsdom has no layout or accessible equivalent.
      const lead = px(screen.getAllByTestId('tv-block')[0].parentElement.style.left);
      const line = screen.getByTestId('tv-now-line');
      const x = px(line.style.left) + px(line.style.width) / 2 + px(screen.getByTestId('tv-track').scrollLeft) - lead;
      const left = widths.slice(0, i).reduce((a, b) => a + b, 0);
      expect(x).toBeGreaterThanOrEqual(left - 1e-6);
      expect(x).toBeLessThanOrEqual(left + widths[i] + 1e-6);
      unmount();
    }
  });
});
