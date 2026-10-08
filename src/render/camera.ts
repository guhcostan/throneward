/**
 * Câmera RTS em órbita (Fase 1). Módulo SEM dependência de Three.js:
 * matemática pura + ligação de eventos de DOM. O chamador aplica
 * `cameraPos(s)` / alvo `(tx, 0, tz)` no `THREE.PerspectiveCamera`.
 *
 * Convenção de coordenadas (mundo: plano XZ, Y para cima):
 * - (tx, tz): ponto no chão para onde a câmera olha.
 * - yaw: rotação em torno de Y. yaw = 0 => câmera posicionada em +Z
 *   olhando para -Z. Direção "frente" horizontal da câmera:
 *     f = (-sin(yaw), -cos(yaw))
 *   Direção "direita" horizontal:
 *     r = ( cos(yaw), -sin(yaw))
 * - pitch: elevação acima do plano do chão (rad). pitch = 0.96 rad ≈ 55°
 *   (estilo AoE). Altura = dist*sin(pitch); distância horizontal =
 *   dist*cos(pitch).
 * - dist: distância da câmera ao ponto (tx, 0, tz).
 *
 * Posição da câmera:
 *   x = tx + dist*cos(pitch)*sin(yaw)
 *   y =      dist*sin(pitch)
 *   z = tz + dist*cos(pitch)*cos(yaw)
 *
 * As funções de estado mutam e retornam o mesmo objeto `CameraState`.
 */

export interface CameraState {
  tx: number;
  tz: number;
  dist: number;
  yaw: number;
  pitch: number;
}

export interface CameraPos {
  x: number;
  y: number;
  z: number;
}

export const DIST_MIN = 10;
export const DIST_MAX = 80;
export const DEFAULT_PITCH = 0.96;
export const DEFAULT_HALF_SIZE = 50;
/** Velocidade de pan: unidades de mundo por px = dist * PAN_PER_PX_PER_DIST. */
export const PAN_PER_PX_PER_DIST = 0.0016;
/** Yaw (rad) por px de arrasto com botão direito. */
export const ROTATE_PER_PX = 0.005;
/** Zoom por unidade de deltaY de wheel. */
export const ZOOM_PER_WHEEL = 0.02;
/** Passo de pan por tecla, como fração de dist por segundo. */
export const KEY_PAN_PER_DIST_PER_SEC = 0.8;

const clamp = (v: number, lo: number, hi: number): number =>
  v < lo ? lo : v > hi ? hi : v;

export function createCamera(): CameraState {
  return { tx: 0, tz: 0, dist: 35, yaw: Math.PI / 4, pitch: DEFAULT_PITCH };
}

/**
 * Pan em unidades de mundo (dx em +X, dz em +Z). Não aplica limite de mapa;
 * use `clampToBounds` depois.
 */
export function pan(s: CameraState, dx: number, dz: number): CameraState {
  s.tx += dx;
  s.tz += dz;
  return s;
}

/** Zoom: `delta` positivo afasta a câmera (aumenta dist). Clamp 10..80. */
export function zoom(s: CameraState, delta: number): CameraState {
  s.dist = clamp(s.dist + delta, DIST_MIN, DIST_MAX);
  return s;
}

/** Acumula yaw (rad). Normalizado para [-PI, PI). */
export function rotate(s: CameraState, dYaw: number): CameraState {
  let y = (s.yaw + dYaw) % (Math.PI * 2);
  if (y >= Math.PI) y -= Math.PI * 2;
  if (y < -Math.PI) y += Math.PI * 2;
  s.yaw = y;
  return s;
}

/** Prende (tx, tz) ao retângulo [-half, half] x [-half, half]. */
export function clampToBounds(s: CameraState, half: number): CameraState {
  s.tx = clamp(s.tx, -half, half);
  s.tz = clamp(s.tz, -half, half);
  return s;
}

/**
 * Converte um arrasto em pixels (px = direita+, py = baixo+) em deslocamento
 * de mundo, de modo que o chão "acompanhe" o mouse. A velocidade escala com
 * dist: pan = dist * PAN_PER_PX_PER_DIST por px.
 */
export function pixelsToWorld(
  s: CameraState,
  px: number,
  py: number,
): { dx: number; dz: number } {
  const k = s.dist * PAN_PER_PX_PER_DIST;
  const fx = -Math.sin(s.yaw);
  const fz = -Math.cos(s.yaw);
  const rx = Math.cos(s.yaw);
  const rz = -Math.sin(s.yaw);
  // Arrastar à direita move a câmera para a esquerda (chão acompanha o mouse);
  // arrastar para baixo move a câmera para a frente.
  return {
    dx: (-px * rx + py * fx) * k,
    dz: (-px * rz + py * fz) * k,
  };
}

/** Posição da câmera no mundo segundo a convenção do cabeçalho. */
export function cameraPos(s: CameraState): CameraPos {
  const h = s.dist * Math.cos(s.pitch);
  return {
    x: s.tx + h * Math.sin(s.yaw),
    y: s.dist * Math.sin(s.pitch),
    z: s.tz + h * Math.cos(s.yaw),
  };
}

export interface AttachOptions {
  /** Meia-largura do mapa (clamp de tx/tz). Padrão 50. */
  half?: number;
}

/**
 * Liga eventos de entrada ao estado da câmera. `get` deve retornar o objeto
 * `CameraState` vivo (mutado in place). `render` é chamado após cada mudança.
 *
 * - Botão esquerdo ou meio arrastando: pan.
 * - Roda: zoom.
 * - Botão direito arrastando: rotate.
 * - Setas / WASD: pan por evento keydown (passo = dist*0.8*0.05 por tecla;
 *   repetição do SO gera o movimento contínuo; sem timer).
 *
 * Retorna função de detach que remove todos os listeners.
 */
export function attachCamera(
  el: HTMLElement,
  get: () => CameraState,
  render: () => void,
  opts: AttachOptions = {},
): () => void {
  const half = opts.half ?? DEFAULT_HALF_SIZE;
  const win: EventTarget = el.ownerDocument?.defaultView ?? el;

  let mode: 'pan' | 'rotate' | null = null;
  let lastX = 0;
  let lastY = 0;

  const finish = (): void => {
    const s = get();
    clampToBounds(s, half);
    render();
  };

  const onDown = (ev: Event): void => {
    const e = ev as MouseEvent;
    if (e.button === 0 || e.button === 1) mode = 'pan';
    else if (e.button === 2) mode = 'rotate';
    else return;
    lastX = e.clientX;
    lastY = e.clientY;
    e.preventDefault?.();
  };

  const onMove = (ev: Event): void => {
    if (mode === null) return;
    const e = ev as MouseEvent;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    const s = get();
    if (mode === 'pan') {
      const w = pixelsToWorld(s, dx, dy);
      pan(s, w.dx, w.dz);
    } else {
      rotate(s, dx * ROTATE_PER_PX);
    }
    finish();
  };

  const onUp = (): void => {
    mode = null;
  };

  const onWheel = (ev: Event): void => {
    const e = ev as WheelEvent;
    e.preventDefault?.();
    zoom(get(), e.deltaY * ZOOM_PER_WHEEL);
    finish();
  };

  const onContext = (ev: Event): void => {
    ev.preventDefault?.();
  };

  const keyDir = (key: string): { f: number; r: number } | null => {
    switch (key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        return { f: 1, r: 0 };
      case 'ArrowDown':
      case 's':
      case 'S':
        return { f: -1, r: 0 };
      case 'ArrowLeft':
      case 'a':
      case 'A':
        return { f: 0, r: -1 };
      case 'ArrowRight':
      case 'd':
      case 'D':
        return { f: 0, r: 1 };
      default:
        return null;
    }
  };

  const onKeyDown = (ev: Event): void => {
    const e = ev as KeyboardEvent;
    const d = keyDir(e.key);
    if (!d) return;
    e.preventDefault?.();
    const s = get();
    // Passo fixo por evento de tecla (sem loop de frame nesta fase).
    const step = s.dist * KEY_PAN_PER_DIST_PER_SEC * 0.05;
    const fx = -Math.sin(s.yaw);
    const fz = -Math.cos(s.yaw);
    const rx = Math.cos(s.yaw);
    const rz = -Math.sin(s.yaw);
    pan(s, (fx * d.f + rx * d.r) * step, (fz * d.f + rz * d.r) * step);
    finish();
  };

  el.addEventListener('mousedown', onDown);
  win.addEventListener('mousemove', onMove);
  win.addEventListener('mouseup', onUp);
  el.addEventListener('wheel', onWheel, { passive: false } as AddEventListenerOptions);
  el.addEventListener('contextmenu', onContext);
  win.addEventListener('keydown', onKeyDown);

  return (): void => {
    el.removeEventListener('mousedown', onDown);
    win.removeEventListener('mousemove', onMove);
    win.removeEventListener('mouseup', onUp);
    el.removeEventListener('wheel', onWheel);
    el.removeEventListener('contextmenu', onContext);
    win.removeEventListener('keydown', onKeyDown);
    mode = null;
  };
}
