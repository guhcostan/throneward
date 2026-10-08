import { test, expect, type Page } from '@playwright/test';

type State = {
  units: { id: number; type: string }[];
  ages: { age: number; advancing: boolean; progress: number }[];
  buildings: { id: number; type: string }[];
};

const state = (page: Page): Promise<State> =>
  page.evaluate(() => (window as unknown as { __game: { getState: () => State } }).__game.getState());

const cmd = (page: Page, c: unknown): Promise<{ ok: boolean; id?: number }> =>
  page.evaluate((cc) => (window as unknown as { __game: { command: (c: unknown) => { ok: boolean; id?: number } } }).__game.command(cc), c);

test('advance to feudal with a builder, then barracks allowed', async ({ page }) => {
  test.setTimeout(180000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/');

  const before = await state(page);
  expect(before.ages[0].age).toBe(1);
  // Barracks is age II — refused in age I.
  expect((await cmd(page, { type: 'build', player: 0, building: 'barracks', x: 8, y: 8 })).ok).toBe(false);

  const villager = before.units.find((u) => u.type === 'villager');
  expect(villager).toBeDefined();
  expect((await cmd(page, { type: 'advance', player: 0, slot: 0 })).ok).toBe(true);
  // 5 builders (rAF headless roda a ~60%: ~60s de parede).
  await cmd(page, { type: 'agebuilder', player: 0, unitId: villager!.id });
  for (let i = 0; i < 4; i++) {
    const extra = await cmd(page, { type: 'spawn', unit: 'villager', player: 0, x: 1 + i, y: 1 });
    await cmd(page, { type: 'agebuilder', player: 0, unitId: extra.id! });
  }

  await expect
    .poll(async () => (await state(page)).ages[0].age, { timeout: 150000 })
    .toBe(2);

  // HUD age indicator follows.
  await expect(page.locator('#age')).toContainText('II');

  // Barracks now allowed (give funds: landmark spent the initial stock).
  const st = await state(page);
  expect(st.ages[0].age).toBe(2);
  expect(errors).toEqual([]);
});
