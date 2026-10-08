// Deterministic map generation from a seed. No DOM, no Three.js: runs headless in Node.
// Same config => identical TerrainData. PRNG is a local copy of mulberry32 (no coupling to sim.ts).

export interface TerrainConfig {
  seed: number;
  size: number; // tiles per side (default 128)
  players: number;
}

export interface ResourcePoint {
  x: number;
  y: number;
  amount: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface TerrainData {
  size: number;
  height: Float32Array;
  forest: Uint8Array; // 1 = forest tile
  stealth: Uint8Array; // 1 = forest tile where units are hidden
  gold: ResourcePoint[];
  stone: ResourcePoint[];
  berries: ResourcePoint[];
  sheep: Point[];
  deer: Point[];
  boar: Point[];
  sacred: Point[];
  relics: Point[];
  spawns: Point[];
}

const SPAWN_RADIUS = 8; // resources placed within this distance of each spawn
const RESOURCE_RING = 10; // distance band used for per-player resources
const FOREST_THRESHOLD = 0.62;
const STEALTH_CHANCE = 0.1;
const CENTER_NEUTRAL_COUNT = 4; // extra neutral gold/stone piles near the centre
const DEER_COUNT = 10;
const BOAR_COUNT = 8;
const RELIC_COUNT = 5;

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Integer hash -> [0,1) lattice value, used by value-noise.
function latticeValue(seed: number, ix: number, iy: number): number {
  let h = Math.imul(ix | 0, 374761393) ^ Math.imul(iy | 0, 668265263) ^ Math.imul(seed | 0, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

// Bilinear-smoothed value noise at (x, y) for a given lattice frequency seed.
function valueNoise(seed: number, x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = smooth(x - ix);
  const fy = smooth(y - iy);
  const v00 = latticeValue(seed, ix, iy);
  const v10 = latticeValue(seed, ix + 1, iy);
  const v01 = latticeValue(seed, ix, iy + 1);
  const v11 = latticeValue(seed, ix + 1, iy + 1);
  const top = v00 + (v10 - v00) * fx;
  const bottom = v01 + (v11 - v01) * fx;
  return top + (bottom - top) * fy;
}

// Three octaves of value noise, normalised to roughly [0,1].
function fractalNoise(seed: number, x: number, y: number, baseFreq: number): number {
  let amp = 1;
  let freq = baseFreq;
  let sum = 0;
  let norm = 0;
  for (let o = 0; o < 3; o++) {
    sum += amp * valueNoise(seed + o * 1013, x * freq, y * freq);
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm;
}

function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by);
}

function inBounds(size: number, x: number, y: number): boolean {
  return x >= 1 && y >= 1 && x < size - 1 && y < size - 1;
}

function tileIndex(size: number, x: number, y: number): number {
  return y * size + x;
}

// Random point at distance in [minR, maxR] around (cx, cy), kept inside the playable interior.
function randomAround(
  rng: () => number,
  size: number,
  cx: number,
  cy: number,
  minR: number,
  maxR: number,
): Point {
  for (let attempt = 0; attempt < 32; attempt++) {
    const a = rng() * Math.PI * 2;
    const r = minR + rng() * (maxR - minR);
    const x = Math.round(cx + Math.cos(a) * r);
    const y = Math.round(cy + Math.sin(a) * r);
    if (inBounds(size, x, y)) return { x, y };
  }
  return { x: Math.round(cx), y: Math.round(cy) };
}

export function generateTerrain(cfg: TerrainConfig): TerrainData {
  const size = cfg.size > 0 ? Math.floor(cfg.size) : 128;
  const players = Math.max(1, Math.floor(cfg.players));
  const rng = mulberry32(cfg.seed);
  const seed = cfg.seed | 0;
  const total = size * size;

  // Height: smooth relief via 3-octave value noise.
  const height = new Float32Array(total);
  const forestNoise = new Float32Array(total);
  const forest = new Uint8Array(total);
  const stealth = new Uint8Array(total);
  const baseFreq = 4 / size;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = tileIndex(size, x, y);
      height[i] = fractalNoise(seed, x, y, baseFreq);
      forestNoise[i] = fractalNoise(seed ^ 0x5bd1e995, x, y, baseFreq * 1.5);
    }
  }

  // Forest: blobs where noise exceeds threshold; ~10% of forest tiles get stealth.
  for (let i = 0; i < total; i++) {
    if (forestNoise[i] > FOREST_THRESHOLD) {
      forest[i] = 1;
      if (rng() < STEALTH_CHANCE) stealth[i] = 1;
    }
  }

  // Spawns: players arranged on a ring around the centre.
  const cx = size / 2;
  const cy = size / 2;
  const ringR = size * 0.36;
  const spawns: Point[] = [];
  for (let p = 0; p < players; p++) {
    const a = (p / players) * Math.PI * 2 - Math.PI / 2;
    spawns.push({
      x: Math.round(cx + Math.cos(a) * ringR),
      y: Math.round(cy + Math.sin(a) * ringR),
    });
  }

  const gold: ResourcePoint[] = [];
  const stone: ResourcePoint[] = [];
  const berries: ResourcePoint[] = [];
  const sheep: Point[] = [];
  const deer: Point[] = [];
  const boar: Point[] = [];

  // Per-player resources near each spawn: 2 gold + 1 stone + berries + sheep.
  for (const s of spawns) {
    for (let g = 0; g < 2; g++) {
      const p = randomAround(rng, size, s.x, s.y, RESOURCE_RING - 2, RESOURCE_RING + 2);
      gold.push({ x: p.x, y: p.y, amount: 800 + Math.floor(rng() * 200) });
    }
    const st = randomAround(rng, size, s.x, s.y, RESOURCE_RING - 2, RESOURCE_RING + 2);
    stone.push({ x: st.x, y: st.y, amount: 700 + Math.floor(rng() * 200) });

    const b = randomAround(rng, size, s.x, s.y, 4, SPAWN_RADIUS);
    berries.push({ x: b.x, y: b.y, amount: 200 + Math.floor(rng() * 100) });

    const sh = randomAround(rng, size, s.x, s.y, 4, SPAWN_RADIUS);
    sheep.push(sh);
  }

  // Neutral gold/stone piles near the centre.
  for (let n = 0; n < CENTER_NEUTRAL_COUNT; n++) {
    const gp = randomAround(rng, size, cx, cy, 2, size * 0.12);
    gold.push({ x: gp.x, y: gp.y, amount: 1000 + Math.floor(rng() * 300) });
    const sp = randomAround(rng, size, cx, cy, 2, size * 0.12);
    stone.push({ x: sp.x, y: sp.y, amount: 900 + Math.floor(rng() * 300) });
  }

  // Huntable animals scattered across the map.
  for (let i = 0; i < DEER_COUNT; i++) {
    deer.push({ x: 1 + Math.floor(rng() * (size - 2)), y: 1 + Math.floor(rng() * (size - 2)) });
  }
  for (let i = 0; i < BOAR_COUNT; i++) {
    boar.push({ x: 1 + Math.floor(rng() * (size - 2)), y: 1 + Math.floor(rng() * (size - 2)) });
  }

  // Three sacred sites equidistant from the centre (120° apart).
  const sacredR = size * 0.2;
  const sacredOffset = rng() * Math.PI * 2;
  const sacred: Point[] = [];
  for (let k = 0; k < 3; k++) {
    const a = sacredOffset + (k / 3) * Math.PI * 2;
    sacred.push({ x: Math.round(cx + Math.cos(a) * sacredR), y: Math.round(cy + Math.sin(a) * sacredR) });
  }

  // Five relics spread across the map, away from spawns.
  const relics: Point[] = [];
  let guard = 0;
  while (relics.length < RELIC_COUNT && guard++ < 1000) {
    const x = 1 + Math.floor(rng() * (size - 2));
    const y = 1 + Math.floor(rng() * (size - 2));
    const farEnough = spawns.every((s) => dist(x, y, s.x, s.y) > size * 0.15);
    const apart = relics.every((r) => dist(x, y, r.x, r.y) > size * 0.12);
    if (farEnough && apart) relics.push({ x, y });
  }

  // TC clearings: no forest/stealth near spawns or map center (gameplay + camera).
  const clearings: { x: number; y: number; r: number }[] = [
    ...spawns.map((s) => ({ x: s.x, y: s.y, r: 7 })),
    { x: cx, y: cy, r: 5 }
  ];
  for (const c of clearings) {
    for (let y = Math.max(0, Math.floor(c.y - c.r)); y <= Math.min(size - 1, Math.ceil(c.y + c.r)); y++) {
      for (let x = Math.max(0, Math.floor(c.x - c.r)); x <= Math.min(size - 1, Math.ceil(c.x + c.r)); x++) {
        if (dist(x, y, c.x, c.y) <= c.r) {
          forest[y * size + x] = 0;
          stealth[y * size + x] = 0;
        }
      }
    }
  }

  return {
    size,
    height,
    forest,
    stealth,
    gold,
    stone,
    berries,
    sheep,
    deer,
    boar,
    sacred,
    relics,
    spawns,
  };
}

// Border tiles are impassable; resource tiles block pathfinding; forest never blocks (stealth only).
export function isBlocked(t: TerrainData, x: number, y: number): boolean {
  const xi = Math.round(x);
  const yi = Math.round(y);
  if (xi < 0 || yi < 0 || xi >= t.size || yi >= t.size) return true;
  if (xi === 0 || yi === 0 || xi === t.size - 1 || yi === t.size - 1) return true;
  const isResource = (p: ResourcePoint) => Math.round(p.x) === xi && Math.round(p.y) === yi;
  return t.gold.some(isResource) || t.stone.some(isResource);
}

// Pathfinding grid: 1 = blocked, 0 = free. Index = y * size + x.
export function blockedGrid(t: TerrainData): Uint8Array {
  const grid = new Uint8Array(t.size * t.size);
  for (let y = 0; y < t.size; y++) {
    for (let x = 0; x < t.size; x++) {
      grid[tileIndex(t.size, x, y)] = isBlocked(t, x, y) ? 1 : 0;
    }
  }
  return grid;
}
