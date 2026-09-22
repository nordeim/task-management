import { expect, test } from "@playwright/test";

import { login } from "./helpers";

/**
 * Mobile navigation regression (session 21, remediation-plan Finding 1):
 * Tailwind v4 guards every `hover:*` utility behind `@media (hover: hover)`,
 * which kills hover/tap feedback on touch devices — the reference's v3 CSS
 * applies plain `:hover`. The fix is `@custom-variant hover (&:hover);` in
 * src/app/globals.css. This spec runs in a touch-emulated context
 * (`hasTouch: true` → `(hover: none)`), the exact environment where the
 * pre-fix CSS provably failed (agent-browser reproduction, 2026-09-22):
 * the hamburger matched `:hover` while its computed background stayed
 * transparent. If this spec ever fails, the custom variant was dropped.
 */
test.use({ viewport: { width: 375, height: 812 }, hasTouch: true });

test.describe("mobile navigation menu", () => {
  test("hamburger opens the panel with nav links, search, and user section", async ({ page }) => {
    await login(page);

    // Pin the premise: this context reports no hover capability, so only the
    // v3-style plain :hover rule (the custom variant) can style feedback.
    const hoverCapable = await page.evaluate(
      () => window.matchMedia("(hover: hover)").matches,
    );
    expect(hoverCapable).toBe(false);

    await expect(page.getByRole("button", { name: "Open main menu" })).toBeVisible();
    await page.getByRole("button", { name: "Open main menu" }).click();

    await expect(page.getByRole("link", { name: "Dashboard", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "My Boards", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Analytics", exact: true })).toBeVisible();
    await expect(page.locator("#search-mobile")).toBeVisible();
    await expect(page.getByText("user@example.com")).toBeVisible();
  });

  test("hover/tap feedback applies without (hover: hover) — the v4 regression", async ({ page }) => {
    await login(page);
    const menuButton = page.getByRole("button", { name: "Open main menu" });

    // The hamburger's hover background (#E1E5F3) must apply on :hover even
    // though the device reports (hover: none) — reference v3 behavior.
    await menuButton.hover();
    await expect
      .poll(() => menuButton.evaluate((el) => getComputedStyle(el).backgroundColor))
      .toBe("rgb(225, 229, 243)");

    // Open the panel and repeat for a nav link (#F5F6F8 inactive hover).
    await menuButton.click();
    const link = page.getByRole("link", { name: "My Boards", exact: true });
    await link.hover();
    await expect
      .poll(() => link.evaluate((el) => getComputedStyle(el).backgroundColor))
      .toBe("rgb(245, 246, 248)");
  });

  test("tapping a nav link navigates and closes the panel", async ({ page }) => {
    await login(page);
    await page.getByRole("button", { name: "Open main menu" }).click();
    await page.getByRole("link", { name: "My Boards", exact: true }).click();

    await page.waitForURL(/\/boards/i);
    await expect(page.getByRole("heading", { name: "My Boards" })).toBeVisible();
    // The inline panel closes after navigation (reference behavior).
    await expect(page.getByRole("button", { name: "Open main menu" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });
});
