import { test, expect } from '@playwright/test';

test('boot renders and exposes window.__game', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/');
  await expect(page.locator('#hud-top')).toBeVisible();
  const version = await page.evaluate(() => (window as unknown as { __game?: { version?: string } }).__game?.version);
  expect(version).toBeTruthy();
  expect(errors).toEqual([]);
});
