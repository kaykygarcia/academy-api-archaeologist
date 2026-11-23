import { defineConfig, devices } from '@playwright/test';

const externalURL = process.env.E2E_BASE_URL;
const baseURL = externalURL || 'http://127.0.0.1:4173';

export default defineConfig({
  testDir: './e2e',
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL, trace: 'retain-on-failure', serviceWorkers: 'block' },
  projects: [
    {
      name: 'chromium',
      testIgnore: '**/mobile.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile',
      testMatch: '**/mobile.spec.ts',
      use: { ...devices['Pixel 7'] },
    },
  ],
  webServer: externalURL
    ? undefined
    : {
        command: 'pnpm build && pnpm preview',
        url: baseURL,
        reuseExistingServer: false,
        timeout: 120_000,
      },
});
