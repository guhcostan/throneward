import { describe, expect, it } from 'vitest';
import { Sim } from '../src/sim/sim';

describe('determinism', () => {
  it('same seed + same commands => same hash', () => {
    const run = (): string => {
      const sim = new Sim({ seed: 42, tickRate: 60 });
      sim.spawnUnit('villager', 0, 0, 0);
      sim.commandMove([1], 10, 5);
      for (let i = 0; i < 120; i++) sim.tickOnce(1 / 60);
      return sim.hash();
    };
    expect(run()).toBe(run());
  });
});
