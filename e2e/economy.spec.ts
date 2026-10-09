import { test, expect, type Page } from '@playwright/test';

type State = {
  units: { id: number; type: string; x: number; y: number; queue: { x: number; y: number }[] }[];
  resources: { food: number; wood: number; gold: number; stone: number }[];
  pop: number[];
  buildings: { id: number; type: string; player: number; x: number; y: number; progress: number; built: boolean }[];
  gatherers: { id: number; amount: number; carrying: string | null }[];
};

type Cmd = { type: string; [k: string]: unknown };
type Res = { ok: boolean; id?: number; error?: string };

const state = (page: Page): Promise<State> =>
  page.evaluate(() => (window as unknown as { __game: { getState: () => State } }).__game.getState());

const cmd = (page: Page, c: Cmd): Promise<Res> =>
  page.evaluate((cc) => (window as unknown as { __game: { command: (c: unknown) => Res } }).__game.command(cc), c);

test('build house spends wood and progresses', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/?test=1');

  const before = await state(page);
  const woodBefore = before.resources[0].wood;
  const villager = before.units.find((u) => u.type === 'villager');
  expect(villager).toBeDefined();

  const res = await cmd(page, { type: 'build', player: 0, building: 'house', x: 6, y: 6 });
  expect(res.ok).toBe(true);

  const afterOrder = await state(page);
  expect(afterOrder.resources[0].wood).toBe(woodBefore - 50);
  const house = afterOrder.buildings.find((b) => b.id === res.id);
  expect(house).toBeDefined();
  expect(house!.built).toBe(false);

  await cmd(page, { type: 'addbuilder', buildingId: res.id, unitId: villager!.id });
  await page.waitForTimeout(2000);
  const later = await state(page);
  const progress = later.buildings.find((b) => b.id === res.id)!.progress;
  expect(progress).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test('gather berries accumulates carrying', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/?test=1');

  const before = await state(page);
  const villager = before.units.find((u) => u.type === 'villager');
  expect(villager).toBeDefined();
  const food0 = before.resources[0].food;
  const res = await cmd(page, { type: 'gather', unitId: villager!.id, kind: 'berry', x: 0, y: 0, dx: 1, dy: 1 });
  expect(res.ok).toBe(true);

  // Ciclo real (anda até a fruta, acumula, entrega): viaja no tempo da simulação.
  await cmd(page, { type: 'tick', seconds: 120 });
  const later = await state(page);
  const g = later.gatherers.find((x) => x.id === villager!.id);
  expect(g).toBeDefined();
  const food1 = later.resources[0].food;
  // Acumulou no cesto ou já entregou no estoque.
  expect(g!.amount > 0 || food1 > food0).toBe(true);
  expect(errors).toEqual([]);
});

test('train villager in town center', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/?test=1');

  const before = await state(page);
  const tc = before.buildings.find((b) => b.type === 'towncenter');
  expect(tc).toBeDefined();
  expect(tc!.built).toBe(true);
  const nBefore = before.units.length;

  const res = await cmd(page, { type: 'train', buildingId: tc!.id, unit: 'villager', time: 1 });
  expect(res.ok).toBe(true);

  await expect
    .poll(async () => (await state(page)).units.length, { timeout: 15000 })
    .toBeGreaterThan(nBefore);
  expect(errors).toEqual([]);
});
