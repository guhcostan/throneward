import { test, expect, type Page } from '@playwright/test';

type State = {
  units: { id: number; type: string; player: number; hp: number; elev: number }[];
};

const snap = (page: Page): Promise<State> =>
  page.evaluate(() => (window as unknown as { __game: { getState: () => State } }).__game.getState());

const cmd = (page: Page, c: unknown): Promise<{ ok: boolean; id?: number }> =>
  page.evaluate((cc) => (window as unknown as { __game: { command: (c: unknown) => { ok: boolean; id?: number } } }).__game.command(cc), c);

test('archer on stone wall is immune to melee but not to archers', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/?test=1');

  await cmd(page, { type: 'grant', player: 0, resource: 'stone', amount: 500 });
  const wall = await cmd(page, { type: 'wall', player: 0, kind: 'stone', x1: 0, y1: 0, x2: 0, y2: 2 });
  const ar = await cmd(page, { type: 'spawn', unit: 'archer', player: 0, x: 0, y: 1 });
  expect((await cmd(page, { type: 'mount', unitId: ar.id, wallId: wall.id })).ok).toBe(true);
  let st = await snap(page);
  expect(st.units.find((u) => u.id === ar.id)!.elev).toBe(1);

  // Lanceiro colado não acerta; arqueiro inimigo acerta.
  const sp = await cmd(page, { type: 'spawn', unit: 'spearman', player: 1, x: 0.5, y: 1 });
  await cmd(page, { type: 'attack', unitId: sp.id!, targetId: ar.id! });
  const ea = await cmd(page, { type: 'spawn', unit: 'archer', player: 1, x: 3, y: 1 });
  await cmd(page, { type: 'attack', unitId: ea.id!, targetId: ar.id! });
  await cmd(page, { type: 'tick', seconds: 20 });
  st = await snap(page);
  const hp = st.units.find((u) => u.id === ar.id)!.hp;
  // Dano só do arqueiro (5/golpe × ~12 golpes em 20s ≈ 60 → hp < 70 mas longe de morte rápida por 2).
  expect(hp).toBeLessThan(70);
  expect(hp).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});
