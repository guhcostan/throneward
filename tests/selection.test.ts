import { describe, expect, it } from 'vitest';
import {
  ControlGroups,
  type SelUnit,
  boxSelect,
  clickSelect,
  doubleClickSelect,
  isMilitary,
  shiftQueue,
} from '../src/sim/selection';

const units: SelUnit[] = [
  { id: 1, player: 0, type: 'lanceiro', x: 10, y: 10 },
  { id: 2, player: 0, type: 'aldeao', x: 10.5, y: 10 },
  { id: 3, player: 1, type: 'lanceiro', x: 10.1, y: 10.1 }, // enemy, closest
  { id: 4, player: 0, type: 'arqueiro', x: 20, y: 20 },
  { id: 5, player: 0, type: 'lanceiro', x: 30, y: 30 },
  { id: 6, player: 0, type: 'aldeao', x: 21, y: 19 },
];

describe('clickSelect', () => {
  it('picks the closest own unit and ignores enemies', () => {
    expect(clickSelect(units, 0, 10.1, 10.1)).toEqual([1]);
  });

  it('returns [] when nothing is within radius', () => {
    expect(clickSelect(units, 0, 50, 50)).toEqual([]);
  });

  it('returns [] when only an enemy is in range', () => {
    const enemyOnly: SelUnit[] = [{ id: 9, player: 1, type: 'lanceiro', x: 0, y: 0 }];
    expect(clickSelect(enemyOnly, 0, 0, 0)).toEqual([]);
  });
});

describe('boxSelect', () => {
  it('normalizes reversed corners', () => {
    expect(boxSelect(units, 0, 25, 25, 15, 15)).toEqual([4, 6]);
    expect(boxSelect(units, 0, 15, 15, 25, 25)).toEqual([4, 6]);
  });

  it('excludes enemy units', () => {
    expect(boxSelect(units, 0, 0, 0, 12, 12)).toEqual([1, 2]);
  });

  it('filters to military only when requested', () => {
    expect(boxSelect(units, 0, 0, 0, 40, 40, true)).toEqual([1, 4, 5]);
  });

  it('isMilitary classifies unit types', () => {
    expect(isMilitary('cerco')).toBe(true);
    expect(isMilitary('monge')).toBe(false);
    expect(isMilitary('mercador')).toBe(false);
    expect(isMilitary('batedor')).toBe(false);
  });
});

describe('doubleClickSelect', () => {
  it('selects only the same type within the screen radius', () => {
    expect(doubleClickSelect(units, 0, 'aldeao', 10, 10)).toEqual([2]);
    expect(doubleClickSelect(units, 0, 'aldeao', 20, 20)).toEqual([6]);
  });

  it('never includes enemy units of the same type', () => {
    expect(doubleClickSelect(units, 0, 'lanceiro', 10, 10)).toEqual([1]); // enemy 3 is nearer but excluded
    expect(doubleClickSelect(units, 0, 'lanceiro', 30, 30)).toEqual([5]);
  });
});

describe('ControlGroups', () => {
  it('set/get/add are isolated per group index', () => {
    const cg = new ControlGroups();
    cg.set(1, [1, 2]);
    cg.add(1, [3, 2]);
    cg.set(2, [9]);
    expect(cg.get(1)).toEqual([1, 2, 3]);
    expect(cg.get(2)).toEqual([9]);
    expect(cg.get(0)).toEqual([]);
    expect(cg.get(9)).toEqual([]);
  });

  it('returns defensive copies', () => {
    const cg = new ControlGroups();
    const ids = [1, 2];
    cg.set(3, ids);
    ids.push(99);
    const out = cg.get(3);
    out.push(100);
    expect(cg.get(3)).toEqual([1, 2]);
  });

  it('rejects out-of-range groups', () => {
    const cg = new ControlGroups();
    expect(() => cg.set(10, [1])).toThrow(RangeError);
    expect(() => cg.get(-1)).toThrow(RangeError);
  });
});

describe('shiftQueue', () => {
  const existing = [{ x: 1, y: 1 }];
  it('appends with shift', () => {
    expect(shiftQueue(existing, { x: 2, y: 2 }, true)).toEqual([
      { x: 1, y: 1 },
      { x: 2, y: 2 },
    ]);
  });

  it('replaces without shift', () => {
    expect(shiftQueue(existing, { x: 2, y: 2 }, false)).toEqual([{ x: 2, y: 2 }]);
  });

  it('does not mutate the existing queue', () => {
    shiftQueue(existing, { x: 2, y: 2 }, true);
    expect(existing).toEqual([{ x: 1, y: 1 }]);
  });
});
