// Building construction and production queues. Pure logic, no DOM, no Three.js: runs headless.
// Every function advances by an explicit dt (seconds) so the same inputs always give the same outputs.

export interface Cost {
  food?: number;
  wood?: number;
  gold?: number;
  stone?: number;
}

export interface BuildingDef {
  cost: Cost;
  hp: number;
  buildTime: number; // seconds of work for ONE builder at rate 1x
  popRoom?: number;
}

// THR v0 VERIFICAR: valores provisórios da Fase 2. Conferir contra o GDD v0 antes de balancear.
// Notação do spec: "M" = madeira (wood), "O" = ouro (gold), "S" = pedra (stone).
export const BUILDINGS: Record<string, BuildingDef> = {
  towncenter: { cost: { food: 0, wood: 0 }, hp: 7000, buildTime: 0 }, // inicial, já pronto
  house: { cost: { wood: 50 }, hp: 700, buildTime: 20, popRoom: 10 },
  farm: { cost: { wood: 75 }, hp: 400, buildTime: 15 },
  lumbercamp: { cost: { wood: 50 }, hp: 800, buildTime: 20 },
  miningcamp: { cost: { wood: 50 }, hp: 800, buildTime: 20 },
  mill: { cost: { wood: 50 }, hp: 800, buildTime: 20 },
  barracks: { cost: { wood: 150 }, hp: 1500, buildTime: 30 },
  archerrange: { cost: { wood: 150 }, hp: 1500, buildTime: 30 },
  stable: { cost: { wood: 150 }, hp: 1500, buildTime: 30 },
  blacksmith: { cost: { wood: 150 }, hp: 1500, buildTime: 30 },
  market: { cost: { wood: 100 }, hp: 1200, buildTime: 25 },
  monastery: { cost: { wood: 150, gold: 150 }, hp: 1500, buildTime: 40 },
  outpost: { cost: { wood: 100, stone: 50 }, hp: 1000, buildTime: 25 },
  siegeworkshop: { cost: { wood: 200 }, hp: 1500, buildTime: 45 }, // THR v0 VERIFICAR
  university: { cost: { wood: 200 }, hp: 1500, buildTime: 40 }, // THR v0 VERIFICAR
  wonder: { cost: { food: 1000, wood: 1000, gold: 1000, stone: 1000 }, hp: 5000, buildTime: 180 }, // THR v0 VERIFICAR
};

export const QUEUE_MAX = 5;
export const POP_BASE = 10;
export const POP_MAX = 200;

export interface QueueItem {
  unit: string;
  time: number; // segundos restantes
  total: number; // segundos totais (para UI)
}

export interface Building {
  id: number;
  type: string;
  player: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  progress: number; // 0..1
  built: boolean;
  builders: number;
  queue: QueueItem[];
  rally: { x: number; y: number } | null;
}

export function getDef(type: string): BuildingDef {
  const def = BUILDINGS[type];
  if (!def) throw new Error(`unknown building type: ${type}`);
  return def;
}

// Criação: começa em progress 0, hp = 10% do máximo.
// buildTime 0 (ex.: towncenter inicial) nasce já pronto.
export function placeBuilding(nextId: number, type: string, player: number, x: number, y: number): Building {
  const def = getDef(type);
  const instant = def.buildTime <= 0;
  return {
    id: nextId,
    type,
    player,
    x,
    y,
    hp: instant ? def.hp : def.hp * 0.1,
    maxHp: def.hp,
    progress: instant ? 1 : 0,
    built: instant,
    builders: 0,
    queue: [],
    rally: null,
  };
}

// Velocidade de construção com N aldeões: rate = (N + 2) / 3.
// 1 aldeão = 1.0x, 2 = 1.33x, 3 = 1.67x. Sem bônus para N = 0 (rate 2/3, mas sem builders não há progresso).
export function buildRate(builders: number): number {
  return (builders + 2) / 3;
}

// Avança a construção: progress += dt * rate(builders) / buildTime.
// hp sobe linearmente de 10% a 100% durante a obra. Ao completar: built = true, hp = maxHp.
export function buildTick(b: Building, dt: number): void {
  if (b.built) return;
  const def = getDef(b.type);
  if (b.builders <= 0 || def.buildTime <= 0) return;
  b.progress = Math.min(1, b.progress + (dt * buildRate(b.builders)) / def.buildTime);
  if (b.progress >= 1) {
    b.progress = 1;
    b.built = true;
    b.hp = b.maxHp;
  } else {
    b.hp = b.maxHp * (0.1 + 0.9 * b.progress);
  }
}

// Enfileira uma unidade. Só prédio pronto produz e a fila tem limite QUEUE_MAX.
export function queueUnit(b: Building, unit: string, time: number): boolean {
  if (!b.built || b.queue.length >= QUEUE_MAX || time <= 0) return false;
  b.queue.push({ unit, time, total: time });
  return true;
}

// Consome dt do topo da fila; tempo excedente passa para o próximo item (sem perda de tempo).
// Retorna os nomes das unidades concluídas neste tick, na ordem de produção.
export function productionTick(b: Building, dt: number): string[] {
  const produced: string[] = [];
  if (!b.built) return produced;
  let budget = dt;
  while (budget > 0 && b.queue.length > 0) {
    const head = b.queue[0];
    if (head.time > budget) {
      head.time -= budget;
      budget = 0;
    } else {
      budget -= head.time;
      produced.push(head.unit);
      b.queue.shift();
    }
  }
  return produced;
}

export function setRally(b: Building, x: number, y: number): void {
  b.rally = { x, y };
}

// Limite de população: POP_BASE + soma de popRoom dos prédios PRONTOS, travado em POP_MAX.
export function popCap(buildings: Building[]): number {
  let total = POP_BASE;
  for (const b of buildings) {
    if (!b.built) continue;
    total += getDef(b.type).popRoom ?? 0;
  }
  return Math.min(POP_MAX, total);
}
