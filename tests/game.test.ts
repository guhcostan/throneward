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
