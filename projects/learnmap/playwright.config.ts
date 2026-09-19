import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: 'tests/e2e',
  workers: 1,
  timeout: 45000,
  webServer: [
    {
      command: 'pnpm exec tsx server/index.ts',
      url: 'http://127.0.0.1:3101/api/config',
      env: {
        PORT: '3101',
        APP_ORIGIN: 'http://127.0.0.1:5174',
        DATA_DIR: 'memory://',
        ENABLE_DEMO: 'true',
        AI_PROVIDER: 'mock',
      },
      reuseExistingServer: false,
      timeout: 60000,
    },
    {
      command: 'pnpm exec vite --host 127.0.0.1 --port 5174',
      url: 'http://127.0.0.1:5174',
      env: { LEARNMAP_API_PORT: '3101' },
      reuseExistingServer: false,
    },
  ],
  use: {
    baseURL: 'http://127.0.0.1:5174',
    channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
    headless: true,
    viewport: { width: 1280, height: 900 },
    launchOptions: {
      args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
    },
    screenshot: 'only-on-failure',
  },
  reporter: 'list',
});
