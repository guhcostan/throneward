import { test, expect, type Page } from '@playwright/test';

type Unit = { id: number; x: number; y: number; queue: { x: number; y: number }[] };
type GameApi = {
  getState: () => { units: Unit[] };
  command: (cmd: { type: string; unitIds?: number[]; x?: number; y?: number; queue?: boolean }) => { ok: boolean; error?: string };
};

const readUnits = (page: Page): Promise<Unit[]> =>
  page.evaluate(() => (window as unknown as { __game: GameApi }).__game.getState().units);

const sendCommand = (page: Page, cmd: { type: string; unitIds?: number[]; x?: number; y?: number; queue?: boolean }) =>
  page.evaluate((c) => (window as unknown as { __game: GameApi }).__game.command(c), cmd);

test('move command advances units', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/?test=1');

  const before = await readUnits(page);
  expect(before.length).toBeGreaterThan(0);
  const ids = before.map((u) => u.id);

  const res = await sendCommand(page, { type: 'move', unitIds: ids, x: 10, y: 5 });
  expect(res.ok).toBe(true);

  await page.waitForTimeout(500);
  const after = await readUnits(page);

  const moved = after.filter((u) => {
    const b = before.find((v) => v.id === u.id);
    return b !== undefined && (b.x !== u.x || b.y !== u.y);
  });
  expect(moved.length).toBeGreaterThanOrEqual(1);
  expect(errors).toEqual([]);
});

test('shift queues waypoints', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/?test=1');

  const [unit] = await readUnits(page);
  expect(unit).toBeDefined();
  const id = unit.id;

  expect((await sendCommand(page, { type: 'move', unitIds: [id], x: 10, y: 5 })).ok).toBe(true);
  expect((await sendCommand(page, { type: 'move', unitIds: [id], x: -10, y: -5, queue: true })).ok).toBe(true);

  const queued = (await readUnits(page)).find((u) => u.id === id);
  expect(queued).toBeDefined();
  expect(queued!.queue.length).toBeGreaterThanOrEqual(1);

  // Positional check: the unit must still be moving over ~1s.
  const start = queued!;
  await page.waitForTimeout(1000);
  const later = (await readUnits(page)).find((u) => u.id === id);
  expect(later).toBeDefined();
  expect(later!.x !== start.x || later!.y !== start.y).toBe(true);
  expect(errors).toEqual([]);
});
