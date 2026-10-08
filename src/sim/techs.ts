// Tecnologias de ferraria e universidade (Fase 4). Lógica pura, sem DOM, sem Three.js.
// Determinística: mesmas entradas, mesmas saídas. Não debita custo: o chamador debita
// `def.cost` ao aceitar a pesquisa (research só valida era, duplicidade e fila).
// Ver docs/spec-economy.md §2.3 (bônus de coleta) e docs/spec-units.md §3 (upgrades).

export type TechBuilding = 'blacksmith' | 'university';
export type TechAge = 2 | 3 | 4;
export type TechEffectKind = 'meleeAtk' | 'meleeArmor' | 'rangedAtk' | 'rangedArmor' | 'gather' | 'other';
export type GatherGroup = 'food' | 'hunt' | 'wood' | 'gold' | 'stone';

export interface TechCost {
  food?: number;
  wood?: number;
  gold?: number;
  stone?: number;
}

export interface TechDef {
  id: string;
  building: TechBuilding;
  age: TechAge;
  cost: TechCost;
  time: number; // segundos
  effect: {
    kind: TechEffectKind;
    // Alvo do efeito. Para 'gather' é um ou mais grupos de GatherGroup separados por '|'
    // (ex.: 'gold|stone'). Para 'other' é um rótulo livre (ex.: 'siege').
    target: string;
    mult: number; // multiplicador final (ex.: 1.1)
  };
  desc: string;
}

// THR v0 VERIFICAR: multiplicadores e custos provisórios. Conferir contra o GDD v0.
// Tempos seguem a escala 30/45/60 s pedida para as três eras de cada linha.
// Custo de armas/armaduras segue spec-units §3.1 (F+G para melee, W+G para distância).
const MELEE_ATK_COSTS: TechCost[] = [
  { food: 50, gold: 125 },
  { food: 100, gold: 250 },
  { food: 150, gold: 350 },
];
const MELEE_ARMOR_COSTS: TechCost[] = MELEE_ATK_COSTS;
const RANGED_ATK_COSTS: TechCost[] = [
  { wood: 50, gold: 125 },
  { wood: 100, gold: 250 },
  { wood: 150, gold: 350 },
];
const RANGED_ARMOR_COSTS: TechCost[] = RANGED_ATK_COSTS;
const TIERS: { age: TechAge; time: number }[] = [
  { age: 2, time: 30 },
  { age: 3, time: 45 },
  { age: 4, time: 60 },
];
const ROMAN = ['I', 'II', 'III'];

function tierLine(
  prefix: string,
  building: TechBuilding,
  kind: 'meleeAtk' | 'meleeArmor' | 'rangedAtk' | 'rangedArmor',
  costs: TechCost[],
  mult: number,
  label: string,
): TechDef[] {
  return TIERS.map((t, i) => ({
    id: `${prefix}-${i + 1}`,
    building,
    age: t.age,
    cost: costs[i] ?? {},
    time: t.time,
    effect: { kind, target: kind.startsWith('melee') ? 'melee' : 'ranged', mult },
    desc: `${label} ${ROMAN[i] ?? ''}`.trim(),
  }));
}

const MILITARY: TechDef[] = [
  ...tierLine('melee-atk', 'blacksmith', 'meleeAtk', MELEE_ATK_COSTS, 1.1, 'Dano melee'),
  ...tierLine('melee-armor', 'blacksmith', 'meleeArmor', MELEE_ARMOR_COSTS, 1.1, 'Armadura melee'),
  ...tierLine('ranged-atk', 'blacksmith', 'rangedAtk', RANGED_ATK_COSTS, 1.1, 'Dano à distância'),
  ...tierLine('ranged-armor', 'blacksmith', 'rangedArmor', RANGED_ARMOR_COSTS, 1.1, 'Armadura à distância'),
];

const GATHER: TechDef[] = [
  { id: 'horticulture', building: 'university', age: 2, cost: { food: 50, gold: 100 }, time: 30, effect: { kind: 'gather', target: 'food', mult: 1.1 }, desc: 'Coleta de comida +10% (exceto caça)' },
  { id: 'fertilization', building: 'university', age: 3, cost: { food: 100, gold: 200 }, time: 45, effect: { kind: 'gather', target: 'food', mult: 1.1 }, desc: 'Comida +10% (exceto caça)' },
  { id: 'precision', building: 'university', age: 4, cost: { food: 150, gold: 300 }, time: 60, effect: { kind: 'gather', target: 'food', mult: 1.1 }, desc: 'Comida +10% (exceto caça)' },
  { id: 'survival', building: 'university', age: 2, cost: { food: 50, gold: 100 }, time: 30, effect: { kind: 'gather', target: 'hunt', mult: 1.15 }, desc: 'Caça +15%' },
  { id: 'double-broadax', building: 'university', age: 2, cost: { food: 50, gold: 100 }, time: 30, effect: { kind: 'gather', target: 'wood', mult: 1.15 }, desc: 'Madeira +15%' },
  { id: 'lumber-preservation', building: 'university', age: 3, cost: { food: 100, gold: 200 }, time: 45, effect: { kind: 'gather', target: 'wood', mult: 1.15 }, desc: 'Madeira +15%' },
  { id: 'crosscut', building: 'university', age: 4, cost: { food: 150, gold: 300 }, time: 60, effect: { kind: 'gather', target: 'wood', mult: 1.15 }, desc: 'Madeira +15%' },
  { id: 'specialized-pick', building: 'university', age: 2, cost: { food: 50, gold: 100 }, time: 30, effect: { kind: 'gather', target: 'gold|stone', mult: 1.15 }, desc: 'Ouro/pedra +15%' },
  { id: 'shaft-mining', building: 'university', age: 3, cost: { food: 100, gold: 200 }, time: 45, effect: { kind: 'gather', target: 'gold|stone', mult: 1.15 }, desc: 'Ouro/pedra +15%' },
];

const OTHER: TechDef[] = [
  { id: 'ballistics', building: 'university', age: 3, cost: { food: 100, gold: 250 }, time: 45, effect: { kind: 'other', target: 'siege', mult: 1.2 }, desc: 'Cerco +20% (VERIFICAR)' },
  { id: 'chemistry', building: 'university', age: 4, cost: { food: 150, gold: 350 }, time: 60, effect: { kind: 'other', target: 'siege|gunpowder', mult: 1.2 }, desc: 'Cerco/pólvora +20% (VERIFICAR)' },
];

const ALL: TechDef[] = [...MILITARY, ...GATHER, ...OTHER];

export const TECHS: Record<string, TechDef> = Object.fromEntries(ALL.map((t) => [t.id, t]));

export const TECH_QUEUE_MAX = 2;

export interface TechQueueEntry {
  id: string;
  timeLeft: number;
}

export class TechState {
  researched = new Set<string>();
  queue: TechQueueEntry[] = [];
}

/**
 * Enfileira a pesquisa `id` se: a tech existir, a era `age` for suficiente, não estiver
 * pesquisada nem na fila, e a fila tiver espaço (máx. TECH_QUEUE_MAX). Retorna true se enfileirou.
 */
export function research(s: TechState, id: string, age: number): boolean {
  const def = TECHS[id];
  if (!def) return false;
  if (age < def.age) return false;
  if (s.researched.has(id)) return false;
  if (s.queue.some((q) => q.id === id)) return false;
  if (s.queue.length >= TECH_QUEUE_MAX) return false;
  s.queue.push({ id, timeLeft: def.time });
  return true;
}

/**
 * Avança a fila em `dt` segundos. Conclui pesquisas na ordem da fila; o tempo excedente
 * de uma conclusão é repassado à próxima. Retorna os ids concluídos neste tick.
 */
export function techTick(s: TechState, dt: number): string[] {
  const done: string[] = [];
  let budget = dt;
  while (s.queue.length > 0) {
    const head = s.queue[0];
    if (head.timeLeft > budget) {
      head.timeLeft -= budget;
      break;
    }
    budget -= head.timeLeft;
    s.queue.shift();
    s.researched.add(head.id);
    done.push(head.id);
  }
  // Se a fila esvaziou, o tempo restante é descartado (nada a consumir).
  if (s.queue.length > 0) {
    s.queue[0].timeLeft = Math.max(s.queue[0].timeLeft, 0);
  }
  return done;
}

function productOf(s: TechState, pred: (d: TechDef) => boolean): number {
  let m = 1;
  for (const id of s.researched) {
    const def = TECHS[id];
    if (def && pred(def)) m *= def.effect.mult;
  }
  return m;
}

/** Multiplicador de dano corpo-a-corpo ou à distância (produto das techs pesquisadas). */
export function attackMult(s: TechState, kind: 'melee' | 'ranged'): number {
  const want = kind === 'melee' ? 'meleeAtk' : 'rangedAtk';
  return productOf(s, (d) => d.effect.kind === want);
}

/** Multiplicador de armadura (produto das techs pesquisadas da categoria). */
export function armorBonus(s: TechState, kind: 'melee' | 'ranged'): number {
  const want = kind === 'melee' ? 'meleeArmor' : 'rangedArmor';
  return productOf(s, (d) => d.effect.kind === want);
}

/** Multiplicador de coleta para um grupo de recurso (produto das techs 'gather' que o cobrem). */
export function gatherMult(s: TechState, group: GatherGroup): number {
  return productOf(
    s,
    (d) => d.effect.kind === 'gather' && d.effect.target.split('|').includes(group),
  );
}

/** Multiplicador de efeitos 'other' (ex.: 'siege') pelo rótulo do alvo. */
export function otherMult(s: TechState, target: string): number {
  return productOf(
    s,
    (d) => d.effect.kind === 'other' && d.effect.target.split('|').includes(target),
  );
}
