import { describe, expect, it } from 'vitest';
import {
  TOWER_DEFS,
  damageArrowCount,
  towerTick,
  wallTiles,
  type Tower,
  type Wall,
} from '../src/sim/defenses';

function wall(x1: number, y1: number, x2: number, y2: number): Wall {
  return { id: 1, player: 0, kind: 'palisade', x1, y1, x2, y2, hp: 500, maxHp: 500, gate: false };
}

function tower(kind: 'outpost' | 'tower' | 'keep', x = 0, y = 0): Tower {
  return { id: 100, player: 0, kind, x, y, hp: 1000, maxHp: 1000, garrison: [], cdLeft: 0 };
}

describe('wallTiles', () => {
  it('cobre linha horizontal com extremos inclusos', () => {
    expect(wallTiles(wall(2, 5, 5, 5))).toEqual([
      { x: 2, y: 5 },
      { x: 3, y: 5 },
      { x: 4, y: 5 },
      { x: 5, y: 5 },
    ]);
  });

  it('cobre linha vertical e no sentido inverso', () => {
    expect(wallTiles(wall(1, 4, 1, 2))).toEqual([
      { x: 1, y: 4 },
      { x: 1, y: 3 },
      { x: 1, y: 2 },
    ]);
  });

  it('cobre diagonal exata', () => {
    expect(wallTiles(wall(0, 0, 3, 3))).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 2 },
      { x: 3, y: 3 },
    ]);
  });

  it('ponto único gera um tile', () => {
    expect(wallTiles(wall(7, 7, 7, 7))).toEqual([{ x: 7, y: 7 }]);
  });

  it('linha genérica é 8-conectada: cada passo move no máximo 1 tile em cada eixo', () => {
    const tiles = wallTiles(wall(0, 0, 4, 2));
    expect(tiles[0]).toEqual({ x: 0, y: 0 });
    expect(tiles[tiles.length - 1]).toEqual({ x: 4, y: 2 });
    expect(tiles).toHaveLength(5);
    for (let i = 1; i < tiles.length; i++) {
      const step = Math.max(Math.abs(tiles[i].x - tiles[i - 1].x), Math.abs(tiles[i].y - tiles[i - 1].y));
      expect(step).toBe(1);
    }
  });
});

describe('towerTick', () => {
  it('escolhe o inimigo mais próximo em alcance', () => {
    const t = tower('outpost', 0, 0);
    const enemies = [
      { id: 5, x: 6, y: 0, hp: 10 },
      { id: 9, x: 2, y: 0, hp: 10 },
      { id: 3, x: 0, y: 7, hp: 10 },
    ];
    expect(towerTick(t, enemies, 0.1)).toBe(9);
  });

  it('ignora inimigos fora de alcance e os já mortos', () => {
    const t = tower('outpost', 0, 0); // range 8
    const enemies = [
      { id: 1, x: 9, y: 0, hp: 10 }, // fora de alcance
      { id: 2, x: 1, y: 0, hp: 0 }, // morto
      { id: 3, x: 0, y: 5, hp: 10 }, // em alcance
    ];
    expect(towerTick(t, enemies, 0.1)).toBe(3);
  });

  it('respeita o cooldown após disparar', () => {
    const t = tower('outpost', 0, 0); // cooldown 2
    const enemies = [{ id: 4, x: 1, y: 0, hp: 10 }];
    expect(towerTick(t, enemies, 0.1)).toBe(4);
    expect(t.cdLeft).toBe(TOWER_DEFS.outpost.cooldown);
    expect(towerTick(t, enemies, 1)).toBeNull(); // cdLeft 2 -> 1: ainda recarregando
    expect(t.cdLeft).toBeCloseTo(1);
    expect(towerTick(t, enemies, 0.5)).toBeNull(); // cdLeft 1 -> 0.5
    expect(towerTick(t, enemies, 0.5)).toBe(4); // cdLeft chega a 0: dispara no mesmo tick
    expect(t.cdLeft).toBe(TOWER_DEFS.outpost.cooldown);
  });

  it('retorna null com lista vazia e mantém a torre pronta', () => {
    const t = tower('tower', 0, 0);
    expect(towerTick(t, [], 0.5)).toBeNull();
    expect(t.cdLeft).toBe(0);
  });

  it('retorna null quando nenhum inimigo está em alcance', () => {
    const t = tower('keep', 0, 0); // range 10
    expect(towerTick(t, [{ id: 1, x: 50, y: 50, hp: 10 }], 0.1)).toBeNull();
    expect(t.cdLeft).toBe(0);
  });

  it('empate de distância resolve pelo menor id, independente da ordem da lista', () => {
    const a = [
      { id: 8, x: 3, y: 0, hp: 10 },
      { id: 2, x: 0, y: 3, hp: 10 },
    ];
    const b = [...a].reverse();
    expect(towerTick(tower('tower', 0, 0), a, 0.1)).toBe(2);
    expect(towerTick(tower('tower', 0, 0), b, 0.1)).toBe(2);
  });

  it('é determinística: mesma entrada, mesma saída', () => {
    const enemies = [
      { id: 7, x: 4, y: 4, hp: 10 },
      { id: 6, x: -3, y: 1, hp: 10 },
    ];
    const r1 = towerTick(tower('tower', 0, 0), enemies, 0.1);
    const r2 = towerTick(tower('tower', 0, 0), enemies, 0.1);
    expect(r1).toBe(r2);
  });
});

describe('damageArrowCount', () => {
  it('1 flecha base mais 1 por unidade guarnecida', () => {
    const t = tower('keep');
    expect(damageArrowCount(t)).toBe(1);
    t.garrison = [11, 12, 13];
    expect(damageArrowCount(t)).toBe(4);
  });
});
