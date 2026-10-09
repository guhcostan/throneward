import { test, expect, type Page } from '@playwright/test';

type State = {
  units: { id: number; type: string; player: number; x: number; y: number }[];
  buildings: { id: number; type: string; player: number; hp: number; maxHp: number; x: number; y: number }[];
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

test('right-click repair restores a damaged town center', async ({ page }) => {
  test.setTimeout(180000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/?test=1&bots=0');

  const st0 = await snap(page);
  const tc = st0.buildings.find((b) => b.type === 'towncenter' && b.player === 0)!;
  // Aríete inimigo danifica o TC, depois é afastado.
  const ram = await cmd(page, { type: 'spawn', unit: 'ram', player: 1, x: tc.x + 1, y: tc.y });
  await cmd(page, { type: 'siege', unitId: ram.id!, buildingId: tc.id });
  await cmd(page, { type: 'tick', seconds: 20 });
  await cmd(page, { type: 'move', unitIds: [ram.id!], x: tc.x + 30, y: tc.y + 30 });
  // Deixa o aríete sair do alcance antes da linha de base (senão ele bate no meio).
  await cmd(page, { type: 'tick', seconds: 30 });
  const damaged = (await snap(page)).buildings.find((b) => b.id === tc.id)!.hp;
  expect(damaged).toBeLessThan(tc.maxHp);

  // Aldeão repara pelo botão direito no TC.
  const st1 = await snap(page);
  const vil = st1.units.find((u) => u.type === 'villager')!;
  const pv = await proj(page, vil.x, vil.y);
  await page.mouse.click(pv.x, pv.y);
  await expect(page.locator('#selection')).toContainText('villager', { timeout: 5000 });
  const ptc = await proj(page, tc.x, tc.y);
  await page.mouse.click(ptc.x, ptc.y, { button: 'right' });
  await cmd(page, { type: 'tick', seconds: 30 });
  const repaired = (await snap(page)).buildings.find((b) => b.id === tc.id)!.hp;
  expect(repaired).toBeGreaterThan(damaged);
  expect(errors).toEqual([]);
});
