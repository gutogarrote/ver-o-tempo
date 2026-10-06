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

// What the ribbon shows, in display order (TV and phone). Semantics of a task marked done
// ahead of time ("Nina went to the potty while the routine said 'play'"): marking it does
// not mean it took zero minutes, only that it is behind us. So:
//  - done tasks (past ones, and ones marked ahead of time) are shown first — past ones in
//    their original order, then the ones marked ahead in the order they were marked —
//    i.e. BEFORE the task in progress and the NOW marker, each sized by
//    max(planned, original) minutes: a big task still looks big, with its name and icon.
//    This part of the ribbon is a visual record, not an exact clock;
//  - from `pivot` (start of the task in progress; end of the last task when none is in
//    progress) the ribbon is an exact time scale: the task in progress and the pending
//    ones, with their planned minutes, then the closing ("Hora de dormir"/"Hora de sair"),
//    right after the last task, from `closeMin` on (free time, deadline, overtime).
// The order derives from the done marks, their order (plan.doneSeq) and the task index, so
// undoing a mark puts the task back in its original place (see schedule.unmarkFuture for
// its time); pending tasks always keep their original order.
// Minutes are counted from the plan start (view.planStart/planMinutes).
export function ribbonItems(blocks) {
  const cur = blocks.findIndex((b) => b.isCurrent);
  const end = (b) => b.planStart + b.planMinutes;
  const pivot = cur >= 0 ? blocks[cur].planStart : blocks.reduce((m, b) => Math.max(m, end(b)), 0);
  const done = [];
  const open = [];
  blocks.forEach((b, i) => (b.done ? done : open).push(i));
  // Tasks marked done ahead of the task in progress come last among the done ones, in the
  // order they were MARKED (markSeq; legacy marks without one count as oldest, by index):
  // the one just marked always sits right before the task in progress, next to NOW.
  const isAhead = (i) => cur >= 0 && i > cur;
  const seq = (i) => blocks[i].markSeq || 0;
  done.sort((a, b) => isAhead(a) - isAhead(b) || (isAhead(a) ? seq(a) - seq(b) : 0) || a - b);
  const items = [
    ...done.map((i) => {
      const b = blocks[i];
      // Marked ahead of the task in progress: its (zero) time slot is still ahead, but it is
      // shown behind us, so it maps to the pivot instant.
      const ahead = cur >= 0 && i > cur;
      return {
        i, done: true, early: b.planMinutes <= 0, ahead,
        m0: ahead ? pivot : Math.min(b.planStart, pivot),
        m1: ahead ? pivot : Math.min(end(b), pivot),
        minutes: Math.max(b.planMinutes, b.minutes),
      };
    }),
    ...open.map((i) => ({ i, done: false, early: false, ahead: false, m0: blocks[i].planStart, m1: end(blocks[i]), minutes: blocks[i].planMinutes })),
  ];
  const closeMin = open.length ? end(blocks[open[open.length - 1]]) : pivot;
  return { items, pivot, closeMin };
}

// TV ribbon (see ribbonItems) seen through a fixed window: `viewW` px show `windowMin`
// minutes; the NOW marker is pinned at `followAt` × viewW and the track scrolls under it.
// Content, left to right: margin (only what is needed so the first thing can sit under the
// marker), done tasks (≥ doneMinPx each), wait before the start (up to preMaxMin), the
// exact part (task in progress, pending tasks), then the closing up to the end of the
// content (free time, deadline, overtime, and room so they can sit under the marker).
// Same contract as ribbonWindow (which it reduces to when nothing is done), plus items/closeX.
//
// Tasks marked done AHEAD of the task in progress (their slot has not come yet: `ahead`) are
// kept in sight, whole, between `edgePx` (the left edge of the window that is not clearly
// visible: fade) and the marker. When the task in progress has already run longer than
// what is left of that room, its ELAPSED part (behind the marker) is drawn compressed
// (`squeeze` px less, `elapsedW` px wide) — a visual record, like the done blocks — and when
// they are too big for the room even so, the ahead blocks themselves share it (≥ doneMinPx
// each; with too many of them the leftmost — marked longest ago — go past the edge, so the
// one just marked is always whole next to the marker). From the marker on the
// ribbon stays exact (remaining minutes of the task in progress, pending tasks, deadline).
// Once the plan reaches their slot they are plain past done tasks and scroll away.
export function ribbonTrack({ blocks, viewW, windowMin, followAt, planMin, nowMin, preMaxMin, doneMinPx = 0, edgePx = 0 }) {
  const perMin = viewW / windowMin;
  const anchor = viewW * followAt;
  const { items, pivot, closeMin } = ribbonItems(blocks);
  const cur = blocks.findIndex((b) => b.isCurrent);
  const pre = Math.min(Math.max(0, -nowMin), preMaxMin);
  const markMin = Math.max(nowMin, -pre);
  const natural = (it) => Math.max(it.minutes * perMin, doneMinPx);
  const room = Math.max(0, anchor - edgePx);
  const ahead = items.filter((it) => it.ahead);
  const aheadNat = ahead.reduce((s, it) => s + natural(it), 0);
  const aheadSizes = aheadNat > room ? layoutByLength(ahead.map((it) => it.minutes), { length: room, minSize: doneMinPx }).sizes : ahead.map(natural);
  const aheadW = new Map(ahead.map((it, k) => [it.i, aheadSizes[k]]));
  const elapsed = cur >= 0 ? Math.max(0, nowMin - pivot) : 0; // minutes of the task in progress behind the marker
  const elapsedW = ahead.length ? Math.min(elapsed * perMin, Math.max(0, room - aheadSizes.reduce((s, w) => s + w, 0))) : elapsed * perMin;
  const squeeze = elapsed * perMin - elapsedW;
  const widthOf = (it) => (it.done ? aheadW.get(it.i) ?? natural(it) : Math.max(0, it.minutes) * perMin - (it.i === cur ? squeeze : 0));
  const doneW = items.filter((it) => it.done).reduce((s, it) => s + widthOf(it), 0);
  const margin = Math.max(0, anchor - doneW);
  const doneEnd = margin + doneW;
  const xP = doneEnd + pre * perMin; // x of the pivot minute
  let x = margin;
  const placed = items.map((it) => {
    if (!it.done && x < xP) x = xP; // the wait before the start comes before the first pending task
    const w = widthOf(it);
    const p = { ...it, x, w };
    x += w;
    return p;
  });
  const past = placed.filter((p) => p.done);
  const xOf = (min) => {
    if (squeeze > 0 && min >= pivot) return min >= nowMin ? xP + elapsedW + (min - nowMin) * perMin : xP + ((min - pivot) / elapsed) * elapsedW;
    if (!past.length || min >= pivot - pre) return xP + (min - pivot) * perMin;
    for (const p of past) {
      if (min < p.m0) return p.x;
      if (min < p.m1) return p.x + ((min - p.m0) / (p.m1 - p.m0)) * p.w;
    }
    return doneEnd;
  };
  const minAt = (cx) => {
    if (squeeze > 0 && cx >= xP) return cx >= xP + elapsedW ? nowMin + (cx - xP - elapsedW) / perMin : pivot + (elapsedW ? ((cx - xP) / elapsedW) * elapsed : 0);
    if (!past.length || cx >= doneEnd) return pivot + (cx - xP) / perMin;
    for (const p of past) if (cx < p.x + p.w) return cx < p.x ? p.m0 : p.m0 + ((cx - p.x) / p.w) * (p.m1 - p.m0);
    return pivot;
  };
  const closeX = xOf(closeMin);
  const contentW = xOf(Math.max(planMin, markMin, closeMin)) + (viewW - anchor);
  return {
    perMin, anchor, lead: margin, margin, contentW, markMin, early: nowMin < markMin,
    maxScroll: contentW - viewW,
    items: placed, pivot, closeMin, closeX, squeeze, elapsedW,
    xOf,
    // scrollLeft that puts `min` under the marker, and the minute under it for a scrollLeft.
    scrollFor: (min) => xOf(min) - anchor,
    minAt: (scrollLeft) => minAt(scrollLeft + anchor),
  };
}

// Phone column: the rows of ribbonItems (each ≥ minSize px tall, so the dot fits), then the
// closing row at `closeY`, right after the last task. yOf(min, closeH) puts a plan minute
// on it: inside the row of the task in progress, or inside the closing row once the last
// task is over (free time, overtime), never below it.
export function ribbonColumn(blocks, { perMin, minSize }) {
  const { items, pivot, closeMin } = ribbonItems(blocks);
  const layout = withOffsets(items.map((it) => Math.max(it.minutes * perMin, minSize)));
  const rows = items.map((it, k) => ({ ...it, y: layout.offsets[k], h: layout.sizes[k] }));
  const closeY = layout.total;
  const yOf = (min, closeH) => {
    for (const r of rows) {
      if (r.done || min >= r.m1) continue;
      return r.m1 > r.m0 ? r.y + Math.max(0, (min - r.m0) / (r.m1 - r.m0)) * r.h : r.y;
    }
    return closeY + Math.min(Math.max(0, (min - closeMin) * perMin), Math.max(0, closeH - 12));
  };
  return { rows, pivot, closeMin, closeY, yOf };
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
