import { defineConfig } from '@playwright/test';

/**
 * Scaffold only (Phase 0, Slice 13) — no specs yet. apps/studio has no
 * real UI to click through: the Composition Root exists but isn't wired
 * to any route (Slice 9), so there's nothing true end-to-end coverage
 * could assert on without inventing placeholder behavior that doesn't
 * exist. First real spec lands with the first real page.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'pnpm run build && pnpm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
