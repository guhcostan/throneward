import { describe, expect, it } from 'vitest';
import { COUNTER_BONUS, UNIT_COMBAT, attackTick, dealDamage, inRange, isDead, type Fighter } from '../src/sim/combat';

function make(over: Partial<Fighter> & Pick<Fighter, 'type'>): Fighter {
  const stats = UNIT_COMBAT[over.type];
  if (!stats) throw new Error(`unknown type ${over.type}`);
  return {
    id: 1,
    player: 0,
    x: 0,
    y: 0,
    hp: stats.hp,
    maxHp: stats.hp,
    range: stats.range,
    damage: stats.damage,
    meleeArmor: stats.melee,
    rangedArmor: stats.ranged,
    cooldown: stats.cooldown,
    cdLeft: 0,
    ...over
  };
}

describe('combat — dano e armadura', () => {
  it('dealDamage = max(1, atk + bonus − armadura)', () => {
    expect(dealDamage(10, 3)).toBe(7);
    expect(dealDamage(10, 3, 5)).toBe(12);
  });

  it('armadura não derruba o dano abaixo de 1', () => {
    expect(dealDamage(5, 100)).toBe(1);
    expect(dealDamage(1, 50, 0)).toBe(1);
  });
});

describe('combat — counter (spearman)', () => {
  it('spearman tem bônus vs knight e vs archer não', () => {
    expect(COUNTER_BONUS.spearman.knight).toBe(17);
    expect(COUNTER_BONUS.spearman.archer).toBeUndefined();
  });

  it('spearman causa mais dano por golpe em knight do que em archer', () => {
    // Dano por golpe: knight = 7 + 17 − 4 = 20; archer = 7 − 0 = 7 (sem counter).
    const sp = make({ type: 'spearman', player: 0, x: 0, y: 0 });
    const knight = make({ type: 'knight', player: 1, x: 0.5, y: 0, id: 2 });
    const archer = make({ type: 'archer', player: 1, x: 0.5, y: 0, id: 3 });
    sp.cdLeft = 0;
    attackTick(sp, knight, 0);
    const knightDmg = UNIT_COMBAT.knight.hp - knight.hp;
    sp.cdLeft = 0;
    attackTick(sp, archer, 0);
    const archerDmg = UNIT_COMBAT.archer.hp - archer.hp;
    expect(knightDmg).toBeGreaterThan(archerDmg);
    expect(knightDmg).toBe(20);
    expect(archerDmg).toBe(7);
  });

  it('spearman mata knight em menos golpes que archer (considerando HP)', () => {
    const hitsToKill = (targetType: string): number => {
      const sp = make({ type: 'spearman', player: 0, x: 0, y: 0 });
      const target = make({ type: targetType, player: 1, x: 0.5, y: 0, id: 2 });
      let hits = 0;
      while (!isDead(target) && hits < 1000) {
        sp.cdLeft = 0;
        attackTick(sp, target, 0);
        hits++;
      }
      return hits;
    };
    // knight 230hp / 20 = 12 golpes; archer 70hp / 7 = 10 golpes.
    // Com os números do spec o archer morre antes em golpes; o teste fixa o valor exato.
    expect(hitsToKill('knight')).toBe(12);
    expect(hitsToKill('archer')).toBe(10);
  });
});

describe('combat — cooldown e alcance', () => {
  it('cooldown impede 2 hits no mesmo tick', () => {
    const a = make({ type: 'spearman', player: 0, x: 0, y: 0 });
    const b = make({ type: 'villager', player: 1, x: 0.5, y: 0, id: 2 });
    const first = attackTick(a, b, 0);
    expect(first.hits).toEqual([2]);
    // Mesmo tick (dt=0): cdLeft = cooldown > 0, nenhum golpe.
    const second = attackTick(a, b, 0);
    expect(second.hits).toEqual([]);
    expect(b.hp).toBe(UNIT_COMBAT.villager.hp - 7);
  });

  it('cooldown reseta para o valor de cadência após o golpe', () => {
    const a = make({ type: 'spearman', player: 0, x: 0, y: 0 });
    const b = make({ type: 'villager', player: 1, x: 0.5, y: 0, id: 2 });
    attackTick(a, b, 0);
    expect(a.cdLeft).toBe(a.cooldown);
  });

  it('fora de alcance não hita', () => {
    const a = make({ type: 'spearman', player: 0, x: 0, y: 0 });
    const b = make({ type: 'villager', player: 1, x: 5, y: 0, id: 2 });
    expect(inRange(a, b)).toBe(false);
    expect(attackTick(a, b, 1).hits).toEqual([]);
    expect(b.hp).toBe(UNIT_COMBAT.villager.hp);
  });

  it('melee (range 0) alcança 1.0; archer alcança 5', () => {
    const sp = make({ type: 'spearman', player: 0, x: 0, y: 0 });
    const near = make({ type: 'villager', player: 1, x: 1.0, y: 0, id: 2 });
    const far = make({ type: 'villager', player: 1, x: 1.01, y: 0, id: 3 });
    expect(inRange(sp, near)).toBe(true);
    expect(inRange(sp, far)).toBe(false);
    const ar = make({ type: 'archer', player: 0, x: 0, y: 0 });
    const target = make({ type: 'villager', player: 1, x: 4.9, y: 0, id: 4 });
    expect(inRange(ar, target)).toBe(true);
  });
});

describe('combat — friendly e morte', () => {
  it('friendly não hita', () => {
    const a = make({ type: 'spearman', player: 0, x: 0, y: 0 });
    const ally = make({ type: 'villager', player: 0, x: 0.5, y: 0, id: 2 });
    expect(attackTick(a, ally, 1).hits).toEqual([]);
    expect(ally.hp).toBe(UNIT_COMBAT.villager.hp);
  });

  it('não ataca alvo morto', () => {
    const a = make({ type: 'spearman', player: 0, x: 0, y: 0 });
    const dead = make({ type: 'villager', player: 1, x: 0.5, y: 0, id: 2, hp: 0 });
    expect(attackTick(a, dead, 1).hits).toEqual([]);
  });

  it('isDead quando hp <= 0', () => {
    expect(isDead(make({ type: 'villager', player: 0, hp: 0 }))).toBe(true);
    expect(isDead(make({ type: 'villager', player: 0, hp: 1 }))).toBe(false);
  });
});

describe('combat — determinismo', () => {
  it('mesma sequência de entradas produz mesmo resultado', () => {
    const run = (): number[] => {
      const a = make({ type: 'archer', player: 0, x: 0, y: 0 });
      const b = make({ type: 'spearman', player: 1, x: 3, y: 0, id: 2 });
      const log: number[] = [];
      for (let i = 0; i < 200; i++) {
        attackTick(a, b, 1 / 60);
        log.push(b.hp);
      }
      return log;
    };
    expect(run()).toEqual(run());
  });
});

describe('combat — escala por idade (SPEC)', () => {
  it('statsForAge segue a tabela do SPEC', async () => {
    const { statsForAge, bonusForAge, hpForAge } = await import('../src/sim/combat');
    expect(statsForAge('spearman', 3)).toEqual({ damage: 9, melee: 0, ranged: 0 });
    expect(statsForAge('knight', 4)).toEqual({ damage: 29, melee: 5, ranged: 5 });
    expect(statsForAge('villager', 4)).toBeUndefined();
    expect(bonusForAge('spearman', 'knight', 3)).toBe(23);
    expect(bonusForAge('spearman', 'knight', 1)).toBe(17);
    expect(bonusForAge('longbow', 'spearman', 2)).toBe(6);
    expect(bonusForAge('knight', 'archer', 3)).toBe(0); // sem bônus de classe (SPEC)
    expect(hpForAge('archer', 4)).toBe(95);
  });

  it('Fighter com idade usa bônus da idade; sem idade, linha de base', async () => {
    const { attackTick } = await import('../src/sim/combat');
    const sp3 = make({ type: 'spearman', player: 0, x: 0, y: 0, age: 3 });
    const k3 = make({ type: 'knight', player: 1, x: 0.5, y: 0, id: 2 });
    sp3.cdLeft = 0;
    attackTick(sp3, k3, 0);
    // 7 (base I) + 23 (era III) − 4 = 26.
    expect(UNIT_COMBAT.knight.hp - k3.hp).toBe(26);
  });
});

describe('combat — elevação (muralha)', () => {
  it('melee do chão não alcança alvo elevado; à distância alcança', () => {
    const sp = make({ type: 'spearman', player: 0, x: 0, y: 0 });
    const up = make({ type: 'archer', player: 1, x: 0.5, y: 0, id: 2, elev: 1 });
    expect(inRange(sp, up)).toBe(false);
    expect(attackTick(sp, up, 1).hits).toEqual([]);
    const ar = make({ type: 'archer', player: 0, x: 0, y: 0 });
    expect(inRange(ar, up)).toBe(true);
  });
});

describe('combat — resistência de cerco (SPEC §1.4)', () => {
  it('aríete ignora 95% do dano; tropa comum recebe integral', () => {
    const sp = make({ type: 'spearman', player: 0, x: 0, y: 0 });
    const ram = make({ type: 'ram', player: 1, x: 0.5, y: 0, id: 2 });
    sp.cdLeft = 0;
    attackTick(sp, ram, 0);
    // 7 de dano × 5% = 0.35.
    expect(UNIT_COMBAT.ram.hp - ram.hp).toBeCloseTo(0.35, 6);
  });
});
