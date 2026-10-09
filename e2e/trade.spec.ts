import { test, expect, type Page } from '@playwright/test';

type State = {
  units: { id: number; type: string; x: number; y: number }[];
  resources: { gold: number }[];
  buildings: { id: number; type: string; player: number; built: boolean; x: number; y: number }[];
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

test('trade route by mouse earns gold per trip', async ({ page }) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/?test=1');

  // Mercado é era II: avança primeiro (setup documentado).
  await cmd(page, { type: 'grant', player: 0, resource: 'food', amount: 1000 });
  await cmd(page, { type: 'grant', player: 0, resource: 'wood', amount: 1000 });
  await cmd(page, { type: 'grant', player: 0, resource: 'gold', amount: 1000 });
  await cmd(page, { type: 'grant', player: 0, resource: 'stone', amount: 1000 });
  {
    const st = await snap(page);
    const vil = st.units.find((u) => u.type === 'villager')!;
    await cmd(page, { type: 'advance', player: 0, slot: 0 });
    await cmd(page, { type: 'agebuilder', player: 0, unitId: vil.id });
    await cmd(page, { type: 'tick', seconds: 200 });
  }

  // Dois mercados prontos (setup rápido) + mercador.
  const m1 = await cmd(page, { type: 'build', player: 0, building: 'market', x: -8, y: -20 });
  const m2 = await cmd(page, { type: 'build', player: 0, building: 'market', x: 8, y: -20 });
  await cmd(page, { type: 'instant', buildingId: m1.id });
  await cmd(page, { type: 'instant', buildingId: m2.id });
  const trader = await cmd(page, { type: 'spawn', unit: 'trader', player: 0, x: 0, y: -20 });

  // Seleciona o mercador pelo clique e abre a rota pela grade.
  const st0 = await snap(page);
  const t = st0.units.find((u) => u.id === trader.id)!;
  const pt = await proj(page, t.x, t.y);
  await page.mouse.click(pt.x, pt.y);
  await expect(page.locator('#selection')).toContainText('trader', { timeout: 5000 });
  await page.click('[data-act="route"]');

  // Dois cliques nos mercados.
  const st1 = await snap(page);
  const a = st1.buildings.find((b) => b.id === m1.id)!;
  const b = st1.buildings.find((b) => b.id === m2.id)!;
  const pa = await proj(page, a.x, a.y);
  await page.mouse.click(pa.x, pa.y);
  const pb = await proj(page, b.x, b.y);
  await page.mouse.click(pb.x, pb.y);

  const gold0 = (await snap(page)).resources[0].gold;
  // Viagem de ~16 tiles a 1.0 t/s ida-e-volta ≈ 32s; folga com 120s.
  await cmd(page, { type: 'tick', seconds: 120 });
  const gold1 = (await snap(page)).resources[0].gold;
  expect(gold1).toBeGreaterThan(gold0);
  expect(errors).toEqual([]);
});
