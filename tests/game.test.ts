import { describe, expect, it } from 'vitest';
import { Game, START_STOCK } from '../src/sim/game';
import { setRally } from '../src/sim/construction';

const DT = 1 / 60;

function runSeconds(g: Game, seconds: number): { trained: { building: number; unit: string }[] } {
  const trained: { building: number; unit: string }[] = [];
  const steps = Math.round(seconds / DT);
  for (let i = 0; i < steps; i++) trained.push(...g.tick(DT).trained);
  return { trained };
}

// Constrói um prédio com 1 aldeão e roda até ficar pronto. Retorna o id.
function buildAndWait(g: Game, type: string, x: number, y: number, maxSeconds: number): number {
  const villager = g.sim.spawnUnit('villager', 0, x, y);
  const id = g.orderBuild(0, type, x, y);
  expect(id).toBeGreaterThan(0);
  g.addBuilder(id, villager.id);
  const steps = Math.ceil(maxSeconds / DT);
  for (let i = 0; i < steps && !g.buildings.get(id)?.built; i++) g.tick(DT);
  return id;
}

describe('Game: construção', () => {
  it('house desconta 50 de madeira e completa com 1 builder em ~20s', () => {
    const g = new Game(1, 1);
    const villager = g.sim.spawnUnit('villager', 0, 5, 5);
    const id = g.orderBuild(0, 'house', 10, 10);
    expect(id).toBe(1000);
    expect(g.stocks[0].stock.wood).toBe(START_STOCK.wood - 50);

    g.addBuilder(id, villager.id);
    runSeconds(g, 18.3);
    expect(g.buildings.get(id)?.built).toBe(false);
    runSeconds(g, 2.5);
    expect(g.buildings.get(id)?.built).toBe(true);
    expect(g.buildings.get(id)?.hp).toBe(700);
  });
});

describe('Game: coleta', () => {
  it('gatherer de berry entrega 10 por ciclo e aumenta o stock de comida', () => {
    const g = new Game(2, 1);
    const villager = g.sim.spawnUnit('villager', 0, 0, 0);
    expect(g.assignGather(villager.id, { kind: 'berry', x: 3, y: 3 }, { x: 0, y: 0 })).toBe(true);

    const food0 = g.stocks[0].stock.food;
    let food = food0;
    for (let cycle = 1; cycle <= 2; cycle++) {
      for (let i = 0; i < 2000 && g.stocks[0].stock.food === food; i++) g.tick(DT);
      expect(g.stocks[0].stock.food).toBe(food0 + 10 * cycle);
      food = g.stocks[0].stock.food;
    }
  });

  it('assignGather falha para unidade inexistente', () => {
    const g = new Game(2, 1);
    expect(g.assignGather(999, { kind: 'berry', x: 0, y: 0 }, { x: 0, y: 0 })).toBe(false);
  });
});

describe('Game: treino', () => {
  it('trainUnit só funciona em prédio pronto e produz no rally após o tempo', () => {
    const g = new Game(3, 1);
    g.ages[0].age = 2; // isola mecânica de treino (barracks/spearman exigem era II)
    const id = g.orderBuild(0, 'barracks', 20, 20);
    expect(g.trainUnit(id, 'spearman', 5)).toBe(false);

    const builder = g.sim.spawnUnit('villager', 0, 18, 20);
    g.addBuilder(id, builder.id);
    runSeconds(g, 30.5);
    expect(g.buildings.get(id)?.built).toBe(true);

    setRally(g.buildings.get(id)!, 50, 60);
    expect(g.trainUnit(id, 'spearman', 5)).toBe(true);
    const before = g.sim.state.units.length;

    const { trained } = runSeconds(g, 4.5);
    expect(trained).toHaveLength(0);
    const { trained: done } = runSeconds(g, 1);
    expect(done).toEqual([{ building: id, unit: 'spearman' }]);

    const spawned = g.sim.state.units.slice(before);
    expect(spawned).toHaveLength(1);
    expect(spawned[0].type).toBe('spearman');
    expect(spawned[0].x).toBe(50);
    expect(spawned[0].y).toBe(60);
  });

  it('popUsed conta unidades vivas e fila, sem contar prédio em construção', () => {
    const g = new Game(4, 1);
    g.ages[0].age = 2; // isola mecânica de pop (barracks/spearman exigem era II)
    const id = g.orderBuild(0, 'barracks', 20, 20);
    expect(g.popUsed()).toEqual([0]);
    const builder = g.sim.spawnUnit('villager', 0, 18, 20);
    expect(g.popUsed()).toEqual([1]);
    g.addBuilder(id, builder.id);
    runSeconds(g, 30.5);
    g.trainUnit(id, 'spearman', 5);
    expect(g.popUsed()).toEqual([2]);
  });
});

describe('Game: fundos', () => {
  it('orderBuild retorna -1 sem fundos e não altera o stock', () => {
    const g = new Game(5, 1);
    g.stocks[0].stock.wood = 40;
    expect(g.orderBuild(0, 'house', 0, 0)).toBe(-1);
    expect(g.stocks[0].stock.wood).toBe(40);
    expect(g.buildings.size).toBe(0);
  });
});

describe('Game: eras', () => {
  it('era bloqueia prédio/unidade/tech de era superior', () => {
    const g = new Game(6, 1);
    expect(g.orderBuild(0, 'barracks', 0, 0)).toBe(-1); // era II na era I
    expect(g.researchTech(0, 'melee-atk-1')).toBe(false); // tech de era II na era I
  });

  it('advanceAge paga landmark e avança com construtores', () => {
    const g = new Game(7, 1);
    const v = g.sim.spawnUnit('villager', 0, 0, 0);
    expect(g.advanceAge(0, 0)).toBe(true);
    expect(g.ages[0].advancing).toBe(true);
    g.addAgeBuilder(0, v.id);
    for (let i = 0; i < 6000 && g.ages[0].age === 1; i++) g.tick(DT);
    expect(g.ages[0].age).toBe(2);
    g.stocks[0].stock.wood = 500; // landmark consumiu o stock inicial
    expect(g.orderBuild(0, 'barracks', 0, 0)).toBeGreaterThan(0);
  });
});
describe('Game: determinismo', () => {
  function script(g: Game): void {
    const v = g.sim.spawnUnit('villager', 0, 0, 0);
    g.assignGather(v.id, { kind: 'berry', x: 1, y: 1 }, { x: 0, y: 0 });
    const id = g.orderBuild(0, 'house', 10, 10);
    g.addBuilder(id, v.id);
    g.sim.commandMove([v.id], 15, 3);
    for (let i = 0; i < 1500; i++) g.tick(DT);
  }

  it('mesmos comandos produzem mesmo hash e mesmos stocks', () => {
    const a = new Game(42, 2);
    const b = new Game(42, 2);
    script(a);
    script(b);
    expect(a.hash()).toBe(b.hash());
    expect(a.stocks).toEqual(b.stocks);
  });
});

describe('Game:Gallia', () => {
  it('ageChoices da Gallia usa landmarks próprios', () => {
    const g = new Game(8, 1, ['gallia']);
    const pair = g.ageChoices(0);
    expect(pair).not.toBe(null);
    expect(pair![0].id).toContain('gallia');
    expect(pair![1].id).toContain('gallia');
  });

  it('estábulo gallia produz mais rápido que genérico', () => {
    const mk = (civs?: string[]): Game => {
      const g = new Game(9, 1, civs);
      g.ages[0].age = 3; // stable (II) + knight (III)
      g.stocks[0].stock.wood = 1000;
      const id = g.orderBuild(0, 'stable', 0, 0);
      const v = g.sim.spawnUnit('villager', 0, 1, 1);
      g.addBuilder(id, v.id);
      for (let i = 0; i < 2000 && !g.buildings.get(id)?.built; i++) g.tick(DT);
      return g;
    };
    const DT = 1 / 60;
    const gal = mk(['gallia']);
    const gen = mk();
    const gid = [...gal.buildings.keys()][0];
    const nid = [...gen.buildings.keys()][0];
    gal.trainUnit(gid, 'knight', 10);
    gen.trainUnit(nid, 'knight', 10);
    for (let i = 0; i < 300; i++) {
      gal.tick(DT);
      gen.tick(DT);
    }
    const gq = gal.buildings.get(gid)!.queue[0]?.time ?? 0;
    const nq = gen.buildings.get(nid)!.queue[0]?.time ?? 0;
    expect(gq).toBeLessThan(nq);
  });
});

describe('Game:treino-custo', () => {
  it('treinar cobra o custo e falha sem fundos', () => {
    const g = new Game(10, 1);
    g.ages[0].age = 2;
    g.stocks[0].stock.wood = 1000;
    const id = g.orderBuild(0, 'barracks', 0, 0);
    const v = g.sim.spawnUnit('villager', 0, 1, 1);
    g.addBuilder(id, v.id);
    for (let i = 0; i < 3000 && !g.buildings.get(id)?.built; i++) g.tick(DT);
    g.stocks[0].stock.food = 10;
    expect(g.trainUnit(id, 'spearman', 5)).toBe(false); // 60F
    g.stocks[0].stock.food = 100;
    expect(g.trainUnit(id, 'spearman', 5)).toBe(true);
    expect(g.stocks[0].stock.food).toBe(40);
    expect(g.stocks[0].stock.wood).toBeLessThan(1000);
  });
});

describe('Game:cerco', () => {
  it('orderSiege recusa amigo e destrói prédio inimigo', () => {
    const g = new Game(20, 2);
    const b = g.orderBuild(1, 'house', 10, 10);
    const bb = g.buildings.get(b)!;
    bb.progress = 1;
    bb.built = true;
    bb.hp = bb.maxHp;
    const ram = g.sim.spawnUnit('ram', 0, 10, 10.5);
    expect(g.orderSiege(ram.id, ram.id)).toBe(false); // unidade não é prédio
    const own = g.sim.spawnUnit('villager', 1, 10, 11);
    expect(g.orderSiege(own.id, b)).toBe(false); // mesmo player
    expect(g.orderSiege(ram.id, b)).toBe(true);
    for (let i = 0; i < 3000 && g.buildings.has(b); i++) g.tick(DT);
    expect(g.buildings.has(b)).toBe(false);
  });
});

describe('Game:landmarks', () => {
  it('avanço cria entidade landmark destruível', () => {
    const g = new Game(21, 1);
    g.stocks[0].stock.food = 1000;
    g.stocks[0].stock.wood = 1000;
    const v = g.sim.spawnUnit('villager', 0, 0, 0);
    expect(g.advanceAge(0, 0)).toBe(true);
    g.addAgeBuilder(0, v.id);
    for (let i = 0; i < 20000 && g.ageOf(0) === 1; i++) g.tick(DT);
    expect(g.ageOf(0)).toBe(2);
    const lms = [...g.buildings.values()].filter((b) => b.type === 'landmark');
    expect(lms).toHaveLength(1);
    expect(lms[0].built).toBe(true);
  });

  it('eliminação declara vencedor por aniquilação', () => {
    const g = new Game(22, 2);
    // Player 1 sem nada; player 0 com unidade. Avança o relógio além de 120s.
    g.sim.spawnUnit('villager', 0, 0, 0);
    for (let i = 0; i < 7300; i++) g.tick(DT);
    expect(g.winner).toEqual({ player: 0, reason: 'annihilation' });
  });
});

describe('Game:carga', () => {
  it('cavaleiro real com corrida dá +3 no primeiro golpe', () => {
    const run = (startX: number): number => {
      const g = new Game(23, 2);
      const rk = g.sim.spawnUnit('royalknight', 0, startX, 0);
      const v = g.sim.spawnUnit('villager', 1, 10, 0);
      g.sim.commandMove([rk.id], 9, 0);
      // Anda até chegar (sem ordem de ataque ainda).
      for (let i = 0; i < 1200 && Math.hypot(rk.x - 9, rk.y) > 0.01; i++) g.tick(DT);
      g.orderAttack(rk.id, v.id);
      // Exatos 2 golpes (cadência 1,5s: golpes em t=0 e t=1,5s; 100 ticks = 1,67s).
      for (let i = 0; i < 100; i++) g.tick(DT);
      return g.sim.state.units.find((u) => u.id === v.id)?.hp ?? 0;
    };
    // Sem corrida (adjacente): 50 − 38 = 12 após 2 golpes.
    expect(run(9)).toBe(12);
    // Com corrida de 9 tiles: 50 − 41 = 9 após 2 golpes.
    expect(run(0)).toBe(9);
  });
});

describe('Game:cura', () => {
  it('monge cura aliado próximo até o máximo', () => {
    const g = new Game(30, 1);
    const monk = g.sim.spawnUnit('monk', 0, 0, 0);
    const hurt = g.sim.spawnUnit('villager', 0, 1, 0);
    hurt.hp = 20;
    void monk;
    for (let i = 0; i < 600; i++) g.tick(DT);
    expect(hurt.hp).toBeGreaterThan(20);
    expect(hurt.hp).toBeLessThanOrEqual(hurt.maxHp);
    // Longe não cura.
    const far = g.sim.spawnUnit('villager', 0, 50, 50);
    far.hp = 10;
    for (let i = 0; i < 600; i++) g.tick(DT);
    expect(far.hp).toBe(10);
  });
});

describe('Game:muralha', () => {
  it('monta arqueiro em pedra própria; melee não monta; mover desmonta', () => {
    const g = new Game(31, 1);
    g.mapSize = 64;
    g.stocks[0].stock.stone = 1000;
    const id = g.placeWall(0, 'stone', 0, 0, 0, 2);
    expect(id).toBeGreaterThan(0);
    const ar = g.sim.spawnUnit('archer', 0, 0, 1);
    const sp = g.sim.spawnUnit('spearman', 0, 0, 1);
    expect(g.mountWall(sp.id, id)).toBe(false); // melee não monta
    expect(g.mountWall(ar.id, id)).toBe(true);
    expect(ar.elev).toBe(1);
    g.sim.commandMove([ar.id], 10, 10);
    expect(ar.elev).toBe(0); // nova ordem desmonta
  });
});

describe('Game:esgotamento', () => {
  it('fonte esgota e coletor migra para a próxima', () => {
    const g = new Game(40, 1);
    g.seedNodes([
      { kind: 'berry', x: 5, y: 5, amount: 12 },
      { kind: 'berry', x: 50, y: 50, amount: 1000 }
    ]);
    const v = g.sim.spawnUnit('villager', 0, 5, 5);
    expect(g.assignGather(v.id, { kind: 'berry', x: 5, y: 5 }, { x: 0, y: 0 })).toBe(true);
    for (let i = 0; i < 3000; i++) g.tick(DT);
    // 12 unidades saíram da primeira fonte e o coletor migrou para a segunda.
    expect(g.nodeLeft('berry', 5, 5)).toBe(0);
    expect(g.gatherers.get(v.id)?.source).toEqual({ kind: 'berry', x: 50, y: 50 });
  });

  it('sem fonte restante, coletor fica ocioso sem travar', () => {
    const g = new Game(41, 1);
    g.seedNodes([{ kind: 'berry', x: 5, y: 5, amount: 5 }]);
    const v = g.sim.spawnUnit('villager', 0, 5, 5);
    g.assignGather(v.id, { kind: 'berry', x: 5, y: 5 }, { x: 0, y: 0 });
    for (let i = 0; i < 3000; i++) g.tick(DT);
    expect(g.nodeLeft('berry', 5, 5)).toBe(0);
    expect(g.gatherers.get(v.id)?.source).toBeNull();
  });
});
