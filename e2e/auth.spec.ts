import { expect, test } from "@playwright/test";

import { DEMO_EMAIL, login } from "./helpers";

test.describe("auth golden path", () => {
  test("sign in with the seeded demo account lands on the dashboard", async ({ page }) => {
    await login(page);
    // KPI cards render the seeded dataset (README "Verify Setup" numbers).
    await expect(page.getByRole("button", { name: "Total Boards 4" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Pending Tasks 18" })).toBeVisible();
  });

  test("invalid credentials stay on /login with the form error", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(DEMO_EMAIL);
    await page.getByLabel("Password").fill("wrong-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL(/\/login/);
    await expect(page.getByText(/invalid/i)).toBeVisible();
  });

  test("logged-out visit to a protected route redirects to /login?from_url", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto("/Boards");
    await expect(page).toHaveURL(/\/login\?from_url=/);
    await expect(page.getByRole("heading", { name: "Welcome to Task Management" })).toBeVisible();
    await context.close();
  });
});
