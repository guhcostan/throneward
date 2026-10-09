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

// Base speeds in tiles/s (THR v0 VERIFICAR — espelham SPEC §unidades).
export const UNIT_SPEED: Record<string, number> = {
  villager: 1.12,
  scout: 1.625, // SPEC
  spearman: 1.25,
  archer: 1.25,
  crossbow: 1.25,
  manatarms: 1.05,
  knight: 1.55,
  royalknight: 1.625, // SPEC
  monk: 1.12,
  trader: 1.2
};

// Base HP per type = estágio I do SPEC (escalonado por idade no treino via hpForAge).
export const UNIT_HP: Record<string, number> = {
  villager: 50,
  scout: 110, // SPEC (era 90 THR v0)
  spearman: 80,
  archer: 70,
  crossbow: 80,
  manatarms: 100, // SPEC I (era 155 THR v0); 120/155/180 nas eras seguintes
  knight: 230,
  royalknight: 190, // SPEC estágio II
  monk: 90,
  trader: 90
};

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

  spawnUnit(type: string, player: number, x: number, y: number, hp?: number): Unit {
    const base = hp ?? UNIT_HP[type] ?? 100;
    const u: Unit = { id: this.nextUnitId++, type, player, x, y, hp: base, maxHp: base, queue: [] };
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
    // Deterministic movement: per-type speed (tiles/s), no rng floats here.
    for (const u of this.state.units) {
      const target = u.queue[0];
      if (!target) continue;
      const speed = (UNIT_SPEED[u.type] ?? 1.2) * dt;
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
    const s = JSON.stringify([this.state.seed, this.state.tick, this.state.resources, this.state.units.map((u) => [u.id, u.type, u.x.toFixed(4), u.y.toFixed(4), u.hp, u.queue])]);
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0).toString(16);
  }

  random(): number {
    return this.rng();
  }
}
