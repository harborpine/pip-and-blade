import { defineConfig, devices } from '@playwright/test';

// A port private to this project: other projects on this PC use Vite's default preview
// port (4173) and their test runs would otherwise stop our server mid-suite.
const PORT = 47613;
const ORIGIN = `http://127.0.0.1:${PORT}`;
const BASE_URL = `${ORIGIN}/pip-and-blade/`;
// Read by tests/e2e/support (the config is loaded in every worker, so this reaches them all).
process.env.PIP_E2E_ORIGIN = ORIGIN;

// Tests run against the real production build (dist/), served by `vite preview`,
// in WebKit (Safari's engine) at iPhone size. `npm run verify` builds before this runs.
export default defineConfig({
  testDir: 'tests/e2e',
  outputDir: 'test-results',
  fullyParallel: true,
  forbidOnly: true,
  retries: 0,
  // The suite grew a lot in 0.2.0 (many phone sizes); this PC has plenty of cores.
  workers: 6,
  timeout: 120_000,
  expect: { timeout: 10_000 },
  reporter: [['list']],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'iphone-webkit',
      use: { ...devices['iPhone 14'] },
    },
  ],
  webServer: {
    command: `"${process.execPath}" node_modules/vite/bin/vite.js preview --port ${PORT} --strictPort --host 127.0.0.1`,
    url: BASE_URL,
    // Always start our own server on the fresh build; fail loudly if the port is taken
    // rather than risk testing some other app that happens to be listening there.
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
