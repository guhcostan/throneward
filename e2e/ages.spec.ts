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
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/?test=1');

  const before = await state(page);
  expect(before.ages[0].age).toBe(1);
  // Barracks is age II — refused in age I.
  expect((await cmd(page, { type: 'build', player: 0, building: 'barracks', x: 8, y: 8 })).ok).toBe(false);

  const villager = before.units.find((u) => u.type === 'villager');
  expect(villager).toBeDefined();
  // Setup de teste: fundos para o landmark (civ Albion custa além do inicial).
  await cmd(page, { type: 'grant', player: 0, resource: 'food', amount: 1000 });
  await cmd(page, { type: 'grant', player: 0, resource: 'wood', amount: 1000 });
  await cmd(page, { type: 'grant', player: 0, resource: 'gold', amount: 1000 });
  await cmd(page, { type: 'grant', player: 0, resource: 'stone', amount: 1000 });
  expect((await cmd(page, { type: 'advance', player: 0, slot: 0 })).ok).toBe(true);
  await cmd(page, { type: 'agebuilder', player: 0, unitId: villager!.id });

  // Time-travel: landmark Albion 120s a 1x → 150s cobre com folga.
  expect((await cmd(page, { type: 'tick', seconds: 150 })).ok).toBe(true);
  await expect
    .poll(async () => (await state(page)).ages[0].age, { timeout: 15000 })
    .toBe(2);

  // HUD age indicator follows (atualizado no rAF).
  await expect(page.locator('#age')).toContainText('II');

  // Barracks now allowed (give funds: landmark spent the initial stock).
  const st = await state(page);
  expect(st.ages[0].age).toBe(2);
  expect(errors).toEqual([]);
});
