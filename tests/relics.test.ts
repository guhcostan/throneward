import { describe, expect, it } from 'vitest';
import {
  RelicState,
  drop,
  garrison,
  pickup,
  relicTick,
} from '../src/sim/relics';

const OK = ['monastery', 'landmark-x'];

describe('relics', () => {
  it('only monks can pick up a relic', () => {
    const s = new RelicState();
    s.add(1, 0, 0);
    expect(pickup(s, 1, 10, 'scout')).toBe(false);
    expect(pickup(s, 1, 10, 'villager')).toBe(false);
    expect(s.relics.get(1)?.carrier).toBe(null);
    expect(pickup(s, 1, 10, 'monk')).toBe(true);
    expect(s.relics.get(1)?.carrier).toBe(10);
  });

  it('carrying blocks a second pickup', () => {
    const s = new RelicState();
    s.add(1, 0, 0);
    expect(pickup(s, 1, 10, 'monk')).toBe(true);
    expect(pickup(s, 1, 11, 'monk')).toBe(false);
    expect(s.relics.get(1)?.carrier).toBe(10);
  });

  it('pickup of unknown relic fails', () => {
    const s = new RelicState();
    expect(pickup(s, 99, 10, 'monk')).toBe(false);
  });

  it('garrison only accepts okKinds and needs a carried relic', () => {
    const s = new RelicState();
    s.add(1, 0, 0);
    pickup(s, 1, 10, 'monk');
    expect(garrison(s, 1, 50, 'house', OK)).toBe(false);
    expect(garrison(s, 1, 50, 'monastery', OK)).toBe(true);
    expect(s.relics.get(1)).toMatchObject({ carrier: null, garrisoned: 50 });
  });

  it('garrisoned relic cannot be picked up or garrisoned again', () => {
    const s = new RelicState();
    s.add(1, 0, 0);
    pickup(s, 1, 10, 'monk');
    garrison(s, 1, 50, 'monastery', OK);
    expect(pickup(s, 1, 11, 'monk')).toBe(false);
    expect(garrison(s, 1, 51, 'monastery', OK)).toBe(false);
  });

  it('drop frees the relic and sets position', () => {
    const s = new RelicState();
    s.add(1, 0, 0);
    expect(drop(s, 1, 5, 5)).toBe(false); // free on ground: nothing to drop
    pickup(s, 1, 10, 'monk');
    expect(drop(s, 1, 3, 4)).toBe(true);
    expect(s.relics.get(1)).toMatchObject({ x: 3, y: 4, carrier: null, garrisoned: null });
    expect(pickup(s, 1, 11, 'monk')).toBe(true);
  });

  it('drop frees a garrisoned relic', () => {
    const s = new RelicState();
    s.add(1, 0, 0);
    pickup(s, 1, 10, 'monk');
    garrison(s, 1, 50, 'monastery', OK);
    expect(drop(s, 1, 7, 8)).toBe(true);
    expect(s.relics.get(1)).toMatchObject({ carrier: null, garrisoned: null, x: 7, y: 8 });
  });

  it('tick: 2 garrisoned relics x 10s x 0.5 = 10 gold', () => {
    const s = new RelicState();
    s.add(1, 0, 0);
    s.add(2, 0, 0);
    s.add(3, 0, 0); // ground relic: produces nothing
    pickup(s, 1, 10, 'monk');
    garrison(s, 1, 50, 'monastery', OK);
    pickup(s, 2, 11, 'monk');
    garrison(s, 2, 50, 'monastery', OK);
    let gold = 0;
    for (let i = 0; i < 100; i++) gold += relicTick(s, 0.1).gold;
    expect(gold).toBeCloseTo(10, 9);
  });

  it('tick with custom rate and no garrisoned relics', () => {
    const s = new RelicState();
    s.add(1, 0, 0);
    expect(relicTick(s, 10).gold).toBe(0);
    pickup(s, 1, 10, 'monk');
    garrison(s, 1, 50, 'monastery', OK);
    expect(relicTick(s, 10, 2).gold).toBe(20);
  });
});
