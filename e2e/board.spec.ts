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

  // Session 31: the dialog-based mutation paths were re-verified by hand every
  // session (worklog sessions 19–29) but not pinned by the suite. The three
  // specs below convert that manual smoke into permanent regression coverage,
  // each using the established restore-to-seed pattern (mutate → assert
  // persistence → restore → assert seed state).

  test("task creation via the New Task dialog persists and the row trash deletes it", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/Boards");
    await page.getByRole("link", { name: "Open Website Redesign" }).click();
    await page.waitForURL(/\/board\?id=/i);
    await expect(page.getByRole("heading", { name: "Discovery" })).toBeVisible();

    // Self-heal: a previously failed run may have left a spec task behind
    // (the auth spec pins the seeded task counts, so residue poisons the
    // suite). The sweep runs through the page's own fetch — same-origin
    // requests carry the session cookie (Playwright's request contexts
    // provably do not).
    await page.evaluate(async () => {
      const boards = (await (await fetch("/api/boards")).json()).data as Array<{
        id: string;
        title: string;
      }>;
      const board = boards.find((b) => b.title === "Website Redesign");
      const detail = (await (await fetch(`/api/boards/${board!.id}`)).json()).data as {
        groups: Array<{ tasks: Array<{ id: string; title: string }> }>;
      };
      for (const group of detail.groups) {
        for (const task of group.tasks) {
          if (task.title.startsWith("E2E spec task")) {
            await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
          }
        }
      }
    });
    // Unique per run — belt-and-suspenders against strict-mode collisions.
    const taskTitle = `E2E spec task ${Date.now()}`;

    // Create through the reference's New Task dialog flow.
    await page.getByRole("button", { name: "New Task" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Create New Task" })).toBeVisible();
    await dialog.getByLabel("Task Title").fill(taskTitle);
    await dialog.getByRole("button", { name: "Create Task" }).click();
    // exact: the row's Actions trigger ("Actions for <title>")
    // substring-matches the task name otherwise (strict mode).
    await expect(page.getByRole("button", { name: taskTitle, exact: true })).toBeVisible();

    // The mutation round-tripped through the API + SQLite.
    await page.reload();
    await expect(page.getByRole("button", { name: taskTitle, exact: true })).toBeVisible();

    // Row trash delete (the reference's hover-revealed action menu).
    await page.getByRole("button", { name: `Actions for ${taskTitle}` }).click();
    await page.getByRole("menuitem", { name: "Delete Task" }).click();
    await expect(page.getByRole("button", { name: taskTitle, exact: true })).toHaveCount(0);

    // Deletion persisted too (restore complete — the board stays at seed).
    await page.reload();
    await expect(page.getByRole("button", { name: taskTitle, exact: true })).toHaveCount(0);
  });

  test("board create, edit via Options, and delete round-trips the boards list", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/Boards");
    await expect(page.getByRole("heading", { name: "My Boards" })).toBeVisible();

    // Self-heal: sweep boards left behind by a previously failed run (the
    // auth spec pins the seeded board count, so residue poisons the suite).
    // In-page fetch: same-origin requests carry the session cookie.
    await page.evaluate(async () => {
      const boards = (await (await fetch("/api/boards")).json()).data as Array<{
        id: string;
        title: string;
      }>;
      for (const b of boards) {
        if (b.title.startsWith("Spec Board s31")) {
          await fetch(`/api/boards/${b.id}`, { method: "DELETE" });
        }
      }
    });

    // Create a board (the toolbar button opens the dialog; the submit button
    // of the same name lives inside it).
    await page.getByRole("button", { name: "Create Board" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Create New Board" })).toBeVisible();
    await dialog.getByLabel("Board Title").fill("Spec Board s31");
    await dialog.getByRole("button", { name: "Create Board" }).click();
    await page.waitForURL(/\/board\?id=/i);
    await expect(page.getByRole("heading", { name: "Spec Board s31" })).toBeVisible();

    // Back on the boards list, the new card renders.
    await page.goto("/Boards");
    await expect(page.getByRole("link", { name: "Open Spec Board s31" })).toBeVisible();

    // Rename through the card footer's Options → Edit Board.
    const card = page
      .locator("div[class*='rounded-xl']")
      .filter({ has: page.getByRole("heading", { name: "Spec Board s31" }) });
    await card.getByRole("button", { name: "Options" }).click();
    await page.getByRole("menuitem", { name: "Edit Board" }).click();
    const editDialog = page.getByRole("dialog");
    await editDialog.getByLabel("Board Title").fill("Spec Board s31 renamed");
    await editDialog.getByRole("button", { name: "Save Changes" }).click();
    await expect(
      page.getByRole("link", { name: "Open Spec Board s31 renamed" }),
    ).toBeVisible();

    // Delete through Options → Delete Board → the confirm dialog.
    const renamedCard = page
      .locator("div[class*='rounded-xl']")
      .filter({ has: page.getByRole("heading", { name: "Spec Board s31 renamed" }) });
    await renamedCard.getByRole("button", { name: "Options" }).click();
    await page.getByRole("menuitem", { name: "Delete Board" }).click();
    await page.getByRole("button", { name: "Delete board" }).click();
    await expect(
      page.getByRole("link", { name: "Open Spec Board s31 renamed" }),
    ).toHaveCount(0);

    // The seeded boards are intact (restore complete — the list is at seed).
    await expect(page.getByRole("link", { name: "Open Website Redesign" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Q4 Product Launch", exact: true }),
    ).toBeVisible();
  });

  test("group collapse persists across reload and restores", async ({ page }) => {
    await login(page);
    await page.goto("/Boards");
    await page.getByRole("link", { name: "Open Website Redesign" }).click();
    await page.waitForURL(/\/board\?id=/i);

    // The Build group's tasks render (rows leave the DOM when collapsed —
    // board-table.tsx mounts them under `{!collapsed && …}`).
    const buildTask = page.getByText("Set up CMS collections", { exact: true });
    const buildHeader = page.getByRole("heading", { name: "Build", exact: true });
    await expect(buildHeader).toBeVisible();
    // Self-heal: a previously failed run may have left the group collapsed.
    if (!(await buildTask.isVisible())) {
      await buildHeader.click();
    }
    await expect(buildTask).toBeVisible();

    // Clicking the header (clicks bubble to the cursor-pointer zone) collapses.
    await buildHeader.click();
    await expect(buildTask).toHaveCount(0);

    // The optimistic collapse round-tripped through the API + SQLite.
    await page.reload();
    await expect(buildTask).toHaveCount(0);

    // Restore the seed state.
    await page.getByRole("heading", { name: "Build", exact: true }).click();
    await expect(buildTask).toBeVisible();
  });
});
