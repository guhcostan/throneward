// Relics: pickup by monks, carry, garrison in okKinds buildings, drop, and gold ticks.
// Pure logic: no DOM, no Three.js, no game.ts import. Fixed dt. Deterministic (id order).
// Rate is THR v0 placeholder pending balance verification (docs/spec-economy.md §6 is VERIFICAR).

export interface Relic {
  id: number;
  x: number;
  y: number;
  carrier: number | null; // unitId carrying the relic
  garrisoned: number | null; // buildingId holding the relic
}

// THR v0 VERIFICAR: gold per second per garrisoned relic.
export const RELIC_RATE = 0.5;

export class RelicState {
  relics = new Map<number, Relic>();

  add(id: number, x: number, y: number): void {
    this.relics.set(id, { id, x, y, carrier: null, garrisoned: null });
  }
}

// Only monks can pick up relics, and only free ones (not carried, not garrisoned).
export function pickup(
  s: RelicState,
  relicId: number,
  unitId: number,
  unitType: string,
): boolean {
  if (unitType !== 'monk') return false;
  const r = s.relics.get(relicId);
  if (!r) return false;
  if (r.carrier !== null || r.garrisoned !== null) return false;
  r.carrier = unitId;
  return true;
}

// Drops a held relic (carried or garrisoned) on the ground at x,y.
export function drop(s: RelicState, relicId: number, x: number, y: number): boolean {
  const r = s.relics.get(relicId);
  if (!r) return false;
  if (r.carrier === null && r.garrisoned === null) return false;
  r.carrier = null;
  r.garrisoned = null;
  r.x = x;
  r.y = y;
  return true;
}

// Garrisons a carried relic into a building whose kind is in okKinds.
// The carrier monk delivers it, so the relic must be carried and not already garrisoned.
export function garrison(
  s: RelicState,
  relicId: number,
  buildingId: number,
  kind: string,
  okKinds: readonly string[],
): boolean {
  if (!okKinds.includes(kind)) return false;
  const r = s.relics.get(relicId);
  if (!r) return false;
  if (r.carrier === null || r.garrisoned !== null) return false;
  r.carrier = null;
  r.garrisoned = buildingId;
  return true;
}

// Each garrisoned relic yields ratePerRelic gold/s. Iterates by ascending id for determinism.
// Returns the gold produced this tick; the integrator credits it.
export function relicTick(
  s: RelicState,
  dt: number,
  ratePerRelic: number = RELIC_RATE,
): { gold: number } {
  const ids = [...s.relics.keys()].sort((a, b) => a - b);
  let gold = 0;
  for (const id of ids) {
    const r = s.relics.get(id);
    if (r && r.garrisoned !== null) gold += ratePerRelic * dt;
  }
  return { gold };
}
