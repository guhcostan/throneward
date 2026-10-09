import { test, expect, type Page } from '@playwright/test';

type State = {
  units: { id: number; type: string; player: number; x: number; y: number }[];
  walls: { id: number }[];
};

const snap = (page: Page): Promise<State> =>
  page.evaluate(() => (window as unknown as { __game: { getState: () => State } }).__game.getState());

const cmd = (page: Page, c: unknown): Promise<{ ok: boolean; id?: number }> =>
  page.evaluate((cc) => (window as unknown as { __game: { command: (c: unknown) => { ok: boolean; id?: number } } }).__game.command(cc), c);

test('wall blocks straight line; unit routes around the end', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/?test=1');

  // Muralha vertical em x=-10, de y=-5 a y=5 (11 tiles).
  const wall = await cmd(page, { type: 'wall', player: 0, kind: 'palisade', x1: -10, y1: -5, x2: -10, y2: 5 });
  expect(wall.ok).toBe(true);
  let st = await snap(page);
  expect(st.walls.length).toBe(1);

  const vil = await cmd(page, { type: 'spawn', unit: 'villager', player: 0, x: -15, y: 0 });
  await cmd(page, { type: 'move', unitIds: [vil.id!], x: -5, y: 0 });
  // Rota contorna pela ponta: y desvia de 0 ainda a oeste do muro.
  await cmd(page, { type: 'tick', seconds: 10 });
  st = await snap(page);
  const mid = st.units.find((u) => u.id === vil.id)!;
  expect(Math.abs(mid.y)).toBeGreaterThan(0.5);
  // Chega ao destino após o contorno.
  await cmd(page, { type: 'tick', seconds: 60 });
  st = await snap(page);
  const end = st.units.find((u) => u.id === vil.id)!;
  expect(Math.hypot(end.x + 5, end.y)).toBeLessThan(1.5);
  expect(errors).toEqual([]);
});
