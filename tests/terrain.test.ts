import { describe, it, expect } from 'vitest';
import { generateTerrain, blockedGrid, isBlocked, type TerrainData } from '../src/sim/terrain';

function hashTerrain(t: TerrainData): string {
  let h = 2166136261;
  const mix = (n: number) => {
    h ^= n | 0;
    h = Math.imul(h, 16777619);
  };
  for (let i = 0; i < t.height.length; i++) mix(Math.round(t.height[i] * 1e6));
  const pts = [t.gold, t.stone, t.berries, t.sheep, t.deer, t.boar, t.sacred, t.relics, t.spawns];
  for (const list of pts) {
    for (const p of list) {
      mix(p.x);
      mix(p.y);
    }
  }
  return (h >>> 0).toString(16);
}

function near(list: { x: number; y: number }[], x: number, y: number, r: number): boolean {
  return list.some((p) => Math.hypot(p.x - x, p.y - y) <= r);
}

describe('generateTerrain', () => {
  it('is deterministic for the same seed', () => {
    const a = generateTerrain({ seed: 42, size: 128, players: 2 });
    const b = generateTerrain({ seed: 42, size: 128, players: 2 });
    expect(hashTerrain(a)).toBe(hashTerrain(b));
  });

  it('differs for different seeds', () => {
    const a = generateTerrain({ seed: 1, size: 128, players: 2 });
    const b = generateTerrain({ seed: 2, size: 128, players: 2 });
    expect(hashTerrain(a)).not.toBe(hashTerrain(b));
  });

  it('gives each player gold, stone, fruit and sheep within 20 tiles', () => {
    const t = generateTerrain({ seed: 7, size: 128, players: 4 });
    expect(t.spawns).toHaveLength(4);
    for (const s of t.spawns) {
      expect(near(t.gold, s.x, s.y, 20)).toBe(true);
      expect(near(t.stone, s.x, s.y, 20)).toBe(true);
      expect(near(t.berries, s.x, s.y, 20)).toBe(true);
      expect(near(t.sheep, s.x, s.y, 20)).toBe(true);
    }
  });

  it('creates 3 sacred sites equidistant from the centre and 5 relics', () => {
    const t = generateTerrain({ seed: 99, size: 128, players: 2 });
    expect(t.sacred).toHaveLength(3);
    expect(t.relics).toHaveLength(5);
    const c = t.size / 2;
    const d = t.sacred.map((p) => Math.hypot(p.x - c, p.y - c));
    expect(Math.max(...d) - Math.min(...d)).toBeLessThan(2);
  });

  it('keeps stealth only on forest tiles', () => {
    const t = generateTerrain({ seed: 3, size: 128, players: 2 });
    for (let i = 0; i < t.stealth.length; i++) {
      if (t.stealth[i]) expect(t.forest[i]).toBe(1);
    }
  });
});

describe('blockedGrid / isBlocked', () => {
  it('marks resource tiles and borders as blocked', () => {
    const t = generateTerrain({ seed: 5, size: 64, players: 2 });
    const grid = blockedGrid(t);
    expect(grid.length).toBe(t.size * t.size);
    const g = t.gold[0];
    expect(grid[g.y * t.size + g.x]).toBe(1);
    expect(isBlocked(t, g.x, g.y)).toBe(true);
    const s = t.stone[0];
    expect(grid[s.y * t.size + s.x]).toBe(1);
    expect(grid[0]).toBe(1);
  });

  it('does not block forest tiles', () => {
    const t = generateTerrain({ seed: 11, size: 64, players: 2 });
    const grid = blockedGrid(t);
    for (let i = 0; i < t.forest.length; i++) {
      if (t.forest[i]) {
        const x = i % t.size;
        const y = Math.floor(i / t.size);
        const isEdge = x === 0 || y === 0 || x === t.size - 1 || y === t.size - 1;
        const isRes = t.gold.some((p) => p.x === x && p.y === y) || t.stone.some((p) => p.x === x && p.y === y);
        if (!isEdge && !isRes) expect(grid[i]).toBe(0);
      }
    }
  });
});
