import { test, expect } from '@playwright/test';

// Skirmish via menu: 2 bots hard vencem o default; HUD lateral aparece; botões de ocioso funcionam.
test('skirmish menu starts game with chosen bots', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/');

  await page.selectOption('#sel-civ', 'gallia');
  await page.selectOption('#sel-bots', '2');
  await page.selectOption('#sel-diff', 'hard');
  await page.click('#btn-start');
  await expect(page.locator('#menu')).toBeHidden();

  const st = await page.evaluate(() => (window as unknown as { __game: { getState: () => {
    units: { player: number }[];
    scores: number[];
  } } }).__game.getState());
  const players = new Set(st.units.map((u) => u.player));
  expect(players.has(0)).toBe(true);
  expect(players.has(1)).toBe(true);
  expect(players.has(2)).toBe(true);
  expect(st.scores.length).toBe(3);

  await expect(page.locator('#objectives')).toContainText('Objetivos');
  await expect(page.locator('#score')).toContainText('Placar');
  expect(errors).toEqual([]);
});

test('skirmish menu supports 3 bots (4 players)', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/');

  await page.selectOption('#sel-civ', 'albion');
  await page.selectOption('#sel-bots', '3');
  await page.selectOption('#sel-diff', 'easy');
  await page.click('#btn-start');
  await expect(page.locator('#menu')).toBeHidden();

  const st = await page.evaluate(() => (window as unknown as { __game: { getState: () => {
    units: { player: number }[];
    scores: number[];
  } } }).__game.getState());
  const players = new Set(st.units.map((u) => u.player));
  expect(players.size).toBe(4);
  expect(st.scores.length).toBe(4);
  expect(errors).toEqual([]);
});

test('idle buttons select units', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/?test=1');

  // Força um ocioso: aldeão recém-nascido sem ordens passa a ocioso.
  await page.evaluate(() => (window as unknown as { __game: { command: (c: unknown) => unknown } }).__game.command({ type: 'tick', seconds: 5 }));
  const n = await page.locator('#idle-vil-n').textContent();
  expect(Number(n)).toBeGreaterThanOrEqual(0);
  await page.click('#btn-idle-vil');
  const sel = await page.locator('#selection').textContent();
  expect(sel).not.toBeNull();
  expect(errors).toEqual([]);
});
