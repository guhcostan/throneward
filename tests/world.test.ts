import { describe, expect, it } from 'vitest';
import { generateTerrain } from '../src/sim/terrain';
import {
  forestInstances,
  heightColor,
  minimapImage,
  resourceMarkers,
  tileToWorld,
  worldToTile,
} from '../src/render/world';

const terrain = () => generateTerrain({ seed: 7, size: 32, players: 2 });

describe('heightColor', () => {
  it('keeps components within [0,1], even for out-of-range input', () => {
    for (const h of [-1, 0, 0.25, 0.5, 0.75, 1, 2, NaN]) {
      const c = heightColor(h);
      for (const v of c) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });

  it('is deterministic and varies with height', () => {
    expect(heightColor(0.3)).toEqual(heightColor(0.3));
    expect(heightColor(0)).not.toEqual(heightColor(1));
  });
});

describe('forestInstances', () => {
  it('has one instance per forest tile, within bounds', () => {
    const t = terrain();
    const inst = forestInstances(t);
    const forestCount = t.forest.reduce((a, b) => a + b, 0);
    expect(inst.length).toBeGreaterThan(0);
    expect(inst.length).toBe(forestCount);
    for (const i of inst) {
      expect(i.x).toBeGreaterThanOrEqual(0);
      expect(i.x).toBeLessThan(t.size);
      expect(i.z).toBeGreaterThanOrEqual(0);
      expect(i.z).toBeLessThan(t.size);
      expect(i.s).toBeGreaterThanOrEqual(1.5);
    }
  });
});

describe('resourceMarkers', () => {
  it('contains gold, stone, sacred and relic markers', () => {
    const kinds = new Set(resourceMarkers(terrain()).map((m) => m.kind));
    expect(kinds.has('gold')).toBe(true);
    expect(kinds.has('stone')).toBe(true);
    expect(kinds.has('sacred')).toBe(true);
    expect(kinds.has('relic')).toBe(true);
  });
});

describe('worldToTile / tileToWorld', () => {
  it('are inverse for tile size 1', () => {
    for (const [tx, ty] of [[0, 0], [3, 4], [31, 17]]) {
      const w = tileToWorld(tx, ty);
      expect(worldToTile(w.x, w.z)).toEqual({ tx, ty });
    }
  });

  it('floors world coordinates with a custom tile size', () => {
    expect(worldToTile(5.9, 2.1, 2)).toEqual({ tx: 2, ty: 1 });
  });
});

describe('minimapImage', () => {
  it('returns px*px*4 bytes with at least 2 distinct colours', () => {
    const img = minimapImage(terrain(), 64);
    expect(img.length).toBe(64 * 64 * 4);
    const colours = new Set<string>();
    for (let i = 0; i < img.length; i += 4) colours.add(`${img[i]},${img[i + 1]},${img[i + 2]}`);
    expect(colours.size).toBeGreaterThanOrEqual(2);
    expect(img[3]).toBe(255);
  });

  it('is deterministic', () => {
    expect(minimapImage(terrain(), 32)).toEqual(minimapImage(terrain(), 32));
  });
});
