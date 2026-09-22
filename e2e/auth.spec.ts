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

  test("login rate limiting blocks the 6th failed attempt with a friendly 429", async ({ request }) => {
    // Unique throwaway email: the limiter keys on email+IP, so this spec's
    // failures cannot contaminate the demo account's budget (which only ever
    // sees one failure per run — the invalid-credentials spec — and is reset
    // by every successful sign-in).
    const email = `ratelimit-${Date.now()}@example.test`;
    const post = (password: string) =>
      request.post("/api/auth/login", {
        headers: { "Content-Type": "application/json" },
        data: { email, password },
      });

    for (let i = 0; i < 5; i++) {
      const response = await post("wrong-password");
      expect(response.status()).toBe(401);
    }

    const blocked = await post("wrong-password");
    expect(blocked.status()).toBe(429);
    expect(Number(blocked.headers()["retry-after"])).toBeGreaterThanOrEqual(1);
    const body = (await blocked.json()) as { ok: boolean; error: string };
    expect(body.ok).toBe(false);
    expect(body.error).toMatch(/too many attempts/i);
  });
});

test.describe("login surface structure (platform redesign, session 25)", () => {
  // Pins the redesigned reference login/signup surfaces — DOM-dumped from the
  // redeployed platform page 2026-09-22 (docs/remediation-plan-session25.md,
  // Finding 1). No account is created: the signup form is toggled and
  // validated structurally only, keeping the DB at the canonical seed.
  test("login mode renders the reference hero, Google button, divider, and footer", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Welcome to Task Management" })).toBeVisible();
    await expect(page.getByText("Sign in to continue")).toBeVisible();
    await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
    await expect(page.getByText("or", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Forgot password?" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Need an account? Sign up" })).toBeVisible();
  });

  test("signup mode: Back to sign in + three fields + Create account round-trip", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Need an account? Sign up" }).click();

    // The redesigned signup surface: no logo hero, no Google button, no footer.
    await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Back to sign in" })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Confirm Password")).toBeVisible();
    await expect(page.getByPlaceholder("Min. 8 characters")).toBeVisible();
    await expect(page.getByPlaceholder("Re-enter password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Create account" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Continue with Google" })).toHaveCount(0);

    // Back to sign in returns to the login surface.
    await page.getByRole("button", { name: "Back to sign in" }).click();
    await expect(page.getByRole("heading", { name: "Welcome to Task Management" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
  });

  test("signup mode flags mismatched passwords inline (no request sent)", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Need an account? Sign up" }).click();
    await page.getByLabel("Email").fill(`structure-${Date.now()}@example.test`);
    await page.getByLabel("Password", { exact: true }).fill("Abcd1234");
    await page.getByLabel("Confirm Password").fill("Different99");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText(/passwords do not match/i)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();
  });
});
