import { describe, expect, it } from 'vitest';
import {
  ARBALETRIER,
  GALLIA,
  GALLIA_LANDMARKS,
  GALLIA_UNITS,
  ROYAL_KNIGHT,
  galliaStableMult,
  knightChargeBonus,
} from '../src/sim/civs/gallia';

describe('Gallia landmarks', () => {
  it('tem exatamente 2 landmarks em cada idade II, III e IV', () => {
    for (const age of [2, 3, 4] as const) {
      expect(GALLIA_LANDMARKS[age]).toHaveLength(2);
      for (const lm of GALLIA_LANDMARKS[age]) {
        expect(lm.age).toBe(age);
      }
    }
  });

  it('ids de landmark são únicos entre todas as idades', () => {
    const ids = [2, 3, 4].flatMap((age) =>
      GALLIA_LANDMARKS[age as 2 | 3 | 4].map((lm) => lm.id),
    );
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('Gallia bônus', () => {
  it('identificação da civilização', () => {
    expect(GALLIA.id).toBe('gallia');
    expect(GALLIA.name).toBe('Gallia');
  });

  it('galliaStableMult é definido e > 0', () => {
    expect(galliaStableMult()).toBeGreaterThan(0);
    expect(galliaStableMult()).toBe(GALLIA.stableProductionMult);
  });

  it('knightChargeBonus é definido e > 0', () => {
    expect(knightChargeBonus()).toBeGreaterThan(0);
    expect(knightChargeBonus()).toBe(ROYAL_KNIGHT.chargeBonus);
  });
});

describe('Gallia unidades', () => {
  it('GALLIA_UNITS contém royalknight e arbaletrier', () => {
    expect(GALLIA_UNITS).toContain('royalknight');
    expect(GALLIA_UNITS).toContain('arbaletrier');
  });

  it('UU têm stats positivos', () => {
    for (const u of [ROYAL_KNIGHT, ARBALETRIER]) {
      expect(u.hp).toBeGreaterThan(0);
      expect(u.damage).toBeGreaterThan(0);
      expect(u.cooldown).toBeGreaterThan(0);
      expect(u.speed).toBeGreaterThan(0);
      expect(u.trainTime).toBeGreaterThan(0);
    }
  });

  it('ARBALETRIER tem alcance 5 e bônus contra pesadas', () => {
    expect(ARBALETRIER.range).toBe(5);
    expect(ARBALETRIER.bonusVsHeavy).toBeGreaterThan(0);
  });

  it('ROYAL_KNIGHT tem HP 190 (espelha UNIT_HP de sim.ts)', () => {
    expect(ROYAL_KNIGHT.hp).toBe(190);
  });
});

describe('Gallia nomes originais', () => {
  it('nenhum nome ou texto cita French ou English', () => {
    const texts: string[] = [GALLIA.name, GALLIA.description];
    for (const age of [2, 3, 4] as const) {
      for (const lm of GALLIA_LANDMARKS[age]) {
        texts.push(lm.name, lm.effect, lm.id);
      }
    }
    for (const u of [ROYAL_KNIGHT, ARBALETRIER]) {
      texts.push(u.name, u.id);
    }
    for (const t of texts) {
      expect(t).not.toMatch(/French|English/i);
    }
  });
});
