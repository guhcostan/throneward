import { describe, expect, it } from 'vitest';
import {
  CAPTURE_TIME,
  SACRED_COUNT,
  SacredState,
  VICTORY_HOLD,
  resetProgress,
  sacredTick,
  type SacredUnit,
} from '../src/sim/sacred';

const monk = (player: number): SacredUnit => ({ player, religious: true });
const soldier = (player: number): SacredUnit => ({ player, religious: false });
type Presence = Map<number, SacredUnit[]>;

function stateWithSites(n = SACRED_COUNT): SacredState {
  const s = new SacredState();
  for (let i = 1; i <= n; i++) s.add(i, i * 10, i * 10);
  return s;
}

function run(s: SacredState, seconds: number, presence: Presence): void {
  for (let i = 0; i < seconds; i++) sacredTick(s, 1, presence);
}

function captureAll(s: SacredState, player: number): void {
  const presence: Presence = new Map();
  for (const id of s.sites.keys()) presence.set(id, [monk(player)]);
  run(s, CAPTURE_TIME, presence);
}

describe('captura de sagrado', () => {
  it('um monge captura o site em CAPTURE_TIME segundos', () => {
    const s = stateWithSites(1);
    const presence: Presence = new Map([[1, [monk(1)]]]);
    run(s, CAPTURE_TIME - 1, presence);
    expect(s.sites.get(1)?.owner).toBeNull();
    run(s, 1, presence);
    expect(s.sites.get(1)?.owner).toBe(1);
    expect(s.sites.get(1)?.progress).toBe(0);
  });

  it('sem monge religioso não há captura, mesmo com soldados', () => {
    const s = stateWithSites(1);
    run(s, CAPTURE_TIME * 2, new Map([[1, [soldier(1)]]]));
    expect(s.sites.get(1)?.owner).toBeNull();
    expect(s.sites.get(1)?.progress).toBe(0);
  });

  it('inimigo presente no local pausa a captura e preserva o progresso', () => {
    const s = stateWithSites(1);
    run(s, 60, new Map([[1, [monk(1)]]]));
    expect(s.sites.get(1)?.progress).toBeCloseTo(0.5);

    run(s, 300, new Map([[1, [monk(1), soldier(2)]]]));
    expect(s.sites.get(1)?.progress).toBeCloseTo(0.5);
    expect(s.sites.get(1)?.owner).toBeNull();

    run(s, 60, new Map([[1, [monk(1)]]]));
    expect(s.sites.get(1)?.owner).toBe(1);
  });

  it('troca de capturador recomeça o progresso do zero', () => {
    const s = stateWithSites(1);
    run(s, 60, new Map([[1, [monk(1)]]]));
    run(s, 10, new Map([[1, [monk(2)]]]));
    expect(s.sites.get(1)?.progress).toBeCloseTo(10 / CAPTURE_TIME);
    expect(s.capturers.get(1)).toBe(2);
  });

  it('resetProgress zera progresso e capturador', () => {
    const s = stateWithSites(1);
    run(s, 30, new Map([[1, [monk(1)]]]));
    resetProgress(s, 1);
    expect(s.sites.get(1)?.progress).toBe(0);
    expect(s.capturers.has(1)).toBe(false);
  });
});

describe('vitória por sagrados', () => {
  it('um player com os 3 sagrados vence quando o timer atinge VICTORY_HOLD', () => {
    const s = stateWithSites();
    captureAll(s, 1);
    for (const site of s.sites.values()) expect(site.owner).toBe(1);
    // O timer começa no tick em que o último sagrado é capturado (dt=1 já contado).
    expect(s.timer).toBe(1);
    expect(s.winner).toBeNull();

    run(s, VICTORY_HOLD - 2, new Map());
    expect(s.timer).toBe(VICTORY_HOLD - 1);
    expect(s.winner).toBeNull();
    run(s, 1, new Map());
    expect(s.timer).toBe(VICTORY_HOLD);
    expect(s.winner).toBe(1);
  });

  it('perder um site faz o timer decair e não há vencedor', () => {
    const s = stateWithSites();
    captureAll(s, 1);
    run(s, 100, new Map());
    // Player 2 captura o site 2 com monge: a posse de player 1 é quebrada ao completar.
    run(s, CAPTURE_TIME, new Map([[2, [monk(2)]]]));
    expect(s.sites.get(2)?.owner).toBe(2);
    const t0 = s.timer;
    run(s, 10, new Map());
    expect(s.timer).toBeCloseTo(Math.max(0, t0 - 10));
    expect(s.timer).toBeLessThan(t0);
    expect(s.winner).toBeNull();
  });

  it('timer decai sem ir abaixo de zero', () => {
    const s = stateWithSites();
    captureAll(s, 1);
    s.timer = 3;
    s.sites.get(2)!.owner = 2; // perda de posse sem captura (estado direto)
    sacredTick(s, 500, new Map());
    expect(s.timer).toBe(0);
    expect(s.winner).toBeNull();
  });
});
