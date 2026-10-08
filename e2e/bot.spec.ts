import { test, expect } from '@playwright/test';

test('enemy bot expands over time', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/?test=1');

  const before = await page.evaluate(() => {
    const g = (window as unknown as { __game: { getState: () => {
      units: { player: number; type: string }[];
      resources: { food: number }[];
    } } }).__game.getState();
    return {
      foes: g.units.filter((u) => u.player === 1).length,
      food: g.resources[1].food
    };
  });

  // 3 minutos de simulação de uma vez (bot decide a cada 4s no medium).
  await page.evaluate(() => (window as unknown as { __game: { command: (c: unknown) => unknown } }).__game.command({ type: 'tick', seconds: 180 }));

  const after = await page.evaluate(() => {
    const g = (window as unknown as { __game: { getState: () => {
      units: { player: number; type: string }[];
      buildings: { player: number; type: string }[];
    } } }).__game.getState();
    return {
      foes: g.units.filter((u) => u.player === 1).length,
      buildings: g.buildings.filter((b) => b.player === 1).length
    };
  });

  // O bot treina aldeões (TC com fila) e/ou constrói: algo mudou na base inimiga.
  expect(after.foes + after.buildings).toBeGreaterThan(before.foes + 1);
  expect(errors).toEqual([]);
});
