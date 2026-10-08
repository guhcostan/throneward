import { describe, expect, it } from 'vitest';
import {
  QUEUE_MAX,
  buildRate,
  buildTick,
  placeBuilding,
  popCap,
  productionTick,
  queueUnit,
  setRally,
} from '../src/sim/construction';

function ticksToBuild(builders: number, type: string): number {
  const b = placeBuilding(1, type, 0, 0, 0);
  b.builders = builders;
  const dt = 1 / 10;
  let n = 0;
  while (!b.built && n < 100000) {
    buildTick(b, dt);
    n++;
  }
  return n;
}

describe('construction', () => {
  it('starts at 10% hp and 0 progress', () => {
    const b = placeBuilding(1, 'house', 0, 3, 4);
    expect(b.built).toBe(false);
    expect(b.progress).toBe(0);
    expect(b.hp).toBeCloseTo(b.maxHp * 0.1);
  });

  it('towncenter nasce pronto', () => {
    const b = placeBuilding(1, 'towncenter', 0, 0, 0);
    expect(b.built).toBe(true);
    expect(b.hp).toBe(b.maxHp);
  });

  it('1 aldeão constrói house em buildTime (20s)', () => {
    const n = ticksToBuild(1, 'house');
    expect(n).toBeGreaterThanOrEqual(199);
    expect(n).toBeLessThanOrEqual(201);
  });

  it('3 aldeões constroem mais rápido que 1', () => {
    const one = ticksToBuild(1, 'house');
    const three = ticksToBuild(3, 'house');
    expect(three).toBeLessThan(one);
    // rate 3 aldeões = 5/3 => ~12s
    expect(three).toBeGreaterThanOrEqual(119);
    expect(three).toBeLessThanOrEqual(121);
  });

  it('buildRate: 1 = 1x, 3 = 5/3x', () => {
    expect(buildRate(1)).toBe(1);
    expect(buildRate(3)).toBeCloseTo(5 / 3);
  });

  it('sem aldeões não progride', () => {
    const b = placeBuilding(1, 'farm', 0, 0, 0);
    buildTick(b, 10);
    expect(b.progress).toBe(0);
  });

  it('hp completa ao maxHp quando pronto', () => {
    const b = placeBuilding(1, 'barracks', 0, 0, 0);
    b.builders = 1;
    buildTick(b, 1000);
    expect(b.built).toBe(true);
    expect(b.hp).toBe(b.maxHp);
  });

  it('fila produz na ordem com tempos', () => {
    const b = placeBuilding(1, 'barracks', 0, 0, 0);
    b.built = true;
    b.progress = 1;
    b.hp = b.maxHp;
    expect(queueUnit(b, 'spearman', 5)).toBe(true);
    expect(queueUnit(b, 'archer', 3)).toBe(true);
    expect(productionTick(b, 4)).toEqual([]);
    // t=6: spearman (5s) pronto; sobra 1s para o archer (3s), que fica com 2s
    expect(productionTick(b, 2)).toEqual(['spearman']);
    expect(b.queue[0].unit).toBe('archer');
    expect(b.queue[0].time).toBeCloseTo(2);
    expect(productionTick(b, 1)).toEqual([]);
    expect(productionTick(b, 1)).toEqual(['archer']);
    expect(b.queue).toHaveLength(0);
  });

  it('excesso de tempo passa para o próximo item no mesmo tick', () => {
    const b = placeBuilding(1, 'barracks', 0, 0, 0);
    b.built = true;
    queueUnit(b, 'a', 1);
    queueUnit(b, 'b', 1);
    queueUnit(b, 'c', 1);
    expect(productionTick(b, 2.5)).toEqual(['a', 'b']);
    expect(b.queue[0].unit).toBe('c');
    expect(b.queue[0].time).toBeCloseTo(0.5);
  });

  it('fila limitada a QUEUE_MAX e exige prédio pronto', () => {
    const b = placeBuilding(1, 'barracks', 0, 0, 0);
    expect(queueUnit(b, 'x', 1)).toBe(false); // não pronto
    b.built = true;
    for (let i = 0; i < QUEUE_MAX; i++) expect(queueUnit(b, 'x', 1)).toBe(true);
    expect(queueUnit(b, 'x', 1)).toBe(false);
  });

  it('setRally grava ponto de reunião', () => {
    const b = placeBuilding(1, 'barracks', 0, 0, 0);
    setRally(b, 7, 9);
    expect(b.rally).toEqual({ x: 7, y: 9 });
  });

  it('popCap soma popRoom de prédios prontos e trava em 200', () => {
    const houses = Array.from({ length: 3 }, (_, i) => {
      const h = placeBuilding(i + 1, 'house', 0, 0, 0);
      h.built = true;
      return h;
    });
    expect(popCap([])).toBe(10);
    expect(popCap(houses)).toBe(40);
    // house em construção não conta
    expect(popCap([placeBuilding(9, 'house', 0, 0, 0)])).toBe(10);
    const many = Array.from({ length: 50 }, (_, i) => {
      const h = placeBuilding(i + 1, 'house', 0, 0, 0);
      h.built = true;
      return h;
    });
    expect(popCap(many)).toBe(200);
  });

  it('determinístico: mesmas entradas, mesmo resultado', () => {
    const run = (): string => {
      const b = placeBuilding(1, 'mill', 0, 0, 0);
      b.builders = 2;
      for (let i = 0; i < 37; i++) buildTick(b, 1 / 60);
      return JSON.stringify(b);
    };
    expect(run()).toBe(run());
  });
});
