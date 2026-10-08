import { defineConfig } from '@playwright/test';

// Porta exclusiva deste projeto (5173 = aeo4-ds, 4173/4174 = outros agentes).
// reuseExistingServer:false — nunca reusar servidor alheio (window.__game parecido).
const port = Number(process.env.E2E_PORT ?? 5216);

export default defineConfig({
  testDir: 'e2e',
  use: { baseURL: process.env.E2E_BASE_URL ?? `http://127.0.0.1:${port}` },
  webServer: process.env.E2E_NO_SERVER
    ? undefined
    : {
        command: `./node_modules/.bin/vite --port ${port} --host 127.0.0.1 --strictPort`,
        port,
        reuseExistingServer: false,
        timeout: 30000
      }
});
