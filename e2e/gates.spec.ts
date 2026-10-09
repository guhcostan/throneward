import { test, expect, type Page } from '@playwright/test';

type State = {
  units: { id: number; type: string; player: number; x: number; y: number }[];
  walls: { id: number; player: number; gate: boolean }[];
};

const snap = (page: Page): Promise<State> =>
  page.evaluate(() => (window as unknown as { __game: { getState: () => State } }).__game.getState());

const cmd = (page: Page, c: unknown): Promise<{ ok: boolean; id?: number }> =>
  page.evaluate((cc) => (window as unknown as { __game: { command: (c: unknown) => { ok: boolean; id?: number } } }).__game.command(cc), c);

test('open gate lets own units through; closed gate forces detour', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/?test=1');

  const wall = await cmd(page, { type: 'wall', player: 0, kind: 'palisade', x1: -10, y1: -5, x2: -10, y2: 5 });
  expect(wall.ok).toBe(true);
  expect((await cmd(page, { type: 'gate', player: 0, wallId: wall.id, gate: true })).ok).toBe(true);

  const vil = await cmd(page, { type: 'spawn', unit: 'villager', player: 0, x: -15, y: 0 });
  await cmd(page, { type: 'move', unitIds: [vil.id!], x: -5, y: 0 });
  await cmd(page, { type: 'tick', seconds: 30 });
  let st = await snap(page);
  let u = st.units.find((x) => x.id === vil.id)!;
  // Passou reto pelo portão (≈10 tiles, sem desvio).
  expect(Math.hypot(u.x + 5, u.y)).toBeLessThan(1.5);

  // Fecha o portão: agora contorna.
  expect((await cmd(page, { type: 'gate', player: 0, wallId: wall.id, gate: false })).ok).toBe(true);
  await cmd(page, { type: 'move', unitIds: [vil.id!], x: -15, y: 0 });
  await cmd(page, { type: 'tick', seconds: 12 });
  st = await snap(page);
  u = st.units.find((x) => x.id === vil.id)!;
  expect(Math.abs(u.y)).toBeGreaterThan(0.5);
  expect(errors).toEqual([]);
});

test('enemy cannot use our gate', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/?test=1');

  const wall = await cmd(page, { type: 'wall', player: 0, kind: 'palisade', x1: -10, y1: -5, x2: -10, y2: 5 });
  await cmd(page, { type: 'gate', player: 0, wallId: wall.id, gate: true });
  const foe = await cmd(page, { type: 'spawn', unit: 'villager', player: 1, x: -15, y: 0 });
  await cmd(page, { type: 'move', unitIds: [foe.id!], x: -5, y: 0 });
  await cmd(page, { type: 'tick', seconds: 12 });
  const st = await snap(page);
  const u = st.units.find((x) => x.id === foe.id)!;
  // Inimigo contorna mesmo com o portão aberto (não é dele).
  expect(Math.abs(u.y)).toBeGreaterThan(0.5);
  expect(errors).toEqual([]);
});
