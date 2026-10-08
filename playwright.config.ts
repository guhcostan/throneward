import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  use: { baseURL: 'http://127.0.0.1:5173' },
  webServer: {
    command: 'pnpm dev --port 5173',
    port: 5173,
    reuseExistingServer: true,
    timeout: 30000
  }
});
