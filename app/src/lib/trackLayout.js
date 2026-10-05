// Geometry of the task ribbon (TV row / phone column), in px.
// Blocks are proportional to the minutes they are given (the screens pass the PLANNED
// minutes, so a task that received time grows). Phone rows never shrink below `minSize`,
// so every row can hold its completion dot, and the NOW line is mapped through the same
// geometry (positionOnTrack), so it always sits inside the row of the current task.
// The TV uses an exact time scale instead (layoutExact + ribbonWindow + spreadDots).

// Phone: open-ended track, `perMin` px per minute, at least `minSize` each.
export function layoutByMinute(minutes, { perMin, minSize }) {
  return withOffsets(minutes.map((m) => Math.max(m * perMin, minSize)));
}

// TV: blocks share a fixed `length`, proportional to minutes, at least `minSize` each.
// Blocks that would be too small are pinned at `minSize`; the rest share what is left.
export function layoutByLength(minutes, { length, minSize }) {
  const n = minutes.length;
  const sizes = new Array(n).fill(minSize);
  if (!n || n * minSize >= length) return withOffsets(sizes);
  const pinned = new Array(n).fill(false);
  for (;;) {
    let room = length;
    let weight = 0;
    let free = 0;
    for (let i = 0; i < n; i++) {
      if (pinned[i]) room -= minSize;
      else { weight += minutes[i]; free++; }
    }
    let changed = false;
    for (let i = 0; i < n; i++) {
      if (pinned[i]) continue;
      const size = weight > 0 ? (minutes[i] / weight) * room : room / free;
      if (size < minSize) { pinned[i] = true; changed = true; }
      else sizes[i] = size;
    }
    if (!changed) break;
  }
  for (let i = 0; i < n; i++) if (pinned[i]) sizes[i] = minSize;
  return withOffsets(sizes);
}

// TV: a fixed time scale. Every block is exactly minutes × perMin wide — a task with no
// time left (marked done in the future) has no width, so the visible window is always
// exactly the same number of minutes, however many tasks are done. Completion dots do not
// depend on block widths (see spreadDots).
export function layoutExact(minutes, { perMin }) {
  return withOffsets(minutes.map((m) => Math.max(0, m) * perMin));
}

// TV ribbon seen through a fixed window: `viewW` px show `windowMin` minutes and the NOW
// marker is pinned at `followAt` × viewW from the left of the window; the track scrolls
// under it. Content (px), left to right:
//   lead     empty track before the plan start, so the start can sit under the marker
//            (grows before the start, up to `preMaxMin` minutes);
//   plan     0..planMin minutes (blocks, then any free time, up to the deadline);
//   tail     after the deadline: overtime up to now, then room so the deadline/now can
//            still sit under the marker.
// Minutes are counted from the plan start (negative = before it). `markMin` is the time
// the marker shows when following the clock: nowMin, except long before the start, when
// it waits at -preMaxMin (`early`).
export function ribbonWindow({ viewW, windowMin, followAt, planMin, nowMin, preMaxMin }) {
  const perMin = viewW / windowMin;
  const anchor = viewW * followAt;
  const pre = Math.min(Math.max(0, -nowMin), preMaxMin);
  const markMin = Math.max(nowMin, -pre);
  const lead = anchor + pre * perMin;
  const endMin = Math.max(planMin, markMin);
  const contentW = lead + endMin * perMin + (viewW - anchor);
  const xOf = (min) => lead + min * perMin;
  return {
    perMin, anchor, lead, contentW, markMin, early: nowMin < markMin,
    maxScroll: contentW - viewW,
    xOf,
    // scrollLeft that puts `min` under the marker, and the minute under it for a scrollLeft.
    scrollFor: (min) => xOf(min) - anchor,
    minAt: (scrollLeft) => (scrollLeft + anchor - lead) / perMin,
  };
}

// Spread markers (dots) along a line: centers as close as possible to `desired` (sorted
// ascending) but at least `gap` apart. Pool-adjacent-violators: overlapping runs are merged
// and centered on the mean of their wishes, so a crowd spreads evenly around where it wants
// to be instead of being pushed to one side.
export function spreadDots(desired, gap) {
  const runs = []; // { sum of (desired - k·gap), count, first index }
  desired.forEach((d, i) => {
    let run = { sum: d - i * gap, n: 1, first: i };
    for (;;) {
      const prev = runs[runs.length - 1];
      if (!prev || prev.sum / prev.n < run.sum / run.n) break;
      runs.pop();
      run = { sum: prev.sum + run.sum, n: prev.n + run.n, first: prev.first };
    }
    runs.push(run);
  });
  const out = [];
  for (const r of runs) for (let k = 0; k < r.n; k++) out.push(r.sum / r.n + (r.first + k) * gap);
  return out;
}

// Spans of the plan view blocks (see routineView), for positionOnTrack with planElapsed.
export const planSpans = (blocks) => blocks.map((b) => ({ start: b.planStart, minutes: b.planMinutes }));

function withOffsets(sizes) {
  const offsets = [];
  let acc = 0;
  for (const s of sizes) { offsets.push(acc); acc += s; }
  return { sizes, offsets, total: acc };
}

// px position of `elapsed` minutes along the track (blocks carry `start` and `minutes`).
export function positionOnTrack(layout, blocks, elapsed) {
  for (let i = 0; i < blocks.length; i++) {
    const { start, minutes } = blocks[i];
    if (minutes > 0 && elapsed < start + minutes) {
      const frac = Math.min(1, Math.max(0, (elapsed - start) / minutes));
      return layout.offsets[i] + frac * layout.sizes[i];
    }
  }
  return layout.total;
}
