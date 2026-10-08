import { test, expect, type Page } from '@playwright/test';

type State = {
  units: { id: number; type: string; player: number; x: number; y: number }[];
  ages: { age: number }[];
  buildings: { id: number; type: string; player: number; built: boolean }[];
  sacred: { sites: { id: number; x: number; y: number }[] };
  winner: { player: number; reason: string } | null;
};

const snap = (page: Page): Promise<State> =>
  page.evaluate(() => (window as unknown as { __game: { getState: () => State } }).__game.getState());

const cmd = (page: Page, c: unknown): Promise<{ ok: boolean; id?: number }> =>
  page.evaluate((cc) => (window as unknown as { __game: { command: (c: unknown) => { ok: boolean; id?: number } } }).__game.command(cc), c);

async function grantAll(page: Page): Promise<void> {
  for (const r of ['food', 'wood', 'gold', 'stone']) {
    await cmd(page, { type: 'grant', player: 0, resource: r, amount: 5000 });
  }
}

async function advanceTo(page: Page, target: number): Promise<void> {
  for (;;) {
    const age = (await snap(page)).ages[0].age;
    if (age >= target) return;
    const st = await snap(page);
    const vil = st.units.find((u) => u.type === 'villager');
    await grantAll(page);
    expect((await cmd(page, { type: 'advance', player: 0, slot: 0 })).ok).toBe(true);
    await cmd(page, { type: 'agebuilder', player: 0, unitId: vil!.id });
    expect((await cmd(page, { type: 'tick', seconds: 300 })).ok).toBe(true);
    await expect
      .poll(async () => (await snap(page)).ages[0].age, { timeout: 15000 })
      .toBeGreaterThan(age);
  }
}

test('sacred victory: monks hold all 3 sites', async ({ page }) => {
  test.setTimeout(300000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  // Via isolada: sem isso o bot inimigo pode vencer por aniquilação antes
  // (e os monges desprotegidos morrem para as tropas dele).
  await page.goto('/?test=1&only=sacred&bots=0');

  await advanceTo(page, 3);
  // Mosteiro + 3 monges.
  const mon = await cmd(page, { type: 'build', player: 0, building: 'monastery', x: 4, y: 4 });
  expect(mon.ok).toBe(true);
  await cmd(page, { type: 'instant', buildingId: mon.id });
  for (let i = 0; i < 3; i++) {
    expect((await cmd(page, { type: 'train', buildingId: mon.id, unit: 'monk', time: 1 })).ok).toBe(true);
  }
  await cmd(page, { type: 'tick', seconds: 10 });
  let st = await snap(page);
  const monks = st.units.filter((u) => u.type === 'monk' && u.player === 0);
  expect(monks.length).toBeGreaterThanOrEqual(3);
  // Um monge por local sagrado.
  for (let i = 0; i < 3; i++) {
    const s = st.sacred.sites[i];
    await cmd(page, { type: 'move', unitIds: [monks[i].id], x: s.x, y: s.y });
  }
  await cmd(page, { type: 'tick', seconds: 900 });
  await expect
    .poll(async () => (await snap(page)).winner, { timeout: 30000 })
    .toEqual({ player: 0, reason: 'sacred' });
  expect(errors).toEqual([]);
});

test('wonder victory: sustained wonder wins', async ({ page }) => {
  test.setTimeout(300000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/?test=1&only=wonder&bots=0');

  await advanceTo(page, 4);
  const w = await cmd(page, { type: 'build', player: 0, building: 'wonder', x: 6, y: 6 });
  expect(w.ok).toBe(true);
  await cmd(page, { type: 'instant', buildingId: w.id });
  await cmd(page, { type: 'tick', seconds: 700 });
  await expect
    .poll(async () => (await snap(page)).winner, { timeout: 30000 })
    .toEqual({ player: 0, reason: 'wonder' });
  expect(errors).toEqual([]);
});

test('annihilation: destroying the enemy base wins', async ({ page }) => {
  test.setTimeout(300000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/?test=1');

  const st = await snap(page);
  // Exército de choque sobre cada unidade inimiga + aríetes no TC.
  for (const foe of st.units.filter((u) => u.player === 1)) {
    const k = await cmd(page, { type: 'spawn', unit: 'knight', player: 0, x: foe.x + 0.5, y: foe.y });
    await cmd(page, { type: 'attack', unitId: k.id!, targetId: foe.id });
  }
  const etc = st.buildings.find((b) => b.type === 'towncenter' && b.player === 1)!;
  for (let i = 0; i < 3; i++) {
    const r = await cmd(page, { type: 'spawn', unit: 'ram', player: 0, x: etc.x + 1 + i, y: etc.y });
    await cmd(page, { type: 'siege', unitId: r.id!, buildingId: etc.id });
  }
  await cmd(page, { type: 'tick', seconds: 400 });
  await expect
    .poll(async () => (await snap(page)).winner, { timeout: 30000 })
    .toEqual({ player: 0, reason: 'annihilation' });
  expect(errors).toEqual([]);
});
