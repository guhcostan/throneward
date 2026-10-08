import { describe, expect, it } from 'vitest';
import { TECHS, TechState, armorBonus, attackMult, gatherMult, research, techTick } from '../src/sim/techs';

describe('techs', () => {
  it('blocks research below required age', () => {
    const s = new TechState();
    expect(research(s, 'melee-atk-2', 2)).toBe(false); // requires age 3
    expect(research(s, 'melee-atk-1', 2)).toBe(true);
    expect(research(s, 'melee-atk-1', 2)).toBe(false); // duplicate queue
  });

  it('completes queue in order with rollover', () => {
    const s = new TechState();
    research(s, 'melee-atk-1', 4); // 30s
    research(s, 'melee-atk-2', 4); // 45s
    const done = techTick(s, 40);
    expect(done).toEqual(['melee-atk-1']);
    expect(s.queue[0].timeLeft).toBeCloseTo(35, 6);
  });

  it('attack/armor/gather mults accumulate', () => {
    const s = new TechState();
    research(s, 'melee-atk-1', 4);
    techTick(s, 30);
    research(s, 'melee-atk-2', 4);
    techTick(s, 45);
    expect(attackMult(s, 'melee')).toBeCloseTo(1.21, 6);
    expect(armorBonus(s, 'melee')).toBe(1);
    research(s, 'horticulture', 4);
    techTick(s, 30);
    research(s, 'fertilization', 4);
    techTick(s, 45);
    expect(gatherMult(s, 'food')).toBeCloseTo(1.21, 6);
    expect(gatherMult(s, 'wood')).toBe(1);
  });

  it('rejects unknown tech and full queue', () => {
    const s = new TechState();
    expect(research(s, 'nope', 4)).toBe(false);
    expect(research(s, 'melee-atk-1', 4)).toBe(true);
    expect(research(s, 'melee-atk-2', 4)).toBe(true);
    expect(research(s, 'melee-atk-3', 4)).toBe(false); // queue full (max 2)
  });

  it('TECHS table is sane', () => {
    for (const t of Object.values(TECHS)) {
      expect(t.time).toBeGreaterThan(0);
      expect(t.effect.mult).toBeGreaterThanOrEqual(1);
    }
  });
});
