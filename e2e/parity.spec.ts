import { expect, test } from "@playwright/test";

import { login } from "./helpers";

/**
 * Computed-style parity contracts (session 27, remediation-plan-session27.md).
 *
 * The reference compiles its login/signup surfaces under the Tailwind v3 play
 * CDN (`cdn.tailwindcss.com`), while this app compiles the same class strings
 * under Tailwind v4 — so v3→v4 renames apply on that surface. The reference's
 * authed CSS is a customized v4 build that pins `.shadow-sm` and
 * `.backdrop-blur-sm` to the v3 values. These specs pin the computed outcome
 * of every value that differs between the two compilers:
 *
 * - v3 `shadow-sm` (0.05 alpha / 1px 2px) == v4 `shadow-xs` — a literal
 *   `shadow-sm` under v4 renders at DOUBLE the reference (0.1 / 1px 3px).
 * - v3 `backdrop-blur-sm` (blur(4px)) == v4 `backdrop-blur-xs` — a literal
 *   `backdrop-blur-sm` under v4 renders blur(8px).
 * - The v3 CDN resolves ring-color cascade conflicts in class-string order
 *   (the consumer's slate-400 wins); v4 sorts `focus:` before
 *   `focus-visible:`, so the vendored base's `focus-visible:ring-ring` needs
 *   an explicit `focus-visible:ring-slate-400` consumer override.
 *
 * If any of these fail, a v3→v4 port was reverted or a class string was
 * edited away from the reference's compiled values.
 */

test.describe("platform login computed-style parity (session 27)", () => {
  test("sign-in button and card compile the reference's v3 shadow/blur values", async ({ page }) => {
    await page.goto("/login");
    const signIn = page.getByRole("button", { name: "Sign in", exact: true });

    // v3 shadow-sm == v4 shadow-xs: 0 1px 2px at 5% alpha (resting state).
    await expect
      .poll(() => signIn.evaluate((el) => getComputedStyle(el).boxShadow))
      .toContain("rgba(0, 0, 0, 0.05) 0px 1px 2px 0px");

    // The card's backdrop blur is 4px on the reference (v3 backdrop-blur-sm).
    const card = page.locator("main .rounded-2xl").first();
    await expect
      .poll(() => card.evaluate((el) => getComputedStyle(el).backdropFilter))
      .toBe("blur(4px)");
  });

  test("the Google button's hover shadow compiles to the v3 value", async ({ page }) => {
    await page.goto("/login");
    const google = page.getByRole("button", { name: "Continue with Google" });
    await google.hover();

    // hover:shadow-sm (v3) == hover:shadow-xs (v4); the button transitions
    // (transition-all duration-200), so poll until the shadow settles.
    await expect
      .poll(() => google.evaluate((el) => getComputedStyle(el).boxShadow))
      .toContain("rgba(0, 0, 0, 0.05) 0px 1px 2px 0px");
  });

  test("focused login inputs render the slate-400 platform focus ring", async ({ page }) => {
    await page.goto("/login");
    const email = page.getByLabel("Email");

    // Text inputs match :focus-visible whenever focused, so a programmatic
    // focus exercises the keyboard-focus ring. The reference resolves the
    // ring color to slate-400 — NOT the near-black --ring. Tailwind v4
    // defines slate-400 in oklch, so the computed string serializes as
    // lab()/oklch() rather than rgb(); comparing against a same-page
    // text-slate-400 probe keeps the assertion color-space-neutral.
    await email.focus();
    const { shadow, slate400 } = await email.evaluate((el) => {
      const probe = document.createElement("span");
      probe.className = "text-slate-400";
      probe.style.display = "none";
      document.body.appendChild(probe);
      const slate400 = getComputedStyle(probe).color;
      probe.remove();
      return { shadow: getComputedStyle(el).boxShadow, slate400 };
    });
    expect(shadow).toContain(slate400);
    expect(shadow).not.toContain("rgb(10, 10, 10)");
  });

  test("signup mode compiles the same values (Create account + input ring)", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Need an account? Sign up" }).click();

    const create = page.getByRole("button", { name: "Create account" });
    await expect
      .poll(() => create.evaluate((el) => getComputedStyle(el).boxShadow))
      .toContain("rgba(0, 0, 0, 0.05) 0px 1px 2px 0px");

    const password = page.getByLabel("Password", { exact: true });
    await password.focus();
    const { shadow, slate400 } = await password.evaluate((el) => {
      const probe = document.createElement("span");
      probe.className = "text-slate-400";
      probe.style.display = "none";
      document.body.appendChild(probe);
      const slate400 = getComputedStyle(probe).color;
      probe.remove();
      return { shadow: getComputedStyle(el).boxShadow, slate400 };
    });
    expect(shadow).toContain(slate400);
    expect(shadow).not.toContain("rgb(10, 10, 10)");
  });
});

test.describe("dashboard backdrop-blur parity (session 27)", () => {
  test("KPI icon tiles and gradient side cards render a 4px backdrop blur", async ({ page }) => {
    await login(page);

    // The reference's authed CSS pins .backdrop-blur-sm to blur(4px) (a v4
    // build carrying the v3 value) across 8 icon tiles + 3 side cards. Our
    // v4 build needs backdrop-blur-xs for the same computed blur.
    const tile = page.getByRole("button", { name: "Total Boards 4" }).locator(".backdrop-blur-xs, .backdrop-blur-sm").first();
    await expect
      .poll(() => tile.evaluate((el) => getComputedStyle(el).backdropFilter))
      .toBe("blur(4px)");
  });
});

/**
 * Background-token parity (session 33, remediation-plan-session32.md).
 *
 * The reference's authed build resolves the shadcn `--background` token to
 * WHITE (`0 0% 100%` — probed on its documentElement), and every
 * `bg-background` consumer renders `rgb(255, 255, 255)`: dialog panels
 * (its Board Analytics panel is an explicit `bg-white`), the board toolbar
 * and header outline buttons (Person/Filter/Sort/Hide/Group by +
 * Analytics/Integrate/Automate — probed each by name), the boards-page
 * buttons, the dashboard hero's View Analytics button, and switch thumbs
 * (thumb `rgb(255, 255, 255)` on track `rgb(229, 231, 235)`).
 *
 * This app's `:root` had drifted the token to the page gray `#f5f6f8`
 * (every consumer above rendered `rgb(245, 246, 248)`), and the
 * board-header sub-row separators used `text-muted-foreground/50`
 * (a blue-tinted ≈rgb(179,180,188)) where the reference renders its
 * `|` spans as `text-[#A0A0A0]` (opaque rgb(160,160,160) — the same
 * explicit color the clone's adjacent "N items ▪ Saved" meta already uses).
 *
 * If these fail, the token was reverted to a page-gray value or a
 * `bg-background` consumer was given an explicit gray override.
 */
test.describe("background-token parity (session 33)", () => {
  test("bg-background surfaces render the reference's white token", async ({ page }) => {
    await login(page);

    // Same-page probe keeps the assertion engine/serialization-neutral.
    const whiteOf = (target: ReturnType<typeof page.locator>) =>
      target.evaluate((el) => {
        const probe = document.createElement("div");
        probe.className = "bg-white";
        probe.style.display = "none";
        document.body.appendChild(probe);
        const white = getComputedStyle(probe).backgroundColor;
        probe.remove();
        return { actual: getComputedStyle(el).backgroundColor, white };
      });

    // 1. Dashboard hero's View Analytics button (variant="outline").
    const viewAnalytics = page.getByRole("button", { name: "View Analytics" });
    const dashboardPair = await whiteOf(viewAnalytics);
    expect(dashboardPair.actual).toBe(dashboardPair.white);

    // 2. Boards page: the Filter button (outline + bg-background consumer).
    await page.goto("/Boards");
    const filter = page.getByRole("button", { name: "Filter boards (not available)" });
    const boardsPair = await whiteOf(filter);
    expect(boardsPair.actual).toBe(boardsPair.white);

    // 3. Board page: header Analytics + toolbar Person outline buttons.
    await page.getByRole("link", { name: "Open Website Redesign" }).click();
    await page.waitForURL(/\/board\?id=/i);
    await expect(page.getByRole("button", { name: "Person", exact: true })).toBeVisible();

    const personPair = await whiteOf(page.getByRole("button", { name: "Person", exact: true }));
    expect(personPair.actual).toBe(personPair.white);

    const analyticsPair = await whiteOf(
      page.getByRole("button", { name: "Analytics", exact: true }),
    );
    expect(analyticsPair.actual).toBe(analyticsPair.white);

    // 4. Board Analytics modal: the Radix DialogContent panel (bg-background).
    await page.getByRole("button", { name: "Analytics", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    const dialogPair = await whiteOf(dialog);
    expect(dialogPair.actual).toBe(dialogPair.white);
    await page.keyboard.press("Escape");

    // 5. Integrations modal: the switch THUMB (bg-background) on its track.
    await page.getByRole("button", { name: "Integrate" }).click();
    const firstSwitch = page.getByRole("switch").first();
    await expect(firstSwitch).toBeVisible();
    const thumbPair = await whiteOf(firstSwitch.locator("span"));
    expect(thumbPair.actual).toBe(thumbPair.white);
  });

  test("board header sub-row separators render #A0A0A0 like the reference", async ({ page }) => {
    await login(page);
    await page.goto("/Boards");
    await page.getByRole("link", { name: "Open Website Redesign" }).click();
    await page.waitForURL(/\/board\?id=/i);
    await expect(page.getByRole("button", { name: "Person", exact: true })).toBeVisible();

    // The two "|" separator spans in the board header sub-row.
    const separators = page.locator('span[aria-hidden="true"]').filter({ hasText: /^\|$/ });
    await expect(separators.first()).toBeVisible();

    const pair = await separators.first().evaluate((el) => {
      const probe = document.createElement("span");
      probe.className = "text-[#A0A0A0]";
      probe.style.display = "none";
      document.body.appendChild(probe);
      const expected = getComputedStyle(probe).color;
      probe.remove();
      return { actual: getComputedStyle(el).color, expected };
    });
    expect(pair.actual).toBe(pair.expected);
  });
});
