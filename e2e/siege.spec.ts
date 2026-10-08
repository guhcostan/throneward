import { test, expect, type Page } from '@playwright/test';

type Bld = { id: number; type: string; player: number; hp: number; maxHp: number; x: number; y: number };
type State = {
  units: { id: number }[];
  ages: { age: number }[];
  buildings: Bld[];
};

const snap = (page: Page): Promise<State> =>
  page.evaluate(() => (window as unknown as { __game: { getState: () => State } }).__game.getState());

const cmd = (page: Page, c: unknown): Promise<{ ok: boolean; id?: number }> =>
  page.evaluate((cc) => (window as unknown as { __game: { command: (c: unknown) => { ok: boolean; id?: number } } }).__game.command(cc), c);

test('rams destroy the enemy town center', async ({ page }) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/?test=1');

  const st = await snap(page);
  const etc = st.buildings.find((b) => b.type === 'towncenter' && b.player === 1)!;
  const hp0 = etc.hp;
  const rams: number[] = [];
  for (let i = 0; i < 3; i++) {
    const r = await cmd(page, { type: 'spawn', unit: 'ram', player: 0, x: etc.x + 1 + i * 0.5, y: etc.y });
    rams.push(r.id!);
    expect((await cmd(page, { type: 'attack', unitId: r.id!, targetId: 1 })).ok).toBe(false); // sanidade: attack não mira prédio
    void r;
  }
  for (const id of rams) {
    expect((await cmd(page, { type: 'siege', unitId: id, buildingId: etc.id })).ok).toBe(true);
  }
  await cmd(page, { type: 'tick', seconds: 60 });
  const st2 = await snap(page);
  const tc2 = st2.buildings.find((b) => b.id === etc.id);
  expect(tc2 ? tc2.hp : 0).toBeLessThan(hp0);
  await cmd(page, { type: 'tick', seconds: 300 });
  const st3 = await snap(page);
  expect(st3.buildings.some((b) => b.id === etc.id)).toBe(false);
  expect(errors).toEqual([]);
});

test('advance creates a destructible landmark', async ({ page }) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/?test=1');

  await cmd(page, { type: 'grant', player: 0, resource: 'food', amount: 1000 });
  await cmd(page, { type: 'grant', player: 0, resource: 'wood', amount: 1000 });
  await cmd(page, { type: 'grant', player: 0, resource: 'gold', amount: 1000 });
  await cmd(page, { type: 'grant', player: 0, resource: 'stone', amount: 1000 });
  const st = await snap(page);
  const vil = st.units.find((u) => u.type === 'villager');
  expect((await cmd(page, { type: 'advance', player: 0, slot: 0 })).ok).toBe(true);
  await cmd(page, { type: 'agebuilder', player: 0, unitId: vil!.id });
  await cmd(page, { type: 'tick', seconds: 200 });
  const st2 = await snap(page);
  expect(st2.ages[0].age).toBe(2);
  const lm = st2.buildings.find((b) => b.type === 'landmark' && b.player === 0);
  expect(lm).toBeDefined();
  // Aríete inimigo derruba o landmark.
  const ram = await cmd(page, { type: 'spawn', unit: 'ram', player: 1, x: lm!.x + 1, y: lm!.y });
  expect((await cmd(page, { type: 'siege', unitId: ram.id!, buildingId: lm!.id })).ok).toBe(true);
  await cmd(page, { type: 'tick', seconds: 300 });
  const st3 = await snap(page);
  expect(st3.buildings.some((b) => b.id === lm!.id)).toBe(false);
  expect(errors).toEqual([]);
});
