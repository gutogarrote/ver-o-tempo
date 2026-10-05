import { layoutByLength, layoutByMinute, layoutForWindow, positionOnTrack } from './trackLayout';

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

test('TV window: up to windowMin the plan fills the ribbon; longer plans overflow at length/windowMin px per min', () => {
  const fit = layoutForWindow([20, 10], { length: 1200, windowMin: 40, minSize: 56 });
  expect(fit.sizes).toEqual([800, 400]);
  const long = layoutForWindow([20, 20, 10, 10, 10], { length: 1200, windowMin: 40, minSize: 56 });
  expect(long.sizes).toEqual([600, 600, 300, 300, 300]);
  expect(long.total).toBe(2100); // 70 min, 40 of them visible at once
  // A task marked done in the future keeps a visible (dot-sized) block.
  expect(layoutForWindow([45, 0, 15], { length: 1200, windowMin: 40, minSize: 56 }).sizes).toEqual([1350, 56, 450]);
});
