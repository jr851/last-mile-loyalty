import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // Run sequentially - tests depend on order
  forbidOnly: true,
  retries: 1,
  workers: 1,
  reporter: 'html',
  timeout: 30000,
  use: {
    baseURL: process.env.E2E_BASE_URL || 'https://lastmileloyalty.com',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 14'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'Desktop Chrome',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
