// Deterministic fixed-tick simulation core. No DOM, no Three.js here so it runs headless in Node.
// Mulberry32 PRNG + fixed dt tick. Same seed => same result.

export type Resource = 'food' | 'wood' | 'gold' | 'stone';

export interface SimConfig {
  seed: number;
  tickRate: number; // ticks per second
}

export interface Unit {
  id: number;
  type: string;
  player: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  queue: { x: number; y: number }[];
}

export interface GameState {
  tick: number;
  seed: number;
  units: Unit[];
  resources: Record<Resource, number>[];
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Sim {
  config: SimConfig;
  state: GameState;
  private rng: () => number;
  private nextUnitId = 1;

  constructor(config: SimConfig) {
    this.config = config;
    this.rng = mulberry32(config.seed);
    this.state = { tick: 0, seed: config.seed, units: [], resources: [{ food: 200, wood: 200, gold: 100, stone: 100 }] };
  }

  spawnUnit(type: string, player: number, x: number, y: number, hp = 100): Unit {
    const u: Unit = { id: this.nextUnitId++, type, player, x, y, hp, maxHp: hp, queue: [] };
    this.state.units.push(u);
    return u;
  }

  commandMove(unitIds: number[], x: number, y: number, queueShift = false): void {
    for (const id of unitIds) {
      const u = this.state.units.find((v) => v.id === id);
      if (!u) continue;
      if (!queueShift) u.queue = [];
      u.queue.push({ x, y });
    }
  }

  tickOnce(dt = 1 / 60): void {
    // Deterministic movement: fixed speed, no floats leaking via rng here.
    const speed = 4 * dt; // units per tick at 60Hz baseline
    for (const u of this.state.units) {
      const target = u.queue[0];
      if (!target) continue;
      const dx = target.x - u.x;
      const dy = target.y - u.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= speed) {
        u.x = target.x; u.y = target.y;
        u.queue.shift();
      } else {
        u.x += (dx / dist) * speed;
        u.y += (dy / dist) * speed;
      }
    }
    this.state.tick++;
  }

  hash(): string {
    // Simple deterministic hash for e2e: same seed+commands => same hash.
    let h = 2166136261;
    const s = JSON.stringify([this.state.seed, this.state.tick, this.state.units.map((u) => [u.id, u.x.toFixed(4), u.y.toFixed(4), u.hp])]);
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0).toString(16);
  }

  random(): number {
    return this.rng();
  }
}
