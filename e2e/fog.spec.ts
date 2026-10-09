import { test, expect, type Page } from '@playwright/test';

type State = {
  units: { id: number; type: string; player: number; x: number; y: number }[];
  visible: number[];
};

const snap = (page: Page): Promise<State> =>
  page.evaluate(() => (window as unknown as { __game: { getState: () => State } }).__game.getState());

test('fog hides far enemies until scouted', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/?test=1');

  const cmd = (c: unknown): Promise<{ ok: boolean; id?: number }> =>
    page.evaluate((cc) => (window as unknown as { __game: { command: (c: unknown) => { ok: boolean; id?: number } } }).__game.command(cc), c);

  let st = await snap(page);
  const foe = st.units.find((u) => u.player === 1)!;
  expect(st.visible.includes(foe.id)).toBe(false);

  // Batedor ao lado do inimigo revela.
  const scout = await cmd({ type: 'spawn', unit: 'scout', player: 0, x: foe.x + 2, y: foe.y });
  await cmd({ type: 'tick', seconds: 2 });
  st = await snap(page);
  expect(st.visible.includes(foe.id)).toBe(true);
  expect(scout.ok).toBe(true);
  expect(errors).toEqual([]);
});
