import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/electron',
  timeout: 90000,
  expect: { timeout: 10000 },
  workers: 1,
  retries: 0,
  forbidOnly: true,
  reporter: [['list'], ['json', { outputFile: 'artifacts/electron/results.json' }]],
  outputDir: 'artifacts/electron/tests',
});
