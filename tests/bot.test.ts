import { describe, expect, it } from 'vitest';
import { Bot, type WorldSites } from '../src/sim/bot';
import { Game } from '../src/sim/game';

const DT = 1 / 60;

function sites(): WorldSites {
  const ring = (cx: number, cy: number, r: number, n: number, kind: string): { kind: string; x: number; y: number }[] =>
    Array.from({ length: n }, (_, i) => {
      const a = (2 * Math.PI * i) / n;
      return { kind, x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
    });
  return {
    food: ring(0, 0, 4, 3, 'berry'),
    wood: ring(0, 0, 6, 3, 'wood'),
    gold: ring(0, 0, 8, 2, 'gold'),
    stone: ring(0, 0, 9, 1, 'stone'),
    dropoff: { x: 0, y: 0 }
  };
}

function setup(seed: number): { g: Game; bot: Bot } {
  const g = new Game(seed, 2);
  const tc = g.orderBuild(0, 'towncenter', 0, 0);
  const b = g.buildings.get(tc)!;
  b.progress = 1;
  b.built = true;
  b.hp = b.maxHp;
  for (let i = 0; i < 3; i++) g.sim.spawnUnit('villager', 0, i, 0);
  const bot = new Bot(g, 0, 'medium', sites());
  return { g, bot };
}

function run(g: Game, bot: Bot, seconds: number): void {
  const steps = Math.round(seconds / DT);
  for (let i = 0; i < steps; i++) {
    bot.update(DT);
    g.tick(DT);
  }
}

describe('bot economy', () => {
  it('trains villagers and expands over 8 minutes', () => {
    const { g, bot } = setup(11);
    run(g, bot, 480);
    const vils = g.sim.state.units.filter((u) => u.player === 0 && u.type === 'villager').length;
    expect(vils).toBeGreaterThan(3);
    expect(g.buildings.size).toBeGreaterThan(1); // TC + algo (casa/fazenda/quartel)
  });

  it('advances to age 2 with funds', () => {
    const { g, bot } = setup(12);
    g.stocks[0].stock.food = 1000;
    g.stocks[0].stock.wood = 1000;
    for (let i = 0; i < 7; i++) g.sim.spawnUnit('villager', 0, i, 1);
    run(g, bot, 200);
    expect(g.ageOf(0)).toBeGreaterThanOrEqual(2);
  });
});

describe('bot combat', () => {
  it('army engages and kills nearby enemies', () => {
    const { g, bot } = setup(13);
    for (let i = 0; i < 12; i++) g.sim.spawnUnit('spearman', 0, 10 + i * 0.5, 0);
    for (let i = 0; i < 4; i++) g.sim.spawnUnit('archer', 1, 12 + i * 0.5, 1);
    const foes0 = g.sim.state.units.filter((u) => u.player === 1).length;
    run(g, bot, 120);
    const foes1 = g.sim.state.units.filter((u) => u.player === 1).length;
    expect(foes1).toBeLessThan(foes0);
  });

  it('same seed produces same result', () => {
    const run2 = (seed: number): string => {
      const { g, bot } = setup(seed);
      for (let i = 0; i < 6; i++) g.sim.spawnUnit('spearman', 0, 10 + i, 0);
      for (let i = 0; i < 3; i++) g.sim.spawnUnit('archer', 1, 12 + i, 1);
      run(g, bot, 60);
      return g.hash();
    };
    expect(run2(99)).toBe(run2(99));
  });
});
