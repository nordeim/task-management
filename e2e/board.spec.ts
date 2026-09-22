import { expect, test } from "@playwright/test";

import { login } from "./helpers";

test.describe("board golden path", () => {
  test("boards list renders the seeded boards and opens a board", async ({ page }) => {
    await login(page);
    await page.goto("/Boards");
    await expect(page.getByRole("heading", { name: "My Boards" })).toBeVisible();
    const firstBoard = page.getByText("Website Redesign", { exact: true }).first();
    await expect(firstBoard).toBeVisible();

    await page.getByRole("link", { name: "Open Website Redesign" }).click();
    await page.waitForURL(/\/board\?id=/i);
    // The table's group zones render the board's groups once data lands.
    await expect(page.getByText("Discovery").first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Back to boards" })).toBeVisible();
  });

  test("status pill change persists across reload (status↔completed coupling)", async ({ page }) => {
    await login(page);
    await page.goto("/Boards");
    await page.getByRole("link", { name: "Open Website Redesign" }).click();
    await page.waitForURL(/\/board\?id=/i);

    // Wait for the table's first status pill, remembering its original state.
    const statusButton = page
      .getByRole("button", { name: /^Status: (Not Started|Working on it|Done|Stuck), change status$/ })
      .first();
    await expect(statusButton).toBeVisible();
    const originalLabel = (await statusButton.getAttribute("aria-label")) as string;
    const originalStatus = originalLabel.replace(/^Status: /, "").replace(/, change status$/, "");

    // Change to a DIFFERENT status through the reference's Select flow.
    const targetStatus = originalStatus === "Done" ? "Working on it" : "Done";
    await statusButton.click();
    await page.getByRole("option", { name: targetStatus, exact: true }).click();
    await expect(
      page
        .getByRole("button", { name: `Status: ${targetStatus}, change status` })
        .first(),
    ).toBeVisible();

    // Persistence: the mutation round-tripped through the API + SQLite.
    await page.reload();
    await expect(
      page
        .getByRole("button", { name: `Status: ${targetStatus}, change status` })
        .first(),
    ).toBeVisible();

    // Restore the seed state (the suite leaves the board task-for-task intact).
    await page
      .getByRole("button", { name: `Status: ${targetStatus}, change status` })
      .first()
      .click();
    await page.getByRole("option", { name: originalStatus, exact: true }).click();
    await expect(
      page
        .getByRole("button", { name: `Status: ${originalStatus}, change status` })
        .first(),
    ).toBeVisible();
  });
});
