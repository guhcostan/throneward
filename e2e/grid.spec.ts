import { test, expect, type Page } from '@playwright/test';

type Unit = { id: number; type: string; player: number; x: number; y: number; queue: unknown[]; elev: number };
type Bld = { id: number; type: string; player: number; hp: number; maxHp: number; x: number; y: number };
type State = { units: Unit[]; buildings: Bld[]; walls: { id: number }[] };
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

async function clickUnit(page: Page, id: number): Promise<void> {
  const st = await snap(page);
  const u = st.units.find((x) => x.id === id)!;
  const base = await proj(page, u.x, u.y);
  // Tenta o centro e pontos vizinhos (sobreposição de cápsulas no raycast).
  for (const [dx, dy] of [[0, 0], [8, 0], [-8, 0], [0, 8], [0, -8], [12, 12]]) {
    await page.mouse.click(base.x + dx, base.y + dy);
    await page.waitForTimeout(250);
    const sel = await page.evaluate(() => {
      const g = window as unknown as { __game: { debug: { ui: () => { selected: number[] } } } };
      return g.__game.debug.ui().selected;
    });
    if (sel.includes(id)) return;
  }
  throw new Error(`não selecionou ${id}`);
}

test('grid buttons: stop clears, repair/mount/gate work', async ({ page }) => {
  test.setTimeout(180000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/?test=1&bots=0');

  let st = await snap(page);
  const vil = st.units.find((u) => u.type === 'villager')!;
  await clickUnit(page, vil.id);
  // A seleção é a unidade da frente (raycast), não necessariamente a projetada.
  const selId = await page.evaluate(() => {
    const g = window as unknown as { __game: { debug: { ui: () => { selected: number[] } } } };
    return g.__game.debug.ui().selected[0];
  });
  // Portão desabilitado com motivo (sem muralhas).
  const gateBtn = page.locator('[data-act="gate"]');
  await expect(gateBtn).toBeDisabled();
  await expect(gateBtn).toHaveAttribute('title', /requer muralha/);

  // Parar limpa a fila de movimento da selecionada.
  const stVil = (await snap(page)).units.find((u) => u.id === selId)!;
  await cmd(page, { type: 'move', unitIds: [selId], x: stVil.x + 10, y: stVil.y });
  await page.click('[data-act="stop"]');
  st = await snap(page);
  expect(st.units.find((u) => u.id === selId)!.queue.length).toBe(0);

  // Reparar via botão: danifica o TC e manda consertar.
  const tc = st.buildings.find((b) => b.type === 'towncenter' && b.player === 0)!;
  const ram = await cmd(page, { type: 'spawn', unit: 'ram', player: 1, x: tc.x + 1, y: tc.y });
  await cmd(page, { type: 'siege', unitId: ram.id!, buildingId: tc.id });
  await cmd(page, { type: 'tick', seconds: 15 });
  await cmd(page, { type: 'move', unitIds: [ram.id!], x: tc.x + 30, y: tc.y + 30 });
  await cmd(page, { type: 'tick', seconds: 30 });
  const hp0 = (await snap(page)).buildings.find((b) => b.id === tc.id)!.hp;
  expect(hp0).toBeLessThan(tc.maxHp);
  await clickUnit(page, vil.id);
  await page.click('[data-act="repair"]');
  await cmd(page, { type: 'tick', seconds: 30 });
  const hp1 = (await snap(page)).buildings.find((b) => b.id === tc.id)!.hp;
  expect(hp1).toBeGreaterThan(hp0);

  // Montar via botão: arqueiro sobe na pedra (clique com retry anti-sobreposição).
  await cmd(page, { type: 'grant', player: 0, resource: 'stone', amount: 500 });
  const wall = await cmd(page, { type: 'wall', player: 0, kind: 'stone', x1: 5, y1: -20, x2: 5, y2: -18 });
  const ar = await cmd(page, { type: 'spawn', unit: 'archer', player: 0, x: 5, y: -19 });
  await clickUnit(page, ar.id!);
  await expect(page.locator('#selection')).toContainText('archer', { timeout: 5000 });
  await page.click('[data-act="mount"]');
  st = await snap(page);
  expect(st.units.find((u) => u.id === ar.id!)!.elev).toBe(1);
  expect(wall.ok).toBe(true);
  expect(errors).toEqual([]);
});
