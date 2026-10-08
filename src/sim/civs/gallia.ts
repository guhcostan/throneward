// THRONEWARD — Civilização Gallia (análoga à French do AoE IV).
// Apenas dados e funções puras. Nomes e textos são originais.
// Números marcados VERIFICAR não foram confirmados por fonte (ver docs/spec-buildings.md e docs/spec-units.md).
// Não importa ages.ts de propósito (tipos locais, igual ao módulo albion.ts).

export type ResourceKind = 'food' | 'wood' | 'gold' | 'stone';
export type Cost = Partial<Record<ResourceKind, number>>;

export type AgeNumber = 2 | 3 | 4;

export const GALLIA = {
  id: 'gallia',
  name: 'Gallia',
  // Estábulos produzem cavalaria 20% mais rápido (VERIFICAR: número de referência não confirmado).
  stableProductionMult: 1.2,
  description:
    'Reino de cavaleiros e besteiros. Estábulos ágeis e uma carga de cavalaria que quebra linhas.',
} as const;

export interface GalLandmark {
  id: string;
  age: AgeNumber;
  name: string;
  cost: Cost;
  buildTime: number; // segundos (VERIFICAR)
  effect: string;
}

// Dois landmarks por idade (escolha 1 de 2). Custos e tempos VERIFICAR.
export const GALLIA_LANDMARKS: Record<AgeNumber, [GalLandmark, GalLandmark]> = {
  2: [
    {
      id: 'gallia-cavalry-school',
      age: 2,
      name: 'Escola de Cavalaria',
      cost: { wood: 300, gold: 150 },
      buildTime: 120,
      effect: 'Produz cavaleiros reais e acelera a produção de cavalaria.',
    },
    {
      id: 'gallia-trade-chamber',
      age: 2,
      name: 'Câmara de Comércio',
      cost: { wood: 200, stone: 150 },
      buildTime: 110,
      effect: 'Aumenta a renda de rotas de comércio e de mercadores.',
    },
  ],
  3: [
    {
      id: 'gallia-royal-palace',
      age: 3,
      name: 'Palácio Real',
      cost: { stone: 350, gold: 200 },
      buildTime: 150,
      effect: 'Fortaleza de guarnição; concede bônus de carga à cavalaria próxima.',
    },
    {
      id: 'gallia-cathedral',
      age: 3,
      name: 'Catedral',
      cost: { wood: 350, stone: 200 },
      buildTime: 150,
      effect: 'Cura unidades próximas fora de combate e eleva a moral das tropas.',
    },
  ],
  4: [
    {
      id: 'gallia-king-castle',
      age: 4,
      name: 'Castelo do Rei',
      cost: { stone: 500, gold: 400 },
      buildTime: 180,
      effect: 'Fortaleza imperial com guarnição ampliada e defesa a distância.',
    },
    {
      id: 'gallia-arsenal',
      age: 4,
      name: 'Arsenal',
      cost: { wood: 400, gold: 350 },
      buildTime: 180,
      effect: 'Produz tecnologias militares avançadas e reforça o equipamento das tropas.',
    },
  ],
};

// Bônus de carga da cavalaria (dano extra no primeiro impacto), idade II (VERIFICAR: spec cita +3).
export const KNIGHT_CHARGE_BONUS = 3;

export function galliaStableMult(): number {
  return GALLIA.stableProductionMult;
}

export function knightChargeBonus(): number {
  return KNIGHT_CHARGE_BONUS;
}

export interface GalUnitStats {
  id: string;
  name: string;
  age: AgeNumber;
  cost: Cost;
  hp: number;
  damage: number; // dano base
  range: number; // alcance em tiles (0 = melee)
  cooldown: number; // cadência em segundos
  speed: number;
  trainTime: number; // segundos
  meleeArmor: number; // armadura melee própria
  chargeBonus: number; // dano extra na carga (0 se não tem)
  bonusVsHeavy: number; // bônus contra unidades pesadas (0 se não tem)
}

export const GALLIA_UNITS = ['royalknight', 'arbaletrier'] as const;

// Cavaleiro real (análogo ao cavaleiro real): stats da spec, idade II. HP espelha UNIT_HP de sim.ts (190).
export const ROYAL_KNIGHT: GalUnitStats = {
  id: 'royalknight',
  name: 'Cavaleiro do Lírio',
  age: 2,
  cost: { food: 140, gold: 100 },
  hp: 190,
  damage: 19,
  range: 0,
  cooldown: 1.5,
  speed: 1.625,
  trainTime: 35,
  meleeArmor: 3,
  chargeBonus: KNIGHT_CHARGE_BONUS,
  bonusVsHeavy: 0,
};

// Balestreiro (análogo ao arbaletrier): besta de alcance 5, armadura melee com pavês. Idade III.
export const ARBALETRIER: GalUnitStats = {
  id: 'arbaletrier',
  name: 'Balestreiro do Pavês',
  age: 3,
  cost: { food: 80, gold: 40 },
  hp: 80,
  damage: 11,
  range: 5,
  cooldown: 2.12,
  speed: 1.125,
  trainTime: 22.5,
  meleeArmor: 1,
  chargeBonus: 0,
  bonusVsHeavy: 10,
};
