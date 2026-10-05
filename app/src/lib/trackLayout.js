// Geometry of the task ribbon (TV row / phone column), in px.
// Blocks are proportional to the minutes they are given (the screens pass the PLANNED
// minutes, so a task that received time grows), but never shrink below `minSize`, so every
// block can hold its completion dot. The NOW line is mapped through the same geometry,
// so it always sits inside the block of the current task.

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

// TV with a time window: `windowMin` minutes fill `length` and a longer plan overflows to
// the right (the ribbon scrolls). A plan that fits the window is stretched to fill it.
export function layoutForWindow(minutes, { length, windowMin, minSize }) {
  const total = minutes.reduce((s, m) => s + m, 0);
  if (total <= windowMin) return layoutByLength(minutes, { length, minSize });
  return layoutByMinute(minutes, { perMin: length / windowMin, minSize });
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
