import { layoutByLength, layoutByMinute, layoutExact, positionOnTrack, ribbonWindow, spreadDots } from './trackLayout';

const blocksOf = (minutes) => {
  let start = 0;
  return minutes.map((m) => { const b = { start, minutes: m }; start += m; return b; });
};

test('phone rows: minutes × px, never below the minimum (1 and 2 min tasks included)', () => {
  const l = layoutByMinute([40, 1, 2, 0, 10], { perMin: 11, minSize: 44 });
  expect(l.sizes).toEqual([440, 44, 44, 44, 110]);
  expect(l.offsets).toEqual([0, 440, 484, 528, 572]);
  expect(l.total).toBe(682);
});

test('TV blocks fill the ribbon exactly; short tasks are pinned at the minimum', () => {
  const l = layoutByLength([40, 1, 2, 10], { length: 1227, minSize: 56 });
  expect(l.sizes[1]).toBe(56);
  expect(l.sizes[2]).toBe(56);
  expect(l.total).toBeCloseTo(1227, 6);
  // The rest stay proportional to each other.
  expect(l.sizes[0] / l.sizes[3]).toBeCloseTo(4, 6);
  for (const s of l.sizes) expect(s).toBeGreaterThanOrEqual(56);
});

test('TV layout without short tasks is plain proportional', () => {
  const l = layoutByLength([10, 20, 30], { length: 600, minSize: 56 });
  expect(l.sizes).toEqual([100, 200, 300]);
});

test('TV layout survives cascading pins, zero minutes and too many tasks', () => {
  const cascade = layoutByLength([100, 3, 3, 3], { length: 300, minSize: 56 });
  expect(cascade.sizes.slice(1)).toEqual([56, 56, 56]);
  expect(cascade.total).toBeCloseTo(300, 6);
  expect(layoutByLength([0, 0], { length: 200, minSize: 56 }).sizes).toEqual([100, 100]);
  expect(layoutByLength([5, 5, 5], { length: 100, minSize: 56 }).sizes).toEqual([56, 56, 56]);
  expect(layoutByLength([], { length: 100, minSize: 56 }).total).toBe(0);
});

test('NOW is always inside the block of the task in progress, and moves forward', () => {
  const minutes = [40, 1, 2, 0, 10];
  const blocks = blocksOf(minutes);
  for (const layout of [
    layoutByMinute(minutes, { perMin: 11, minSize: 44 }),
    layoutByLength(minutes, { length: 1227, minSize: 56 }),
  ]) {
    let last = -1;
    for (let e = 0; e < 53; e += 0.05) {
      const i = blocks.findIndex((b) => b.minutes > 0 && e >= b.start && e < b.start + b.minutes);
      const pos = positionOnTrack(layout, blocks, e);
      expect(pos).toBeGreaterThanOrEqual(layout.offsets[i]);
      expect(pos).toBeLessThanOrEqual(layout.offsets[i] + layout.sizes[i]);
      expect(pos).toBeGreaterThanOrEqual(last);
      last = pos;
    }
    expect(positionOnTrack(layout, blocks, 53)).toBe(layout.total);
  }
  // Half of the 1-min task = middle of its (enlarged) row.
  expect(positionOnTrack(layoutByMinute(minutes, { perMin: 11, minSize: 44 }), blocks, 40.5)).toBe(462);
});

test('TV exact layout: minutes × px, zero-time blocks take no room', () => {
  const l = layoutExact([20, 0, 10, 1], { perMin: 30 });
  expect(l.sizes).toEqual([600, 0, 300, 30]);
  expect(l.offsets).toEqual([0, 600, 600, 900]);
  expect(l.total).toBe(930);
});

test('TV ribbon window: marker at followAt, every instant reachable, 40 min per view', () => {
  const base = { viewW: 1200, windowMin: 40, followAt: 0.25, planMin: 70, preMaxMin: 30 };
  for (const nowMin of [-100, -30, -8, 0, 12.5, 69.99, 70, 95]) {
    const w = ribbonWindow({ ...base, nowMin });
    expect(w.perMin).toBe(30);
    expect(w.anchor).toBe(300);
    const sl = w.scrollFor(w.markMin);
    expect(sl).toBeGreaterThanOrEqual(-1e-9);
    expect(sl).toBeLessThanOrEqual(w.maxScroll + 1e-9);
    expect(w.minAt(sl)).toBeCloseTo(w.markMin, 9);
    expect(w.markMin).toBe(Math.max(nowMin, -30));
    expect(w.early).toBe(nowMin < -30);
    // The view always spans exactly windowMin minutes.
    expect(w.minAt(sl + 1200) - w.minAt(sl)).toBeCloseTo(40, 9);
  }
  // Start of the plan under the marker with the track at 0.
  expect(ribbonWindow({ ...base, nowMin: 0 }).scrollFor(0)).toBe(0);
});

test('spreadDots keeps wishes when there is room and spreads crowds evenly around them', () => {
  expect(spreadDots([0, 100, 200], 46)).toEqual([0, 100, 200]);
  expect(spreadDots([100, 100], 46)).toEqual([77, 123]);
  expect(spreadDots([100, 100, 100], 46)).toEqual([54, 100, 146]);
  const out = spreadDots([0, 566, 600, 600, 630, 900], 46);
  for (let i = 1; i < out.length; i++) expect(out[i] - out[i - 1]).toBeGreaterThanOrEqual(46 - 1e-9);
  expect(out[0]).toBe(0);
  expect(out[5]).toBe(900);
  expect(spreadDots([], 46)).toEqual([]);
});
