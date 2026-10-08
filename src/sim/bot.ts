// Bot RTS (Fase 7): joga via API pública do Game. Puro e determinístico.
// Dificuldades: easy (lento, exército pequeno, sem counter), medium, hard (rápido,
// exército grande, composição por counter). Sem visão de nevoeiro nesta fase (documentado).

import { Game } from './game';

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface WorldSites {
  food: { kind: string; x: number; y: number }[];
  wood: { kind: string; x: number; y: number }[];
  gold: { kind: string; x: number; y: number }[];
  stone: { kind: string; x: number; y: number }[];
  dropoff: { x: number; y: number };
}

const DECIDE_INTERVAL: Record<Difficulty, number> = { easy: 8, medium: 4, hard: 2 };
const ARMY_CAP: Record<Difficulty, number> = { easy: 8, medium: 15, hard: 25 };
const ATTACK_SIZE: Record<Difficulty, number> = { easy: 6, medium: 10, hard: 12 };

// Distribuição de aldeões (fração) por era: [food, wood, gold, stone].
const DIST_BY_AGE: Record<number, [number, number, number, number]> = {
  1: [0.5, 0.35, 0.1, 0.05],
  2: [0.4, 0.35, 0.15, 0.1],
  3: [0.35, 0.3, 0.2, 0.15],
  4: [0.3, 0.3, 0.25, 0.15]
};

const MILITARY = new Set(['spearman', 'archer', 'longbow', 'crossbow', 'manatarms', 'knight', 'royalknight', 'arbaletrier']);

function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(bx - ax, by - ay);
}

export class Bot {
  game: Game;
  player: number;
  difficulty: Difficulty;
  sites: WorldSites;
  private timer = 0;
  private ageBuildersAssigned = new Set<number>();

  constructor(game: Game, player: number, difficulty: Difficulty, sites: WorldSites) {
    this.game = game;
    this.player = player;
    this.difficulty = difficulty;
    this.sites = sites;
  }

  update(dt: number): void {
    this.timer += dt;
    if (this.timer < DECIDE_INTERVAL[this.difficulty]) return;
    this.timer = 0;
    this.economy();
    this.ages();
    this.buildMilitary();
    this.produce();
    this.combat();
    this.sacred();
  }

  private mine(): { id: number; type: string; x: number; y: number; hp: number }[] {
    return this.game.sim.state.units
      .filter((u) => u.player === this.player && u.hp > 0)
      .map((u) => ({ id: u.id, type: u.type, x: u.x, y: u.y, hp: u.hp }));
  }

  private foes(): { id: number; type: string; x: number; y: number; hp: number }[] {
    return this.game.sim.state.units
      .filter((u) => u.player !== this.player && u.hp > 0)
      .map((u) => ({ id: u.id, type: u.type, x: u.x, y: u.y, hp: u.hp }));
  }

  private home(): { x: number; y: number } {
    for (const b of this.game.buildings.values()) {
      if (b.player === this.player && b.type === 'towncenter') return { x: b.x, y: b.y };
    }
    return this.sites.dropoff;
  }

  private economy(): void {
    const g = this.game;
    const villagers = this.mine().filter((u) => u.type === 'villager');
    // 1. Treina aldeões (fila até 2 por TC).
    for (const b of g.buildings.values()) {
      if (b.player !== this.player || b.type !== 'towncenter' || !b.built) continue;
      if (b.queue.length < 2) g.trainUnit(b.id, 'villager', 20);
    }
    // 2. Casas sob pressão populacional.
    const used = g.popUsed()[this.player] ?? 0;
    let cap = 10;
    for (const b of g.buildings.values()) {
      if (b.player === this.player && b.type === 'house' && b.built) cap += 10;
    }
    cap = Math.min(200, cap);
    if (used >= cap - 2) {
      const h = this.home();
      const id = g.orderBuild(this.player, 'house', h.x + 3, h.y + 3);
      if (id !== -1 && villagers.length > 0) g.addBuilder(id, villagers[0].id);
    }
    // 3. Distribui aldeões ociosos (sem coleta registrada).
    const age = g.ageOf(this.player);
    const [f, w, o, s] = DIST_BY_AGE[age] ?? DIST_BY_AGE[1];
    const n = Math.max(1, villagers.length);
    const want = { food: Math.round(n * f), wood: Math.round(n * w), gold: Math.round(n * o), stone: Math.max(n > 6 ? 1 : 0, Math.round(n * s)) };
    const has = { food: 0, wood: 0, gold: 0, stone: 0 };
    for (const v of villagers) {
      const gr = g.gatherers.get(v.id);
      if (gr?.source) {
        const k = gr.source.kind;
        if (k === 'berry' || k === 'farm') has.food++;
        else if (k === 'wood') has.wood++;
        else if (k === 'gold') has.gold++;
        else if (k === 'stone') has.stone++;
      }
    }
    const pools = { food: this.sites.food, wood: this.sites.wood, gold: this.sites.gold, stone: this.sites.stone };
    let pi = 0;
    for (const v of villagers) {
      if (g.gatherers.get(v.id)?.source) continue;
      const order: ('food' | 'wood' | 'gold' | 'stone')[] = ['food', 'wood', 'gold', 'stone'];
      for (const res of order) {
        if (has[res] < want[res] && pools[res].length > 0) {
          const site = pools[res][pi % pools[res].length];
          pi++;
          g.assignGather(v.id, { kind: site.kind, x: site.x, y: site.y }, this.sites.dropoff);
          g.sim.commandMove([v.id], site.x, site.y);
          has[res]++;
          break;
        }
      }
    }
    // 4. Fazendas: 1 para cada 2 excedentes de comida após 8 aldeões.
    const farms = [...g.buildings.values()].filter((b) => b.player === this.player && b.type === 'farm').length;
    if (villagers.length >= 8 && farms < Math.floor((has.food - 4) / 2)) {
      const h = this.home();
      const id = g.orderBuild(this.player, 'farm', h.x - 3, h.y - 2 - farms);
      if (id !== -1 && villagers.length > 0) g.addBuilder(id, villagers[villagers.length - 1].id);
    }
  }

  private ages(): void {
    const g = this.game;
    const st = g.ages[this.player];
    if (!st || st.age >= 4 || st.advancing) return;
    const villagers = this.mine().filter((u) => u.type === 'villager');
    if (villagers.length < 8) return;
    if (!g.advanceAge(this.player, this.difficulty === 'easy' ? 1 : 0)) return;
    for (const v of villagers.slice(0, 3)) {
      if (!this.ageBuildersAssigned.has(v.id)) {
        g.addAgeBuilder(this.player, v.id);
        this.ageBuildersAssigned.add(v.id);
      }
    }
  }

  private buildMilitary(): void {
    const g = this.game;
    const age = g.ageOf(this.player);
    const want: string[] = [];
    if (age >= 2) want.push('barracks');
    if (age >= 3) want.push('archerrange', 'stable');
    const h = this.home();
    let i = 0;
    for (const type of want) {
      const has = [...g.buildings.values()].some((b) => b.player === this.player && b.type === type);
      if (has) continue;
      const vils = this.mine().filter((u) => u.type === 'villager');
      if (vils.length === 0) continue;
      const id = g.orderBuild(this.player, type, h.x + 5 + i * 3, h.y - 4);
      i++;
      if (id !== -1) g.addBuilder(id, vils[vils.length - 1].id);
    }
  }

  // Composição por counter (hard/medium; easy produz lanceiros+arqueiros).
  private composition(): { unit: string; building: string }[] {
    const foes = this.foes().filter((u) => MILITARY.has(u.type));
    const cav = foes.filter((u) => u.type === 'knight' || u.type === 'royalknight' || u.type === 'scout').length;
    const arch = foes.filter((u) => u.type === 'archer' || u.type === 'longbow' || u.type === 'crossbow').length;
    const heavy = foes.filter((u) => u.type === 'manatarms' || u.type === 'knight').length;
    if (this.difficulty !== 'easy') {
      if (cav > arch && cav > 0) return [{ unit: 'spearman', building: 'barracks' }];
      if (heavy > 2) return [{ unit: 'crossbow', building: 'archerrange' }];
      if (arch > cav && arch > 0) return [{ unit: 'knight', building: 'stable' }];
    }
    return [
      { unit: 'spearman', building: 'barracks' },
      { unit: 'archer', building: 'archerrange' }
    ];
  }

  private produce(): void {
    const g = this.game;
    const army = this.mine().filter((u) => MILITARY.has(u.type)).length;
    if (army >= ARMY_CAP[this.difficulty]) return;
    for (const { unit, building } of this.composition()) {
      const b = [...g.buildings.values()].find((x) => x.player === this.player && x.type === building && x.built);
      if (!b || b.queue.length >= 2) continue;
      g.trainUnit(b.id, unit, 15);
    }
  }

  private combat(): void {
    const g = this.game;
    const army = this.mine().filter((u) => MILITARY.has(u.type));
    const foes = this.foes();
    if (army.length === 0 || foes.length === 0) return;
    const h = this.home();
    // Defesa: inimigos perto da base têm prioridade.
    const defenders = foes.filter((f) => dist(f.x, f.y, h.x, h.y) < 15);
    const targets = defenders.length > 0 ? defenders : foes;
    const attackNow = army.length >= ATTACK_SIZE[this.difficulty] || defenders.length > 0;
    for (const m of army) {
      let best = targets[0];
      let bd = Infinity;
      for (const t of targets) {
        const d = dist(m.x, m.y, t.x, t.y);
        if (d < bd) {
          bd = d;
          best = t;
        }
      }
      if (!best) continue;
      if (!attackNow) continue;
      // Perseguição: anda até o alcance, ataca quando perto (alcance melee ~1, ranged do tipo).
      if (bd <= 5) g.orderAttack(m.id, best.id);
      else g.sim.commandMove([m.id], best.x, best.y);
    }
  }

  private sacred(): void {
    const g = this.game;
    if (g.ageOf(this.player) < 3) return;
    const monks = this.mine().filter((u) => u.type === 'monk');
    if (monks.length === 0) return;
    let site: { x: number; y: number } | null = null;
    let bd = Infinity;
    for (const s of g.sacred.sites.values()) {
      if (s.owner === this.player) continue;
      const d = dist(monks[0].x, monks[0].y, s.x, s.y);
      if (d < bd) {
        bd = d;
        site = s;
      }
    }
    if (site) g.sim.commandMove(monks.map((m) => m.id), site.x, site.y);
  }
}
