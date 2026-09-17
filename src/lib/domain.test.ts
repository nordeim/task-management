import { describe, expect, it } from "vitest";

import {
  BOARD_COLORS,
  GROUP_COLOR_OPTIONS,
  KANBAN_CARD_BORDER,
  ROUTE_PATHS,
  TASK_PRIORITIES,
  TASK_STATUSES,
  VISIBILITY_OPTIONS,
  VIEW_TRIGGER_LABELS,
  distributionBars,
  filterTasks,
  formatRecentTaskTime,
  formatSavedAt,
  groupSummary,
  groupTasksByPerson,
  groupTasksByStatus,
  notFoundTitle,
  priorityBadgeStyle,
  priorityMeta,
  relativeBoardTime,
  resolveStatusCompletedPatch,
  sortTasks,
  statusMeta,
  timelineRange,
  validateBoardColor,
  visibilityLabel,
  visibleColumns,
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
    updatedAt: "2026-01-01T00:00:00.000Z",
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

// ---------- reference palette (probed 2026-09-17, session 4) ----------

describe("status colors (current reference)", () => {
  it("uses the monday-canonical status hexes", () => {
    expect(TASK_STATUSES.map((s) => s.bg)).toEqual(["#c4c4c4", "#ffcb00", "#00c875", "#e2445c"]);
  });

  it("renders white pill text for every status, matching the reference", () => {
    for (const s of TASK_STATUSES) {
      expect(s.text).toBe("#ffffff");
    }
  });
});

describe("priority colors (current reference)", () => {
  it("uses the monday-canonical priority hexes", () => {
    expect(TASK_PRIORITIES.map((p) => p.color)).toEqual(["#787d80", "#ffcb00", "#fdab3d", "#e2445c"]);
  });
});

describe("priorityBadgeStyle", () => {
  it("tints the badge background at 12.5% alpha with a solid colored text", () => {
    expect(priorityBadgeStyle("low")).toEqual({ backgroundColor: "#787d8020", color: "#787d80" });
    expect(priorityBadgeStyle("critical")).toEqual({ backgroundColor: "#e2445c20", color: "#e2445c" });
  });

  it("falls back to Low for unknown values", () => {
    expect(priorityBadgeStyle("bogus").color).toBe("#787d80");
  });
});

describe("BOARD_COLORS (current reference)", () => {
  it("offers the six reference swatches in order", () => {
    expect(BOARD_COLORS.map((c) => c.value)).toEqual([
      "#0073ea",
      "#00c875",
      "#ffcb00",
      "#e2445c",
      "#a25ddb",
      "#00d9ff",
    ]);
  });

  it("validates only palette members", () => {
    expect(validateBoardColor("#0073ea")).toBe(true);
    expect(validateBoardColor("#ff642e")).toBe(false);
  });
});

// ---------- board visibility vocabulary (edit-board dialog) ----------

describe("VISIBILITY_OPTIONS", () => {
  it("offers exactly private and public", () => {
    expect(VISIBILITY_OPTIONS.map((v) => v.value)).toEqual(["private", "public"]);
  });

  it("labels them Private / Shared like the reference dialog", () => {
    expect(VISIBILITY_OPTIONS.map((v) => v.label)).toEqual(["Private", "Shared"]);
  });
});

describe("visibilityLabel", () => {
  it("maps values to reference labels", () => {
    expect(visibilityLabel("private")).toBe("Private");
    expect(visibilityLabel("public")).toBe("Shared");
  });

  it("lowercases for card badges", () => {
    expect(visibilityLabel("private", true)).toBe("private");
    expect(visibilityLabel("public", true)).toBe("shared");
  });
});

// ---------- toolbar Filter popover seam (status + priority + person + search) ----------

describe("filterTasks", () => {
  const jane = user("u1", "Jane Doe");
  const tasks = [
    task({ id: "1", title: "Write spec", status: "working", priority: "high", owner: jane }),
    task({ id: "2", title: "Design logo", status: "not_started", priority: "low" }),
    task({ id: "3", title: "Ship release", status: "done", priority: "critical", owner: jane }),
    task({ id: "4", title: "Write tests", status: "stuck", priority: "low" }),
  ];

  it("returns everything when no criteria are set", () => {
    expect(filterTasks(tasks, {})).toHaveLength(4);
  });

  it("filters by a set of statuses", () => {
    const out = filterTasks(tasks, { statuses: ["working", "done"] });
    expect(out.map((t) => t.id)).toEqual(["1", "3"]);
  });

  it("filters by a set of priorities", () => {
    const out = filterTasks(tasks, { priorities: ["low"] });
    expect(out.map((t) => t.id)).toEqual(["2", "4"]);
  });

  it("combines status and priority criteria with AND semantics", () => {
    const out = filterTasks(tasks, { statuses: ["working", "stuck"], priorities: ["low"] });
    expect(out.map((t) => t.id)).toEqual(["4"]);
  });

  it("keeps the person filter and search working alongside the new criteria", () => {
    const out = filterTasks(tasks, { personId: "u1", search: "write" });
    expect(out.map((t) => t.id)).toEqual(["1"]);
  });

  it("matches search case-insensitively on the title", () => {
    const out = filterTasks(tasks, { search: "SHIP" });
    expect(out.map((t) => t.id)).toEqual(["3"]);
  });

  it("treats an empty status set as no constraint (not as match-nothing)", () => {
    expect(filterTasks(tasks, { statuses: [] })).toHaveLength(4);
    expect(filterTasks(tasks, { priorities: [] })).toHaveLength(4);
  });
});

// ---------- toolbar Sort popover seam (Task Name / Created Date / Updated Date) ----------

describe("sortTasks", () => {
  const tasks = [
    task({ id: "1", title: "Beta", createdAt: "2026-03-02T00:00:00.000Z", updatedAt: "2026-05-01T00:00:00.000Z" }),
    task({ id: "2", title: "Alpha", createdAt: "2026-01-02T00:00:00.000Z", updatedAt: "2026-02-01T00:00:00.000Z" }),
    task({ id: "3", title: "Gamma", createdAt: "2026-02-02T00:00:00.000Z", updatedAt: "2026-04-01T00:00:00.000Z" }),
  ];

  it("sorts by title ascending and descending", () => {
    expect(sortTasks(tasks, { field: "title", dir: "asc" }).map((t) => t.id)).toEqual(["2", "1", "3"]);
    expect(sortTasks(tasks, { field: "title", dir: "desc" }).map((t) => t.id)).toEqual(["3", "1", "2"]);
  });

  it("sorts by created date", () => {
    expect(sortTasks(tasks, { field: "createdAt", dir: "asc" }).map((t) => t.id)).toEqual(["2", "3", "1"]);
    expect(sortTasks(tasks, { field: "createdAt", dir: "desc" }).map((t) => t.id)).toEqual(["1", "3", "2"]);
  });

  it("sorts by updated date", () => {
    expect(sortTasks(tasks, { field: "updatedAt", dir: "asc" }).map((t) => t.id)).toEqual(["2", "3", "1"]);
    expect(sortTasks(tasks, { field: "updatedAt", dir: "desc" }).map((t) => t.id)).toEqual(["1", "3", "2"]);
  });

  it("does not mutate the input array", () => {
    const copy = [...tasks];
    sortTasks(tasks, { field: "title", dir: "asc" });
    expect(tasks.map((t) => t.id)).toEqual(copy.map((t) => t.id));
  });
});

// ---------- toolbar Hide popover seam (Show/Hide Columns) ----------

describe("visibleColumns", () => {
  it("returns all five columns in canonical order by default", () => {
    const cols = visibleColumns([]);
    expect(cols.map((c) => c.key)).toEqual(["task", "priority", "status", "owner", "dueDate"]);
  });

  it("drops hidden columns from the ordered list", () => {
    const cols = visibleColumns(["priority", "dueDate"]);
    expect(cols.map((c) => c.key)).toEqual(["task", "status", "owner"]);
  });

  it("ignores unknown keys and tolerates duplicates", () => {
    const cols = visibleColumns(["bogus", "status", "status"]);
    expect(cols.map((c) => c.key)).toEqual(["task", "priority", "owner", "dueDate"]);
  });

  it("exposes a grid template that shrinks with the visible column count", () => {
    const all = visibleColumns([]);
    const fewer = visibleColumns(["priority"]);
    expect(all[0].templateCells).toBe(5);
    expect(fewer[0].templateCells).toBe(4);
    expect(fewer.map((c) => c.templateCells)).toEqual([4, 4, 4, 4]);
  });
});

// ---------- table footer summary row seam ----------

describe("groupSummary", () => {
  it("counts items and per-priority occurrences", () => {
    const tasks = [
      task({ id: "1", priority: "low" }),
      task({ id: "2", priority: "low" }),
      task({ id: "3", priority: "critical" }),
      task({ id: "4", priority: "high", status: "done" }),
    ];
    const summary = groupSummary(tasks);
    expect(summary.items).toBe(4);
    expect(summary.done).toBe(1);
    expect(summary.priorities).toEqual([
      { label: "low", count: 2 },
      { label: "high", count: 1 },
      { label: "critical", count: 1 },
    ]);
  });

  it("returns zeroed counters for an empty group", () => {
    const summary = groupSummary([]);
    expect(summary.items).toBe(0);
    expect(summary.done).toBe(0);
    expect(summary.priorities).toEqual([]);
  });

  it("omits priorities with zero occurrences", () => {
    const summary = groupSummary([task({ id: "1", priority: "medium" })]);
    expect(summary.priorities).toEqual([{ label: "medium", count: 1 }]);
  });
});

// ---------- boards-card relative time ("about N hours ago") ----------

describe("relativeBoardTime", () => {
  it("renders 'just now' for fresh updates", () => {
    expect(relativeBoardTime(new Date(), new Date())).toBe("just now");
  });

  it("renders minutes without the 'about' prefix", () => {
    const now = new Date(2026, 8, 16, 12, 0, 0);
    const then = new Date(2026, 8, 16, 11, 44, 0);
    expect(relativeBoardTime(then, now)).toBe("16 minutes ago");
  });

  it("renders hours and days with the 'about' prefix like the reference", () => {
    const now = new Date(2026, 8, 16, 12, 0, 0);
    expect(relativeBoardTime(new Date(2026, 8, 16, 1, 0, 0), now)).toBe("about 11 hours ago");
    expect(relativeBoardTime(new Date(2026, 8, 14, 12, 0, 0), now)).toBe("about 2 days ago");
  });

  it("falls back to a calendar date beyond a week", () => {
    const now = new Date(2026, 8, 16, 12, 0, 0);
    expect(relativeBoardTime(new Date(2026, 7, 1, 12, 0, 0), now)).toBe("Aug 1");
  });
});

// ---------- session-5 reference vocabulary (probed 2026-09-17) ----------

describe("VIEW_TRIGGER_LABELS", () => {
  it("shows the short labels the reference renders on the view dropdown trigger", () => {
    expect(VIEW_TRIGGER_LABELS.table).toBe("Main table");
    expect(VIEW_TRIGGER_LABELS.kanban).toBe("Kanban");
    expect(VIEW_TRIGGER_LABELS.calendar).toBe("Calendar");
    expect(VIEW_TRIGGER_LABELS.timeline).toBe("Timeline");
    expect(VIEW_TRIGGER_LABELS.unassigned).toBe("Unassigned Tasks");
  });

  it("covers exactly the five board sub-views", () => {
    expect(Object.keys(VIEW_TRIGGER_LABELS).sort()).toEqual(
      ["calendar", "kanban", "table", "timeline", "unassigned"],
    );
  });
});

describe("KANBAN_CARD_BORDER", () => {
  it("is the fixed neutral border the reference renders on every kanban card", () => {
    // Probed with both a Done and a Not Started card — same neutral color,
    // so the card accent is NOT status-driven on the reference.
    expect(KANBAN_CARD_BORDER).toBe("#E1E5F3");
  });
});

describe("GROUP_COLOR_OPTIONS", () => {
  it("lists the seven Add New Group swatches in reference order", () => {
    expect(GROUP_COLOR_OPTIONS.map((c) => c.value)).toEqual([
      "#0073ea",
      "#00c875",
      "#ffcb00",
      "#e2445c",
      "#a25ddb",
      "#00d9ff",
      "#676879",
    ]);
  });

  it("names every swatch like the reference titles", () => {
    expect(GROUP_COLOR_OPTIONS.map((c) => c.name)).toEqual([
      "Ocean Blue",
      "Success Green",
      "Warning Orange",
      "Danger Red",
      "Purple",
      "Teal",
      "Gray",
    ]);
  });
});

describe("notFoundTitle", () => {
  it("titlecases the last path segment like the reference 404 page", () => {
    // Reference: /unassigned -> "Unassigned | Task Management"
    expect(notFoundTitle("/unassigned")).toBe("Unassigned");
  });

  it("splits hyphenated segments into words", () => {
    // Reference: /boards/does-not-exist -> "Does Not Exist | Task Management"
    expect(notFoundTitle("/boards/does-not-exist")).toBe("Does Not Exist");
  });

  it("handles nested segments and stray slashes", () => {
    expect(notFoundTitle("/a/b/missing-page/")).toBe("Missing Page");
  });

  it("falls back to Not Found for a bare root", () => {
    expect(notFoundTitle("/")).toBe("Not Found");
  });
});

describe("ROUTE_PATHS", () => {
  it("maps the four app views onto the reference's real routes", () => {
    expect(ROUTE_PATHS).toEqual({
      dashboard: "/",
      boards: "/Boards",
      board: "/Board",
      analytics: "/Analytics",
    });
  });
});

describe("formatRecentTaskTime", () => {
  it("renders the reference's 'Sep 17, 1:36 AM' dashboard activity format", () => {
    expect(formatRecentTaskTime(new Date("2026-09-17T01:36:00"))).toBe("Sep 17, 1:36 AM");
  });

  it("pads minutes and lowers the meridiem", () => {
    expect(formatRecentTaskTime(new Date("2026-12-05T13:05:00"))).toBe("Dec 5, 1:05 PM");
  });

  it("renders midnight without a leading zero hour", () => {
    expect(formatRecentTaskTime(new Date("2026-01-09T00:08:00"))).toBe("Jan 9, 12:08 AM");
  });
});
