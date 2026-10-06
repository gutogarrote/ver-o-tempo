import { layoutByLength, layoutByMinute, layoutExact, positionOnTrack, ribbonItems, ribbonTrack, ribbonWindow, spreadDots } from './trackLayout';

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

describe('ribbonItems / ribbonTrack (done tasks behind the marker, closing after the last task)', () => {
  // 5 tasks (minutes 20,20,10,10,10) from minute 0. Task 2 marked ahead of time at minute 5:
  // A 0–23.33 in progress, B –46.67, C 0 min (done), D –58.33, E –70.
  const mk = (rows) => rows.map(([planStart, planMinutes, minutes, done, isCurrent]) => ({ planStart, planMinutes, minutes, done, isCurrent }));
  const blocks = mk([[0, 70 / 3, 20, false, true], [70 / 3, 70 / 3, 20, false, false], [140 / 3, 0, 10, true, false], [140 / 3, 35 / 3, 10, false, false], [175 / 3, 35 / 3, 10, false, false]]);
  const opts = { viewW: 1200, windowMin: 40, followAt: 0.25, planMin: 70, preMaxMin: 30, doneMinPx: 100 };

  test('done first (original order), then the task in progress and the pending ones; closing at the end of the last', () => {
    const { items, pivot, closeMin } = ribbonItems(blocks);
    expect(items.map((it) => it.i)).toEqual([2, 0, 1, 3, 4]);
    expect(items[0]).toMatchObject({ done: true, early: true, minutes: 10, m0: 0, m1: 0 });
    expect(pivot).toBe(0);
    expect(closeMin).toBeCloseTo(70, 9);
  });

  test('exact scale from the marker on; done part and elapsed part only visual; marker reachable; inverse mapping', () => {
    const w = ribbonTrack({ ...opts, blocks, nowMin: 5 });
    const ppm = 30;
    const [c, a, b, d, e] = w.items;
    // C (10 min = 300 px) fills the 300 px left of the marker: A's 5 elapsed minutes are
    // drawn compressed (to nothing), C stays whole and right behind the marker.
    expect(c.w).toBeCloseTo(10 * ppm, 9);
    expect(w.squeeze).toBeCloseTo(5 * ppm, 9);
    expect(w.elapsedW).toBe(0);
    expect(a.x).toBeCloseTo(c.x + c.w, 9);
    expect(w.xOf(5)).toBeCloseTo(a.x, 9);
    expect(a.x + a.w - w.xOf(5)).toBeCloseTo((70 / 3 - 5) * ppm, 9); // what is left of A: exact
    expect(b.w).toBeCloseTo((70 / 3) * ppm, 9);
    expect(e.x + e.w).toBeCloseTo(w.closeX, 9);
    expect(w.closeX - w.xOf(5)).toBeCloseTo(65 * ppm, 9); // same 40-min scale from the marker on
    expect(w.scrollFor(5)).toBeGreaterThanOrEqual(0);
    expect(w.scrollFor(5)).toBeLessThanOrEqual(w.maxScroll + 1e-9);
    for (const m of [5, 23, 47, 69.9, 70, 95]) expect(w.minAt(w.scrollFor(m))).toBeCloseTo(m, 9);
    expect(c.x + c.w).toBeLessThanOrEqual(w.xOf(5)); // C is behind the marker
    expect(c.x - w.scrollFor(5)).toBeGreaterThanOrEqual(0); // ...and inside the window
  });

  // A 60-min task in progress at its minute 35 (marker 10 min after the visible left edge),
  // a 5-min pending task marked done: it must be whole between the left fade and the marker.
  describe('task marked done while the task in progress is far along', () => {
    const edgePx = 36;
    const before = mk([[0, 60, 60, false, true], [60, 5, 5, false, false], [65, 15, 15, false, false]]);
    // After the mark: its 5 min shared 60:15 → current 64, last 16.
    const after = mk([[0, 64, 60, false, true], [64, 0, 5, true, false], [64, 16, 15, false, false]]);
    const view = (w) => { const sl = w.scrollFor(w.markMin); return { left: sl, right: sl + 1200, now: sl + w.anchor }; };

    test('it sits whole right behind the marker, inside the window; the rest is exact', () => {
      const w0 = ribbonTrack({ ...opts, edgePx, blocks: before, nowMin: 35 });
      const w = ribbonTrack({ ...opts, edgePx, blocks: after, nowMin: 35 });
      const v = view(w);
      const [done, cur, last] = w.items;
      expect(done).toMatchObject({ i: 1, done: true, ahead: true });
      expect(done.w).toBeCloseTo(5 * 30, 9); // its minutes, readable
      expect(done.x).toBeGreaterThanOrEqual(v.left + edgePx - 1e-9); // clear of the fade
      expect(done.x + done.w).toBeLessThanOrEqual(v.now + 1e-9); // behind the marker
      expect(cur.x).toBeCloseTo(done.x + done.w, 9); // touches the task in progress, never covers it
      expect(w.elapsedW).toBeCloseTo(300 - edgePx - 150, 9); // elapsed part compressed into what is left
      expect(w.squeeze).toBeCloseTo(35 * 30 - w.elapsedW, 9);
      // Marker and deadline: same minute, same distance on screen as before the mark.
      expect(w.minAt(v.now - w.anchor)).toBeCloseTo(35, 9);
      expect(w.xOf(70) - w.xOf(35)).toBeCloseTo(w0.xOf(70) - w0.xOf(35), 9);
      expect(cur.x + cur.w - v.now).toBeCloseTo((64 - 35) * 30, 9);
      expect(last.w).toBeCloseTo(16 * 30, 9);
      expect(w.minAt(w.scrollFor(35) + 900) - 35).toBeCloseTo(30, 9); // right edge under the marker: 30 exact minutes ahead
      // Without the mark nothing is compressed.
      expect(w0.squeeze).toBe(0);
      expect(w0.xOf(35) - w0.xOf(0)).toBeCloseTo(35 * 30, 9);
    });

    test('no compression while the elapsed part and the done block fit', () => {
      const w = ribbonTrack({ ...opts, edgePx, blocks: after, nowMin: 2 });
      expect(w.squeeze).toBe(0);
      expect(w.xOf(2) - w.items[1].x).toBeCloseTo(60, 9);
    });

    test('a big task marked done is narrowed to the room; with several, the nearest ones stay whole', () => {
      const big = mk([[0, 80, 60, false, true], [80, 0, 30, true, false]]);
      const w = ribbonTrack({ ...opts, edgePx, blocks: big, nowMin: 35 });
      const v = view(w);
      expect(w.items[0].w).toBeCloseTo(300 - edgePx, 9);
      expect(w.items[0].x).toBeCloseTo(v.left + edgePx, 9);
      const many = mk([[0, 80, 60, false, true], [80, 0, 10, true, false], [80, 0, 10, true, false], [80, 0, 10, true, false]]);
      const m = ribbonTrack({ ...opts, edgePx, blocks: many, nowMin: 35 });
      const mv = view(m);
      expect(m.items.slice(0, 3).map((it) => it.w)).toEqual([100, 100, 100]);
      expect(m.items[1].x).toBeGreaterThanOrEqual(mv.left + edgePx - 1e-9);
      expect(m.items[2].x + m.items[2].w).toBeCloseTo(mv.now, 9);
    });

    test('once the plan reaches its slot it is a plain past task again (scrolls away)', () => {
      const later = mk([[0, 64, 60, true, false], [64, 0, 5, true, false], [64, 16, 15, false, true]]);
      const w = ribbonTrack({ ...opts, edgePx, blocks: later, nowMin: 75 });
      expect(w.items.map((it) => it.ahead)).toEqual([false, false, false]);
      expect(w.squeeze).toBe(0);
      expect(w.xOf(75) - w.xOf(64)).toBeCloseTo(11 * 30, 9);
    });
  });

  test('all done before the deadline: closing starts at the last end, the deadline inside it', () => {
    const done = mk([[0, 20, 20, true, false], [20, 20, 20, true, false], [40, 0, 10, true, false], [40, 0, 10, true, false], [40, 0, 10, true, false]]);
    const w = ribbonTrack({ ...opts, blocks: done, nowMin: 40 });
    expect(w.closeMin).toBe(40);
    expect(w.items.at(-1).x + w.items.at(-1).w).toBeCloseTo(w.closeX, 9);
    expect(w.xOf(40)).toBeCloseTo(w.closeX, 9); // now: just inside the closing
    expect(w.xOf(70) - w.closeX).toBeCloseTo(30 * 30, 9);
    expect(w.margin).toBe(0); // the done tasks fill the left: no empty track before them
  });

  test('nothing done: same geometry as ribbonWindow', () => {
    const plain = mk([[0, 20, 20, false, true], [20, 20, 20, false, false], [40, 30, 30, false, false]]);
    for (const nowMin of [-50, -8, 0, 27.5, 70, 92]) {
      const a = ribbonTrack({ ...opts, blocks: plain, nowMin });
      const b = ribbonWindow({ ...opts, nowMin });
      expect(a.contentW).toBeCloseTo(b.contentW, 9);
      expect(a.scrollFor(a.markMin)).toBeCloseTo(b.scrollFor(b.markMin), 9);
      expect(a.closeX).toBeCloseTo(b.xOf(70), 9);
    }
  });
});
