import { describe, expect, it } from 'vitest';
import {
  CARRY,
  CARRY_HUNT,
  addStock,
  gatherTick,
  spendStock,
  techBonus,
  type Gatherer,
  type PlayerStock,
} from '../src/sim/resources';

function stock(food = 0, wood = 0, gold = 0, stone = 0): PlayerStock {
  return { stock: { food, wood, gold, stone } };
}

function gatherer(kind: string): Gatherer {
  return { id: 1, carrying: null, amount: 0, source: { kind, x: 0, y: 0 }, dropoff: { x: 0, y: 0 } };
}

// Runs fixed ticks until something is delivered; returns total delivered and elapsed seconds.
function runUntilDelivery(g: Gatherer, dt: number, maxSeconds: number): { total: number; seconds: number } {
  let t = 0;
  while (t < maxSeconds) {
    t += dt;
    const { delivered } = gatherTick(g, dt, true);
    const amount = Object.values(delivered).reduce((a, b) => a + (b ?? 0), 0);
    if (amount > 0) return { total: amount, seconds: t };
  }
  return { total: 0, seconds: t };
}

describe('spendStock', () => {
  it('fails without deducting when funds are insufficient', () => {
    const s = stock(50, 50, 0, 0);
    expect(spendStock(s, { food: 50, gold: 10 })).toBe(false);
    expect(s.stock).toEqual({ food: 50, wood: 50, gold: 0, stone: 0 });
  });

  it('deducts when funds are sufficient', () => {
    const s = stock(50, 50, 0, 0);
    expect(spendStock(s, { food: 20, wood: 10 })).toBe(true);
    expect(s.stock).toEqual({ food: 30, wood: 40, gold: 0, stone: 0 });
  });
});

describe('addStock', () => {
  it('adds to the given resource', () => {
    const s = stock();
    addStock(s, 'stone', 7);
    expect(s.stock.stone).toBe(7);
  });
});

describe('gatherTick', () => {
  it('berry delivers 10 after ~14.5s when at dropoff', () => {
    const g = gatherer('berry');
    const { total, seconds } = runUntilDelivery(g, 1 / 60, 30);
    expect(total).toBeCloseTo(CARRY, 5);
    expect(seconds).toBeGreaterThan(14.3);
    expect(seconds).toBeLessThan(14.8);
    expect(g.amount).toBe(0);
    expect(g.carrying).toBeNull();
  });

  it('does not deliver when full but not at dropoff', () => {
    const g = gatherer('wood');
    for (let i = 0; i < 60 * 30; i++) gatherTick(g, 1 / 60, false);
    expect(g.amount).toBe(CARRY);
    expect(g.carrying).toBe('wood');
  });

  it('hunting delivers 25 food', () => {
    const g = gatherer('deer');
    const { total } = runUntilDelivery(g, 1 / 60, 60);
    expect(total).toBeCloseTo(CARRY_HUNT, 5);
    expect(g.amount).toBe(0);
  });

  it('is deterministic across two identical runs', () => {
    const run = (): number[] => {
      const g = gatherer('boar');
      const out: number[] = [];
      for (let i = 0; i < 2000; i++) {
        const { delivered } = gatherTick(g, 1 / 60, i % 7 === 0);
        out.push(Object.values(delivered).reduce((a, b) => a + (b ?? 0), 0), g.amount);
      }
      return out;
    };
    expect(run()).toEqual(run());
  });
});

describe('techBonus', () => {
  it('multiplies the rate', () => {
    expect(techBonus(0.7, 1.15)).toBeCloseTo(0.805, 10);
  });
});
