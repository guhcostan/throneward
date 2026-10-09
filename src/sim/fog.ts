// Nevoeiro de guerra (Fase 9): visibilidade por jogador + memória de explorado.
// Puro e determinístico. Regra: tile visível se alguma unidade/edifício próprio ao alcance;
// explorado = já visto alguma vez (terreno fica visível, unidades só quando vistas).

// Alcance de visão em tiles (THR v0 VERIFICAR; aldeão 6.22 [V] na spec).
export const SIGHT: Record<string, number> = {
  villager: 6,
  scout: 12,
  monk: 8,
  trader: 6,
  towncenter: 10,
  outpost: 12,
  tower: 12,
  keep: 12,
};

export function sightOf(type: string): number {
  return SIGHT[type] ?? 6;
}

export class Fog {
  readonly size: number;
  readonly players: number;
  /** Visível agora: players × tiles (1 = visível). */
  seen: Uint8Array[];
  /** Já explorado alguma vez (memória): players × tiles. */
  explored: Uint8Array[];

  constructor(size: number, players: number) {
    this.size = size;
    this.players = players;
    this.seen = Array.from({ length: players }, () => new Uint8Array(size * size));
    this.explored = Array.from({ length: players }, () => new Uint8Array(size * size));
  }

  /** Recalcula a visibilidade de um jogador a partir de observadores. */
  update(
    player: number,
    observers: { x: number; y: number; sight: number }[],
    blocked?: Uint8Array
  ): void {
    const seen = this.seen[player];
    const explored = this.explored[player];
    seen.fill(0);
    for (const o of observers) {
      const r = Math.max(0, Math.floor(o.sight));
      const cx = Math.round(o.x);
      const cy = Math.round(o.y);
      for (let y = Math.max(0, cy - r); y <= Math.min(this.size - 1, cy + r); y++) {
        for (let x = Math.max(0, cx - r); x <= Math.min(this.size - 1, cx + r); x++) {
          const d = Math.hypot(x - cx, y - cy);
          if (d > o.sight) continue;
          // Floresta densa bloqueia visão além de 2 tiles (furtividade THR v0).
          if (blocked && d > 2 && blocked[y * this.size + x] === 2) continue;
          seen[y * this.size + x] = 1;
          explored[y * this.size + x] = 1;
        }
      }
    }
  }

  isSeen(player: number, x: number, y: number): boolean {
    const tx = Math.round(x);
    const ty = Math.round(y);
    if (tx < 0 || ty < 0 || tx >= this.size || ty >= this.size) return false;
    return this.seen[player][ty * this.size + tx] === 1;
  }

  isExplored(player: number, x: number, y: number): boolean {
    const tx = Math.round(x);
    const ty = Math.round(y);
    if (tx < 0 || ty < 0 || tx >= this.size || ty >= this.size) return false;
    return this.explored[player][ty * this.size + tx] === 1;
  }
}
