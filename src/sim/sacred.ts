// Locais sagrados e contagem de vitória (SPEC §6 e §8 — tudo VERIFICAR).
// Puro e determinístico: sem I/O, sem aleatoriedade, avança por dt fixo do chamador.

/** Quantidade de locais sagrados por partida. [VERIFICAR] */
export const SACRED_COUNT = 3;
/** Segundos de captura com monge presente e sem inimigo no local. [VERIFICAR] */
export const CAPTURE_TIME = 120;
/** Segundos que um player precisa deter todos os sagrados para vencer. [VERIFICAR] */
export const VICTORY_HOLD = 600;

/** Tolerância para somas de ponto flutuante (dt/CAPTURE_TIME acumulado). */
const EPS = 1e-9;

export interface SacredSite {
  id: number;
  x: number;
  y: number;
  owner: number | null;
  /** Progresso de captura em 0..1 do player que está capturando. */
  progress: number;
}

export interface SacredUnit {
  player: number;
  religious: boolean;
}

export class SacredState {
  readonly sites = new Map<number, SacredSite>();
  timer = 0;
  winner: number | null = null;
  /** Player que está progredindo a captura de cada site (siteId → player). */
  readonly capturers = new Map<number, number>();

  add(id: number, x: number, y: number): void {
    if (this.sites.has(id)) throw new Error(`sacred site ${id} já existe`);
    if (this.sites.size >= SACRED_COUNT) throw new Error(`máximo de ${SACRED_COUNT} sagrados`);
    this.sites.set(id, { id, x, y, owner: null, progress: 0 });
  }
}

/** Zera o progresso e o capturador do site (ex.: troca de capturador). */
export function resetProgress(s: SacredState, siteId: number): void {
  const site = s.sites.get(siteId);
  if (!site) throw new Error(`sacred site ${siteId} não existe`);
  site.progress = 0;
  s.capturers.delete(siteId);
}

/**
 * Avança a captura de cada site e a contagem de vitória.
 * presence: siteId → unidades presentes no local.
 */
export function sacredTick(
  s: SacredState,
  dt: number,
  presence: Map<number, SacredUnit[]>,
): void {
  if (dt < 0) throw new Error('dt negativo');

  for (const site of s.sites.values()) {
    const units = presence.get(site.id) ?? [];
    const capturer = pickCapturer(site.owner, units);
    if (capturer === null) continue; // sem monge elegível: progresso preservado

    // Disputa: qualquer unidade de outro player no local pausa a captura.
    if (units.some((u) => u.player !== capturer)) continue;

    const current = s.capturers.get(site.id);
    if (current !== undefined && current !== capturer) {
      // Outro player assumiu a captura: recomeça do zero.
      resetProgress(s, site.id);
    }
    s.capturers.set(site.id, capturer);
    site.progress = Math.min(1, site.progress + dt / CAPTURE_TIME);

    if (site.progress >= 1 - EPS) {
      site.owner = capturer;
      resetProgress(s, site.id);
    }
  }

  updateVictory(s, dt);
}

/** Primeiro (ordem de presença) monge religioso que não seja o dono atual. */
function pickCapturer(owner: number | null, units: SacredUnit[]): number | null {
  for (const u of units) {
    if (u.religious && u.player !== owner) return u.player;
  }
  return null;
}

function updateVictory(s: SacredState, dt: number): void {
  const holder = commonHolder(s);
  if (holder !== null) {
    s.timer += dt;
    if (s.timer >= VICTORY_HOLD - EPS && s.winner === null) s.winner = holder;
  } else {
    s.timer = Math.max(0, s.timer - dt);
  }
}

/** Player que detém todos os SACRED_COUNT sites, ou null. */
function commonHolder(s: SacredState): number | null {
  if (s.sites.size < SACRED_COUNT) return null;
  let holder: number | null = null;
  for (const site of s.sites.values()) {
    if (site.owner === null) return null;
    if (holder === null) holder = site.owner;
    else if (site.owner !== holder) return null;
  }
  return holder;
}
