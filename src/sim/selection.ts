// Pure selection and control-group logic. No DOM, deterministic.

export interface SelUnit {
  id: number;
  player: number;
  type: string;
  x: number;
  y: number;
}

const MILITARY_TYPES: ReadonlySet<string> = new Set([
  'lanceiro',
  'arqueiro',
  'besta',
  'maa',
  'cavaleiro',
  'cerco',
]);

export function isMilitary(type: string): boolean {
  return MILITARY_TYPES.has(type);
}

/** Closest own unit within radius of (x, y). Returns [] when none qualifies. */
export function clickSelect(
  units: SelUnit[],
  player: number,
  x: number,
  y: number,
  radius = 0.8,
): number[] {
  let best: SelUnit | null = null;
  let bestD2 = Infinity;
  const r2 = radius * radius;
  for (const u of units) {
    if (u.player !== player) continue;
    const dx = u.x - x;
    const dy = u.y - y;
    const d2 = dx * dx + dy * dy;
    if (d2 > r2) continue;
    if (d2 < bestD2 || (d2 === bestD2 && best !== null && u.id < best.id)) {
      best = u;
      bestD2 = d2;
    }
  }
  return best ? [best.id] : [];
}

/** Own units inside the rectangle (corners in any order). */
export function boxSelect(
  units: SelUnit[],
  player: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  onlyMilitary = false,
): number[] {
  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);
  const out: number[] = [];
  for (const u of units) {
    if (u.player !== player) continue;
    if (u.x < minX || u.x > maxX || u.y < minY || u.y > maxY) continue;
    if (onlyMilitary && !isMilitary(u.type)) continue;
    out.push(u.id);
  }
  return out;
}

/** Own units of the same type as the clicked one, within radius of (x, y). */
export function doubleClickSelect(
  units: SelUnit[],
  player: number,
  type: string,
  x: number,
  y: number,
  radius = 12,
): number[] {
  const r2 = radius * radius;
  const out: number[] = [];
  for (const u of units) {
    if (u.player !== player || u.type !== type) continue;
    const dx = u.x - x;
    const dy = u.y - y;
    if (dx * dx + dy * dy <= r2) out.push(u.id);
  }
  return out;
}

export const CONTROL_GROUP_COUNT = 10;

function checkGroup(g: number): void {
  if (!Number.isInteger(g) || g < 0 || g >= CONTROL_GROUP_COUNT) {
    throw new RangeError(`control group must be an integer 0-${CONTROL_GROUP_COUNT - 1}, got ${g}`);
  }
}

/** Ten control groups (0-9). Stores defensive copies. */
export class ControlGroups {
  private groups: number[][] = Array.from({ length: CONTROL_GROUP_COUNT }, () => []);

  set(g: number, ids: number[]): void {
    checkGroup(g);
    this.groups[g] = [...ids];
  }

  get(g: number): number[] {
    checkGroup(g);
    return [...this.groups[g]];
  }

  add(g: number, ids: number[]): void {
    checkGroup(g);
    const current = this.groups[g];
    for (const id of ids) {
      if (!current.includes(id)) current.push(id);
    }
  }
}

/** Shift appends the new waypoint to the queue; otherwise it replaces it. */
export function shiftQueue(
  existing: { x: number; y: number }[],
  app: { x: number; y: number },
  shift: boolean,
): { x: number; y: number }[] {
  if (shift) return [...existing, { x: app.x, y: app.y }];
  return [{ x: app.x, y: app.y }];
}
