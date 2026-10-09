import { test, expect, type Page } from '@playwright/test';

type State = {
  units: { id: number; type: string; player: number; hp: number }[];
};

const state = (page: Page): Promise<State> =>
  page.evaluate(() => (window as unknown as { __game: { getState: () => State } }).__game.getState());

const cmd = (page: Page, c: unknown): Promise<{ ok: boolean; id?: number }> =>
  page.evaluate((cc) => (window as unknown as { __game: { command: (c: unknown) => { ok: boolean; id?: number } } }).__game.command(cc), c);

test('knight kills enemy villager in melee', async ({ page }) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/?test=1');

  const knight = await cmd(page, { type: 'spawn', unit: 'knight', player: 0, x: 0, y: 0 });
  const victim = await cmd(page, { type: 'spawn', unit: 'villager', player: 1, x: 0.5, y: 0 });
  expect(knight.ok && victim.ok).toBe(true);

  expect(await cmd(page, { type: 'attack', unitId: knight.id, targetId: victim.id })).toEqual({ ok: true });

  await expect
    .poll(async () => (await state(page)).units.find((u) => u.id === victim.id)?.hp ?? 0, { timeout: 60000 })
    .toBe(0);
  expect(errors).toEqual([]);
});

test('friendly attack is refused', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/?test=1');

  const before = await state(page);
  const own = before.units.filter((u) => u.player === 0);
  expect(own.length).toBeGreaterThanOrEqual(2);
  const res = await cmd(page, { type: 'attack', unitId: own[0].id, targetId: own[1].id });
  expect(res.ok).toBe(false);
  expect(errors).toEqual([]);
});

test('right-click on enemy orders attack by mouse', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/?test=1&bots=0');
  await page.waitForFunction(
    () => (window as unknown as { __game?: { debug?: { project?: unknown } } }).__game?.debug?.project,
    null,
    { timeout: 15000 }
  );

  const knight = await cmd(page, { type: 'spawn', unit: 'knight', player: 0, x: 0, y: -20 });
  // Adjacente (sem perseguição automática, o cavaleiro só acerta ao alcance).
  const victim = await cmd(page, { type: 'spawn', unit: 'villager', player: 1, x: 0.5, y: -20 });
type Px = { x: number; y: number };

const proj = (page: Page, x: number, y: number): Promise<Px> =>
  page.evaluate(([a, b]) => {
    const g = (window as unknown as { __game: { debug: { project: (x: number, z: number) => Px } } }).__game;
    return g.debug.project(a, b);
  }, [x, y] as [number, number]);
  // Seleciona o cavaleiro e clica com direito no inimigo.
  const pk = await proj(page, 0, -20);
  await page.mouse.click(pk.x, pk.y);
  await expect(page.locator('#selection')).toContainText('knight', { timeout: 5000 });
  const pv = await proj(page, 0.5, -20);
  await page.mouse.click(pv.x, pv.y, { button: 'right' });
  await expect
    .poll(async () => (await state(page)).units.find((u) => u.id === victim.id)?.hp ?? 0, { timeout: 60000 })
    .toBe(0);
  expect(errors).toEqual([]);
});
