// Pure RTS camera math (AoE-like pitch) + DOM attachment. No Three import here.

export interface CameraState {
  tx: number;
  tz: number;
  dist: number;
  yaw: number;
  pitch: number; // radians, ~55°
}

export function createCamera(): CameraState {
  return { tx: 0, tz: 0, dist: 35, yaw: Math.PI / 4, pitch: 0.96 };
}

export function pan(s: CameraState, dx: number, dz: number): void {
  s.tx += dx;
  s.tz += dz;
}

export function zoom(s: CameraState, delta: number): void {
  s.dist = Math.min(80, Math.max(10, s.dist + delta));
}

export function rotate(s: CameraState, dYaw: number): void {
  s.yaw += dYaw;
}

export function clampToBounds(s: CameraState, half: number): void {
  s.tx = Math.min(half, Math.max(-half, s.tx));
  s.tz = Math.min(half, Math.max(-half, s.tz));
}

// Convention: camera orbits target (tx,0,tz) at yaw/dist/pitch.
// x = tx + dist*cos(yaw)*cos(pitch), y = dist*sin(pitch), z = tz + dist*sin(yaw)*cos(pitch).
export function cameraPos(s: CameraState): { x: number; y: number; z: number } {
  const cp = Math.cos(s.pitch);
  return {
    x: s.tx + s.dist * Math.cos(s.yaw) * cp,
    y: s.dist * Math.sin(s.pitch),
    z: s.tz + s.dist * Math.sin(s.yaw) * cp
  };
}

export function attachCamera(
  el: {
    addEventListener: (t: string, fn: (e: { button?: number; movementX?: number; movementY?: number; deltaY?: number; preventDefault?: () => void }) => void, o?: unknown) => void;
    removeEventListener?: (t: string, fn: (e: never) => void) => void;
  },
  get: () => CameraState,
  render: () => void
): () => void {
  const handlers: { t: string; fn: (e: never) => void }[] = [];
  const on = (t: string, fn: (e: never) => void): void => {
    el.addEventListener(t, fn as (e: { button?: number }) => void);
    handlers.push({ t, fn });
  };
  let dragging = false;
  let button = 0;

  on('mousedown', ((e: { button?: number }) => {
    dragging = true;
    button = e.button ?? 0;
  }) as (e: never) => void);
  on('mouseup', (() => { dragging = false; }) as (e: never) => void);
  on('mousemove', ((e: { movementX?: number; movementY?: number }) => {
    if (!dragging) return;
    const s = get();
    const k = s.dist * 0.0016;
    if (button === 2) {
      rotate(s, (e.movementX ?? 0) * 0.005);
    } else {
      const mx = (e.movementX ?? 0) * k;
      const mz = (e.movementY ?? 0) * k;
      const c = Math.cos(s.yaw);
      const sn = Math.sin(s.yaw);
      pan(s, -mx * c - mz * sn, -mz * c + mx * sn);
    }
    render();
  }) as (e: never) => void);
  on('wheel', ((e: { deltaY?: number; preventDefault?: () => void }) => {
    const s = get();
    zoom(s, (e.deltaY ?? 0) * 0.02);
    e.preventDefault?.();
    render();
  }) as (e: never) => void);

  return () => {
    if (el.removeEventListener) for (const h of handlers) el.removeEventListener(h.t, h.fn);
  };
}
