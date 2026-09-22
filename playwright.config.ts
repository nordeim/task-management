import { defineConfig, devices } from "@playwright/test";

/**
 * E2E config (golden path — PAD §10's tracked next step, delivered session 21).
 *
 * The webServer target is the PRODUCTION artifact (`bun run start` →
 * `node .next/standalone/server.js`, requires a prior `bun run build`),
 * following the scandihaven E2E lesson: validate the artifact that ships,
 * not the dev server's HMR runtime. `reuseExistingServer: true` lets a
 * server that is already listening on the port (dev or prod) be reused —
 * handy for local iteration; CI always boots the standalone build.
 *
 * Chromium-only by design: this is the browser the parity probes run in
 * and the only engine installed in the sandbox. `fullyParallel: false`
 * keeps the SQLite-backed app free of write contention between specs.
 */
const PORT = Number(process.env.E2E_PORT ?? 3000);
const baseURL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "bun run start",
        url: baseURL,
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
