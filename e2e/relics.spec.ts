import { test, expect, type Page } from '@playwright/test';

type State = {
  resources: { food: number; wood: number; gold: number; stone: number }[];
  buildings: { id: number; type: string; built: boolean }[];
  units: { id: number; type: string }[];
  ages: { age: number }[];
  relics: { id: number; carrier: number | null; garrisoned: number | null }[];
  winner: { player: number; reason: string } | null;
};

const state = (page: Page): Promise<State> =>
  page.evaluate(() => (window as unknown as { __game: { getState: () => State } }).__game.getState());

const cmd = (page: Page, c: unknown): Promise<{ ok: boolean; id?: number }> =>
  page.evaluate((cc) => (window as unknown as { __game: { command: (c: unknown) => { ok: boolean; id?: number } } }).__game.command(cc), c);

async function advanceTo(page: Page, target: number): Promise<void> {
  for (;;) {
    const age = (await state(page)).ages[0].age;
    if (age >= target) return;
    const st = await state(page);
    const villager = st.units.find((u) => u.type === 'villager');
    await cmd(page, { type: 'grant', player: 0, resource: 'food', amount: 1000 });
    await cmd(page, { type: 'grant', player: 0, resource: 'wood', amount: 1000 });
    await cmd(page, { type: 'grant', player: 0, resource: 'gold', amount: 1000 });
    await cmd(page, { type: 'grant', player: 0, resource: 'stone', amount: 1000 });
    expect((await cmd(page, { type: 'advance', player: 0, slot: 0 })).ok).toBe(true);
    await cmd(page, { type: 'agebuilder', player: 0, unitId: villager!.id });
    // Time-travel em vez de espera de parede (durações cobertas em unit tests).
    // 1 construtor: 90s (era II) / 120s (era III) → 200s cobre com folga.
    expect((await cmd(page, { type: 'tick', seconds: 200 })).ok).toBe(true);
    await expect
      .poll(async () => (await state(page)).ages[0].age, { timeout: 15000 })
      .toBeGreaterThan(age);
  }
}

test('relic garrisoned in monastery trickles gold', async ({ page }) => {
  test.setTimeout(300000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/?test=1');

  await advanceTo(page, 3);

  const order = await cmd(page, { type: 'build', player: 0, building: 'monastery', x: 4, y: 4 });
  expect(order.ok).toBe(true);
  expect((await cmd(page, { type: 'instant', buildingId: order.id })).ok).toBe(true);

  const monk = await cmd(page, { type: 'spawn', unit: 'monk', player: 0, x: 4, y: 5 });
  const before = await state(page);
  const relic = before.relics[0];
  expect(relic).toBeDefined();

  expect((await cmd(page, { type: 'relic', op: 'pickup', unitId: monk.id, relicId: relic.id })).ok).toBe(true);
  expect((await cmd(page, { type: 'relic', op: 'garrison', unitId: monk.id, relicId: relic.id, buildingId: order.id })).ok).toBe(true);

  const goldBefore = (await state(page)).resources[0].gold;
  await expect
    .poll(async () => (await state(page)).resources[0].gold, { timeout: 30000 })
    .toBeGreaterThan(goldBefore);
  expect(errors).toEqual([]);
});

test('non-monk cannot pick up relic', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/?test=1');

  const before = await state(page);
  const villager = before.units.find((u) => u.type === 'villager');
  const res = await cmd(page, { type: 'relic', op: 'pickup', unitId: villager!.id, relicId: before.relics[0].id });
  expect(res.ok).toBe(false);
  expect(errors).toEqual([]);
});
