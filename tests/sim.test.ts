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

describe('per-player blocked grids (gates)', () => {
  it('own gate opens the wall for the owner only', () => {
    const size = 16;
    const open = new Uint8Array(size * size); // tudo livre
    const shut = new Uint8Array(size * size);
    shut[8 * size + 8] = 1; // tile bloqueado
    const sim = new Sim({ seed: 7, tickRate: 60 });
    const a = sim.spawnUnit('villager', 0, -7, 0);
    const b = sim.spawnUnit('villager', 1, -7, 0);
    sim.setBlocked(open, size, 0); // dono: portão aberto
    sim.setBlocked(shut, size, 1); // inimigo: fechado
    sim.commandMove([a.id], 7, 0);
    sim.commandMove([b.id], 7, 0);
    const qa = sim.state.units.find((u) => u.id === a.id)!.queue;
    const qb = sim.state.units.find((u) => u.id === b.id)!.queue;
    // Dono passa reto (rota mínima); inimigo contorna (mais waypoints).
    expect(qb.length).toBeGreaterThan(qa.length);
  });
});
