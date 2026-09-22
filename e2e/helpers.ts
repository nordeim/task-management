import type { Page } from "@playwright/test";

/** Seeded demo credentials (documented public values — see README). */
export const DEMO_EMAIL = "sepnetflix2023@outlook.com";
export const DEMO_PASSWORD = "Abcd1234";

/** Sign in through the real login form and land on the dashboard. */
export async function login(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(DEMO_EMAIL);
  await page.getByLabel("Password").fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("/");
  await expectDashboardGreeting(page);
}

/** The dashboard greets the demo user by email local-part + time of day. */
export async function expectDashboardGreeting(page: Page): Promise<void> {
  const { expect } = await import("@playwright/test");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    `${greeting()}, ${DEMO_EMAIL.split("@")[0]}`,
  );
}

/** Mirrors the dashboard's greeting windows (dashboard-view.tsx). */
function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}
