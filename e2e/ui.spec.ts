import { test, expect, type Page } from '@playwright/test';

type Unit = { id: number; type: string; x: number; y: number };
type State = {
  units: Unit[];
  resources: { food: number; wood: number }[];
  ages: { age: number }[];
  buildings: { id: number; type: string; built: boolean; x: number; y: number }[];
};
type Px = { x: number; y: number };

const snap = (page: Page): Promise<State> =>
  page.evaluate(() => (window as unknown as { __game: { getState: () => State } }).__game.getState());

const proj = (page: Page, x: number, y: number): Promise<Px> =>
  page.evaluate(([a, b]) => {
    const g = (window as unknown as { __game: { debug: { project: (x: number, z: number) => Px } } }).__game;
    return g.debug.project(a, b);
  }, [x, y] as [number, number]);

const cmd = (page: Page, c: unknown): Promise<{ ok: boolean; id?: number }> =>
  page.evaluate((cc) => (window as unknown as { __game: { command: (c: unknown) => { ok: boolean; id?: number } } }).__game.command(cc), c);

test('full loop by mouse: select, build, train, advance', async ({ page }) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/?test=1');

  // 1. Select a villager by clicking it.
  let st = await snap(page);
  const vil = st.units.find((u) => u.type === 'villager')!;
  const pv = await proj(page, vil.x, vil.y);
  await page.mouse.click(pv.x, pv.y);
  await expect(page.locator('#selection')).toContainText('villager', { timeout: 5000 });

  // 2. Build a house through the grid, placed by clicking the ground.
  await expect(page.locator('[data-act="build-house"]')).toBeEnabled({ timeout: 5000 });
  await page.click('[data-act="build-house"]');
  const spot = await proj(page, 6, 6);
  await page.mouse.click(spot.x, spot.y);
  await expect
    .poll(async () => (await snap(page)).buildings.some((b) => b.type === 'house'), { timeout: 10000 })
    .toBe(true);

  // 3. Select the Town Center by clicking it and train a villager.
  st = await snap(page);
  const tc = st.buildings.find((b) => b.type === 'towncenter')!;
  // Offset do centro: aldeões parados cercam o TC (unidades têm prioridade no clique).
  const ptc = await proj(page, tc.x + 2.5, tc.y + 2.5);
  await page.mouse.click(ptc.x, ptc.y);
  await expect(page.locator('#selection')).toContainText('towncenter', { timeout: 5000 });
  const nBefore = st.units.length;
  await page.click('[data-act="train-villager"]');
  await cmd(page, { type: 'tick', seconds: 25 });
  await expect
    .poll(async () => (await snap(page)).units.length, { timeout: 10000 })
    .toBeGreaterThan(nBefore);

  // 4. Advance to age II through the grid (funds granted as test setup).
  await cmd(page, { type: 'grant', player: 0, resource: 'food', amount: 1000 });
  await cmd(page, { type: 'grant', player: 0, resource: 'wood', amount: 1000 });
  await cmd(page, { type: 'grant', player: 0, resource: 'gold', amount: 1000 });
  await cmd(page, { type: 'grant', player: 0, resource: 'stone', amount: 1000 });
  await page.mouse.click(pv.x, pv.y);
  await expect(page.locator('[data-act="advance"]')).toBeVisible({ timeout: 5000 });
  await page.click('[data-act="advance"]');
  await page.click('[data-act="landmark-0"]');
  await cmd(page, { type: 'tick', seconds: 200 });
  await expect
    .poll(async () => (await snap(page)).ages[0].age, { timeout: 15000 })
    .toBe(2);

  expect(errors).toEqual([]);
});
