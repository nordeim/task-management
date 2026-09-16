import { describe, expect, it } from "vitest";

import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  distributionBars,
  formatSavedAt,
  groupTasksByPerson,
  groupTasksByStatus,
  priorityMeta,
  resolveStatusCompletedPatch,
  statusMeta,
  timelineRange,
} from "@/lib/domain";
import type { TaskDTO, UserDTO } from "@/lib/domain";

// ---------- helpers ----------

function user(id: string, name: string): UserDTO {
  return { id, email: `${id}@example.com`, name, avatarColor: "#00d5c0" };
}

function task(overrides: Partial<TaskDTO> & { id: string }): TaskDTO {
  return {
    title: "Task",
    status: "not_started",
    priority: "low",
    groupId: "g1",
    boardId: "b1",
    dueDate: null,
    completed: false,
    position: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    owner: null,
    ...overrides,
  };
}

// ---------- existing vocabulary helpers (characterization) ----------

describe("statusMeta", () => {
  it("returns the matching status metadata", () => {
    expect(statusMeta("working").label).toBe("Working on it");
  });

  it("falls back to Not Started for unknown values", () => {
    expect(statusMeta("bogus").value).toBe("not_started");
  });
});

describe("priorityMeta", () => {
  it("returns the matching priority metadata", () => {
    expect(priorityMeta("critical").label).toBe("Critical");
  });

  it("falls back to Low for unknown values", () => {
    expect(priorityMeta("nope").value).toBe("low");
  });
});

// ---------- status <-> completed coupling (the app's spine) ----------

describe("resolveStatusCompletedPatch", () => {
  it("derives completed=true from status=done", () => {
    const out = resolveStatusCompletedPatch({ status: "done" });
    expect(out.completed).toBe(true);
  });

  it("derives completed=false from a non-done status", () => {
    for (const status of ["not_started", "working", "stuck"] as const) {
      const out = resolveStatusCompletedPatch({ status });
      expect(out.completed).toBe(false);
    }
  });

  it("derives status=done from completed=true", () => {
    const out = resolveStatusCompletedPatch({ completed: true });
    expect(out.status).toBe("done");
  });

  it("derives status=not_started from completed=false", () => {
    const out = resolveStatusCompletedPatch({ completed: false });
    expect(out.status).toBe("not_started");
  });

  it("gives status precedence when both fields are present", () => {
    const out = resolveStatusCompletedPatch({ status: "working", completed: true });
    expect(out.status).toBe("working");
    expect(out.completed).toBe(false);
  });

  it("passes patches without either field through untouched", () => {
    // Extra fields ride along: the helper only ever derives status/completed.
    const rename = { title: "renamed" };
    const out = resolveStatusCompletedPatch(rename);
    expect(out).toEqual({ title: "renamed" });
    expect("completed" in out).toBe(false);
    expect("status" in out).toBe(false);
  });
});

// ---------- timeline window math (Gantt view) ----------

describe("timelineRange", () => {
  it("builds a Monday-start 7-day window labelled 'Week of …'", () => {
    // 2026-09-16 is a Wednesday; the week window must start Mon 2026-09-14.
    const range = timelineRange("week", new Date(2026, 8, 16));
    expect(range.days).toHaveLength(7);
    expect(range.days[0].getDate()).toBe(14);
    expect(range.days[0].getDay()).toBe(1);
    expect(range.label).toBe("Week of Sep 14, 2026");
  });

  it("keeps the cursor inside its own week when the cursor is a Monday", () => {
    const range = timelineRange("week", new Date(2026, 8, 14));
    expect(range.days[0].getDate()).toBe(14);
    expect(range.days[6].getDate()).toBe(20);
  });

  it("builds a single-day window in day mode", () => {
    const range = timelineRange("day", new Date(2026, 8, 16));
    expect(range.days).toHaveLength(1);
    expect(range.label).toBe("Sep 16, 2026");
  });

  it("builds every calendar day of the cursor's month in month mode", () => {
    const range = timelineRange("month", new Date(2026, 1, 10));
    expect(range.days).toHaveLength(28);
    expect(range.days[0].getDate()).toBe(1);
    expect(range.days.at(-1)?.getDate()).toBe(28);
    expect(range.label).toBe("February 2026");
  });

  it("handles a 31-day month", () => {
    const range = timelineRange("month", new Date(2026, 2, 15));
    expect(range.days).toHaveLength(31);
  });
});

// ---------- kanban groupings ----------

describe("groupTasksByStatus", () => {
  it("buckets tasks and always exposes every status column", () => {
    const tasks = [
      task({ id: "1", status: "done" }),
      task({ id: "2", status: "done" }),
      task({ id: "3", status: "working" }),
    ];
    const groups = groupTasksByStatus(tasks);
    expect([...groups.keys()]).toEqual(TASK_STATUSES.map((s) => s.value));
    expect(groups.get("done")).toHaveLength(2);
    expect(groups.get("working")).toHaveLength(1);
    expect(groups.get("stuck")).toHaveLength(0);
  });
});

describe("groupTasksByPerson", () => {
  const jane = user("u1", "Jane Doe");
  const john = user("u2", "John Smith");
  const members = [jane, john];

  it("leads with the Unassigned column, then one column per member", () => {
    const columns = groupTasksByPerson([], members);
    expect(columns[0].key).toBe("unassigned");
    expect(columns[0].label).toBe("Unassigned");
    expect(columns[0].sublabel).toBe("No one assigned");
    expect(columns.map((c) => c.key)).toEqual(["unassigned", "u1", "u2"]);
    expect(columns[1].label).toBe("Jane Doe");
  });

  it("buckets tasks by owner id and leaves unassigned tasks in the first column", () => {
    const tasks = [
      task({ id: "1", owner: jane }),
      task({ id: "2" }),
      task({ id: "3", owner: john }),
      task({ id: "4", owner: jane }),
    ];
    const columns = groupTasksByPerson(tasks, members);
    expect(columns[0].tasks.map((t) => t.id)).toEqual(["2"]);
    expect(columns[1].tasks.map((t) => t.id)).toEqual(["1", "4"]);
    expect(columns[2].tasks.map((t) => t.id)).toEqual(["3"]);
  });
});

// ---------- analytics distribution bars ----------

describe("distributionBars", () => {
  it("computes percentages against the total count", () => {
    const bars = distributionBars([
      { key: "not_started", label: "Not Started", count: 3, color: "#e8e9eb" },
      { key: "done", label: "Done", count: 1, color: "#00ca72" },
    ]);
    expect(bars[0].pct).toBe(75);
    expect(bars[1].pct).toBe(25);
  });

  it("clamps to 0% when there is no data", () => {
    const bars = distributionBars([
      { key: "not_started", label: "Not Started", count: 0, color: "#e8e9eb" },
    ]);
    expect(bars[0].pct).toBe(0);
  });
});

// ---------- board header saved indicator ----------

describe("formatSavedAt", () => {
  it("formats like the reference 'Saved 11:54:10 PM' indicator", () => {
    expect(formatSavedAt(new Date(2026, 8, 16, 23, 54, 10))).toBe("11:54:10 PM");
  });

  it("does not zero-pad the hour", () => {
    expect(formatSavedAt(new Date(2026, 8, 16, 9, 5, 0))).toBe("9:05:00 AM");
  });
});

// ---------- vocabulary invariants (characterization) ----------

describe("closed vocabulary", () => {
  it("keeps exactly four statuses and four priorities in canonical order", () => {
    expect(TASK_STATUSES.map((s) => s.value)).toEqual(["not_started", "working", "done", "stuck"]);
    expect(TASK_PRIORITIES.map((p) => p.value)).toEqual(["low", "medium", "high", "critical"]);
  });
});
