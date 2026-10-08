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

  constructor(seed: number, players: number) {
    this.sim = new Sim({ seed, tickRate: SIM_TICK_RATE });
    this.stocks = [];
    for (let p = 0; p < players; p++) {
      this.stocks.push({ stock: { ...START_STOCK } });
    }
    // Sim e stocks compartilham os mesmos objetos: hash() reflete os recursos reais.
    this.sim.state.resources = this.stocks.map((s) => s.stock);
    this.gatherers = new Map();
    this.buildings = new Map();
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

  // Cria um prédio em construção se houver fundos. Retorna o id ou -1.
  orderBuild(player: number, type: string, x: number, y: number): number {
    const stock = this.stocks[player];
    if (!stock) return -1;
    const def = getDef(type);
    if (!spendStock(stock, def.cost)) return -1;
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
  trainUnit(buildingId: number, unit: string, time: number): boolean {
    const b = this.buildings.get(buildingId);
    if (!b || !b.built) return false;
    return queueUnit(b, unit, time);
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
    return {
      id: u.id, type: u.type, player: u.player, x: u.x, y: u.y,
      hp: u.hp, maxHp: u.maxHp, range: s.range, damage: s.damage,
      meleeArmor: s.melee, rangedArmor: s.ranged,
      cooldown: s.cooldown, cdLeft: this.cooldowns.get(u.id) ?? 0
    };
  }

  // Avança o mundo em dt segundos. Ordem: movimento do Sim, coleta, construção e produção.
  tick(dt: number): { trained: TrainedEvent[] } {
    this.sim.tickOnce(dt);

    for (const id of sortedKeys(this.gatherers)) {
      const g = this.gatherers.get(id);
      const player = this.gatherOwner.get(id);
      if (!g || player === undefined || !g.source) continue;
      const { delivered } = gatherTick(g, dt, true);
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
      for (const unit of productionTick(b, dt)) {
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

