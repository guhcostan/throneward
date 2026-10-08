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

describe('bot vs bot', () => {
  it('two bots clash with casualties, deterministically', () => {
    const clash = (seed: number): { dead: number; hash: string } => {
      const g = new Game(seed, 2);
      const mkSites = (cx: number): WorldSites => ({
        food: [{ kind: 'berry', x: cx + 2, y: 0 }],
        wood: [{ kind: 'wood', x: cx - 2, y: 0 }],
        gold: [{ kind: 'gold', x: cx + 3, y: 1 }],
        stone: [{ kind: 'stone', x: cx - 3, y: 1 }],
        dropoff: { x: cx, y: 0 }
      });
      for (const [p, cx] of [[0, 0], [1, 30]] as [number, number][]) {
        const tc = g.orderBuild(p, 'towncenter', cx, 0);
        const b = g.buildings.get(tc)!;
        b.progress = 1;
        b.built = true;
        b.hp = b.maxHp;
        for (let i = 0; i < 3; i++) g.sim.spawnUnit('villager', p, cx + i, 1);
        for (let i = 0; i < 6; i++) g.sim.spawnUnit('spearman', p, cx + 10, i);
      }
      const bots = [new Bot(g, 0, 'easy', mkSites(0)), new Bot(g, 1, 'easy', mkSites(30))];
      const p0spear = new Set(
        g.sim.state.units.filter((u) => u.player === 0 && u.type === 'spearman').map((u) => u.id)
      );
      // Aproxima os exércitos para o choque (30 tiles é longe demais para 5 min).
      g.sim.commandMove([...p0spear], 15, 0);
      g.sim.commandMove(g.sim.state.units.filter((u) => u.player === 1 && u.type === 'spearman').map((u) => u.id), 15, 0);
      const steps = Math.round(300 / DT);
      for (let i = 0; i < steps; i++) {
        for (const b of bots) b.update(DT);
        g.tick(DT);
      }
      // O destacamento inicial foi aniquilado em combate (nascimentos não contam).
      const survivors = g.sim.state.units.filter((u) => p0spear.has(u.id)).length;
      return { dead: p0spear.size - survivors, hash: g.hash() };
    };
    const a = clash(77);
    const b = clash(77);
    expect(a.dead).toBeGreaterThan(0); // houve combate letal
    expect(a.hash).toBe(b.hash); // determinístico
  });

  it('full game ends with a winner, deterministically', () => {
    const full = (seed: number): { winner: { player: number; reason: string } | null; hash: string } => {
      const g = new Game(seed, 2);
      const mk = (cx: number): WorldSites => ({
        food: [{ kind: 'berry', x: cx + 2, y: 0 }],
        wood: [{ kind: 'wood', x: cx - 2, y: 0 }],
        gold: [{ kind: 'gold', x: cx + 3, y: 1 }],
        stone: [{ kind: 'stone', x: cx - 3, y: 1 }],
        dropoff: { x: cx, y: 0 }
      });
      for (const [p, cx] of [[0, 0], [1, 40]] as [number, number][]) {
        const tc = g.orderBuild(p, 'towncenter', cx, 0);
        const b = g.buildings.get(tc)!;
        b.progress = 1;
        b.built = true;
        b.hp = b.maxHp;
        for (let i = 0; i < 5; i++) g.sim.spawnUnit('villager', p, cx + i, 1);
      }
      const bots = [new Bot(g, 0, 'easy', mk(0)), new Bot(g, 1, 'easy', mk(40))];
      for (let m = 0; m < 40 && !g.winner; m++) {
        for (let i = 0; i < Math.round(60 / DT); i++) {
          for (const b of bots) b.update(DT);
          g.tick(DT);
        }
      }
      return { winner: g.winner, hash: g.hash() };
    };
    const a = full(5);
    expect(a.winner).not.toBeNull(); // bot vs bot termina com vencedor
    expect(a.winner!.reason).toBe('landmarks');
    const b = full(5);
    expect(b.winner).toEqual(a.winner);
    expect(b.hash).toBe(a.hash);
  });
});
