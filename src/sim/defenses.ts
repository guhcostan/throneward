// Estruturas defensivas (muralhas e torres). Lógica pura, sem DOM, sem Three.js, sem combat.ts.
// Determinística: mesmas entradas, mesmas saídas. Dano NÃO é aplicado aqui; o integrador
// (futuramente via combat.ts) recebe o id do alvo de towerTick e aplica o dano.

import type { Cost } from './construction';

// Custo de muralha é POR TILE. Só madeira e pedra fazem sentido para muralhas.
export type WallCost = Pick<Cost, 'wood' | 'stone'>;

export interface WallDef {
  cost: WallCost; // por tile
  hp: number;
  armorM: number; // armadura contra dano melee
  armorR: number; // armadura contra dano à distância
}

// THR v0 VERIFICAR: valores provisórios. Conferir contra o GDD v0 antes de balancear.
export const WALL_DEFS: Record<'palisade' | 'stone', WallDef> = {
  palisade: { cost: { wood: 2 }, hp: 500, armorM: 2, armorR: 1 }, // VERIFICAR
  stone: { cost: { stone: 5 }, hp: 2000, armorM: 8, armorR: 6 }, // VERIFICAR
};

export interface Wall {
  id: number;
  player: number;
  kind: 'palisade' | 'stone';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  hp: number;
  maxHp: number;
  gate: boolean; // portão: mesmo traçado, mas passável por unidades do dono (regra de pathfinding fica fora daqui)
}

export interface Tile {
  x: number;
  y: number;
}

// Tiles de uma muralha: linha entre (x1,y1) e (x2,y2), extremos inclusos, via Bresenham.
// Linha horizontal, vertical ou diagonal exata. Ordem: do ponto 1 ao ponto 2.
export function wallTiles(w: Wall): Tile[] {
  const tiles: Tile[] = [];
  const dx = Math.abs(w.x2 - w.x1);
  const dy = -Math.abs(w.y2 - w.y1);
  const sx = w.x1 < w.x2 ? 1 : -1;
  const sy = w.y1 < w.y2 ? 1 : -1;
  let err = dx + dy;
  let x = w.x1;
  let y = w.y1;
  for (;;) {
    tiles.push({ x, y });
    if (x === w.x2 && y === w.y2) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
  return tiles;
}

export interface TowerDef {
  cost: Cost;
  hp: number;
  range: number; // tiles (distância euclidiana)
  damage: number;
  cooldown: number; // segundos entre disparos
  garrison: number; // capacidade de guarnição
}

// THR v0 VERIFICAR: valores provisórios. "outpost" espelha BUILDINGS.outpost (custo e hp).
export const TOWER_DEFS: Record<'outpost' | 'tower' | 'keep', TowerDef> = {
  outpost: { cost: { wood: 100, stone: 50 }, hp: 1000, range: 8, damage: 6, cooldown: 2, garrison: 0 }, // VERIFICAR
  tower: { cost: { wood: 50, stone: 100 }, hp: 1500, range: 9, damage: 8, cooldown: 2, garrison: 4 }, // VERIFICAR
  keep: { cost: { wood: 50, stone: 150 }, hp: 2000, range: 10, damage: 12, cooldown: 2, garrison: 8 }, // VERIFICAR
};

export interface Tower {
  id: number;
  player: number;
  kind: string; // chave de TOWER_DEFS
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  garrison: number[]; // ids das unidades guarnecidas
  cdLeft: number; // segundos até poder disparar de novo (0 = pronta)
}

export interface TargetCandidate {
  id: number;
  x: number;
  y: number;
  hp: number;
}

function getTowerDef(kind: string): TowerDef {
  if (kind !== 'outpost' && kind !== 'tower' && kind !== 'keep') {
    throw new Error(`unknown tower kind: ${kind}`);
  }
  return TOWER_DEFS[kind];
}

// Avança o cooldown e, se a torre estiver pronta, escolhe o alvo.
// - Recarregando (cdLeft > 0 após o decremento): retorna null.
// - Escolhe o inimigo vivo (hp > 0) mais próximo dentro de range.
// - Empate de distância: menor id (determinístico).
// - Dispara: cdLeft = cooldown e retorna o id do alvo. Dano NÃO é aplicado aqui.
// - Nada em alcance: retorna null e a torre continua pronta (cdLeft 0).
// Enemies devem vir já filtrados (só inimigos); a torre nunca mira aliados.
export function towerTick(t: Tower, enemies: TargetCandidate[], dt: number): number | null {
  const def = getTowerDef(t.kind);
  t.cdLeft = Math.max(0, t.cdLeft - dt);
  if (t.cdLeft > 0) return null;

  const rangeSq = def.range * def.range;
  let best: TargetCandidate | null = null;
  let bestD = Infinity;
  for (const e of enemies) {
    if (e.hp <= 0) continue;
    const dx = e.x - t.x;
    const dy = e.y - t.y;
    const d = dx * dx + dy * dy;
    if (d > rangeSq) continue;
    if (d < bestD || (d === bestD && best !== null && e.id < best.id)) {
      best = e;
      bestD = d;
    }
  }
  if (best === null) return null;

  t.cdLeft = def.cooldown;
  return best.id;
}

// Número de flechas por disparo: 1 base + 1 por unidade guarnecida (regra documentada).
export function damageArrowCount(t: Tower): number {
  return 1 + t.garrison.length;
}
