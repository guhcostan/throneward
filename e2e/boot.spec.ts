import { test, expect } from '@playwright/test';

test('boot renders and exposes window.__game', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/?test=1');
  // Guarda de identidade: nunca testar o app de outro agente (portas colidem na máquina).
  await expect(page.locator('#hud-top')).toContainText('Throneward');
  const version = await page.evaluate(() => (window as unknown as { __game?: { version?: string } }).__game?.version);
  expect(version).toMatch(/^0\./);
  expect(errors).toEqual([]);
});
