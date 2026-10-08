// Pure world-render helpers: colours, instance lists, markers and minimap pixels.
// No WebGL / DOM usage, so everything here is testable headless.

import type { TerrainData } from '../sim/terrain';

export type ResourceKind = 'gold' | 'stone' | 'berries' | 'relic' | 'sacred';

export interface ForestInstance {
  x: number;
  y: number;
  z: number;
  s: number;
}

export interface ResourceMarker {
  kind: ResourceKind;
  x: number;
  y: number;
}

const GRASS_LOW: [number, number, number] = [0.14, 0.32, 0.1]; // dark green
const GRASS_HIGH: [number, number, number] = [0.66, 0.78, 0.36]; // light yellow-green

const GRASS_BASE: [number, number, number] = [0.36, 0.6, 0.24];
const FOREST_RGB: [number, number, number] = [0.07, 0.25, 0.1];
const STEALTH_RGB: [number, number, number] = [0.42, 0.22, 0.55];
const GOLD_RGB: [number, number, number] = [1.0, 0.84, 0.1];
const STONE_RGB: [number, number, number] = [0.55, 0.55, 0.58];
const BERRY_RGB: [number, number, number] = [0.8, 0.1, 0.35];
const SACRED_RGB: [number, number, number] = [0.95, 0.95, 0.85];
const RELIC_RGB: [number, number, number] = [0.3, 0.8, 1.0];

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** Grass colour for normalised height h (clamped to [0,1]); RGB components in [0,1]. */
export function heightColor(h: number): [number, number, number] {
  const t = clamp01(h);
  return [
    GRASS_LOW[0] + (GRASS_HIGH[0] - GRASS_LOW[0]) * t,
    GRASS_LOW[1] + (GRASS_HIGH[1] - GRASS_LOW[1]) * t,
    GRASS_LOW[2] + (GRASS_HIGH[2] - GRASS_LOW[2]) * t,
  ];
}

/** One tree instance per forest tile. x/z = tile coords (world == tile), y = ground height, s = tree scale. */
export function forestInstances(t: TerrainData): ForestInstance[] {
  const out: ForestInstance[] = [];
  for (let y = 0; y < t.size; y++) {
    for (let x = 0; x < t.size; x++) {
      const i = y * t.size + x;
      if (t.forest[i] !== 1) continue;
      const h = t.height[i];
      out.push({ x, y: h, z: y, s: 1.5 + h });
    }
  }
  return out;
}

/** Markers for gold, stone, berries, relics and sacred sites (for minimap and world). */
export function resourceMarkers(t: TerrainData): ResourceMarker[] {
  const out: ResourceMarker[] = [];
  const push = (kind: ResourceKind, pts: { x: number; y: number }[]) => {
    for (const p of pts) out.push({ kind, x: p.x, y: p.y });
  };
  push('gold', t.gold);
  push('stone', t.stone);
  push('berries', t.berries);
  push('relic', t.relics);
  push('sacred', t.sacred);
  return out;
}

/** World (x,z) -> tile indices. */
export function worldToTile(x: number, z: number, tileSize = 1): { tx: number; ty: number } {
  const s = tileSize > 0 ? tileSize : 1;
  return { tx: Math.floor(x / s), ty: Math.floor(z / s) };
}

/** Tile -> world position (tile size 1: world == tile). */
export function tileToWorld(tx: number, ty: number): { x: number; z: number } {
  return { x: tx, z: ty };
}

/** RGBA minimap, px*px*4 bytes, row-major from top-left. */
export function minimapImage(t: TerrainData, px = 128): Uint8ClampedArray {
  const size = t.size;
  const n = Math.max(1, Math.floor(px));
  // Tile colour grid first, then nearest-neighbour sample into the image.
  const tiles = new Float32Array(size * size * 3);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      const base = heightColor(t.height[i]);
      // Grass tinted by height, mixed toward a neutral base for readability.
      let c: [number, number, number] = [
        (base[0] + GRASS_BASE[0]) / 2,
        (base[1] + GRASS_BASE[1]) / 2,
        (base[2] + GRASS_BASE[2]) / 2,
      ];
      if (t.forest[i] === 1) c = t.stealth[i] === 1 ? STEALTH_RGB : FOREST_RGB;
      tiles[i * 3] = c[0];
      tiles[i * 3 + 1] = c[1];
      tiles[i * 3 + 2] = c[2];
    }
  }
  const paint = (pts: { x: number; y: number }[], rgb: [number, number, number]) => {
    for (const p of pts) {
      const x = Math.round(p.x);
      const y = Math.round(p.y);
      if (x < 0 || y < 0 || x >= size || y >= size) continue;
      const i = (y * size + x) * 3;
      tiles[i] = rgb[0];
      tiles[i + 1] = rgb[1];
      tiles[i + 2] = rgb[2];
    }
  };
  paint(t.stone, STONE_RGB);
  paint(t.gold, GOLD_RGB);
  paint(t.berries, BERRY_RGB);
  paint(t.sacred, SACRED_RGB);
  paint(t.relics, RELIC_RGB);

  const img = new Uint8ClampedArray(n * n * 4);
  for (let py = 0; py < n; py++) {
    const ty = Math.min(size - 1, Math.floor((py * size) / n));
    for (let px2 = 0; px2 < n; px2++) {
      const tx = Math.min(size - 1, Math.floor((px2 * size) / n));
      const i = (ty * size + tx) * 3;
      const o = (py * n + px2) * 4;
      img[o] = Math.round(tiles[i] * 255);
      img[o + 1] = Math.round(tiles[i + 1] * 255);
      img[o + 2] = Math.round(tiles[i + 2] * 255);
      img[o + 3] = 255;
    }
  }
  return img;
}
