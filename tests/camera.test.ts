import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PITCH,
  attachCamera,
  cameraPos,
  clampToBounds,
  createCamera,
  pan,
  pixelsToWorld,
  rotate,
  zoom,
} from '../src/render/camera';

type Listener = (ev: unknown) => void;

/** Stub mínimo de HTMLElement/EventTarget com addEventListener fake. */
function fakeEl(): {
  el: HTMLElement;
  fire: (type: string, ev: Record<string, unknown>) => void;
  count: (type: string) => number;
} {
  const map = new Map<string, Set<Listener>>();
  const el = {
    addEventListener(type: string, fn: Listener): void {
      const set = map.get(type) ?? new Set<Listener>();
      set.add(fn);
      map.set(type, set);
    },
    removeEventListener(type: string, fn: Listener): void {
      map.get(type)?.delete(fn);
    },
  };
  return {
    el: el as unknown as HTMLElement,
    fire: (type, ev): void => {
      for (const fn of map.get(type) ?? []) fn({ preventDefault(): void {}, ...ev });
    },
    count: (type): number => map.get(type)?.size ?? 0,
  };
}

describe('camera state', () => {
  it('createCamera has the documented defaults', () => {
    const s = createCamera();
    expect(s).toEqual({ tx: 0, tz: 0, dist: 35, yaw: Math.PI / 4, pitch: DEFAULT_PITCH });
  });

  it('zoom clamps dist to 10..80', () => {
    const s = createCamera();
    zoom(s, 1000);
    expect(s.dist).toBe(80);
    zoom(s, -1000);
    expect(s.dist).toBe(10);
    zoom(s, 5);
    expect(s.dist).toBe(15);
  });

  it('pan moves tx/tz by the given world delta', () => {
    const s = createCamera();
    pan(s, 3, -2);
    expect(s.tx).toBe(3);
    expect(s.tz).toBe(-2);
  });

  it('pixel pan speed scales with dist', () => {
    const near = createCamera();
    near.dist = 20;
    const far = createCamera();
    far.dist = 40;
    const a = pixelsToWorld(near, 100, 0);
    const b = pixelsToWorld(far, 100, 0);
    expect(Math.hypot(b.dx, b.dz)).toBeCloseTo(2 * Math.hypot(a.dx, a.dz), 10);
    expect(Math.hypot(a.dx, a.dz)).toBeCloseTo(100 * 20 * 0.0016, 10);
  });

  it('rotate accumulates yaw', () => {
    const s = createCamera();
    rotate(s, 0.5);
    rotate(s, 0.25);
    expect(s.yaw).toBeCloseTo(Math.PI / 4 + 0.75, 10);
  });

  it('clampToBounds keeps the target inside the map', () => {
    const s = createCamera();
    s.tx = 500;
    s.tz = -500;
    clampToBounds(s, 50);
    expect(s.tx).toBe(50);
    expect(s.tz).toBe(-50);
    s.tx = 10;
    clampToBounds(s, 50);
    expect(s.tx).toBe(10);
  });

  it('cameraPos orbits around (tx,0,tz) with positive height', () => {
    const s = createCamera();
    s.tx = 4;
    s.tz = -7;
    const p = cameraPos(s);
    expect(p.y).toBeGreaterThan(0);
    expect(p.y).toBeCloseTo(s.dist * Math.sin(s.pitch), 10);
    // distância 3D até o alvo == dist
    const d = Math.hypot(p.x - s.tx, p.y, p.z - s.tz);
    expect(d).toBeCloseTo(s.dist, 10);
    // deslocamento horizontal câmera->alvo tem módulo dist*cos(pitch)
    expect(Math.hypot(p.x - s.tx, p.z - s.tz)).toBeCloseTo(s.dist * Math.cos(s.pitch), 10);
  });
});

describe('camera convention and bounds (extra)', () => {
  it('createCamera pitch is ~0.96 rad (~55 deg)', () => {
    const s = createCamera();
    expect(s.pitch).toBeCloseTo(0.96, 2);
  });

  it('pan accumulates exact deltas and clampToBounds clamps negatives', () => {
    const s = createCamera();
    pan(s, 10, 0);
    pan(s, 5, -3);
    expect(s.tx).toBe(15);
    expect(s.tz).toBe(-3);
    s.tx = -999;
    s.tz = -999;
    clampToBounds(s, 50);
    expect(s.tx).toBe(-50);
    expect(s.tz).toBe(-50);
  });

  it('cameraPos with yaw=0 sits on +Z of the target (per header convention)', () => {
    const s = createCamera();
    s.yaw = 0;
    s.tx = 0;
    s.tz = 0;
    const p = cameraPos(s);
    expect(p.x).toBeCloseTo(0, 10);
    expect(p.z).toBeGreaterThan(s.tz);
    expect(p.z).toBeCloseTo(s.dist * Math.cos(s.pitch), 10);
  });

  it('cameraPos with yaw=PI/2 sits on +X of the target', () => {
    const s = createCamera();
    s.yaw = Math.PI / 2;
    s.tx = 4;
    s.tz = -7;
    const p = cameraPos(s);
    expect(p.x).toBeGreaterThan(s.tx);
    expect(p.z).toBeCloseTo(s.tz, 10);
  });

  it('rotate wraps yaw into [-PI, PI)', () => {
    const s = createCamera();
    rotate(s, 10 * Math.PI);
    expect(s.yaw).toBeGreaterThanOrEqual(-Math.PI);
    expect(s.yaw).toBeLessThan(Math.PI);
    expect(s.yaw).toBeCloseTo(Math.PI / 4, 10);
  });
});

describe('attachCamera', () => {
  it('mousemove pans by the pixel delta and calls render', () => {
    const f = fakeEl();
    const s = createCamera();
    let renders = 0;
    attachCamera(f.el, () => s, () => renders++);
    f.fire('mousedown', { button: 0, clientX: 100, clientY: 100 });
    const expected = pixelsToWorld(createCamera(), 10, 5);
    f.fire('mousemove', { clientX: 110, clientY: 105 });
    expect(s.tx).toBeCloseTo(expected.dx, 10);
    expect(s.tz).toBeCloseTo(expected.dz, 10);
    expect(renders).toBe(1);
  });

  it('mouseup stops panning', () => {
    const f = fakeEl();
    const s = createCamera();
    attachCamera(f.el, () => s, () => {});
    f.fire('mousedown', { button: 0, clientX: 0, clientY: 0 });
    f.fire('mouseup', {});
    f.fire('mousemove', { clientX: 50, clientY: 50 });
    expect(s.tx).toBe(0);
    expect(s.tz).toBe(0);
  });

  it('pan through attachCamera is clamped to half-size bounds', () => {
    const f = fakeEl();
    const s = createCamera();
    attachCamera(f.el, () => s, () => {}, { half: 5 });
    f.fire('mousedown', { button: 0, clientX: 0, clientY: 0 });
    f.fire('mousemove', { clientX: -100000, clientY: 0 });
    expect(Math.abs(s.tx)).toBeLessThanOrEqual(5);
    expect(Math.abs(s.tz)).toBeLessThanOrEqual(5);
  });

  it('wheel zooms and calls render', () => {
    const f = fakeEl();
    const s = createCamera();
    let renders = 0;
    attachCamera(f.el, () => s, () => renders++);
    f.fire('wheel', { deltaY: -100 });
    expect(s.dist).toBeCloseTo(35 - 100 * 0.02, 10);
    expect(renders).toBe(1);
  });

  it('keyboard arrow pans and calls render', () => {
    const f = fakeEl();
    const s = createCamera();
    let renders = 0;
    attachCamera(f.el, () => s, () => renders++);
    f.fire('keydown', { key: 'ArrowUp' });
    expect(s.tx !== 0 || s.tz !== 0).toBe(true);
    expect(renders).toBe(1);
  });

  it('detach removes all listeners and does not throw', () => {
    const f = fakeEl();
    const s = createCamera();
    let renders = 0;
    const detach = attachCamera(f.el, () => s, () => renders++);
    expect(() => detach()).not.toThrow();
    expect(f.count('mousedown')).toBe(0);
    expect(f.count('mousemove')).toBe(0);
    expect(f.count('mouseup')).toBe(0);
    expect(f.count('wheel')).toBe(0);
    expect(f.count('contextmenu')).toBe(0);
    expect(f.count('keydown')).toBe(0);
    f.fire('wheel', { deltaY: 100 });
    expect(renders).toBe(0);
  });

  it('left-drag pans and calls render; detach removes listeners', () => {
    const f = fakeEl();
    const s = createCamera();
    let renders = 0;
    const detach = attachCamera(f.el, () => s, () => renders++);
    f.fire('mousedown', { button: 0, clientX: 100, clientY: 100 });
    f.fire('mousemove', { clientX: 110, clientY: 100 });
    expect(s.tx !== 0 || s.tz !== 0).toBe(true);
    expect(renders).toBe(1);
    detach();
    expect(f.count('mousedown')).toBe(0);
    expect(f.count('wheel')).toBe(0);
  });

  it('wheel zooms with clamp', () => {
    const f = fakeEl();
    const s = createCamera();
    attachCamera(f.el, () => s, () => {});
    f.fire('wheel', { deltaY: 100000 });
    expect(s.dist).toBe(80);
  });

  it('right-drag rotates yaw', () => {
    const f = fakeEl();
    const s = createCamera();
    const y0 = s.yaw;
    attachCamera(f.el, () => s, () => {});
    f.fire('mousedown', { button: 2, clientX: 0, clientY: 0 });
    f.fire('mousemove', { clientX: 100, clientY: 0 });
    expect(s.yaw).toBeCloseTo(y0 + 0.5, 10);
  });
});
