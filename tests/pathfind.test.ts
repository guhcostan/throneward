import { describe, it, expect } from 'vitest';
import { findPath, smoothPath } from '../src/sim/pathfind';

const open = (size: number) => new Uint8Array(size * size);

function grid(size: number, walls: [number, number][]): Uint8Array {
  const b = new Uint8Array(size * size);
  for (const [x, y] of walls) b[y * size + x] = 1;
  return b;
}

describe('findPath', () => {
  it('open 10x10: optimal and deterministic', () => {
    const b = open(10);
    const a = findPath(b, 10, 0, 0, 5, 0);
    expect(a).toEqual([
      { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }, { x: 4, y: 0 }, { x: 5, y: 0 },
    ]);
    const d = findPath(b, 10, 0, 0, 3, 5);
    expect(d.length).toBe(5);
    expect(findPath(b, 10, 0, 0, 3, 5)).toEqual(d);
  });

  it('start == target returns []', () => {
    expect(findPath(open(5), 5, 2, 2, 2, 2)).toEqual([]);
  });

  it('routes through the gap in a wall', () => {
    // vertical wall at x=5, gap at y=7 only
    const walls: [number, number][] = [];
    for (let y = 0; y < 10; y++) if (y !== 7) walls.push([5, y]);
    const b = grid(10, walls);
    const p = findPath(b, 10, 0, 0, 9, 0);
    expect(p.length).toBeGreaterThan(0);
    expect(p[p.length - 1]).toEqual({ x: 9, y: 0 });
    const crossing = p.find((t) => t.x === 5);
    expect(crossing).toEqual({ x: 5, y: 7 });
    expect(p.every((t) => b[t.y * 10 + t.x] === 0)).toBe(true);
  });

  it('target enclosed returns []', () => {
    const walls: [number, number][] = [];
    for (let x = 4; x <= 6; x++) for (let y = 4; y <= 6; y++) if (!(x === 5 && y === 5)) walls.push([x, y]);
    expect(findPath(grid(10, walls), 10, 0, 0, 5, 5)).toEqual([]);
  });

  it('blocked target or out-of-bounds returns []', () => {
    expect(findPath(grid(5, [[4, 4]]), 5, 0, 0, 4, 4)).toEqual([]);
    expect(findPath(open(5), 5, 0, 0, 9, 9)).toEqual([]);
  });

  it('maxVisited cap returns []', () => {
    expect(findPath(open(50), 50, 0, 0, 49, 49, 3)).toEqual([]);
  });

  it('100 calls on same map give identical results', () => {
    const b = grid(20, [[10, 2], [10, 3], [10, 4], [3, 10], [4, 10]]);
    const first = findPath(b, 20, 0, 0, 19, 19);
    for (let i = 0; i < 100; i++) expect(findPath(b, 20, 0, 0, 19, 19)).toEqual(first);
  });
});

describe('smoothPath', () => {
  it('reduces waypoints on open map', () => {
    const b = open(10);
    const raw = findPath(b, 10, 0, 0, 7, 3);
    const s = smoothPath(b, 10, raw, { x: 0, y: 0 });
    expect(s.length).toBeLessThan(raw.length);
    expect(s[s.length - 1]).toEqual({ x: 7, y: 3 });
    expect(smoothPath(b, 10, raw, { x: 0, y: 0 })).toEqual(s);
  });

  it('keeps corners needed around walls', () => {
    const walls: [number, number][] = [[2, 0], [2, 1], [2, 2]];
    const b = grid(6, walls);
    const raw = findPath(b, 6, 0, 0, 4, 0);
    const s = smoothPath(b, 6, raw, { x: 0, y: 0 });
    expect(s.length).toBeGreaterThan(1);
    expect(s[s.length - 1]).toEqual({ x: 4, y: 0 });
  });

  it('empty path returns []', () => {
    expect(smoothPath(open(3), 3, [])).toEqual([]);
  });
});
