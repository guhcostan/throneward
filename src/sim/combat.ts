// Sistema de combate (Fase 3). Puro: sem DOM, sem Three.js, roda headless.
// Tick de dt em segundos. Mesmas entradas => mesmas saídas (sem RNG aqui).
// Números de referência: docs/spec-units.md (seções 1, 4 e 5).

/**
 * Bônus de counter por classe do alvo: COUNTER_BONUS[atacante][alvo] = bônus de dano.
 * THR v0 VERIFICAR — valores de referência do spec (lanceiro +17 vs cavalaria no estágio I, etc.).
 */
// THR v0 VERIFICAR
// Linha de base = estágio I (testes de mecânica travam estes valores).
// Cavaleiro e homem de armas SEM bônus de classe (SPEC §1.2–1.3).
export const COUNTER_BONUS: Record<string, Record<string, number>> = {
  spearman: { knight: 17, royalknight: 17, scout: 10, cavalry: 12 },
  archer: { spearman: 4 },
  longbow: { spearman: 6, scout: 6 },
  crossbow: { manatarms: 10, knight: 10 }
};

// Bônus por idade [I, II, III, IV] (SPEC §1.2–1.3). attackTick usa a idade do
// atacante (Fighter.age); sem idade, usa o índice 0 = mesma linha de base acima.
export const BONUS_BY_AGE: Record<string, Record<string, [number, number, number, number]>> = {
  spearman: {
    knight: [17, 20, 23, 28],
    royalknight: [17, 20, 23, 28],
    scout: [10, 10, 10, 10],
    cavalry: [12, 12, 12, 12]
  },
  archer: {
    spearman: [4, 5, 7, 8],
    scout: [4, 5, 7, 8]
  },
  longbow: {
    spearman: [6, 6, 8, 9],
    scout: [6, 6, 8, 9]
  },
  crossbow: {
    manatarms: [10, 10, 10, 12],
    knight: [10, 10, 10, 12]
  }
};

/** Bônus de counter do atacante na idade (1-4); 0 sem entrada. */
export function bonusForAge(atk: string, target: string, age: number): number {
  const line = BONUS_BY_AGE[atk]?.[target];
  if (line) return line[Math.max(0, Math.min(3, age - 1))];
  return COUNTER_BONUS[atk]?.[target] ?? 0;
}

// Dano e armadura por idade [I, II, III, IV] (SPEC §1.2–1.3).
export interface AgeStats {
  damage: [number, number, number, number];
  melee: [number, number, number, number];
  ranged: [number, number, number, number];
}

export const STATS_BY_AGE: Record<string, AgeStats> = {
  spearman: { damage: [7, 8, 9, 11], melee: [0, 0, 0, 0], ranged: [0, 0, 0, 0] },
  archer: { damage: [5, 5, 7, 8], melee: [0, 0, 0, 0], ranged: [0, 0, 0, 0] },
  longbow: { damage: [6, 6, 8, 9], melee: [0, 0, 0, 0], ranged: [0, 0, 0, 0] },
  crossbow: { damage: [11, 11, 11, 14], melee: [0, 0, 0, 0], ranged: [0, 0, 0, 0] },
  manatarms: { damage: [8, 10, 12, 14], melee: [2, 3, 4, 5], ranged: [3, 3, 4, 5] },
  knight: { damage: [24, 24, 24, 29], melee: [4, 4, 4, 5], ranged: [4, 4, 4, 5] },
  royalknight: { damage: [19, 19, 24, 29], melee: [3, 3, 4, 5], ranged: [3, 3, 4, 5] }
};

/** Dano/armadura do tipo na idade (1-4); fora da tabela, undefined (usa a base). */
export function statsForAge(type: string, age: number): { damage: number; melee: number; ranged: number } | undefined {
  const line = STATS_BY_AGE[type];
  if (!line) return undefined;
  const i = Math.max(0, Math.min(3, age - 1));
  return { damage: line.damage[i], melee: line.melee[i], ranged: line.ranged[i] };
}

/**
 * Dano final = max(1, atk + bonus − armadura). Mínimo 1.
 * VERIFICAR (Fase 3): a fórmula real do AoE IV usa redução percentual/multiplicativa de armadura
 * (spec §5.1 e §6.1). A subtração plana aqui é provisória e deve ser trocada quando confirmada.
 */
export function dealDamage(atk: number, armor: number, bonus = 0): number {
  return Math.max(1, atk + bonus - armor);
}

export interface Fighter {
  id: number;
  type: string;
  player: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  range: number; // 0 = melee (alcance efetivo 1.0)
  damage: number;
  meleeArmor: number;
  rangedArmor: number;
  cooldown: number; // segundos entre ataques (cadência)
  cdLeft: number; // segundos restantes até o próximo ataque
  age?: number; // idade do dono (1-4); sem ela, bônus/dano da linha de base
}

export interface UnitCombatStats {
  hp: number;
  damage: number;
  range: number;
  melee: number;
  ranged: number;
  cooldown: number;
  speed?: never;
}

/**
 * Stats de combate por tipo. Fonte: docs/spec-units.md (estágio I/III conforme indicado).
 * Itens sem número no spec ou marcados como referência estão como VERIFICAR.
 */
export const UNIT_COMBAT: Record<string, UnitCombatStats> = {
  // Aldeão: faca melee d6, cadência 3,88 s. Spec §1.1.
  villager: { hp: 50, damage: 6, range: 0, melee: 0, ranged: 0, cooldown: 3.88 },
  // Batedor: espada curta d1, cadência 2,0 s. Spec §1.1 (d1 literal; VERIFICAR — parece baixo).
  scout: { hp: 110, damage: 1, range: 0, melee: 0, ranged: 0, cooldown: 2.0 },
  // Lanceiro estágio I: HP 80, lança d7, cadência 1,88 s. Spec §1.2.
  spearman: { hp: 80, damage: 7, range: 0, melee: 0, ranged: 0, cooldown: 1.88 },
  // Arqueiro: HP 70, arco d5, alcance 5, cadência 1,62 s. Spec §1.2.
  archer: { hp: 70, damage: 5, range: 5, melee: 0, ranged: 0, cooldown: 1.62 },
  // Arco longo: HP 70, arco longo d6, alcance 7, cadência 1,62 s. Spec §1.2.
  longbow: { hp: 70, damage: 6, range: 7, melee: 0, ranged: 0, cooldown: 1.62 },
  // Besta: HP 80 (III), besta d11, alcance 5, cadência 2,12 s. Spec §1.2.
  crossbow: { hp: 80, damage: 11, range: 5, melee: 0, ranged: 0, cooldown: 2.12 },
  // Homem de armas estágio I: HP 100, espada d8, M2/R3, cadência 1,38 s. Spec §1.2.
  manatarms: { hp: 100, damage: 8, range: 0, melee: 2, ranged: 3, cooldown: 1.38 },
  // Cavaleiro estágio III: HP 230, espada d24, M4/R4, cadência 1,5 s. Spec §1.3.
  knight: { hp: 230, damage: 24, range: 0, melee: 4, ranged: 4, cooldown: 1.5 },
  // Cavaleiro real estágio I: HP 190, espada d19, M3/R3, cadência 1,5 s. Spec §1.3.
  royalknight: { hp: 190, damage: 19, range: 0, melee: 3, ranged: 3, cooldown: 1.5 },
  // Mangonel: HP 130, catapulta d10, alcance 8 (mín 3 não modelado), cadência 7,88 s.
  // Resistência de cerco é percentual (85%), não armadura plana: armadura 0 aqui. VERIFICAR.
  mangonel: { hp: 130, damage: 10, range: 8, melee: 0, ranged: 0, cooldown: 7.88 },
  // Trabuco: HP 140, dano 40, alcance 16, cadência 16,38 s. Resistência 80% (VERIFICAR como %).
  trebuchet: { hp: 140, damage: 40, range: 16, melee: 0, ranged: 0, cooldown: 16.38 },
  // Bombarda: HP 210, canhão d55, alcance 10, cadência 6,38 s. Resistência 85% (VERIFICAR como %).
  bombard: { hp: 210, damage: 55, range: 10, melee: 0, ranged: 0, cooldown: 6.38 },
  // Aríete: HP 370, aríete d200, alcance melee (0,54 → 0), cadência 5,12 s. Resistência 95% (VERIFICAR).
  ram: { hp: 370, damage: 200, range: 0, melee: 0, ranged: 0, cooldown: 5.12 },
  // Bombardeiro de mão: HP 130, arma d38, alcance 4, cadência 2,12 s. Spec §1.5 (era IV).
  handcannoneer: { hp: 130, damage: 38, range: 4, melee: 0, ranged: 0, cooldown: 2.12 }
};

// HP por idade (SPEC: homem de armas 100/120/155/180 I–IV; cavaleiro real 190/230/270 II–IV).
// Dano/armadura por idade ainda estáticos (VERIFICAR — ver BALANCE.md).
export const HP_BY_AGE: Record<string, number[]> = {
  spearman: [80, 90, 110, 140],
  archer: [70, 70, 80, 95],
  longbow: [70, 70, 80, 95],
  crossbow: [80, 80, 80, 95],
  manatarms: [100, 120, 155, 180],
  knight: [230, 230, 230, 270],
  royalknight: [190, 190, 230, 270]
};

/** HP de treino para o tipo na idade (1-4); fora da tabela, undefined (usa o padrão). */
export function hpForAge(type: string, age: number): number | undefined {
  const line = HP_BY_AGE[type];
  if (!line) return undefined;
  return line[Math.max(0, Math.min(3, age - 1))];
}

/** Alcance efetivo: range 0 = melee (1.0). Distância euclidiana ≤ alcance. */
export function inRange(a: Fighter, b: Fighter): boolean {
  const reach = a.range > 0 ? a.range : 1.0;
  return Math.hypot(b.x - a.x, b.y - a.y) <= reach;
}

/**
 * Avança o cooldown de `a` por `dt` e, se pronto, aplica um golpe em `b`.
 * Regras: só ataca inimigo (player distinto), alvo vivo, alcance ok, cooldown zerado.
 * Um único golpe por chamada (mesmo com dt grande). Reseta cdLeft = cooldown.
 * Dano: melee se a.range ≤ 1 (usa meleeArmor do alvo), senão ranged (rangedArmor),
 * mais COUNTER_BONUS[a.type][b.type].
 * Muta b.hp e a.cdLeft. Retorna ids atingidos (vazio ou [b.id]).
 */
export function attackTick(a: Fighter, b: Fighter, dt: number): { hits: number[] } {
  a.cdLeft = Math.max(0, a.cdLeft - dt);
  if (a.cdLeft > 0) return { hits: [] };
  if (isDead(a) || isDead(b)) return { hits: [] };
  if (a.player === b.player) return { hits: [] };
  if (!inRange(a, b)) return { hits: [] };

  const isMelee = a.range <= 1;
  const armor = isMelee ? b.meleeArmor : b.rangedArmor;
  const bonus = bonusForAge(a.type, b.type, a.age ?? 1);
  b.hp -= dealDamage(a.damage, armor, bonus);
  a.cdLeft = a.cooldown;
  return { hits: [b.id] };
}

/** Morto quando hp ≤ 0. */
export function isDead(f: Fighter): boolean {
  return f.hp <= 0;
}
