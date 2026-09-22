import { expect, test } from "@playwright/test";

import { login } from "./helpers";

test.describe("real URL routes (reference surface)", () => {
  test("capitalized and lowercase spellings both work (case-insensitive)", async ({ page }) => {
    await login(page);
    await page.goto("/Boards");
    await expect(page.getByRole("heading", { name: "My Boards" })).toBeVisible();
    await page.goto("/boards");
    await expect(page.getByRole("heading", { name: "My Boards" })).toBeVisible();
  });

  test("analytics page renders the dashboard-grade stat surface", async ({ page }) => {
    await login(page);
    await page.goto("/Analytics");
    await expect(page.getByText("Completion Rate").first()).toBeVisible();
  });

  test("unknown paths render the styled 404", async ({ page }) => {
    await login(page);
    await page.goto("/this-route-does-not-exist");
    await expect(page.getByRole("heading", { name: "404", exact: true })).toBeVisible();
  });

  test("browser back/forward works across real routes", async ({ page }) => {
    await login(page);
    await page.goto("/Boards");
    await page.goto("/Analytics");
    await page.goBack();
    await page.waitForURL(/\/boards/i);
    await expect(page.getByRole("heading", { name: "My Boards" })).toBeVisible();
    await page.goForward();
    await page.waitForURL(/\/analytics/i);
    await expect(page.getByText("Completion Rate").first()).toBeVisible();
  });
});
