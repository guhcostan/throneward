// Age progression and landmarks (Fase 4). Pure logic: no DOM, no Three.js, fixed dt.
// Advancing an age happens by building a landmark (choice of two per age), not at the Town Center.
// All values are THR v0 placeholders pending verification (see docs/spec-buildings.md §1.1).

export type Age = 1 | 2 | 3 | 4;

export const AGE_I: Age = 1;
export const AGE_II: Age = 2;
export const AGE_III: Age = 3;
export const AGE_IV: Age = 4;

export interface LandmarkDef {
  id: string;
  age: Age;
  name: string;
  cost: { food?: number; wood?: number; gold?: number; stone?: number };
  buildTime: number;
  // Textual description of the effect, e.g. 'unlocks:knight' or 'produces:longbow'.
  effect: string;
}

export interface AgeState {
  age: Age;
  advancing: boolean;
  choice: [LandmarkDef, LandmarkDef] | null;
  progress: number;
  builders: number;
}

// Cumulative unlocks per age. THR v0 VERIFICAR.
export const AGE_UNLOCKS: Record<Age, { units: string[]; buildings: string[] }> = {
  1: {
    units: ['villager', 'scout'],
    buildings: ['towncenter', 'house', 'farm', 'mill', 'lumber', 'mining'],
  },
  2: {
    units: ['villager', 'scout', 'spearman', 'archer', 'longbow'],
    buildings: [
      'towncenter', 'house', 'farm', 'mill', 'lumber', 'mining',
      'barracks', 'archerrange', 'stable', 'blacksmith', 'market', 'outpost', 'palisade',
    ],
  },
  3: {
    units: ['villager', 'scout', 'spearman', 'archer', 'longbow', 'crossbow', 'manatarms', 'knight', 'royalknight', 'monk', 'ram', 'mangonel', 'springald'],
    buildings: [
      'towncenter', 'house', 'farm', 'mill', 'lumber', 'mining',
      'barracks', 'archerrange', 'stable', 'blacksmith', 'market', 'outpost', 'palisade',
      'siege', 'siegeworkshop', 'monastery', 'university', 'tower', 'stonewall', 'keep',
    ],
  },
  4: {
    units: ['villager', 'scout', 'spearman', 'archer', 'longbow', 'crossbow', 'manatarms', 'knight', 'royalknight', 'monk', 'ram', 'mangonel', 'springald', 'trebuchet', 'bombard'],
    buildings: [
      'towncenter', 'house', 'farm', 'mill', 'lumber', 'mining',
      'barracks', 'archerrange', 'stable', 'blacksmith', 'market', 'outpost', 'palisade',
      'siege', 'siegeworkshop', 'monastery', 'university', 'tower', 'stonewall', 'keep', 'wonder',
    ],
  },
};

export const MAX_AGE: Age = 4;

export function createAgeState(): AgeState {
  return { age: AGE_I, advancing: false, choice: null, progress: 0, builders: 0 };
}

export function nextAge(age: Age): Age | null {
  return age < MAX_AGE ? ((age + 1) as Age) : null;
}

// Starts advancing with the chosen pair of landmarks. Both options must target the next age.
export function beginAdvance(s: AgeState, choice: [LandmarkDef, LandmarkDef]): boolean {
  const next = nextAge(s.age);
  if (next === null || s.advancing) return false;
  if (choice[0].age !== next || choice[1].age !== next) return false;
  s.advancing = true;
  s.choice = choice;
  s.progress = 0;
  return true;
}

// Advances construction by dt seconds. Rate = (builders+2)/3 / buildTime, using choice[0].buildTime.
// With zero builders there is no progress (the rate is 0, not the (0+2)/3 formula value).
// Returns the new age when completed, otherwise null.
export function advanceTick(s: AgeState, dt: number): Age | null {
  if (!s.advancing || s.choice === null) return null;
  if (s.builders <= 0) return null;
  const buildTime = s.choice[0].buildTime;
  s.progress += (dt * ((s.builders + 2) / 3)) / buildTime;
  if (s.progress < 1) return null;
  const next = nextAge(s.age);
  if (next === null) return null;
  s.age = next;
  s.advancing = false;
  s.choice = null;
  s.progress = 0;
  return next;
}

export function setBuilders(s: AgeState, n: number): void {
  s.builders = Math.max(0, Math.floor(n));
}

// Cancels the current advance. Keeps the current age and builder count.
export function cancelAdvance(s: AgeState): void {
  s.advancing = false;
  s.choice = null;
  s.progress = 0;
}

export function canTrain(age: Age, unit: string): boolean {
  return AGE_UNLOCKS[age].units.includes(unit);
}

export function canBuild(age: Age, building: string): boolean {
  return AGE_UNLOCKS[age].buildings.includes(building);
}
