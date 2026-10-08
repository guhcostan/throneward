// Deterministic grid pathfinding (A* 8-dir + line-of-sight smoothing). No DOM, no Three.js.
// Grid layout: blocked[y * size + x] !== 0 means the tile is impassable. Tiles are integers.
// Same input => same output: fixed neighbor order, total-order heap comparison (f, h, x, y).

export interface Tile {
  x: number;
  y: number;
}

const DIAG_COST = 1.4142;
// Fixed neighbor order (dx, dy). Orthogonal first, then diagonal.
const DX = [1, -1, 0, 0, 1, 1, -1, -1];
const DY = [0, 0, 1, -1, 1, -1, 1, -1];

interface HeapEntry {
  f: number;
  h: number;
  idx: number;
}

function heapLess(a: HeapEntry, b: HeapEntry, size: number): boolean {
  if (a.f !== b.f) return a.f < b.f;
  if (a.h !== b.h) return a.h < b.h;
  const ax = a.idx % size;
  const bx = b.idx % size;
  if (ax !== bx) return ax < bx;
  return Math.floor(a.idx / size) < Math.floor(b.idx / size);
}

function heapPush(heap: HeapEntry[], e: HeapEntry, size: number): void {
  heap.push(e);
  let i = heap.length - 1;
  while (i > 0) {
    const p = (i - 1) >> 1;
    if (!heapLess(heap[i], heap[p], size)) break;
    [heap[i], heap[p]] = [heap[p], heap[i]];
    i = p;
  }
}

function heapPop(heap: HeapEntry[], size: number): HeapEntry | undefined {
  const top = heap[0];
  const last = heap.pop();
  if (heap.length === 0 || last === undefined) return top;
  heap[0] = last;
  let i = 0;
  for (;;) {
    const l = 2 * i + 1;
    const r = l + 1;
    let m = i;
    if (l < heap.length && heapLess(heap[l], heap[m], size)) m = l;
    if (r < heap.length && heapLess(heap[r], heap[m], size)) m = r;
    if (m === i) break;
    [heap[i], heap[m]] = [heap[m], heap[i]];
    i = m;
  }
  return top;
}

function isFree(blocked: Uint8Array, size: number, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < size && y < size && blocked[y * size + x] === 0;
}

function octile(x0: number, y0: number, x1: number, y1: number): number {
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  return Math.max(dx, dy) + (DIAG_COST - 1) * Math.min(dx, dy);
}

/**
 * A* on an 8-connected grid. Diagonal moves cannot cut corners (both orthogonal
 * neighbours must be free). Returns waypoints from the tile after the start up to
 * and including the target. Returns [] if start === target, if the target is
 * unreachable / blocked / out of bounds, or if more than `maxVisited` nodes are expanded.
 */
export function findPath(
  blocked: Uint8Array,
  size: number,
  sx: number,
  sy: number,
  tx: number,
  ty: number,
  maxVisited = 20000,
): Tile[] {
  if (size <= 0 || blocked.length < size * size) return [];
  if (!isFree(blocked, size, sx, sy) || !isFree(blocked, size, tx, ty)) return [];
  if (sx === tx && sy === ty) return [];

  const n = size * size;
  const start = sy * size + sx;
  const goal = ty * size + tx;
  const g = new Float64Array(n).fill(Infinity);
  const parent = new Int32Array(n).fill(-1);
  const closed = new Uint8Array(n);
  const heap: HeapEntry[] = [];

  g[start] = 0;
  const h0 = octile(sx, sy, tx, ty);
  heapPush(heap, { f: h0, h: h0, idx: start }, size);

  let expanded = 0;
  while (heap.length > 0) {
    const cur = heapPop(heap, size)!;
    if (closed[cur.idx]) continue;
    if (cur.idx === goal) break;
    closed[cur.idx] = 1;

    expanded++;
    if (expanded > maxVisited) return [];

    const cx = cur.idx % size;
    const cy = Math.floor(cur.idx / size);
    for (let d = 0; d < 8; d++) {
      const nx = cx + DX[d];
      const ny = cy + DY[d];
      if (!isFree(blocked, size, nx, ny)) continue;
      const diag = DX[d] !== 0 && DY[d] !== 0;
      if (diag && (!isFree(blocked, size, cx + DX[d], cy) || !isFree(blocked, size, cx, cy + DY[d]))) continue;
      const ni = ny * size + nx;
      if (closed[ni]) continue;
      const ng = g[cur.idx] + (diag ? DIAG_COST : 1);
      if (ng < g[ni]) {
        g[ni] = ng;
        parent[ni] = cur.idx;
        const h = octile(nx, ny, tx, ty);
        heapPush(heap, { f: ng + h, h, idx: ni }, size);
      }
    }
  }

  if (parent[goal] === -1) return [];

  const out: Tile[] = [];
  let i = goal;
  while (i !== start) {
    out.push({ x: i % size, y: Math.floor(i / size) });
    i = parent[i];
  }
  out.reverse();
  return out;
}

/** True if every tile on the Bresenham line between a and b is free. */
function lineOfSight(blocked: Uint8Array, size: number, ax: number, ay: number, bx: number, by: number): boolean {
  let x = ax;
  let y = ay;
  const dx = Math.abs(bx - ax);
  const dy = -Math.abs(by - ay);
  const stepX = ax < bx ? 1 : -1;
  const stepY = ay < by ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    if (!isFree(blocked, size, x, y)) return false;
    if (x === bx && y === by) return true;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += stepX;
    }
    if (e2 <= dx) {
      err += dx;
      y += stepY;
    }
  }
}

/**
 * Greedy line-of-sight smoothing: from each kept point, jump to the farthest later
 * waypoint that is visible via Bresenham. Removes redundant waypoints.
 *
 * `start` (optional) is the origin tile the path was computed from. If given, the
 * result excludes it (same convention as findPath). If omitted, path[0] is kept as
 * the first output point and smoothing starts from it.
 */
export function smoothPath(blocked: Uint8Array, size: number, path: Tile[], start?: Tile): Tile[] {
  if (path.length === 0) return [];
  const pts = start ? [start, ...path] : path;
  const out: Tile[] = start ? [] : [pts[0]];
  let cur = 0;
  while (cur < pts.length - 1) {
    let next = cur + 1;
    for (let j = pts.length - 1; j > cur + 1; j--) {
      if (lineOfSight(blocked, size, pts[cur].x, pts[cur].y, pts[j].x, pts[j].y)) {
        next = j;
        break;
      }
    }
    out.push(pts[next]);
    cur = next;
  }
  return out;
}
