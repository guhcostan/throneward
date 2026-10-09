import { test, expect, type Page } from '@playwright/test';

// Guarda de regressão do bug r32 (minimapa/veu congelados): o HUD precisa
// refletir o estado vivo — pixels do minimapa mudam e recursos sobem.
test('minimap pixels change as units move', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/?test=1');
  // Força ao menos um ciclo de 1s do sync (minimapa + véu).
  await page.waitForTimeout(2500);

  const shot = (): Promise<string> =>
    page.evaluate(() => (document.getElementById('minimap') as HTMLCanvasElement).toDataURL());
  const before = await shot();
  // Move todas as unidades do jogador para longe via __game e deixa renderizar.
  await page.evaluate(() => {
    const g = window as unknown as { __game: {
      getState: () => { units: { id: number; player: number }[] };
      command: (c: unknown) => unknown;
    } };
    const ids = g.__game.getState().units.filter((u) => u.player === 0).map((u) => u.id);
    g.__game.command({ type: 'move', unitIds: ids, x: 20, y: 20 });
  });
  await page.waitForTimeout(2500);
  const after = await shot();
  expect(after).not.toBe(before);
  expect(errors).toEqual([]);
});

test('HUD resources rise as villagers gather', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/?test=1');

  const food0 = await page.evaluate(() => {
    const g = window as unknown as { __game: { getState: () => { resources: { food: number }[] } } };
    return g.__game.getState().resources[0].food;
  });
  // 3 aldeões na fruta + viagem no tempo da simulação.
  await page.evaluate(() => {
    const g = window as unknown as { __game: {
      getState: () => { units: { id: number; type: string }[] };
      command: (c: unknown) => unknown;
    } };
    const vils = g.__game.getState().units.filter((u) => u.type === 'villager').slice(0, 3);
    for (const v of vils) {
      g.__game.command({ type: 'gather', unitId: v.id, kind: 'berry', x: 0, y: 0, dx: 0, dy: 0 });
    }
    g.__game.command({ type: 'tick', seconds: 30 });
  });
  // O HUD (atualizado no rAF) acompanha em ~1s.
  await expect
    .poll(async () => page.locator('#res-food').textContent(), { timeout: 10000 })
    .not.toBe(`Food ${Math.floor(food0)}`);
  expect(errors).toEqual([]);
});
