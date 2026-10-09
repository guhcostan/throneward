// Comércio (spec-economy.md §7) e condições de vitória (§8). Módulo puro, sem dependência de game.ts.
// Valores marcados VERIFICAR na spec: TRADE_RATE, TRADER_SPEED, WONDER_HOLD ainda não confirmados.

export const TRADE_RATE = 0.15; // ouro por tile de distância por viagem (VERIFICAR)
export const TRADER_SPEED = 1.0; // tiles por segundo (SPEC §1.5)
export const WONDER_HOLD = 600; // segundos (10 min) sustentando a maravilha (VERIFICAR)

export interface Trader {
  id: number;
  player: number;
  fromMarket: number;
  toMarket: number;
  progress: number;
  tripTime: number;
}

export interface VictorySnapshot {
  players: number[];
  /** Por jogador: true se ainda possui landmark vivo. Só `false` explícito conta como destruído. */
  landmarksAlive: Map<number, boolean>;
  sacredWinner: number | null;
  /** Por jogador: maravilha construída e segundos sustentados. */
  wonder: Map<number, { built: boolean; timer: number }>;
}

export interface VictoryResult {
  winner: number | null;
  reason: string | null;
}

/** Tempo de uma viagem (ida e volta) para a distância dada, em segundos. */
export function tripTime(distance: number): number {
  return distance / TRADER_SPEED;
}

/** Ouro creditado ao completar uma viagem de `distance` tiles. */
export function goldFor(distance: number): number {
  return Math.round(distance * TRADE_RATE * 10);
}

/**
 * Avança o mercador em `dt` segundos. Retorna true quando a viagem completa
 * (o integrador credita goldFor(distance)); ao completar, progress volta a 0.
 */
export function traderTick(t: Trader, dt: number): boolean {
  t.progress += dt;
  if (t.progress >= t.tripTime) {
    t.progress = 0;
    return true;
  }
  return false;
}

/** Vencedores candidatos de um critério; empate (mais de um) ou nenhum → null. */
function uniqueWinner(candidates: number[]): number | null {
  return candidates.length === 1 ? candidates[0] : null;
}

/**
 * Prioridade: (1) landmarks — jogador cujos inimigos não têm landmark vivo;
 * (2) sagrados — sacredWinner; (3) maravilha — construída com timer >= WONDER_HOLD.
 * Empate dentro de um mesmo critério ou ausência de vencedor → null.
 */
export function checkVictory(s: VictorySnapshot): VictoryResult {
  const landmarkWinners = s.players.filter((w) => {
    const enemies = s.players.filter((p) => p !== w);
    return enemies.length > 0 && enemies.every((p) => s.landmarksAlive.get(p) === false);
  });
  const lw = uniqueWinner(landmarkWinners);
  if (lw !== null) return { winner: lw, reason: 'landmarks' };
  if (landmarkWinners.length > 1) return { winner: null, reason: null };

  if (s.sacredWinner !== null) return { winner: s.sacredWinner, reason: 'sacred' };

  const wonderWinners = s.players.filter((p) => {
    const w = s.wonder.get(p);
    return w !== undefined && w.built && w.timer >= WONDER_HOLD;
  });
  const ww = uniqueWinner(wonderWinners);
  if (ww !== null) return { winner: ww, reason: 'wonder' };

  return { winner: null, reason: null };
}
