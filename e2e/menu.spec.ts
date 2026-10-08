import { test, expect } from '@playwright/test';

test('menu shows and starts the game on click', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/');

  await expect(page.locator('#menu')).toBeVisible();
  await expect(page.locator('#btn-start')).toBeVisible();
  // No game before start.
  expect(await page.evaluate(() => (window as unknown as { __game?: unknown }).__game)).toBeUndefined();

  await page.click('#btn-start');
  await expect(page.locator('#menu')).toBeHidden();
  await expect(page.locator('#hud-top')).toContainText('Throneward');
  const version = await page.evaluate(() => (window as unknown as { __game: { version: string } }).__game.version);
  expect(version).toMatch(/^0\./);
  expect(errors).toEqual([]);
});

test('select a villager with the mouse and order a move', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/?test=1');

  // Project a known villager to screen coords via debug helper.
  const target = await page.evaluate(() => {
    const g = (window as unknown as { __game: { getState: () => { units: { id: number; type: string; x: number; y: number }[] }; debug: { project: (x: number, z: number) => { x: number; y: number } } } }).__game;
    const v = g.getState().units.find((u) => u.type === 'villager')!;
    return { id: v.id, at: v, px: g.debug.project(v.x, v.y) };
  });

  await page.mouse.click(target.px.x, target.px.y);
  await expect(page.locator('#selection')).toContainText('villager', { timeout: 5000 });

  // A unidade selecionada é a da frente no raio (raycast), não necessariamente a projetada.
  const selId = await page.evaluate(() => {
    const g = (window as unknown as { __game: { debug: { ui: () => { selected: number[] } } } }).__game;
    return g.debug.ui().selected[0];
  });
  const posOf = (id: number): Promise<{ x: number; y: number }> =>
    page.evaluate(([i]) => {
      const g = (window as unknown as { __game: { getState: () => { units: { id: number; x: number; y: number }[] } } }).__game;
      const u = g.getState().units.find((x) => x.id === i)!;
      return { x: u.x, y: u.y };
    }, [id] as [number]);
  const before = await posOf(selId);
  // Right-click elsewhere on the ground to order a move.
  await page.mouse.click(target.px.x + 120, target.px.y + 60, { button: 'right' });
  await page.waitForTimeout(1200);
  const after = await posOf(selId);
  expect(after.x !== before.x || after.y !== before.y).toBe(true);
  expect(errors).toEqual([]);
});
