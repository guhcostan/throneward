import { describe, expect, it } from 'vitest';
import {
  TRADER_SPEED,
  WONDER_HOLD,
  checkVictory,
  goldFor,
  traderTick,
  tripTime,
  type Trader,
  type VictorySnapshot,
} from '../src/sim/trade';

function trader(distance: number): Trader {
  return { id: 1, player: 0, fromMarket: 1, toMarket: 2, progress: 0, tripTime: tripTime(distance) };
}

function snap(over: Partial<VictorySnapshot> = {}): VictorySnapshot {
  return {
    players: [0, 1],
    landmarksAlive: new Map([
      [0, true],
      [1, true],
    ]),
    sacredWinner: null,
    wonder: new Map(),
    ...over,
  };
}

describe('comércio', () => {
  it('tripTime = distância / velocidade', () => {
    expect(tripTime(12)).toBeCloseTo(12 / TRADER_SPEED);
  });

  it('viagem completa exatamente no tempo previsto, depois reinicia', () => {
    const t = trader(12); // 10 s
    let completedAt = -1;
    for (let i = 1; i <= 40; i++) {
      if (traderTick(t, 0.5)) {
        completedAt = i * 0.5;
        break;
      }
    }
    expect(completedAt).toBeCloseTo(tripTime(12), 5);
    expect(t.progress).toBe(0);
  });

  it('não completa antes do tempo', () => {
    const t = trader(12);
    expect(traderTick(t, tripTime(12) - 0.5)).toBe(false);
  });

  it('ouro proporcional à distância (longe > perto)', () => {
    expect(goldFor(40)).toBeGreaterThan(goldFor(10));
    expect(goldFor(10)).toBe(Math.round(10 * 0.15 * 10));
    expect(goldFor(40)).toBe(Math.round(40 * 0.15 * 10));
  });
});

describe('checkVictory', () => {
  it('vitória por landmarks: inimigos sem landmark vivo', () => {
    const r = checkVictory(snap({ landmarksAlive: new Map([[0, true], [1, false]]) }));
    expect(r).toEqual({ winner: 0, reason: 'landmarks' });
  });

  it('vitória por sagrados', () => {
    expect(checkVictory(snap({ sacredWinner: 1 }))).toEqual({ winner: 1, reason: 'sacred' });
  });

  it('vitória por maravilha com timer >= WONDER_HOLD', () => {
    const r = checkVictory(snap({ wonder: new Map([[0, { built: true, timer: WONDER_HOLD }]]) }));
    expect(r).toEqual({ winner: 0, reason: 'wonder' });
  });

  it('maravilha abaixo do tempo ou não construída não vence', () => {
    expect(checkVictory(snap({ wonder: new Map([[0, { built: true, timer: WONDER_HOLD - 1 }]]) }))).toEqual({
      winner: null,
      reason: null,
    });
    expect(checkVictory(snap({ wonder: new Map([[0, { built: false, timer: WONDER_HOLD }]]) }))).toEqual({
      winner: null,
      reason: null,
    });
  });

  it('sem vencedor → null', () => {
    expect(checkVictory(snap())).toEqual({ winner: null, reason: null });
  });

  it('prioridade: landmarks antes de sagrados e maravilha', () => {
    const r = checkVictory(
      snap({
        landmarksAlive: new Map([[0, true], [1, false]]),
        sacredWinner: 1,
        wonder: new Map([[1, { built: true, timer: WONDER_HOLD }]]),
      }),
    );
    expect(r).toEqual({ winner: 0, reason: 'landmarks' });
  });

  it('empate em landmarks (mais de um candidato) → null', () => {
    const r = checkVictory({
      players: [0, 1],
      landmarksAlive: new Map([
        [0, false],
        [1, false],
      ]),
      sacredWinner: null,
      wonder: new Map(),
    });
    expect(r).toEqual({ winner: null, reason: null });
  });
});
