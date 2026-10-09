// Fachada que liga Sim + recursos + construção. Pura lógica: sem DOM, sem Three.js, headless.
// Determinística: sem Math.random; iteração sempre em ordem crescente de id.
//
// Economia: ciclo real de coleta (anda ao nó, acumula, anda à entrega, descarrega).

import { Sim } from './sim';
import {
  addStock,
  carryCapacity,
  gatherTick,
  spendStock,
  type Gatherer,
  type PlayerStock,
} from './resources';
import {
  buildTick,
  getDef,
  placeBuilding,
  popCap,
  productionTick,
  queueUnit,
  type Building,
} from './construction';
import { UNIT_COMBAT, attackTick, dealDamage, hpForAge, statsForAge, type Fighter } from './combat';
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
import { TECHS, TechState, armorBonus, armorFlat, attackFlat, attackMult, gatherMult, otherMult, research, techTick, type GatherGroup } from './techs';
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
  knightChargeBonus,
  type GalLandmark,
} from './civs/gallia';
import { RELIC_RATE, RelicState, drop as relicDrop, garrison as relicGarrison, pickup as relicPickup } from './relics';
import { Fog, sightOf } from './fog';import { SacredState, sacredTick } from './sacred';
import { checkVictory, goldFor, traderTick, tripTime, type Trader } from './trade';

// Custos de treino por unidade (THR v0 VERIFICAR — docs/spec-units.md).
const TRAIN_COSTS: Record<string, { food?: number; wood?: number; gold?: number; stone?: number }> = {
  villager: { food: 50 },
  scout: { food: 65 }, // SPEC (era 60 THR v0)
  spearman: { food: 60, wood: 20 },
  archer: { food: 30, wood: 50 },
  longbow: { food: 40, wood: 50 }, // SPEC (era 30F)
  crossbow: { food: 80, gold: 40 },
  manatarms: { food: 90, gold: 20 }, // SPEC (era 100 THR v0)
  knight: { food: 140, gold: 100 },
  royalknight: { food: 140, gold: 100 },
  monk: { gold: 150 },
  trader: { wood: 60, gold: 60 },
  ram: { wood: 200 },
  mangonel: { wood: 400, gold: 200 }, // SPEC §1.4
  trebuchet: { wood: 400, gold: 150 }, // SPEC §1.4
  bombard: { wood: 350, gold: 500 }, // SPEC §1.4
  handcannoneer: { food: 120, gold: 120 } // SPEC §1.5
};
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

// Tipos militares (para ociosos e composição). THR v0.
const MILITARY_TYPES = new Set([
  'spearman', 'archer', 'longbow', 'crossbow', 'manatarms',
  'knight', 'royalknight', 'arbaletrier', 'mangonel', 'trebuchet', 'bombard', 'ram'
]);
const SIEGE_UNITS = new Set(['ram', 'mangonel', 'trebuchet', 'bombard', 'springald']);
// Bônus somado ao dano base contra prédios/muralhas (SPEC §1.4).
// Aríete: 200 já é o dano de cerco (sem bônus extra).
const SIEGE_BONUS: Record<string, number> = {
  mangonel: 30,
  trebuchet: 350,
  bombard: 375,
  springald: 0,
  ram: 0
};

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
  // Carga: deslocamento acumulado desde o último golpe (bônus do cavaleiro real).
  private lastPos = new Map<number, { x: number; y: number }>();
  private chargeAcc = new Map<number, number>();
  // Cerco a prédios: atacante -> buildingId.
  private siegeTargets = new Map<number, number>();
  // Reparo: aldeão -> buildingId (25 HP/s num raio de 2.5; THR v0 VERIFICAR).
  private repairTargets = new Map<number, number>();
  // Landmarks físicos por jogador (entidades colocadas ao concluir cada avanço).
  landmarks = new Map<number, number[]>();
  private advancedEver = new Set<number>();
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
  // Fase 6: relíquias, sagrados, comércio, maravilha e vencedor.
  relics = new RelicState();
  sacred = new SacredState();
  // Estoque das fontes (esgotamento; fazendas são infinitas e ficam fora).
  private nodes = new Map<string, number>();
  // Nevoeiro de guerra (inicializado via initFog com o tamanho do mapa).
  fog: Fog | null = null;
  // Grade de visão: tiles de furtividade = 2 (bloqueiam visão além de 2 tiles).
  private visionBlocked: Uint8Array | null = null;

  setVisionBlocked(grid: Uint8Array): void {
    this.visionBlocked = grid;
  }
  traders = new Map<number, Trader>();
  private traderDistance = new Map<number, number>();
  private nextTraderSeq = 0;
  private wonderTimers = new Map<number, number>();
  winner: { player: number; reason: string } | null = null;
  victories = new Set(['annihilation', 'landmarks', 'sacred', 'wonder']);

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
    // Condições de vitória ativas (menu skirmish). Padrão: todas.
    this.victories = new Set(['annihilation', 'landmarks', 'sacred', 'wonder']);
  }

  ageOf(player: number): Age {
    return this.ages[player]?.age ?? 1;
  }

  // Inicializa o nevoeiro para um mapa size×size (tiles). Sem isso, tudo é visível.
  // Também fixa o tamanho do mapa para conversão mundo↔tile (muralhas, pathfinding).
  mapSize = 0;

  initFog(size: number): void {
    this.fog = new Fog(size, this.stocks.length);
    this.mapSize = size;
  }

  // Tiles (coordenadas de tile) ocupados por todas as muralhas — para bloqueio e render.
  wallTilesAll(): { x: number; y: number; wall: number; kind: string }[] {
    const out: { x: number; y: number; wall: number; kind: string }[] = [];
    const off = this.mapSize / 2;
    for (const w of this.walls.values()) {
      // Muralhas guardam coords de mundo; wallTiles opera em tiles.
      const tiles = wallTiles({
        id: w.id, player: w.player, kind: w.kind,
        x1: Math.round(w.x1 + off), y1: Math.round(w.y1 + off),
        x2: Math.round(w.x2 + off), y2: Math.round(w.y2 + off),
        hp: w.hp, maxHp: w.maxHp, gate: w.gate
      });
      for (const t of tiles) out.push({ x: t.x, y: t.y, wall: w.id, kind: w.kind });
    }
    return out;
  }

  // Unidade visível para `viewer`? (próprias sempre; inimigas só se vistas).
  isSeenBy(unitId: number, viewer: number): boolean {
    if (!this.fog) return true;
    const u = this.sim.state.units.find((v) => v.id === unitId);
    if (!u) return false;
    if (u.player === viewer) return true;
    return this.fog.isSeen(viewer, u.x + this.fog.size / 2, u.y + this.fog.size / 2);
  }

  // Variante por objeto (minimapa/render) — evita nova busca por id.
  isSeenByUnit(u: { id: number; player: number; x: number; y: number }, viewer: number): boolean {
    if (!this.fog) return true;
    if (u.player === viewer) return true;
    return this.fog.isSeen(viewer, u.x + this.fog.size / 2, u.y + this.fog.size / 2);
  }

  // Pontuação THR v0 (fórmula do original VERIFICAR): unidades e prédios contam.
  score(player: number): number {
    let s = this.ageOf(player) * 100;
    for (const u of this.sim.state.units) if (u.player === player && u.hp > 0) s += 10;
    for (const b of this.buildings.values()) if (b.player === player) s += b.built ? 50 : 10;
    for (const t of this.techs[player]?.researched ?? []) void t, (s += 20);
    return s;
  }

  private busyBuilders(): Set<number> {
    const out = new Set<number>();
    for (const set of this.builderSets.values()) for (const id of set) out.add(id);
    for (const set of this.ageBuilders.values()) for (const id of set) out.add(id);
    return out;
  }

  // Aldeões ociosos: vivos, sem coleta, sem obra, sem ordem de movimento.
  idleVillagers(player: number): number[] {
    const busy = this.busyBuilders();
    return this.sim.state.units
      .filter(
        (u) =>
          u.player === player &&
          u.type === 'villager' &&
          u.hp > 0 &&
          !this.gatherers.get(u.id)?.source &&
          !busy.has(u.id) &&
          u.queue.length === 0
      )
      .map((u) => u.id);
  }

  // Militares ociosos: sem alvo/cerco e sem ordem de movimento.
  idleMilitary(player: number): number[] {
    return this.sim.state.units
      .filter(
        (u) =>
          u.player === player &&
          u.hp > 0 &&
          MILITARY_TYPES.has(u.type) &&
          !this.targets.has(u.id) &&
          !this.siegeTargets.has(u.id) &&
          u.queue.length === 0
      )
      .map((u) => u.id);
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
  // A era do jogador precisa liberar a unidade. Cobra o custo THR v0 (SPEC).
  // Teto populacional: sem casas, sem treino (SPEC: 200 via casas).
  trainUnit(buildingId: number, unit: string, time: number): boolean {
    const b = this.buildings.get(buildingId);
    if (!b || !b.built) return false;
    if (!canTrain(this.ageOf(b.player), unit)) return false;
    const cap = popCap([...this.buildings.values()].filter((x) => x.player === b.player));
    if ((this.popUsed()[b.player] ?? 0) >= cap) return false;
    const stock = this.stocks[b.player];
    const cost = TRAIN_COSTS[unit];
    if (stock && cost && !spendStock(stock, cost)) return false;
    return queueUnit(b, unit, time);
  }

  // Cancela um slot da fila com reembolso integral (como no original).
  cancelTrain(buildingId: number, index: number): boolean {
    const b = this.buildings.get(buildingId);
    if (!b || index < 0 || index >= b.queue.length) return false;
    const [removed] = b.queue.splice(index, 1);
    if (!removed) return false;
    const stock = this.stocks[b.player];
    const cost = TRAIN_COSTS[removed.unit];
    if (stock && cost) {
      for (const res of ['food', 'wood', 'gold', 'stone'] as const) {
        const n = cost[res];
        if (typeof n === 'number' && n > 0) addStock(stock, res, n);
      }
    }
    return true;
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

  private homeOf(p: number): { x: number; y: number } {
    for (const b of this.buildings.values()) {
      if (b.player === p && b.type === 'towncenter') return { x: b.x, y: b.y };
    }
    return { x: 0, y: 0 };
  }

  private castleStructures(): PlacedStructure[] {    const out: PlacedStructure[] = [];
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

  // Ordem de cerco a prédio OU muralha inimiga (qualquer unidade; cerco tem bônus).
  orderSiege(unitId: number, buildingId: number): boolean {
    const a = this.sim.state.units.find((u) => u.id === unitId);
    if (!a) return false;
    const b = this.buildings.get(buildingId);
    if (b) {
      if (a.player === b.player) return false;
      this.siegeTargets.set(unitId, buildingId);
      return true;
    }
    const w = this.walls.get(buildingId);
    if (w) {
      if (a.player === w.player) return false;
      this.siegeTargets.set(unitId, buildingId);
      return true;
    }
    return false;
  }

  // Ordem de reparo: aldeão conserta prédio próprio danificado.
  orderRepair(unitId: number, buildingId: number): boolean {
    const a = this.sim.state.units.find((u) => u.id === unitId);
    const b = this.buildings.get(buildingId);
    if (!a || !b || a.type !== 'villager' || a.player !== b.player || b.hp >= b.maxHp) return false;
    this.gatherers.delete(unitId);
    this.gatherOwner.delete(unitId);
    this.targets.delete(unitId);
    this.repairTargets.set(unitId, buildingId);
    return true;
  }

  // Parar: limpa fila de movimento e todas as ordens das unidades.
  clearOrders(unitIds: number[]): void {
    for (const id of unitIds) {
      const u = this.sim.state.units.find((v) => v.id === id);
      if (u) u.queue = [];
      this.gatherers.delete(id);
      this.gatherOwner.delete(id);
      this.targets.delete(id);
      this.siegeTargets.delete(id);
      this.repairTargets.delete(id);
    }
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

  // Muralha entre dois pontos (coords de MUNDO). Custo por tile THR v0 VERIFICAR.
  placeWall(player: number, kind: 'palisade' | 'stone', x1: number, y1: number, x2: number, y2: number, gate = false): number {
    const stock = this.stocks[player];
    const def = WALL_DEFS[kind];
    if (!stock || !def) return -1;
    const off = this.mapSize / 2;
    const tiles = wallTiles({
      id: -1, player, kind,
      x1: Math.round(x1 + off), y1: Math.round(y1 + off),
      x2: Math.round(x2 + off), y2: Math.round(y2 + off),
      hp: 1, maxHp: 1, gate
    });
    const cost = { ...def.cost };
    if (cost.wood !== undefined) cost.wood *= tiles.length;
    if (cost.stone !== undefined) cost.stone *= tiles.length;
    if (!spendStock(stock, cost)) return -1;
    const id = 3000 + this.nextWallSeq;
    this.nextWallSeq++;
    this.walls.set(id, { id, player, kind, x1, y1, x2, y2, hp: def.hp, maxHp: def.hp, gate });
    return id;
  }

  // ---- Economia: esgotamento ----

  /** Registra fontes com estoque (chamado no setup com os dados do terreno). */
  seedNodes(nodes: { kind: string; x: number; y: number; amount: number }[]): void {
    for (const n of nodes) this.nodes.set(nodeKey(n.kind, n.x, n.y), n.amount);
  }

  /** Estoque restante de uma fonte (undefined = infinita/desconhecida). */
  nodeLeft(kind: string, x: number, y: number): number | undefined {
    return this.nodes.get(nodeKey(kind, x, y));
  }

  /** Fonte mais próxima do tipo com estoque (para realocar esgotados). */
  nearestNode(kind: string, x: number, y: number): { kind: string; x: number; y: number } | null {
    let best: { kind: string; x: number; y: number } | null = null;
    let bd = Infinity;
    for (const [key, amount] of this.nodes) {
      if (amount <= 0) continue;
      const sep = key.indexOf(':');
      const k = key.slice(0, sep);
      if (k !== kind) continue;
      const rest = key.slice(sep + 1).split(',');
      const nx = Number(rest[0]);
      const ny = Number(rest[1]);
      const d = Math.hypot(nx - x, ny - y);
      if (d < bd) {
        bd = d;
        best = { kind: k, x: nx, y: ny };
      }
    }
    return best;
  }

  // ---- Fase 6: relíquias ----

  addRelic(id: number, x: number, y: number): void {
    this.relics.add(id, x, y);
  }

  relicPickup(unitId: number, relicId: number): boolean {
    const u = this.sim.state.units.find((v) => v.id === unitId);
    if (!u) return false;
    return relicPickup(this.relics, relicId, unitId, u.type);
  }

  relicDrop(relicId: number, x: number, y: number): boolean {
    return relicDrop(this.relics, relicId, x, y);
  }

  relicGarrison(unitId: number, relicId: number, buildingId: number): boolean {
    const r = this.relics.relics.get(relicId);
    const b = this.buildings.get(buildingId);
    if (!r || !b || r.carrier !== unitId) return false;
    return relicGarrison(this.relics, relicId, buildingId, b.type, ['monastery']);
  }

  // ---- Fase 6: sagrados ----

  addSacredSite(id: number, x: number, y: number): void {
    this.sacred.add(id, x, y);
  }

  // ---- Fase 6: comércio ----

  // Rota entre dois mercados (prédios 'market' construídos). Retorna id do trader ou -1.
  assignRoute(unitId: number, fromMarketId: number, toMarketId: number): number {
    const u = this.sim.state.units.find((v) => v.id === unitId);
    const a = this.buildings.get(fromMarketId);
    const b = this.buildings.get(toMarketId);
    if (!u || u.type !== 'trader' || !a || !b) return -1;
    if (a.type !== 'market' || b.type !== 'market' || !a.built || !b.built) return -1;
    const distance = Math.hypot(b.x - a.x, b.y - a.y);
    const id = 4000 + this.nextTraderSeq;
    this.nextTraderSeq++;
    this.traders.set(id, { id, player: u.player, fromMarket: fromMarketId, toMarket: toMarketId, progress: 0, tripTime: tripTime(distance) });
    this.traderDistance.set(id, distance);
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
    const atkF = techs ? attackFlat(techs, ranged ? 'ranged' : 'melee') : 0;
    const armF = techs ? armorFlat(techs, ranged ? 'ranged' : 'melee') : 0;
    // Escala por idade (SPEC); fora da tabela, base.
    const age = this.ageOf(u.player);
    const scaled = statsForAge(u.type, age);
    const baseDmg = scaled?.damage ?? s.damage;
    const baseMelee = scaled?.melee ?? s.melee;
    const baseRanged = scaled?.ranged ?? s.ranged;
    let damage = (baseDmg + atkF) * atkM;
    if (this.civs[u.player] === 'albion') {
      damage *= 1 + castleBonus(u.x, u.y, this.castleStructures());
    }
    // No alto da muralha: +1 de alcance para distância (THR v0).
    const range = s.range > 1 && u.elev > 0 ? s.range + 1 : s.range;
    return {
      id: u.id, type: u.type, player: u.player, x: u.x, y: u.y,
      hp: u.hp, maxHp: u.maxHp, range, minRange: s.minRange, damage,
      meleeArmor: Math.round((baseMelee + armF) * armM), rangedArmor: Math.round((baseRanged + armF) * armM),
      cooldown: s.cooldown, cdLeft: this.cooldowns.get(u.id) ?? 0, age, elev: u.elev
    };
  }

  // Monta unidade à distância em muralha de PEDRA própria (teletransporte abstraído).
  // Retorna false se inválido (não-ranged, muralha alheia/paliçada, longe >3 tiles).
  mountWall(unitId: number, wallId: number): boolean {
    const u = this.sim.state.units.find((v) => v.id === unitId);
    const w = this.walls.get(wallId);
    if (!u || !w || w.player !== u.player || w.kind !== 'stone') return false;
    const s = UNIT_COMBAT[u.type];
    if (!s || s.range <= 1) return false;
    const tiles = this.wallTilesOf(wallId);
    let best: { x: number; y: number } | null = null;
    let bd = Infinity;
    const off = this.mapSize / 2;
    for (const t of tiles) {
      const wx = t.x - off;
      const wy = t.y - off;
      const d = Math.hypot(wx - u.x, wy - u.y);
      if (d <= 3 && d < bd) {
        bd = d;
        best = { x: wx, y: wy };
      }
    }
    if (!best) return false;
    u.x = best.x;
    u.y = best.y;
    u.queue = [];
    u.elev = 1;
    return true;
  }

  // Avança o mundo em dt segundos. Ordem: idades, tecnologias, movimento, coleta, construção/produção, combate.
  tick(dt: number): { trained: TrainedEvent[] } {
    this.sim.tickOnce(dt);

    // Nevoeiro a cada 10 ticks (6Hz; determinístico pelo contador do Sim).
    // Observadores = unidades vivas + prédios prontos (coordenadas em tiles).
    if (this.fog && this.sim.state.tick % 10 === 0) {
      const size = this.fog.size;
      for (let p = 0; p < this.stocks.length; p++) {
        const obs: { x: number; y: number; sight: number }[] = [];
        for (const u of this.sim.state.units) {
          if (u.player !== p || u.hp <= 0) continue;
          obs.push({ x: u.x + size / 2, y: u.y + size / 2, sight: sightOf(u.type) });
        }
        for (const b of this.buildings.values()) {
          if (b.player !== p || !b.built) continue;
          obs.push({ x: b.x + size / 2, y: b.y + size / 2, sight: sightOf(b.type) });
        }
        this.fog.update(p, obs, this.visionBlocked ?? undefined);
      }
    }

    for (let p = 0; p < this.ages.length; p++) {
      const st = this.ages[p];
      setBuilders(st, this.ageBuilders.get(p)?.size ?? 0);
      const reached = advanceTick(st, dt);
      if (reached !== null) {
        // Landmark físico ao lado do TC (entidade destruível — vitória por landmarks).
        this.advancedEver.add(p);
        const home = this.homeOf(p);
        const id = FIRST_BUILDING_ID + this.nextBuildingSeq;
        this.nextBuildingSeq++;
        this.buildings.set(id, placeBuilding(id, 'landmark', p, home.x + 4, home.y));
        const list = this.landmarks.get(p) ?? [];
        list.push(id);
        this.landmarks.set(p, list);
      }
      techTick(this.techs[p], dt);
    }

    // Ciclo de coleta: anda ao nó, acumula até a carga, anda à entrega, descarrega.
    for (const id of sortedKeys(this.gatherers)) {
      const g = this.gatherers.get(id);
      const player = this.gatherOwner.get(id);
      if (!g || player === undefined || !g.source) continue;
      const u = this.sim.state.units.find((v) => v.id === id);
      if (!u || u.hp <= 0) continue;
      // Esgotamento: fazendas são infinitas; demais fontes têm estoque.
      if (g.source.kind !== 'farm') {
        const key = nodeKey(g.source.kind, g.source.x, g.source.y);
        const left = this.nodes.get(key);
        if (left !== undefined && left <= 0) {
          // Procura outra fonte do mesmo tipo com estoque; senão, ocioso.
          const alt = this.nearestNode(g.source.kind, g.source.x, g.source.y);
          if (alt) {
            g.source = { kind: alt.kind, x: alt.x, y: alt.y };
            g.amount = 0;
            g.carrying = null;
          } else {
            g.source = null;
            g.amount = 0;
            g.carrying = null;
          }
          continue;
        }
      }
      const mult = gatherMult(this.techs[player], gatherGroup(g.source.kind));
      const atNode = Math.hypot(u.x - g.source.x, u.y - g.source.y) <= 1.5;
      const drop = g.dropoff ?? { x: g.source.x, y: g.source.y };
      const atDrop = Math.hypot(u.x - drop.x, u.y - drop.y) <= 2;
      if (g.amount >= carryCapacity(g.source.kind) && g.carrying) {
        // Cheio: entrega no ponto (anda até lá se preciso).
        if (atDrop) {
          const res = g.carrying;
          const n = g.amount;
          const key = nodeKey(g.source.kind, g.source.x, g.source.y);
          const left = this.nodes.get(key);
          if (left === undefined || g.source.kind === 'farm') {
            addStock(this.stocks[player], res, n);
          } else {
            const actual = Math.min(n, left);
            this.nodes.set(key, left - actual);
            if (actual > 0) addStock(this.stocks[player], res, actual);
          }
          g.amount = 0;
          g.carrying = null;
        } else if (u.queue.length === 0) {
          this.sim.commandMove([id], drop.x, drop.y);
        }
      } else {
        // Acumula no nó (anda até lá se preciso; sem entrega fora do ponto).
        if (atNode) {
          gatherTick(g, dt * mult, false);
        } else if (u.queue.length === 0) {
          this.sim.commandMove([id], g.source.x, g.source.y);
        }
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
        // HP por idade (SPEC: MAA e cavaleiro real escalam).
        const aged = hpForAge(unit, this.ageOf(b.player));
        if (aged === undefined) this.sim.spawnUnit(unit, b.player, x, y);
        else this.sim.spawnUnit(unit, b.player, x, y, aged);
      }
    }

    // Carga: deslocamento de TODAS as unidades a cada tick (independe de alvo).
    for (const u of this.sim.state.units) {
      if (u.hp <= 0) continue;
      const prev = this.lastPos.get(u.id);
      if (prev) {
        this.chargeAcc.set(u.id, (this.chargeAcc.get(u.id) ?? 0) + Math.hypot(u.x - prev.x, u.y - prev.y));
      }
      this.lastPos.set(u.id, { x: u.x, y: u.y });
    }

    // Auto-defesa: tropa ociosa (sem alvo, sem fila, sem coleta) revida o inimigo
    // mais próximo num raio de alcance+3. Aldeões, monges e mercadores não revidam.
    const IDLE_COMBAT = new Set(['spearman', 'archer', 'longbow', 'crossbow', 'manatarms', 'knight', 'royalknight', 'scout', 'handcannoneer']);
    for (const u of this.sim.state.units) {
      if (u.hp <= 0 || !IDLE_COMBAT.has(u.type)) continue;
      if (this.targets.has(u.id) || u.queue.length > 0 || this.gatherers.has(u.id)) continue;
      const s = UNIT_COMBAT[u.type];
      const radius = (s?.range ?? 0) > 1 ? s.range + 3 : 4;
      let best: number | null = null;
      let bd = Infinity;
      for (const f of this.sim.state.units) {
        if (f.player === u.player || f.hp <= 0) continue;
        const d = Math.hypot(f.x - u.x, f.y - u.y);
        if (d <= radius && d < bd) {
          bd = d;
          best = f.id;
        }
      }
      if (best !== null) this.targets.set(u.id, best);
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
        // Carga do cavaleiro real: base +3, ×(10/3) com Cantled Saddles (SPEC §1.3).
        const atk = this.sim.state.units.find((u) => u.id === attackerId);
        if (victim && atk && atk.type === 'royalknight' && (this.chargeAcc.get(attackerId) ?? 0) >= 3) {
          const techs = this.techs[atk.player];
          victim.hp -= knightChargeBonus() * (techs ? otherMult(techs, 'charge') : 1);
        }
        this.chargeAcc.set(attackerId, 0);
      }
    }

    // Monges curam aliados em 4 tiles a 1 HP/s (taxa VERIFICAR, SPEC §1.5).
    for (const m of this.sim.state.units) {
      if (m.type !== 'monk' || m.hp <= 0) continue;
      for (const a of this.sim.state.units) {
        if (a.player !== m.player || a.hp <= 0 || a.hp >= a.maxHp) continue;
        if (Math.hypot(a.x - m.x, a.y - m.y) <= 4) {
          a.hp = Math.min(a.maxHp, a.hp + 1 * dt);
        }
      }
    }

    // Torres disparam contra inimigos em alcance.
    for (const towerId of sortedKeys(this.towers)) {      const tw = this.towers.get(towerId);
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

    // Cerco: unidades atacam prédios E muralhas (dano base + bônus SPEC §1.4).
    // Respeita a cadência da unidade (mesmo mapa de cooldown do melee).
    for (const attackerId of sortedKeys(this.siegeTargets)) {
      const targetId = this.siegeTargets.get(attackerId);
      if (targetId === undefined) continue;
      const a = this.sim.state.units.find((u) => u.id === attackerId);
      if (!a || a.hp <= 0) {
        this.siegeTargets.delete(attackerId);
        continue;
      }
      const b = this.buildings.get(targetId);
      const w = b ? null : this.walls.get(targetId);
      if (!b && !w) {
        this.siegeTargets.delete(attackerId);
        continue;
      }
      const stats = UNIT_COMBAT[a.type];
      const reach = stats && stats.range > 1 ? stats.range : 1.5;
      let dist: number;
      if (b) {
        dist = Math.hypot(b.x - a.x, b.y - a.y);
      } else {
        // Muralha: distância ao tile mais próximo.
        dist = Infinity;
        const off = this.mapSize / 2;
        for (const t of this.wallTilesOf(targetId)) {
          const d = Math.hypot(t.x - off - a.x, t.y - off - a.y);
          if (d < dist) dist = d;
        }
      }
      if (dist > reach) continue;
      const cdLeft = (this.cooldowns.get(attackerId) ?? 0) - dt;
      if (cdLeft > 0) {
        this.cooldowns.set(attackerId, cdLeft);
        continue;
      }
      this.cooldowns.set(attackerId, stats?.cooldown ?? 2);
      const base = stats?.damage ?? 5;
      const dmg = dealDamage(SIEGE_UNITS.has(a.type) ? base + (SIEGE_BONUS[a.type] ?? 0) : base, 0);
      if (b) {
        b.hp -= dmg;
      } else if (w) {
        w.hp -= dmg;
        if (w.hp <= 0) {
          this.walls.delete(w.id);
          this.siegeTargets.delete(attackerId);
        }
      }
    }

    // Reparo: aldeão perto do prédio restaura 25 HP/s (anda até lá se longe).
    for (const workerId of sortedKeys(this.repairTargets)) {
      const buildingId = this.repairTargets.get(workerId);
      if (buildingId === undefined) continue;
      const a = this.sim.state.units.find((u) => u.id === workerId);
      const b = this.buildings.get(buildingId);
      if (!a || a.hp <= 0 || !b || b.hp >= b.maxHp) {
        this.repairTargets.delete(workerId);
        continue;
      }
      if (Math.hypot(b.x - a.x, b.y - a.y) > 2.5) {
        if (a.queue.length === 0) this.sim.commandMove([workerId], b.x, b.y);
        continue;
      }
      b.hp = Math.min(b.maxHp, b.hp + 25 * dt);
    }

    // Fase 6: renda de relíquias (por jogador dono do mosteiro).
    for (const r of this.relics.relics.values()) {
      if (r.garrisoned === null) continue;
      const b = this.buildings.get(r.garrisoned);
      if (!b) continue;
      addStock(this.stocks[b.player], 'gold', RELIC_RATE * dt);
    }

    // Fase 6: presença nos sagrados (raio 4 tiles, THR v0) e contagem.
    const presence = new Map<number, { player: number; religious: boolean }[]>();
    for (const site of this.sacred.sites.values()) {
      const here: { player: number; religious: boolean }[] = [];
      for (const u of this.sim.state.units) {
        if (u.hp <= 0) continue;
        if (Math.hypot(u.x - site.x, u.y - site.y) <= 4) {
          here.push({ player: u.player, religious: u.type === 'monk' });
        }
      }
      presence.set(site.id, here);
    }
    sacredTick(this.sacred, dt, presence);

    // Fase 6: rotas de comércio.
    for (const t of this.traders.values()) {
      if (traderTick(t, dt)) {
        addStock(this.stocks[t.player], 'gold', goldFor(this.traderDistance.get(t.id) ?? 0));
      }
    }

    // Fase 6: maravilha sustentada + veredito.
    if (!this.winner) {
      const wonderByPlayer = new Map<number, { built: boolean; timer: number }>();
      for (let p = 0; p < this.stocks.length; p++) wonderByPlayer.set(p, { built: false, timer: 0 });
      for (const b of this.buildings.values()) {
        if (b.type !== 'wonder' || !b.built) continue;
        const t = (this.wonderTimers.get(b.id) ?? 0) + dt;
        this.wonderTimers.set(b.id, t);
        const cur = wonderByPlayer.get(b.player);
        if (cur) wonderByPlayer.set(b.player, { built: true, timer: Math.max(cur.timer, t) });
      }
      // Landmarks: vivos se alguma entidade existir; ramo ativo só se todos avançaram.
      const landmarksAlive = new Map<number, boolean>();
      const allAdvanced = this.advancedEver.size === this.stocks.length;
      for (let p = 0; p < this.stocks.length; p++) {
        const ids = this.landmarks.get(p) ?? [];
        landmarksAlive.set(p, allAdvanced && ids.some((id) => this.buildings.has(id)));
      }
      const res = checkVictory({
        players: this.stocks.map((_, p) => p),
        landmarksAlive,
        sacredWinner: this.sacred.winner,
        wonder: wonderByPlayer
      });
      if (res.winner !== null && res.reason !== null && this.victories.has(res.reason)) {
        this.winner = { player: res.winner, reason: res.reason };
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
        this.siegeTargets.delete(id);
        this.repairTargets.delete(id);
        this.lastPos.delete(id);
        this.chargeAcc.delete(id);
      }
      for (const [attacker, target] of this.targets) {
        if (dead.has(target)) this.targets.delete(attacker);
      }
    }
    // Prédios destruídos saem do mapa (limpa cercos e timers de maravilha).
    for (const [id] of this.buildings) {
      const b = this.buildings.get(id);
      if (!b || b.hp > 0) continue;
      this.buildings.delete(id);
      this.wonderTimers.delete(id);
      for (const [attacker, target] of this.siegeTargets) {
        if (target === id) this.siegeTargets.delete(attacker);
      }
    }

    // Aniquilação: resta 1 jogador com unidades ou prédios prontos (após 120s).
    if (!this.winner && this.victories.has('annihilation') && this.sim.state.tick > 7200 && this.stocks.length > 1) {
      const alive = this.stocks.map((_, p) => p).filter(
        (p) =>
          this.sim.state.units.some((u) => u.player === p && u.hp > 0) ||
          [...this.buildings.values()].some((b) => b.player === p && b.built)
      );
      if (alive.length === 1) this.winner = { player: alive[0], reason: 'annihilation' };
    }

    return { trained };
  }

  // Repassa a grade de bloqueio (terreno + muralhas) para o pathfinding do Sim.
  setBlockedGrid(grid: Uint8Array, size: number): void {
    this.sim.setBlocked(grid, size);
  }

  // Grades por jogador a partir da base (terreno): portões próprios abertos.
  setBlockedGrids(base: Uint8Array, size: number): void {
    const walls = [...this.walls.values()];
    for (let p = 0; p < this.stocks.length; p++) {
      const grid = new Uint8Array(base);
      const ownGates = new Set<number>();
      for (const w of walls) {
        if (w.player === p && w.gate) {
          for (const t of this.wallTilesOf(w.id)) ownGates.add(t.y * size + t.x);
        }
      }
      for (const t of this.wallTilesAll()) {
        if (t.x < 0 || t.y < 0 || t.x >= size || t.y >= size) continue;
        if (ownGates.has(t.y * size + t.x)) continue;
        grid[t.y * size + t.x] = 1;
      }
      this.sim.setBlocked(grid, size, p);
    }
  }

  // Tiles de uma muralha (ids de tile já em coords de tile).
  wallTilesOf(wallId: number): { x: number; y: number }[] {
    return this.wallTilesAll().filter((t) => t.wall === wallId);
  }

  // Marca/desmarca portão numa muralha própria. Retorna false se inválido.
  setGate(wallId: number, player: number, gate: boolean): boolean {
    const w = this.walls.get(wallId);
    if (!w || w.player !== player) return false;
    w.gate = gate;
    return true;
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

function nodeKey(kind: string, x: number, y: number): string {
  return `${kind}:${x},${y}`;
}

