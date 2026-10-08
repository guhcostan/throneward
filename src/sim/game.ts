// Fachada que liga Sim + recursos + construção. Pura lógica: sem DOM, sem Three.js, headless.
// Determinística: sem Math.random; iteração sempre em ordem crescente de id.
//
// SIMPLIFICAÇÃO (documentada): não há caminhada real até o depósito. Um gatherer entrega
// automaticamente ao stock do dono assim que completa um ciclo (amount atinge a capacidade),
// via gatherTick(g, dt, atDropoff=true). O movimento do aldeão continua sendo feito pelo Sim
// (sim.commandMove), mas não afeta a entrega.

import { Sim } from './sim';
import {
  addStock,
  gatherTick,
  spendStock,
  type Gatherer,
  type PlayerStock,
} from './resources';
import {
  buildTick,
  getDef,
  placeBuilding,
  productionTick,
  queueUnit,
  type Building,
} from './construction';
import { UNIT_COMBAT, attackTick, dealDamage, type Fighter } from './combat';
import {
  TOWER_DEFS,
  WALL_DEFS,
  damageArrowCount,
  towerTick,
  wallTiles,
  type Tower,
  type Wall,
} from './defenses';
import {
  beginAdvance,
  canBuild,
  canTrain,
  createAgeState,
  advanceTick,
  setBuilders,
  type Age,
  type AgeState,
  type LandmarkDef,
} from './ages';
import { TECHS, TechState, armorBonus, attackMult, gatherMult, research, techTick, type GatherGroup } from './techs';
import {
  ALBION_LANDMARKS,
  albionFarmCost,
  castleBonus,
  type AlbLandmark,
  type PlacedStructure,
} from './civs/albion';
import {
  GALLIA_LANDMARKS,
  galliaStableMult,
  type GalLandmark,
} from './civs/gallia';

// Landmarks genéricos (civs sem pacote próprio). THR v0 VERIFICAR.
const GENERIC_LANDMARKS: Record<2 | 3 | 4, [LandmarkDef, LandmarkDef]> = {
  2: [
    { id: 'gen-war-hall', age: 2, name: 'War Hall', cost: { food: 200, wood: 200 }, buildTime: 90, effect: 'advance:2' },
    { id: 'gen-abbey', age: 2, name: 'Abbey', cost: { food: 200, wood: 200 }, buildTime: 90, effect: 'advance:2' }
  ],
  3: [
    { id: 'gen-white-tower', age: 3, name: 'White Tower', cost: { food: 300, wood: 300 }, buildTime: 120, effect: 'advance:3' },
    { id: 'gen-grand-hall', age: 3, name: 'Grand Hall', cost: { food: 300, wood: 300 }, buildTime: 120, effect: 'advance:3' }
  ],
  4: [
    { id: 'gen-crown-keep', age: 4, name: 'Crown Keep', cost: { food: 400, wood: 400 }, buildTime: 150, effect: 'advance:4' },
    { id: 'gen-royal-academy', age: 4, name: 'Royal Academy', cost: { food: 400, wood: 400 }, buildTime: 150, effect: 'advance:4' }
  ]
};

// ages.ts usa ids provisórios ('lumber','mining','siege'); construction usa outros.
const BUILD_ALIAS: Record<string, string> = {
  lumbercamp: 'lumber',
  miningcamp: 'mining',
  siegeworkshop: 'siege'
};

const HUNT_SOURCES = new Set(['deer', 'boar', 'sheep']);

function gatherGroup(kind: string): GatherGroup {
  if (HUNT_SOURCES.has(kind)) return 'hunt';
  if (kind === 'wood') return 'wood';
  if (kind === 'gold') return 'gold';
  if (kind === 'stone') return 'stone';
  return 'food'; // berry, farm e demais fontes de comida
}

export const START_STOCK = { food: 200, wood: 200, gold: 100, stone: 100 } as const;
export const SIM_TICK_RATE = 60;
const FIRST_BUILDING_ID = 1000;
const SPAWN_OFFSET_X = 2;

export interface TrainedEvent {
  building: number;
  unit: string;
}

export class Game {
  sim: Sim;
  stocks: PlayerStock[];
  gatherers: Map<number, Gatherer>;
  buildings: Map<number, Building>;

  // Dono (player) de cada gatherer; Gatherer não carrega esse campo.
  private gatherOwner = new Map<number, number>();
  // Construtores atribuídos a cada prédio (set de unitIds).
  private builderSets = new Map<number, Set<number>>();
  private nextBuildingSeq = 0;
  // Combate: alvo por atacante + cooldown restante por atacante.
  private targets = new Map<number, number>();
  private cooldowns = new Map<number, number>();
  // Defesas.
  towers = new Map<number, Tower>();
  walls = new Map<number, Wall>();
  private nextTowerSeq = 0;
  private nextWallSeq = 0;
  // Idades, tecnologias e civilizações (uma entrada por jogador).
  ages: AgeState[] = [];
  techs: TechState[] = [];
  civs: string[] = [];
  private ageBuilders = new Map<number, Set<number>>();

  constructor(seed: number, players: number, civs?: string[]) {
    this.sim = new Sim({ seed, tickRate: SIM_TICK_RATE });
    this.stocks = [];
    for (let p = 0; p < players; p++) {
      this.stocks.push({ stock: { ...START_STOCK } });
    }
    // Sim e stocks compartilham os mesmos objetos: hash() reflete os recursos reais.
    this.sim.state.resources = this.stocks.map((s) => s.stock);
    this.gatherers = new Map();
    this.buildings = new Map();
    for (let p = 0; p < players; p++) {
      this.ages.push(createAgeState());
      this.techs.push(new TechState());
      this.civs.push(civs?.[p] ?? 'generic');
    }
  }

  ageOf(player: number): Age {
    return this.ages[player]?.age ?? 1;
  }

  // Registra um aldeão como coletor. Dono = player da unidade no Sim.
  assignGather(
    unitId: number,
    source: { kind: string; x: number; y: number },
    dropoff: { x: number; y: number },
  ): boolean {
    const unit = this.sim.state.units.find((u) => u.id === unitId);
    if (!unit || !this.stocks[unit.player]) return false;
    this.gatherers.set(unitId, { id: unitId, carrying: null, amount: 0, source: { ...source }, dropoff: { ...dropoff } });
    this.gatherOwner.set(unitId, unit.player);
    return true;
  }

  // Cria um prédio em construção se houver fundos e a era permitir. Retorna o id ou -1.
  orderBuild(player: number, type: string, x: number, y: number): number {
    const stock = this.stocks[player];
    if (!stock) return -1;
    const gated = BUILD_ALIAS[type] ?? type;
    if (!canBuild(this.ageOf(player), type) && !canBuild(this.ageOf(player), gated)) return -1;
    const def = getDef(type);
    const cost = { ...def.cost };
    if (type === 'farm' && this.civs[player] === 'albion' && cost.wood !== undefined) {
      cost.wood = albionFarmCost(cost.wood);
    }
    if (!spendStock(stock, cost)) return -1;
    const id = FIRST_BUILDING_ID + this.nextBuildingSeq;
    this.nextBuildingSeq++;
    this.buildings.set(id, placeBuilding(id, type, player, x, y));
    return id;
  }

  // Registra um construtor para o prédio. Ignora ids desconhecidos.
  addBuilder(buildingId: number, unitId: number): void {
    const b = this.buildings.get(buildingId);
    if (!b) return;
    let set = this.builderSets.get(buildingId);
    if (!set) {
      set = new Set<number>();
      this.builderSets.set(buildingId, set);
    }
    set.add(unitId);
    b.builders = set.size;
  }

  // Enfileira treino só em prédio pronto (queueUnit já checa built e limite de fila).
  // A era do jogador precisa liberar a unidade.
  trainUnit(buildingId: number, unit: string, time: number): boolean {
    const b = this.buildings.get(buildingId);
    if (!b || !b.built) return false;
    if (!canTrain(this.ageOf(b.player), unit)) return false;
    return queueUnit(b, unit, time);
  }

  // Par de landmarks da próxima idade (dados da civ ou genéricos).
  ageChoices(player: number): [LandmarkDef, LandmarkDef] | null {
    const age = this.ageOf(player);
    if (age >= 4) return null;
    const next = (age + 1) as 2 | 3 | 4;
    if (this.civs[player] === 'albion') {
      const [a, b]: [AlbLandmark, AlbLandmark] = ALBION_LANDMARKS[next];
      return [
        { id: a.id, age: next, name: a.name, cost: { ...a.cost }, buildTime: a.buildTime, effect: a.effect },
        { id: b.id, age: next, name: b.name, cost: { ...b.cost }, buildTime: b.buildTime, effect: b.effect }
      ];
    }
    if (this.civs[player] === 'gallia') {
      const [a, b]: [GalLandmark, GalLandmark] = GALLIA_LANDMARKS[next];
      return [
        { id: a.id, age: next, name: a.name, cost: { ...a.cost }, buildTime: a.buildTime, effect: a.effect },
        { id: b.id, age: next, name: b.name, cost: { ...b.cost }, buildTime: b.buildTime, effect: b.effect }
      ];
    }
    return GENERIC_LANDMARKS[next];
  }

  // Inicia o avanço de era pagando o landmark do slot escolhido. Retorna false sem fundos/era.
  advanceAge(player: number, slot: 0 | 1): boolean {
    const st = this.ages[player];
    const stock = this.stocks[player];
    const pair = this.ageChoices(player);
    if (!st || !stock || !pair) return false;
    const chosen = pair[slot];
    if (!chosen) return false;
    if (!spendStock(stock, chosen.cost)) return false;
    return beginAdvance(st, pair);
  }

  addAgeBuilder(player: number, unitId: number): void {
    let set = this.ageBuilders.get(player);
    if (!set) {
      set = new Set<number>();
      this.ageBuilders.set(player, set);
    }
    set.add(unitId);
  }

  // Pesquisa tecnologia (custo THR v0 em TECHS). Retorna false sem fundos/era/fila.
  researchTech(player: number, id: string): boolean {
    const st = this.techs[player];
    const stock = this.stocks[player];
    const def = TECHS[id];
    if (!st || !stock || !def) return false;
    if (!spendStock(stock, def.cost)) return false;
    if (!research(st, id, this.ageOf(player))) {
      // Devolve o custo se a fila/era recusar.
      for (const k of Object.keys(def.cost) as (keyof typeof def.cost)[]) {
        const n = def.cost[k];
        if (n !== undefined) stock.stock[k] += n;
      }
      return false;
    }
    return true;
  }

  private castleStructures(): PlacedStructure[] {
    const out: PlacedStructure[] = [];
    for (const b of this.buildings.values()) {
      if (!b.built) continue;
      if (b.type === 'towncenter') out.push({ kind: 'town_center', x: b.x, y: b.y });
    }
    for (const tw of this.towers.values()) {
      if (tw.kind === 'outpost') out.push({ kind: 'outpost', x: tw.x, y: tw.y });
      else out.push({ kind: 'keep', x: tw.x, y: tw.y });
    }
    return out;
  }

  // Ordem de ataque corpo a corpo/à distância (alvos de players distintos).
  orderAttack(unitId: number, targetId: number): boolean {
    const a = this.sim.state.units.find((u) => u.id === unitId);
    const t = this.sim.state.units.find((u) => u.id === targetId);
    if (!a || !t || a.player === t.player) return false;
    this.targets.set(unitId, targetId);
    return true;
  }

  // Torre defensiva (custo THR v0 VERIFICAR em TOWER_DEFS). Retorna id ou -1.
  placeTower(player: number, kind: 'outpost' | 'tower' | 'keep', x: number, y: number): number {
    const stock = this.stocks[player];
    const def = TOWER_DEFS[kind];
    if (!stock || !def) return -1;
    if (!spendStock(stock, def.cost)) return -1;
    const id = 2000 + this.nextTowerSeq;
    this.nextTowerSeq++;
    this.towers.set(id, { id, player, kind, x, y, hp: def.hp, maxHp: def.hp, garrison: [], cdLeft: 0 });
    return id;
  }

  // Muralha entre dois pontos (custo por tile THR v0 VERIFICAR). Retorna id ou -1.
  placeWall(player: number, kind: 'palisade' | 'stone', x1: number, y1: number, x2: number, y2: number, gate = false): number {
    const stock = this.stocks[player];
    const def = WALL_DEFS[kind];
    if (!stock || !def) return -1;
    const tiles = wallTiles({ id: -1, player, kind, x1, y1, x2, y2, hp: 1, maxHp: 1, gate });
    const cost = { ...def.cost };
    if (cost.wood !== undefined) cost.wood *= tiles.length;
    if (cost.stone !== undefined) cost.stone *= tiles.length;
    if (!spendStock(stock, cost)) return -1;
    const id = 3000 + this.nextWallSeq;
    this.nextWallSeq++;
    this.walls.set(id, { id, player, kind, x1, y1, x2, y2, hp: def.hp, maxHp: def.hp, gate });
    return id;
  }

  private fighterOf(unitId: number): Fighter | null {
    const u = this.sim.state.units.find((v) => v.id === unitId);
    if (!u) return null;
    const s = UNIT_COMBAT[u.type] ?? { hp: u.maxHp, damage: 5, range: 0, melee: 0, ranged: 0, cooldown: 2 };
    const techs = this.techs[u.player];
    const ranged = s.range > 1;
    const atkM = techs ? attackMult(techs, ranged ? 'ranged' : 'melee') : 1;
    const armM = techs ? armorBonus(techs, ranged ? 'ranged' : 'melee') : 1;
    let damage = s.damage * atkM;
    if (this.civs[u.player] === 'albion') {
      damage *= 1 + castleBonus(u.x, u.y, this.castleStructures());
    }
    return {
      id: u.id, type: u.type, player: u.player, x: u.x, y: u.y,
      hp: u.hp, maxHp: u.maxHp, range: s.range, damage,
      meleeArmor: Math.round(s.melee * armM), rangedArmor: Math.round(s.ranged * armM),
      cooldown: s.cooldown, cdLeft: this.cooldowns.get(u.id) ?? 0
    };
  }

  // Avança o mundo em dt segundos. Ordem: idades, tecnologias, movimento, coleta, construção/produção, combate.
  tick(dt: number): { trained: TrainedEvent[] } {
    this.sim.tickOnce(dt);

    for (let p = 0; p < this.ages.length; p++) {
      const st = this.ages[p];
      setBuilders(st, this.ageBuilders.get(p)?.size ?? 0);
      advanceTick(st, dt);
      techTick(this.techs[p], dt);
    }

    for (const id of sortedKeys(this.gatherers)) {
      const g = this.gatherers.get(id);
      const player = this.gatherOwner.get(id);
      if (!g || player === undefined || !g.source) continue;
      const mult = gatherMult(this.techs[player], gatherGroup(g.source.kind));
      const { delivered } = gatherTick(g, dt * mult, true);
      for (const res of Object.keys(delivered) as (keyof typeof delivered)[]) {
        const n = delivered[res];
        if (n !== undefined && n > 0) addStock(this.stocks[player], res, n);
      }
    }

    const trained: TrainedEvent[] = [];
    for (const id of sortedKeys(this.buildings)) {
      const b = this.buildings.get(id);
      if (!b) continue;
      buildTick(b, dt);
      // Bônus Gallia: estábulo produz 20% mais rápido (THR v0 VERIFICAR).
      const pdt = b.type === 'stable' && this.civs[b.player] === 'gallia' ? dt * galliaStableMult() : dt;
      for (const unit of productionTick(b, pdt)) {
        trained.push({ building: b.id, unit });
        const x = b.rally ? b.rally.x : b.x + SPAWN_OFFSET_X;
        const y = b.rally ? b.rally.y : b.y;
        this.sim.spawnUnit(unit, b.player, x, y);
      }
    }

    // Combate entre unidades (ordens de ataque).
    for (const attackerId of sortedKeys(this.targets)) {
      const targetId = this.targets.get(attackerId);
      if (targetId === undefined) continue;
      const a = this.fighterOf(attackerId);
      const t = this.fighterOf(targetId);
      if (!a || !t) {
        this.targets.delete(attackerId);
        continue;
      }
      const { hits } = attackTick(a, t, dt);
      this.cooldowns.set(attackerId, a.cdLeft);
      if (hits.length > 0) {
        const victim = this.sim.state.units.find((u) => u.id === targetId);
        if (victim) victim.hp = t.hp;
      }
    }

    // Torres disparam contra inimigos em alcance.
    for (const towerId of sortedKeys(this.towers)) {
      const tw = this.towers.get(towerId);
      if (!tw) continue;
      const def = TOWER_DEFS[tw.kind as keyof typeof TOWER_DEFS];
      if (!def) continue;
      const enemies = this.sim.state.units
        .filter((u) => u.player !== tw.player && u.hp > 0)
        .map((u) => ({ id: u.id, x: u.x, y: u.y, hp: u.hp }));
      const targetId = towerTick(tw, enemies, dt);
      if (targetId !== null) {
        const victim = this.sim.state.units.find((u) => u.id === targetId);
        const stats = victim ? UNIT_COMBAT[victim.type] : undefined;
        const dmg = dealDamage(def.damage * damageArrowCount(tw), stats?.ranged ?? 0);
        if (victim) victim.hp -= dmg;
      }
    }

    // Mortes: remove unidades com hp<=0 e limpa referências (ordens, coleta, cooldown).
    const dead = new Set(this.sim.state.units.filter((u) => u.hp <= 0).map((u) => u.id));
    if (dead.size > 0) {
      this.sim.state.units = this.sim.state.units.filter((u) => !dead.has(u.id));
      for (const id of dead) {
        this.gatherers.delete(id);
        this.gatherOwner.delete(id);
        this.targets.delete(id);
        this.cooldowns.delete(id);
      }
      for (const [attacker, target] of this.targets) {
        if (dead.has(target)) this.targets.delete(attacker);
      }
    }

    return { trained };
  }

  // População usada por jogador: unidades vivas + itens na fila de treino.
  // Prédios em construção não contam.
  popUsed(): number[] {
    const used = this.stocks.map(() => 0);
    for (const u of this.sim.state.units) {
      if (used[u.player] !== undefined) used[u.player]++;
    }
    for (const id of sortedKeys(this.buildings)) {
      const b = this.buildings.get(id);
      if (!b || used[b.player] === undefined) continue;
      used[b.player] += b.queue.length;
    }
    return used;
  }

  hash(): string {
    return this.sim.hash();
  }
}

function sortedKeys<V>(m: Map<number, V>): number[] {
  return [...m.keys()].sort((a, b) => a - b);
}

