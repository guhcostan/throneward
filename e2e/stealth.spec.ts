import { test, expect, type Page } from '@playwright/test';

type State = {
  units: { id: number; type: string; player: number; x: number; y: number }[];
  visible: number[];
};

const snap = (page: Page): Promise<State> =>
  page.evaluate(() => (window as unknown as { __game: { getState: () => State } }).__game.getState());

const cmd = (page: Page, c: unknown): Promise<{ ok: boolean; id?: number }> =>
  page.evaluate((cc) => (window as unknown as { __game: { command: (c: unknown) => { ok: boolean; id?: number } } }).__game.command(cc), c);

test('stealth forest hides enemies beyond 2 tiles', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/?test=1');

  const tiles = await page.evaluate(() => {
    const g = window as unknown as { __game: { debug: { stealthTiles: () => { x: number; y: number }[] } } };
    return g.__game.debug.stealthTiles();
  });
  expect(tiles.length).toBeGreaterThan(0);
  // Tile furtivo longe da base do jogador (spawns têm clareira, então o 1º já serve).
  const t = tiles[0];
  const foe = await cmd(page, { type: 'spawn', unit: 'archer', player: 1, x: t.x, y: t.y });
  await cmd(page, { type: 'tick', seconds: 2 });
  let st = await snap(page);
  expect(st.visible.includes(foe.id!)).toBe(false);

  // Batedor colado revela.
  await cmd(page, { type: 'spawn', unit: 'scout', player: 0, x: t.x + 1, y: t.y });
  await cmd(page, { type: 'tick', seconds: 2 });
  st = await snap(page);
  expect(st.visible.includes(foe.id!)).toBe(true);
  expect(errors).toEqual([]);
});
