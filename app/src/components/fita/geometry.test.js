import { fireEvent, render, screen } from '@testing-library/react';
import Home from '../../pages/Home';
import { DOT_HIT, MIN_ROW_H } from './RoutinePhone';
import { DOT, FLAG_TOP, MIN_BLOCK_W, RIBBON_W } from './RoutineTV';

// Regression for the marca-feito audit: short tasks must keep a whole, tappable dot,
// the TV AGORA flag must never sit on a dot, and NOW must stay aligned with the blocks.

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
      expect(px(b.style.height)).toBeLessThanOrEqual(px(b.parentElement.style.height));
      // Over the NOW line (zIndex 3) and the row has no stacking context of its own.
      expect(Number(b.style.zIndex)).toBeGreaterThan(3);
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
  test('short blocks keep the minimum width and the ribbon width is unchanged', () => {
    renderAt(at(19, 30), false);
    const widths = screen.getAllByTestId('tv-block').map((b) => px(b.style.width));
    expect(widths[1]).toBe(MIN_BLOCK_W);
    expect(widths[2]).toBe(MIN_BLOCK_W);
    expect(widths.reduce((a, b) => a + b, 0)).toBeCloseTo(RIBBON_W, 6);
    expect(widths[0] / widths[3]).toBeCloseTo(4, 6);
  });

  test('dots sit at the bottom, far below the AGORA flag, and above the NOW line', () => {
    renderAt(at(19, 47, 30), false);
    const flag = screen.getByTestId('tv-now-flag');
    expect(px(flag.style.top)).toBe(FLAG_TOP);
    for (const name of ['Jantar', 'Pente', 'Dentes', 'Historinha']) {
      const b = dot(name);
      expect(b.style.top).toBe('');
      expect(px(b.style.width)).toBe(DOT);
      // Ribbon is 300 tall: the dot occupies [300 - bottom - DOT, 300 - bottom].
      // Even a flag three times its real ~41px height would end before that.
      expect(FLAG_TOP + 3 * 41).toBeLessThan(300 - px(b.style.bottom) - DOT);
      expect(Number(b.style.zIndex)).toBeGreaterThan(Number(flag.style.zIndex));
    }
  });

  test('NOW line stays inside the block of the task in progress across the routine', () => {
    for (let s = 0; s < 53 * 60; s += 20) {
      const { unmount } = renderAt(new Date(at(19, 7).getTime() + s * 1000), false);
      const blocks = screen.getAllByTestId('tv-block');
      const widths = blocks.map((b) => px(b.style.width));
      const i = s < 40 * 60 ? 0 : s < 41 * 60 ? 1 : s < 43 * 60 ? 2 : 3;
      const left = widths.slice(0, i).reduce((a, b) => a + b, 0);
      const x = px(screen.getByTestId('tv-now-line').style.left);
      expect(x).toBeGreaterThanOrEqual(left - 1e-6);
      expect(x).toBeLessThanOrEqual(left + widths[i] + 1e-6);
      unmount();
    }
  });
});
