import { describe, expect, it } from 'vitest';
import { Fog, sightOf } from '../src/sim/fog';

describe('fog', () => {
  it('tile com observador é visto e explorado; longe não', () => {
    const f = new Fog(16, 2);
    f.update(0, [{ x: 0, y: 0, sight: sightOf('villager') }]);
    expect(f.isSeen(0, 0, 0)).toBe(true);
    expect(f.isExplored(0, 0, 0)).toBe(true);
    expect(f.isSeen(0, 15, 15)).toBe(false);
    expect(f.isSeen(1, 0, 0)).toBe(false); // outro jogador não vê
  });

  it('memória persiste após saída; visão acompanha', () => {
    const f = new Fog(16, 1);
    f.update(0, [{ x: 2, y: 2, sight: 6 }]);
    expect(f.isExplored(0, 2, 2)).toBe(true);
    f.update(0, [{ x: 14, y: 14, sight: 6 }]);
    expect(f.isSeen(0, 2, 2)).toBe(false);
    expect(f.isExplored(0, 2, 2)).toBe(true);
  });

  it('batedor enxerga mais longe que aldeão', () => {
    expect(sightOf('scout')).toBeGreaterThan(sightOf('villager'));
  });

  it('determinístico entre execuções', () => {
    const run = (): string => {
      const f = new Fog(32, 2);
      f.update(0, [{ x: 5, y: 5, sight: 8 }]);
      return [...f.seen[0]].join('');
    };
    expect(run()).toBe(run());
  });

  it('furtividade esconde além de 2 tiles', () => {
    const f = new Fog(16, 1);
    const blocked = new Uint8Array(16 * 16);
    blocked[8 * 16 + 8] = 2; // tile furtivo
    // Observador a 5 tiles do alvo, com o tile furtivo no meio: além de 2 não vê.
    f.update(0, [{ x: 3, y: 8, sight: 10 }], blocked);
    expect(f.isSeen(0, 8, 8)).toBe(false);
    // Colado (≤2 tiles) vê normalmente.
    f.update(0, [{ x: 7, y: 8, sight: 10 }], blocked);
    expect(f.isSeen(0, 8, 8)).toBe(true);
  });
});
