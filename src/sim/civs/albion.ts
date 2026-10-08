// THRONEWARD — Civilização Albion (análoga à English do AoE IV).
// Apenas dados e funções puras. Nomes e textos são originais.
// Números marcados VERIFICAR não foram confirmados por fonte (ver docs/spec-buildings.md e docs/spec-units.md).

export type ResourceKind = 'food' | 'wood' | 'gold' | 'stone';
export type Cost = Partial<Record<ResourceKind, number>>;

// Tipos locais compatíveis com ages.ts (não importado de propósito).
export type AgeNumber = 2 | 3 | 4;

export const ALBION = {
  id: 'albion',
  name: 'Albion',
  // Fazendas 50% mais baratas (VERIFICAR: fonte de número não confirmada).
  farmDiscount: 0.5,
  description:
    'Reino de arqueiros e muralhas. Fazendas baratas, e torres e fortalezas que se apoiam mutuamente.',
} as const;

export interface AlbLandmark {
  id: string;
  age: AgeNumber;
  name: string;
  cost: Cost;
  buildTime: number; // segundos (VERIFICAR)
  effect: string;
}

// Dois landmarks por idade (escolha 1 de 2). Custos e tempos VERIFICAR.
export const ALBION_LANDMARKS: Record<AgeNumber, [AlbLandmark, AlbLandmark]> = {
  2: [
    {
      id: 'albion-council-hall',
      age: 2,
      name: 'Salão do Conselho',
      cost: { wood: 300, gold: 150 },
      buildTime: 120,
      effect: 'Produz unidades de arco longo e acelera o treino de arqueiros.',
    },
    {
      id: 'albion-royal-abbey',
      age: 2,
      name: 'Abadia Real',
      cost: { wood: 200, stone: 150 },
      buildTime: 110,
      effect: 'Cura unidades próximas e aumenta a renda de aldeões.',
    },
  ],
  3: [
    {
      id: 'albion-alva-tower',
      age: 3,
      name: 'Torre Alva',
      cost: { stone: 350, gold: 200 },
      buildTime: 150,
      effect: 'Torre de guarda reforçada; funciona como fortaleza de guarnição.',
    },
    {
      id: 'albion-great-hall',
      age: 3,
      name: 'Grande Salão',
      cost: { wood: 350, stone: 200 },
      buildTime: 150,
      effect: 'Concede bônus de dano a todas as tropas da civilização.',
    },
  ],
  4: [
    {
      id: 'albion-crown-keep',
      age: 4,
      name: 'Castelo da Coroa',
      cost: { stone: 500, gold: 400 },
      buildTime: 180,
      effect: 'Fortaleza imperial com guarnição ampliada e defesa a distância.',
    },
    {
      id: 'albion-royal-university',
      age: 4,
      name: 'Universidade Real',
      cost: { wood: 400, gold: 350 },
      buildTime: 180,
      effect: 'Produz tecnologias avançadas e gera pesquisa passiva.',
    },
  ],
};

export type GatherSource = 'farm' | 'other';

// Desconto de fazenda já está no custo (ver albionFarmCost); coleta não recebe multiplicador extra.
export function albionGatherMult(_source: GatherSource): number {
  return 1;
}

export function albionFarmCost(baseCost: number): number {
  return baseCost * ALBION.farmDiscount;
}

export type StructureKind = 'town_center' | 'keep' | 'outpost' | 'other';

export interface PlacedStructure {
  kind: StructureKind;
  x: number;
  y: number;
}

// Rede de Castelos (VERIFICAR nome/valor): +25% de ataque se a menos de 8 tiles de TC/keep/outpost.
export const CASTLE_BONUS_RADIUS = 8;
export const CASTLE_BONUS_ATTACK = 0.25;
const CASTLE_BONUS_KINDS: ReadonlySet<StructureKind> = new Set<StructureKind>([
  'town_center',
  'keep',
  'outpost',
]);

export function castleBonus(x: number, y: number, structures: readonly PlacedStructure[]): number {
  for (const s of structures) {
    if (!CASTLE_BONUS_KINDS.has(s.kind)) continue;
    if (Math.hypot(s.x - x, s.y - y) < CASTLE_BONUS_RADIUS) return CASTLE_BONUS_ATTACK;
  }
  return 0;
}

export interface UnitStats {
  id: string;
  name: string;
  age: AgeNumber;
  cost: Cost;
  hp: number;
  damage: number; // dano de arco longo na idade II (base)
  range: number; // alcance em tiles
  cooldown: number; // cadência em segundos
  speed: number;
  trainTime: number; // segundos
  bonusVsLightInfantry: number;
}

export const ALBION_UNITS = ['longbow'] as const;

// Arco longo (análogo ao arqueiro de longo alcance): stats da spec, idade II.
export const LONGBOW: UnitStats = {
  id: 'longbow',
  name: 'Arqueiro Longo',
  age: 2,
  cost: { food: 40, wood: 50 },
  hp: 70,
  damage: 6,
  range: 7,
  cooldown: 1.62,
  speed: 1.125,
  trainTime: 15,
  bonusVsLightInfantry: 6,
};
