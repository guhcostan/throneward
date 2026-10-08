import { describe, expect, it } from 'vitest';
import {
  ALBION,
  ALBION_LANDMARKS,
  ALBION_UNITS,
  LONGBOW,
  albionFarmCost,
  albionGatherMult,
  castleBonus,
  type PlacedStructure,
} from '../src/sim/civs/albion';

describe('Albion landmarks', () => {
  it('tem exatamente 2 landmarks em cada idade II, III e IV', () => {
    for (const age of [2, 3, 4] as const) {
      expect(ALBION_LANDMARKS[age]).toHaveLength(2);
      for (const lm of ALBION_LANDMARKS[age]) {
        expect(lm.age).toBe(age);
      }
    }
  });

  it('ids de landmark são únicos entre todas as idades', () => {
    const ids = [2, 3, 4].flatMap((age) =>
      ALBION_LANDMARKS[age as 2 | 3 | 4].map((lm) => lm.id),
    );
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('Albion economia', () => {
  it('farmDiscount é 0.5', () => {
    expect(ALBION.farmDiscount).toBe(0.5);
    expect(ALBION.id).toBe('albion');
  });

  it('albionFarmCost aplica o desconto de fazenda', () => {
    expect(albionFarmCost(100)).toBe(50);
  });

  it('albionGatherMult é neutro (1) para fazenda e outras fontes', () => {
    expect(albionGatherMult('farm')).toBe(1);
    expect(albionGatherMult('other')).toBe(1);
  });
});

describe('castleBonus (Rede de Castelos)', () => {
  const structures: PlacedStructure[] = [
    { kind: 'town_center', x: 0, y: 0 },
    { kind: 'keep', x: 50, y: 50 },
    { kind: 'outpost', x: 100, y: 0 },
    { kind: 'other', x: 200, y: 200 },
  ];

  it('retorna +0.25 perto de TC', () => {
    expect(castleBonus(3, 4, structures)).toBe(0.25); // distância 5
  });

  it('retorna +0.25 perto de keep e outpost', () => {
    expect(castleBonus(52, 50, structures)).toBe(0.25);
    expect(castleBonus(104, 0, structures)).toBe(0.25);
  });

  it('retorna 0 longe de qualquer TC/keep/outpost', () => {
    expect(castleBonus(30, 30, structures)).toBe(0);
  });

  it('ignora estruturas que não são TC/keep/outpost', () => {
    expect(castleBonus(200, 200, structures)).toBe(0);
  });

  it('retorna 0 sem estruturas', () => {
    expect(castleBonus(0, 0, [])).toBe(0);
  });
});

describe('Albion unidades', () => {
  it('ALBION_UNITS contém longbow', () => {
    expect(ALBION_UNITS).toContain('longbow');
  });

  it('LONGBOW tem alcance 7 (spec de unidades)', () => {
    expect(LONGBOW.range).toBe(7);
    expect(LONGBOW.id).toBe('longbow');
  });
});
