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

  /**
   * Hamburger DOM parity (session 37, remediation-plan Findings 1–2):
   * the reference's accessible name comes from an sr-only span INSIDE the
   * button — it carries no aria-label — and both state icons render with
   * the `block` utility (`lucide-menu block h-6 w-6` / `lucide-x block
   * h-6 w-6`, probed live in both states). The clone originally used
   * aria-label + bare h-6 w-6 icons; this spec pins the ported pattern.
   * (`aria-expanded` stays: the CLAUDE.md a11y floor — a documented
   * deliberate deviation the reference lacks.)
   */
  test("hamburger DOM mirrors the reference's sr-only accessible-name pattern", async ({ page }) => {
    await login(page);
    const menuButton = page.getByRole("button", { name: "Open main menu" });

    // No aria-label: the name comes from the sr-only span (reference pattern).
    await expect(menuButton).not.toHaveAttribute("aria-label");
    const srOnly = menuButton.locator("span.sr-only");
    await expect(srOnly).toHaveText("Open main menu");

    // Closed state: Menu icon with the reference's `block` utility.
    await expect(menuButton.locator("svg.lucide-menu")).toHaveClass(/block/);
    await expect(menuButton.locator("svg.lucide-menu")).toHaveClass(/h-6 w-6/);

    // Open state: X icon, same utilities, sr-only name unchanged.
    await menuButton.click();
    await expect(menuButton.locator("svg.lucide-x")).toHaveClass(/block/);
    await expect(menuButton.locator("svg.lucide-x")).toHaveClass(/h-6 w-6/);
    await expect(menuButton.locator("span.sr-only")).toHaveText("Open main menu");
  });
});
