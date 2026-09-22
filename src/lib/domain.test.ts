import { describe, expect, it } from "vitest";

import {
  BOARD_COLORS,
  GROUP_COLOR_OPTIONS,
  KANBAN_CARD_BORDER,
  PEOPLE_COLUMN_PALETTE,
  ROUTE_PATHS,
  TASK_PRIORITIES,
  TASK_STATUSES,
  VISIBILITY_OPTIONS,
  VIEW_TRIGGER_LABELS,
  avatarGradient,
  avatarInitials,
  calendarCells,
  distributionBars,
  distributionEntries,
  boardStats,
  distinctOwnerNames,
  filterTasks,
  formatBoardActivityTime,
  deriveSignupName,
  isNavActive,
  isOverdueDate,
  recentActivityItems,
  formatRecentTaskTime,
  formatSavedAt,
  groupSummary,
  groupTasksByPerson,
  groupTasksByStatus,
  memberPopoverPalette,
  notFoundTitle,
  priorityBadgeStyle,
  priorityMeta,
  relativeBoardTime,
  resolveStatusCompletedPatch,
  sortTasks,
  statusHeaderDots,
  statusMeta,
  summaryDateLabel,
  summaryOwnerLabel,
  teamAvatarPalette,
  teamWorkload,
  timelineRange,
  validateBoardColor,
  visibilityLabel,
  visibleColumns,
} from "@/lib/domain";
import type { TaskDTO, UserDTO } from "@/lib/domain";

// ---------- helpers ----------

function user(id: string, name: string): UserDTO {
  return { id, email: `${id}@example.com`, name, avatarColor: "#00d5c0", role: "Editor", online: true };
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

  it("names the third and sixth swatches like the live dialog (re-probed 2026-09-17)", () => {
    // The live Create Board dialog titles its swatches "Warning Orange"
    // (#ffcb00) and "Teal" (#00d9ff) — same values as the old
    // "Sunny Yellow" / "Cyan" names.
    expect(BOARD_COLORS.map((c) => c.name)).toEqual([
      "Ocean Blue",
      "Success Green",
      "Warning Orange",
      "Danger Red",
      "Purple",
      "Teal",
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
    const out = filterTasks(tasks, { personIds: ["u1"], search: "write" });
    expect(out.map((t) => t.id)).toEqual(["1"]);
  });

  it("accepts several selected people at once (reference multi-select)", () => {
    const bob = user("u2", "Bob Roe");
    const mixed = [
      ...tasks,
      task({ id: "5", title: "Bob task", status: "working", priority: "high", owner: bob }),
    ];
    const out = filterTasks(mixed, { personIds: ["u1", "u2"] });
    expect(out.map((t) => t.id)).toEqual(["1", "3", "5"]);
  });

  it("treats an empty person selection as no constraint", () => {
    expect(filterTasks(tasks, { personIds: [] })).toHaveLength(4);
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

  it("sorts by priority using the vocabulary order (low first asc, critical first desc)", () => {
    const mixed = [
      task({ id: "a", priority: "high" }),
      task({ id: "b", priority: "low" }),
      task({ id: "c", priority: "critical" }),
      task({ id: "d", priority: "medium" }),
    ];
    expect(sortTasks(mixed, { field: "priority", dir: "asc" }).map((t) => t.id)).toEqual([
      "b",
      "d",
      "a",
      "c",
    ]);
    expect(sortTasks(mixed, { field: "priority", dir: "desc" }).map((t) => t.id)).toEqual([
      "c",
      "a",
      "d",
      "b",
    ]);
  });

  it("sorts by status using the vocabulary order", () => {
    const mixed = [
      task({ id: "a", status: "done" }),
      task({ id: "b", status: "not_started" }),
      task({ id: "c", status: "stuck" }),
      task({ id: "d", status: "working" }),
    ];
    expect(sortTasks(mixed, { field: "status", dir: "asc" }).map((t) => t.id)).toEqual([
      "b",
      "d",
      "a",
      "c",
    ]);
  });

  it("sorts by owner name with unowned tasks last (asc and desc)", () => {
    const jane = user("u1", "Jane Doe");
    const bob = user("u2", "Bob Roe");
    const mixed = [
      task({ id: "a", owner: jane }),
      task({ id: "b" }),
      task({ id: "c", owner: bob }),
    ];
    expect(sortTasks(mixed, { field: "owner", dir: "asc" }).map((t) => t.id)).toEqual([
      "c",
      "a",
      "b",
    ]);
    // Descending keeps nulls last too (stable reference behavior: nulls never lead).
    expect(sortTasks(mixed, { field: "owner", dir: "desc" }).map((t) => t.id)).toEqual([
      "a",
      "c",
      "b",
    ]);
  });

  it("sorts by due date with dateless tasks last", () => {
    const mixed = [
      task({ id: "a", dueDate: "2026-09-24T12:00:00.000Z" }),
      task({ id: "b" }),
      task({ id: "c", dueDate: "2026-09-15T12:00:00.000Z" }),
    ];
    expect(sortTasks(mixed, { field: "dueDate", dir: "asc" }).map((t) => t.id)).toEqual([
      "c",
      "a",
      "b",
    ]);
    expect(sortTasks(mixed, { field: "dueDate", dir: "desc" }).map((t) => t.id)).toEqual([
      "a",
      "c",
      "b",
    ]);
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
  it("counts items and per-priority occurrences in first-encounter order (reference quirk)", () => {
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
      { label: "critical", count: 1 },
      { label: "high", count: 1 },
    ]);
    expect(summary.overflowCount).toBe(0);
  });

  it("caps the badge list at three and counts the extra types (reference '+N')", () => {
    const tasks = [
      task({ id: "1", priority: "high" }),
      task({ id: "2", priority: "medium" }),
      task({ id: "3", priority: "critical" }),
      task({ id: "4", priority: "low" }),
      task({ id: "5", priority: "medium" }),
    ];
    const summary = groupSummary(tasks);
    expect(summary.priorities).toEqual([
      { label: "high", count: 1 },
      { label: "medium", count: 2 },
      { label: "critical", count: 1 },
    ]);
    expect(summary.overflowCount).toBe(1);
  });

  it("returns zeroed counters for an empty group", () => {
    const summary = groupSummary([]);
    expect(summary.items).toBe(0);
    expect(summary.done).toBe(0);
    expect(summary.priorities).toEqual([]);
    expect(summary.overflowCount).toBe(0);
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

// ---------- session 7: reference-drift seams ----------

describe("isNavActive", () => {
  it("matches the exact href, case-sensitively, like the reference", () => {
    expect(isNavActive("/Boards", "/Boards")).toBe(true);
    expect(isNavActive("/Analytics", "/Analytics")).toBe(true);
    expect(isNavActive("/Dashboard", "/Dashboard")).toBe(true);
  });

  it("does not highlight lowercase rewrites of the same route", () => {
    expect(isNavActive("/boards", "/Boards")).toBe(false);
    expect(isNavActive("/analytics", "/Analytics")).toBe(false);
  });

  it("does not highlight Dashboard on the root path (href mismatch)", () => {
    expect(isNavActive("/", "/Dashboard")).toBe(false);
  });

  it("does not highlight anything on a board detail URL", () => {
    expect(isNavActive("/Board?id=abc", "/Board")).toBe(false);
    expect(isNavActive("/Board?id=abc", "/Boards")).toBe(false);
  });
});

describe("calendarCells", () => {
  it("renders only the weeks needed — 35 cells for September 2026", () => {
    const cells = calendarCells(new Date(2026, 8, 1));
    expect(cells).toHaveLength(35);
    expect(cells[0].toISOString()).toContain("2026-08-30"); // Sun before Sep 1
    expect(cells[cells.length - 1].toISOString()).toContain("2026-10-03"); // Sat of week 5
  });

  it("renders 28 cells when a month exactly fills four Sun-first weeks", () => {
    // Feb 1 2026 is a Sunday and 2026 is not a leap year.
    const cells = calendarCells(new Date(2026, 1, 1));
    expect(cells).toHaveLength(28);
    expect(cells[0].getDate()).toBe(1);
    expect(cells[cells.length - 1].getDate()).toBe(28);
  });

  it("renders 42 cells for a month spilling across six weeks", () => {
    // Aug 1 2026 is a Saturday -> 6 leading days + 31 days = 37 -> 6 weeks.
    const cells = calendarCells(new Date(2026, 7, 1));
    expect(cells).toHaveLength(42);
    expect(cells[0].toISOString()).toContain("2026-07-26");
    expect(cells[cells.length - 1].toISOString()).toContain("2026-09-05");
  });

  it("always starts on a Sunday and spans consecutive days", () => {
    const cells = calendarCells(new Date(2026, 8, 1));
    expect(cells[0].getDay()).toBe(0);
    const noon = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12).getTime();
    for (let i = 1; i < cells.length; i++) {
      expect(noon(cells[i]) - noon(cells[i - 1])).toBe(24 * 60 * 60 * 1000);
    }
  });
});

describe("summaryDateLabel", () => {
  it("is empty when no task has a due date", () => {
    expect(summaryDateLabel([null, null])).toBe("");
    expect(summaryDateLabel([])).toBe("");
  });

  it("renders a single short date when all dates are the same day", () => {
    expect(summaryDateLabel(["2026-09-25T12:00:00.000Z", "2026-09-25T12:00:00.000Z"])).toBe("Sep 25");
  });

  it("renders a min-max range when dates differ", () => {
    expect(summaryDateLabel(["2026-09-25T12:00:00.000Z", "2026-09-18T12:00:00.000Z"])).toBe("Sep 18 - Sep 25");
  });

  it("ignores nulls mixed with real dates", () => {
    expect(summaryDateLabel([null, "2026-09-25T12:00:00.000Z"])).toBe("Sep 25");
  });
});

describe("summaryOwnerLabel", () => {
  it("is empty with no owners", () => {
    expect(summaryOwnerLabel([null, null])).toBe("");
    expect(summaryOwnerLabel([])).toBe("");
  });

  it("counts assigned owners as 'N people' — even one", () => {
    expect(summaryOwnerLabel(["u1"])).toBe("1 people");
    expect(summaryOwnerLabel(["u1", null, "u2", "u3"])).toBe("3 people");
  });
});

describe("teamAvatarPalette", () => {
  it("colors the visible team row by position like the reference", () => {
    expect(teamAvatarPalette(0)).toBe("bg-blue-500");
    expect(teamAvatarPalette(1)).toBe("bg-green-500");
    expect(teamAvatarPalette(2)).toBe("bg-purple-500");
  });

  it("clamps out-of-range positions to the last color", () => {
    expect(teamAvatarPalette(3)).toBe("bg-purple-500");
    expect(teamAvatarPalette(99)).toBe("bg-purple-500");
  });
});

describe("memberPopoverPalette", () => {
  it("colors popover members by id modulo 3 like the reference", () => {
    expect(memberPopoverPalette("3")).toBe("bg-blue-500"); // 3 % 3 === 0
    expect(memberPopoverPalette("1")).toBe("bg-green-500"); // 1 % 3 === 1
    expect(memberPopoverPalette("2")).toBe("bg-purple-500"); // 2 % 3 === 2
    expect(memberPopoverPalette("4")).toBe("bg-green-500"); // 4 % 3 === 1
  });

  it("hashes non-numeric ids deterministically into the same palette", () => {
    const first = memberPopoverPalette("cmu572z45000xr10jah0q56q6");
    expect(["bg-blue-500", "bg-green-500", "bg-purple-500"]).toContain(first);
    expect(memberPopoverPalette("cmu572z45000xr10jah0q56q6")).toBe(first);
  });
});

// ---------- session-9 seams: kanban avatars, group header dots, people columns ----------

describe("avatarGradient (reference kanban avatar palette)", () => {
  it("indexes the 8-gradient palette by the first character's char code", () => {
    // "J" = 74; 74 % 8 = 2 -> the #4facfe -> #00f2fe gradient (probed live
    // for owner "John Doe" on the reference's kanban card).
    expect(avatarGradient("John Doe")).toBe("linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)");
    // "M" = 77; 77 % 8 = 5 -> #a8edea -> #fed6e3 (probed for "Mike Wilson" -> "MI").
    expect(avatarGradient("Mike Wilson")).toBe("linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)");
    // "A" = 65; 65 % 8 = 1 -> #f093fb -> #f5576c.
    expect(avatarGradient("Alice")).toBe("linear-gradient(135deg, #f093fb 0%, #f5576c 100%)");
  });

  it("wraps around at the palette boundary (char code 8 -> index 0)", () => {
    expect(avatarGradient("\b")).toBe("linear-gradient(135deg, #667eea 0%, #764ba2 100%)");
    expect(avatarGradient("\t")).toBe("linear-gradient(135deg, #f093fb 0%, #f5576c 100%)");
  });

  it("is deterministic for the same name", () => {
    expect(avatarGradient("Jane Smith")).toBe(avatarGradient("Jane Smith"));
  });
});

describe("avatarInitials (reference 2-char initials)", () => {
  it("takes the first two characters uppercased (substring, not word initials)", () => {
    // Probed live: John Doe -> "JO", Jane Smith -> "JA", Mike Wilson -> "MI".
    expect(avatarInitials("John Doe")).toBe("JO");
    expect(avatarInitials("Jane Smith")).toBe("JA");
    expect(avatarInitials("Mike Wilson")).toBe("MI");
  });

  it("pads gracefully for single-character names", () => {
    expect(avatarInitials("A")).toBe("A");
    expect(avatarInitials("")).toBe("?");
  });
});

describe("statusHeaderDots (group header per-status dots)", () => {
  it("renders one dot per status in first-encounter order with counts", () => {
    // Mirrors the live probe: tasks ordered [done, working, working,
    // not_started, stuck] produce green "1", yellow "2", gray "1", red "1".
    const tasks = [
      task({ id: "1", status: "done" }),
      task({ id: "2", status: "working" }),
      task({ id: "3", status: "working" }),
      task({ id: "4", status: "not_started" }),
      task({ id: "5", status: "stuck" }),
    ];
    const dots = statusHeaderDots(tasks);
    expect(dots.map((d) => [d.label, d.count])).toEqual([
      ["Done", 1],
      ["Working on it", 2],
      ["Not Started", 1],
      ["Stuck", 1],
    ]);
  });

  it("carries each status's reference color", () => {
    const dots = statusHeaderDots([task({ id: "1", status: "stuck" })]);
    expect(dots[0]!.color).toBe("#e2445c");
  });

  it("returns an empty list for an empty group", () => {
    expect(statusHeaderDots([])).toEqual([]);
  });
});

describe("distinctOwnerNames (people columns / person filter source)", () => {
  it("lists owners in first-encounter order without duplicates", () => {
    const jane = user("u1", "Jane Doe");
    const john = user("u2", "John Doe");
    const tasks = [
      task({ id: "1", owner: john }),
      task({ id: "2", owner: jane }),
      task({ id: "3", owner: john }),
      task({ id: "4" }),
      task({ id: "5", owner: jane }),
    ];
    expect(distinctOwnerNames(tasks)).toEqual(["John Doe", "Jane Doe"]);
  });

  it("ignores unowned tasks", () => {
    expect(distinctOwnerNames([task({ id: "1" }), task({ id: "2" })])).toEqual([]);
  });
});

describe("PEOPLE_COLUMN_PALETTE (kanban people column badge colors)", () => {
  it("matches the reference's 8-color LE palette including its duplicate", () => {
    expect(PEOPLE_COLUMN_PALETTE).toEqual([
      "#6C5CE7",
      "#A29BFE",
      "#FD79A8",
      "#E17055",
      "#00B894",
      "#0984E3",
      "#6C5CE7",
      "#FDCB6E",
    ]);
  });
});

// ---------- session-11 seams: analytics ordering + board modals ----------

describe("distributionEntries (site analytics row order + zero omission)", () => {
  it("counts keys in first-encounter order over the given (updated-desc) sequence", () => {
    // Reference probe: items sorted -updated_date → W, Done, NS, Stuck rendered.
    const tasks = [
      task({ id: "1", status: "working" }),
      task({ id: "2", status: "done" }),
      task({ id: "3", status: "not_started" }),
      task({ id: "4", status: "stuck" }),
      task({ id: "5", status: "working" }),
      task({ id: "6", status: "not_started" }),
    ];
    const entries = distributionEntries(tasks, (t) => t.status);
    expect(entries).toEqual([
      { key: "working", count: 2 },
      { key: "done", count: 1 },
      { key: "not_started", count: 2 },
      { key: "stuck", count: 1 },
    ]);
  });

  it("omits keys that never appear (the reference drops zero-count rows)", () => {
    const tasks = [task({ id: "1", status: "not_started" })];
    expect(distributionEntries(tasks, (t) => t.status)).toEqual([
      { key: "not_started", count: 1 },
    ]);
  });

  it("returns an empty list when nothing is encountered", () => {
    expect(distributionEntries([], (t: TaskDTO) => t.status)).toEqual([]);
  });

  it("skips null keys (unowned tasks contribute no rows)", () => {
    const john = user("u1", "John Doe");
    const tasks = [
      task({ id: "1", owner: john }),
      task({ id: "2" }),
      task({ id: "3" }),
    ];
    expect(distributionEntries(tasks, (t) => (t.owner ? t.owner.name : null))).toEqual([
      { key: "John Doe", count: 1 },
    ]);
  });
});

describe("teamWorkload (Board Analytics modal owner counts)", () => {
  it("counts per-owner task totals in first-encounter order", () => {
    const john = user("u1", "John Doe");
    const jane = user("u2", "Jane Smith");
    const tasks = [
      task({ id: "1", owner: john }),
      task({ id: "2", owner: jane }),
      task({ id: "3", owner: john }),
      task({ id: "4" }),
      task({ id: "5", owner: jane }),
    ];
    expect(teamWorkload(tasks)).toEqual([
      { name: "John Doe", count: 2 },
      { name: "Jane Smith", count: 2 },
    ]);
  });

  it("caps the list at the reference's slice(0,5)", () => {
    const owners = ["A", "B", "C", "D", "E", "F", "G"].map((n, i) => user(`u${i}`, `${n} Owner`));
    const tasks = owners.map((o, i) => task({ id: String(i), owner: o }));
    expect(teamWorkload(tasks)).toHaveLength(5);
    expect(teamWorkload(tasks)[0]).toEqual({ name: "A Owner", count: 1 });
  });

  it("returns empty when no task has an owner (modal hides the card)", () => {
    expect(teamWorkload([task({ id: "1" }), task({ id: "2" })])).toEqual([]);
  });
});

describe("recentActivityItems (Board Analytics modal feed)", () => {
  it("sorts by updatedAt desc and slices to the limit (default 5)", () => {
    const tasks = [
      task({ id: "1", updatedAt: "2026-09-17T10:00:00.000Z" }),
      task({ id: "2", updatedAt: "2026-09-17T22:01:00.000Z" }),
      task({ id: "3", updatedAt: "2026-09-16T08:00:00.000Z" }),
      task({ id: "4", updatedAt: "2026-09-18T09:00:00.000Z" }),
      task({ id: "5", updatedAt: "2026-09-17T12:00:00.000Z" }),
      task({ id: "6", updatedAt: "2026-09-15T00:00:00.000Z" }),
    ];
    expect(recentActivityItems(tasks).map((t) => t.id)).toEqual(["4", "2", "5", "1", "3"]);
  });

  it("does not mutate the input array", () => {
    const tasks = [
      task({ id: "1", updatedAt: "2026-09-17T10:00:00.000Z" }),
      task({ id: "2", updatedAt: "2026-09-17T22:01:00.000Z" }),
    ];
    const copy = [...tasks];
    recentActivityItems(tasks);
    expect(tasks.map((t) => t.id)).toEqual(copy.map((t) => t.id));
  });

  it("returns fewer items when the board is smaller than the limit", () => {
    expect(recentActivityItems([task({ id: "1" })])).toHaveLength(1);
  });
});

describe("boardStats (Board Analytics modal headline numbers)", () => {
  it("computes total, done, completionRate, and overdue", () => {
    const now = new Date("2026-09-18T12:00:00.000Z");
    const tasks = [
      task({ id: "1", status: "done", completed: true, dueDate: "2026-09-10T12:00:00.000Z" }),
      task({ id: "2", status: "not_started", dueDate: "2026-09-16T12:00:00.000Z" }),
      task({ id: "3", status: "working" }),
      task({ id: "4", status: "done", completed: true }),
      task({ id: "5", status: "stuck", dueDate: "2026-09-25T12:00:00.000Z" }),
    ];
    expect(boardStats(tasks, now)).toEqual({
      total: 5,
      done: 2,
      completionRate: 40,
      overdue: 1,
    });
  });

  it("an overdue-but-done task is not counted (reference: status !== Done)", () => {
    const now = new Date("2026-09-18T12:00:00.000Z");
    const tasks = [
      task({ id: "1", status: "done", completed: true, dueDate: "2026-09-10T12:00:00.000Z" }),
    ];
    expect(boardStats(tasks, now).overdue).toBe(0);
  });

  it("returns zeros for an empty board", () => {
    expect(boardStats([], new Date())).toEqual({
      total: 0,
      done: 0,
      completionRate: 0,
      overdue: 0,
    });
  });
});

describe("isOverdueDate (date-cell overdue boundary, decompiled pZ)", () => {
  // The reference's rule (decompiled from pZ): a date is overdue when
  // `new Date(e) < new Date && new Date(e).toDateString() !==
  // new Date().toDateString()` — strictly before now AND not today.
  // Due dates live at local noon, so "today after noon" must NOT render red.
  it("yesterday's noon date is overdue", () => {
    const now = new Date(2026, 8, 18, 15, 30);
    expect(isOverdueDate(new Date(2026, 8, 17, 12, 0), now)).toBe(true);
  });

  it("today at noon is NOT overdue (the clone's old < now bug)", () => {
    const now = new Date(2026, 8, 18, 15, 30);
    expect(isOverdueDate(new Date(2026, 8, 18, 12, 0), now)).toBe(false);
  });

  it("today at 00:01 is NOT overdue", () => {
    const now = new Date(2026, 8, 18, 0, 1);
    expect(isOverdueDate(new Date(2026, 8, 18, 12, 0), now)).toBe(false);
  });

  it("today at 23:59 is NOT overdue even though the date is before now", () => {
    const now = new Date(2026, 8, 18, 23, 59);
    expect(isOverdueDate(new Date(2026, 8, 18, 12, 0), now)).toBe(false);
  });

  it("an instant exactly equal to now is NOT overdue (same day)", () => {
    const now = new Date(2026, 8, 18, 12, 0);
    expect(isOverdueDate(now, now)).toBe(false);
  });

  it("a future date is NOT overdue", () => {
    const now = new Date(2026, 8, 18, 15, 30);
    expect(isOverdueDate(new Date(2026, 8, 25, 12, 0), now)).toBe(false);
  });

  it("today at 00:00 midnight (start of day) with the date at noon is NOT overdue", () => {
    const now = new Date(2026, 8, 18, 0, 0);
    expect(isOverdueDate(new Date(2026, 8, 18, 12, 0), now)).toBe(false);
  });

  it("the last millisecond before midnight yesterday is overdue", () => {
    const now = new Date(2026, 8, 18, 0, 0);
    expect(isOverdueDate(new Date(2026, 8, 17, 23, 59, 59, 999), now)).toBe(true);
  });
});

describe("formatBoardActivityTime (Board Analytics modal 24-hour stamp)", () => {
  it("formats as 'MMM d, HH:mm' with zero-padded 24-hour time", () => {
    expect(formatBoardActivityTime(new Date(2026, 8, 17, 22, 1))).toBe("Sep 17, 22:01");
    expect(formatBoardActivityTime(new Date(2026, 8, 5, 9, 5))).toBe("Sep 5, 09:05");
    expect(formatBoardActivityTime(new Date(2026, 0, 2, 0, 0))).toBe("Jan 2, 00:00");
  });
});

describe("deriveSignupName (platform signup display name, session 25)", () => {
  /**
   * The redesigned platform signup form (reference redeploy, 2026-09-22)
   * collects NO Full name — the display name is derived from the email
   * prefix (observable on the reference: the demo account
   * sepnetflix2023@outlook.com renders as "sepnetflix2023"). See
   * docs/remediation-plan-session25.md, Finding 1.
   */
  it("derives the local part of a plain email", () => {
    expect(deriveSignupName("sepnetflix2023@outlook.com")).toBe("sepnetflix2023");
    expect(deriveSignupName("ada.lovelace@example.com")).toBe("ada.lovelace");
  });

  it("trims surrounding whitespace before splitting", () => {
    expect(deriveSignupName("  pete@pop-os.dev ")).toBe("pete");
  });

  it("returns the whole string when there is no @ (defensive)", () => {
    expect(deriveSignupName("nope")).toBe("nope");
  });

  it("falls back to 'user' for an empty local part", () => {
    expect(deriveSignupName("@example.com")).toBe("user");
    expect(deriveSignupName("")).toBe("user");
    expect(deriveSignupName("   ")).toBe("user");
  });
});
