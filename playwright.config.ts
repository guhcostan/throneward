import { defineConfig } from '@playwright/test';

const port = Number(process.env.E2E_PORT ?? 5173);

export default defineConfig({
  testDir: 'e2e',
  use: { baseURL: process.env.E2E_BASE_URL ?? `http://127.0.0.1:${port}` },
  webServer: {
    command: `pnpm dev --port ${port} --host 127.0.0.1`,
    port,
    reuseExistingServer: true,
    timeout: 30000
  }
});
