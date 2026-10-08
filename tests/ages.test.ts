import { describe, expect, it } from 'vitest';
import {
  AGE_UNLOCKS,
  advanceTick,
  beginAdvance,
  canBuild,
  canTrain,
  cancelAdvance,
  createAgeState,
  setBuilders,
  type AgeState,
  type LandmarkDef,
} from '../src/sim/ages';

function landmark(id: string, age: 2 | 3 | 4, buildTime = 10): LandmarkDef {
  return { id, age, name: id, cost: { food: 100 }, buildTime, effect: `unlocks:${id}` };
}

const feudalPair = (): [LandmarkDef, LandmarkDef] => [
  landmark('patio-arco', 2, 10),
  landmark('guilda-ferro', 2, 12),
];

function run(s: AgeState, dt: number, maxSteps = 10000): number {
  for (let i = 0; i < maxSteps; i++) {
    const r = advanceTick(s, dt);
    if (r !== null) return i + 1;
  }
  throw new Error('did not complete');
}

describe('age advance I -> II via landmark', () => {
  it('completes and unlocks archer', () => {
    const s = createAgeState();
    expect(canTrain(s.age, 'archer')).toBe(false);
    expect(beginAdvance(s, feudalPair())).toBe(true);
    setBuilders(s, 1);
    run(s, 1);
    expect(s.age).toBe(2);
    expect(s.advancing).toBe(false);
    expect(s.choice).toBeNull();
    expect(canTrain(s.age, 'archer')).toBe(true);
    expect(canBuild(s.age, 'barracks')).toBe(true);
  });

  it('returns the new age exactly on completion', () => {
    const s = createAgeState();
    beginAdvance(s, feudalPair());
    setBuilders(s, 1);
    let result: number | null = null;
    for (let i = 0; i < 100 && result === null; i++) {
      result = advanceTick(s, 1);
    }
    expect(result).toBe(2);
  });

  it('rejects a choice that does not target the next age', () => {
    const s = createAgeState();
    expect(beginAdvance(s, [landmark('a', 3), landmark('b', 3)])).toBe(false);
    expect(s.advancing).toBe(false);
  });
});

describe('builders', () => {
  it('without builders the advance does not progress', () => {
    const s = createAgeState();
    beginAdvance(s, feudalPair());
    for (let i = 0; i < 1000; i++) advanceTick(s, 1);
    expect(s.progress).toBe(0);
    expect(s.age).toBe(1);
    expect(s.advancing).toBe(true);
  });

  it('more builders finish faster', () => {
    const slow = createAgeState();
    beginAdvance(slow, feudalPair());
    setBuilders(slow, 1);
    const slowSteps = run(slow, 1);

    const fast = createAgeState();
    beginAdvance(fast, feudalPair());
    setBuilders(fast, 4);
    const fastSteps = run(fast, 1);

    expect(fastSteps).toBeLessThan(slowSteps);
  });

  it('setBuilders clamps negatives to zero', () => {
    const s = createAgeState();
    setBuilders(s, -3);
    expect(s.builders).toBe(0);
  });
});

describe('max age', () => {
  it('age IV cannot advance', () => {
    const s = createAgeState();
    s.age = 4;
    expect(beginAdvance(s, [landmark('a', 4), landmark('b', 4)])).toBe(false);
    expect(s.advancing).toBe(false);
  });

  it('advanceTick does nothing when not advancing', () => {
    const s = createAgeState();
    setBuilders(s, 5);
    expect(advanceTick(s, 100)).toBeNull();
    expect(s.age).toBe(1);
    expect(s.progress).toBe(0);
  });
});

describe('re-entry and cancel', () => {
  it('cannot begin a second advance while advancing', () => {
    const s = createAgeState();
    expect(beginAdvance(s, feudalPair())).toBe(true);
    expect(beginAdvance(s, feudalPair())).toBe(false);
  });

  it('cancel resets advancing, choice and progress but keeps age and builders', () => {
    const s = createAgeState();
    beginAdvance(s, feudalPair());
    setBuilders(s, 2);
    advanceTick(s, 3);
    expect(s.progress).toBeGreaterThan(0);
    cancelAdvance(s);
    expect(s.advancing).toBe(false);
    expect(s.choice).toBeNull();
    expect(s.progress).toBe(0);
    expect(s.age).toBe(1);
    expect(s.builders).toBe(2);
  });

  it('can begin again after cancel', () => {
    const s = createAgeState();
    beginAdvance(s, feudalPair());
    cancelAdvance(s);
    expect(beginAdvance(s, feudalPair())).toBe(true);
  });
});

describe('unlocks', () => {
  it('unlocks are cumulative across ages', () => {
    for (let a = 1; a < 4; a++) {
      const lower = AGE_UNLOCKS[a as 1 | 2 | 3];
      const upper = AGE_UNLOCKS[(a + 1) as 2 | 3 | 4];
      for (const u of lower.units) expect(upper.units).toContain(u);
      for (const b of lower.buildings) expect(upper.buildings).toContain(b);
    }
  });

  it('age I cannot train archer or build barracks', () => {
    expect(canTrain(1, 'archer')).toBe(false);
    expect(canBuild(1, 'barracks')).toBe(false);
    expect(canTrain(1, 'villager')).toBe(true);
  });

  it('trebuchet is only trainable in age IV', () => {
    expect(canTrain(3, 'trebuchet')).toBe(false);
    expect(canTrain(4, 'trebuchet')).toBe(true);
  });
});

describe('determinism', () => {
  it('same inputs produce the same trajectory', () => {
    const trace = (): number[] => {
      const s = createAgeState();
      beginAdvance(s, feudalPair());
      setBuilders(s, 3);
      const out: number[] = [];
      for (let i = 0; i < 50; i++) {
        advanceTick(s, 0.37);
        out.push(s.progress);
      }
      return out;
    };
    expect(trace()).toEqual(trace());
  });
});
