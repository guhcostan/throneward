// Resource stock, gather rates and gather cycle. Pure logic: no DOM, no Three.js, fixed dt.
// Gatherers mutate in place; the caller moves the villager and passes atDropoff.

export type Resource = 'food' | 'wood' | 'gold' | 'stone';

export const CARRY = 10;
export const CARRY_HUNT = 25;

// Units per second. All values are THR v0 placeholders pending balance verification.
export const GATHER_RATES: Record<string, number> = {
  berry: 0.69, // THR v0 VERIFICAR
  sheep: 0.9, // THR v0 VERIFICAR
  deer: 0.9, // THR v0 VERIFICAR
  boar: 1.0, // THR v0 VERIFICAR
  farm: 0.75, // THR v0 VERIFICAR
  wood: 0.7, // THR v0 VERIFICAR
  gold: 0.7, // THR v0 VERIFICAR
  stone: 0.65, // THR v0 VERIFICAR
};

// Source kind -> resource delivered.
const RESOURCE_OF: Record<string, Resource> = {
  berry: 'food',
  sheep: 'food',
  deer: 'food',
  boar: 'food',
  farm: 'food',
  wood: 'wood',
  gold: 'gold',
  stone: 'stone',
};

// Hunted sources use the larger carry capacity.
const HUNT_KINDS: ReadonlySet<string> = new Set(['deer', 'boar', 'sheep']);

export interface Gatherer {
  id: number;
  carrying: Resource | null;
  amount: number;
  source: { kind: string; x: number; y: number } | null;
  dropoff: { x: number; y: number } | null;
}

export interface PlayerStock {
  stock: Record<Resource, number>;
}

export function addStock(s: PlayerStock, res: Resource, n: number): void {
  s.stock[res] += n;
}

// Atomic: returns false and leaves stock untouched if any resource is insufficient.
export function spendStock(s: PlayerStock, cost: Partial<Record<Resource, number>>): boolean {
  const entries = Object.entries(cost) as [Resource, number][];
  for (const [res, n] of entries) {
    if (s.stock[res] < n) return false;
  }
  for (const [res, n] of entries) {
    s.stock[res] -= n;
  }
  return true;
}

export function carryCapacity(kind: string): number {
  return HUNT_KINDS.has(kind) ? CARRY_HUNT : CARRY;
}

// Accumulates while the source is valid; once full, delivers only when atDropoff is true.
export function gatherTick(
  g: Gatherer,
  dt: number,
  atDropoff: boolean,
): { delivered: Partial<Record<Resource, number>> } {
  const source = g.source;
  if (!source) return { delivered: {} };
  const rate = GATHER_RATES[source.kind];
  const res = RESOURCE_OF[source.kind];
  if (rate === undefined || res === undefined) return { delivered: {} };

  const cap = carryCapacity(source.kind);
  if (g.amount < cap) {
    g.carrying = res;
    g.amount = Math.min(cap, g.amount + rate * dt);
    return { delivered: {} };
  }

  if (!atDropoff || g.carrying === null) return { delivered: {} };
  const delivered: Partial<Record<Resource, number>> = { [g.carrying]: g.amount };
  g.amount = 0;
  g.carrying = null;
  return { delivered };
}

// Applies a technology multiplier to a rate (e.g. 1.15 for +15%).
export function techBonus(rate: number, mult: number): number {
  return rate * mult;
}
