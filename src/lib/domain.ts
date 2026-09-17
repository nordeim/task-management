// Domain vocabulary shared by the API routes and the client views.
// Single source of truth for status/priority metadata and board palette.

// Colors probed from the live reference on 2026-09-17 (session 4) — the
// app was redeployed after session 3 with monday.com's canonical palette.
// Pill text is white on every status, including grey Not Started: that is
// what the reference renders (an accepted contrast deviation for parity).
export const TASK_STATUSES = [
  { value: "not_started", label: "Not Started", bg: "#c4c4c4", text: "#ffffff" },
  { value: "working", label: "Working on it", bg: "#ffcb00", text: "#ffffff" },
  { value: "done", label: "Done", bg: "#00c875", text: "#ffffff" },
  { value: "stuck", label: "Stuck", bg: "#e2445c", text: "#ffffff" },
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number]["value"];

export const TASK_PRIORITIES = [
  { value: "low", label: "Low", color: "#787d80" },
  { value: "medium", label: "Medium", color: "#ffcb00" },
  { value: "high", label: "High", color: "#fdab3d" },
  { value: "critical", label: "Critical", color: "#e2445c" },
] as const;

export type TaskPriority = (typeof TASK_PRIORITIES)[number]["value"];

// The six theme swatches offered by the create/edit board dialogs
// (re-probed 2026-09-17: values unchanged, but the live dialog titles the
// third swatch "Warning Orange" and the sixth "Teal").
export const BOARD_COLORS = [
  { name: "Ocean Blue", value: "#0073ea" },
  { name: "Success Green", value: "#00c875" },
  { name: "Warning Orange", value: "#ffcb00" },
  { name: "Danger Red", value: "#e2445c" },
  { name: "Purple", value: "#a25ddb" },
  { name: "Teal", value: "#00d9ff" },
] as const;

/** Whether a color belongs to the board palette (Zod-free check for shared use). */
export function validateBoardColor(value: string): boolean {
  return BOARD_COLORS.some((c) => c.value === value);
}

// The seven swatches of the reference's "Add New Group" dialog (probed
// 2026-09-17). Different set from BOARD_COLORS: adds Gray #676879 and names
// the third swatch "Warning Orange". Selected swatch renders with a dark
// ring + scale-110; the group's border-left accent uses the chosen value.
export const GROUP_COLOR_OPTIONS = [
  { name: "Ocean Blue", value: "#0073ea" },
  { name: "Success Green", value: "#00c875" },
  { name: "Warning Orange", value: "#ffcb00" },
  { name: "Danger Red", value: "#e2445c" },
  { name: "Purple", value: "#a25ddb" },
  { name: "Teal", value: "#00d9ff" },
  { name: "Gray", value: "#676879" },
] as const;

// The view dropdown TRIGGER shows short labels while the menu lists the
// long ones (probed 2026-09-17: trigger reads "Main table", "Kanban",
// "Calendar", "Timeline", "Unassigned Tasks").
export const VIEW_TRIGGER_LABELS = {
  table: "Main table",
  kanban: "Kanban",
  calendar: "Calendar",
  timeline: "Timeline",
  unassigned: "Unassigned Tasks",
} as const;

export type BoardSubView = keyof typeof VIEW_TRIGGER_LABELS;

// Kanban card accent (probed 2026-09-17): a FIXED neutral left border on
// every card — Done and Not Started cards both render #E1E5F3, so the
// accent is not status-driven on the reference.
export const KANBAN_CARD_BORDER = "#E1E5F3";

// Board visibility — the closed vocabulary behind the create/edit board
// dialogs. Stored values stay private|public (API-stable); the reference
// labels the open option "Shared" (probed 2026-09-17).
export const VISIBILITY_OPTIONS = [
  { value: "private", label: "Private" },
  { value: "public", label: "Shared" },
] as const;

export type BoardVisibility = (typeof VISIBILITY_OPTIONS)[number]["value"];

/** Valid PATCH targets for the edit-board dialog (visibility included). */
export function isBoardVisibility(value: string): value is BoardVisibility {
  return VISIBILITY_OPTIONS.some((v) => v.value === value);
}

/** Reference display label for a stored visibility value ("private"→"Private", "public"→"Shared"). */
export function visibilityLabel(value: string, lowercase = false): string {
  const option = VISIBILITY_OPTIONS.find((v) => v.value === value) ?? VISIBILITY_OPTIONS[0];
  return lowercase ? option.label.toLowerCase() : option.label;
}

export function statusMeta(value: string) {
  return TASK_STATUSES.find((s) => s.value === value) ?? TASK_STATUSES[0];
}

export function priorityMeta(value: string) {
  return TASK_PRIORITIES.find((p) => p.value === value) ?? TASK_PRIORITIES[0];
}

/**
 * The reference priority badge recipe: background at 12.5% alpha over the
 * solid priority color as text (8-digit hex; 0x20/0xff = 32/255 = 12.5%).
 */
export function priorityBadgeStyle(value: string): { backgroundColor: string; color: string } {
  const meta = priorityMeta(value);
  return { backgroundColor: `${meta.color}20`, color: meta.color };
}

// ---------- pure domain logic (unit-tested in domain.test.ts) ----------

/**
 * The status <-> completed coupling — one fact stored in two columns.
 * Both the PATCH handler and the client mirror call this so the table
 * checkbox, status pill, kanban, and analytics can never disagree.
 * `status` wins when both fields are present, mirroring the server route.
 */
export interface StatusCompletedPatch {
  status?: TaskStatus;
  completed?: boolean;
}

export function resolveStatusCompletedPatch<T extends object>(
  patch: T & StatusCompletedPatch,
): T & StatusCompletedPatch {
  if (patch.status !== undefined) {
    return { ...patch, completed: patch.status === "done" };
  }
  if (patch.completed !== undefined) {
    return { ...patch, status: patch.completed ? "done" : "not_started" };
  }
  return patch;
}

/** Zoom modes of the timeline (Gantt) view, mirroring the reference app. */
export type TimelineMode = "day" | "week" | "month";

export interface TimelineRange {
  /** First day of the window (a Monday in week mode). */
  start: Date;
  /** Inclusive last day of the window. */
  end: Date;
  /** Every day column to render, in order. */
  days: Date[];
  /** Header label, e.g. "Week of Sep 14, 2026" / "Sep 16, 2026" / "September 2026". */
  label: string;
}

function atLocalNoon(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(12, 0, 0, 0);
  return copy;
}

/**
 * Window math for the timeline view. Weeks start on Monday (the reference
 * renders Mon…Sun columns); months span their own calendar days.
 */
export function timelineRange(mode: TimelineMode, cursor: Date): TimelineRange {
  const base = atLocalNoon(cursor);
  if (mode === "day") {
    return { start: base, end: base, days: [base], label: dayLabel(base) };
  }
  if (mode === "week") {
    // Monday-start week: (getDay()+6)%7 maps Sun=0…Sat=6 to Mon=0…Sun=6.
    const offsetToMonday = (base.getDay() + 6) % 7;
    const start = new Date(base);
    start.setDate(base.getDate() - offsetToMonday);
    const days = Array.from({ length: 7 }, (_, i) => {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      return day;
    });
    return { start, end: days[6], days, label: `Week of ${dayLabel(start)}` };
  }
  const first = new Date(base.getFullYear(), base.getMonth(), 1, 12, 0, 0, 0);
  const dayCount = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
  const days = Array.from({ length: dayCount }, (_, i) => {
    const day = new Date(first);
    day.setDate(first.getDate() + i);
    return day;
  });
  return { start: first, end: days[dayCount - 1], days, label: monthLabel(base) };
}

function dayLabel(date: Date): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

function monthLabel(date: Date): string {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
}

/** Kanban: bucket tasks into the four status columns (all keys always present). */
export function groupTasksByStatus(tasks: TaskDTO[]): Map<TaskStatus, TaskDTO[]> {
  const map = new Map<TaskStatus, TaskDTO[]>(TASK_STATUSES.map((s) => [s.value, []]));
  for (const t of tasks) {
    map.get(t.status)?.push(t);
  }
  return map;
}

/** Kanban "People" mode: a column per member, unassigned first. */
export interface PersonColumn {
  key: string;
  label: string;
  sublabel: string | null;
  user: UserDTO | null;
  tasks: TaskDTO[];
}

// ---------- toolbar Filter popover (status + priority + person + search) ----------

/** Filter criteria applied together (AND semantics) by the board toolbar. */
export interface TaskFilterCriteria {
  search?: string;
  /** Multi-select person filter (reference: checkboxes over distinct owners). */
  personIds?: readonly string[];
  statuses?: readonly TaskStatus[];
  priorities?: readonly TaskPriority[];
}

/**
 * The board toolbar's filter pipeline. Empty/absent criteria are no-ops —
 * an empty status set must NOT mean "match nothing". `personIds` is
 * OR-within, AND-with-everything-else, like the reference.
 */
export function filterTasks(tasks: TaskDTO[], criteria: TaskFilterCriteria): TaskDTO[] {
  const query = criteria.search?.trim().toLowerCase() ?? "";
  const statuses = criteria.statuses ?? [];
  const priorities = criteria.priorities ?? [];
  const personIds = criteria.personIds ?? [];
  return tasks.filter((t) => {
    if (query && !t.title.toLowerCase().includes(query)) return false;
    if (personIds.length > 0 && !(t.owner && personIds.includes(t.owner.id))) return false;
    if (statuses.length > 0 && !statuses.includes(t.status)) return false;
    if (priorities.length > 0 && !priorities.includes(t.priority)) return false;
    return true;
  });
}

// ---------- toolbar Sort popover (Task Name / dates / every column) ----------

export type SortField =
  | "title"
  | "createdAt"
  | "updatedAt"
  | "priority"
  | "status"
  | "owner"
  | "dueDate";
export type SortDir = "asc" | "desc";

export interface SortSpec {
  field: SortField;
  dir: SortDir;
}

const PRIORITY_ORDER: Record<TaskPriority, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};
const STATUS_ORDER: Record<TaskStatus, number> = {
  not_started: 0,
  working: 1,
  done: 2,
  stuck: 3,
};

/**
 * Sorts a copy — the input array is never mutated. The reference's Sort
 * menu offers every column; vocabulary fields sort by their array order,
 * owner by name and dueDate by time, each with nulls/empties last in BOTH
 * directions (the reference's comparator never floats nulls to the top).
 */
export function sortTasks(tasks: TaskDTO[], spec: SortSpec): TaskDTO[] {
  const sorted = [...tasks];
  const dir = spec.dir === "asc" ? 1 : -1;
  sorted.sort((a, b) => {
    // Null-ish keys (no owner / no due date) always sort LAST, in both
    // directions — the direction flip below never applies to them.
    if (spec.field === "owner" || spec.field === "dueDate") {
      const aEmpty =
        spec.field === "owner" ? a.owner === null : a.dueDate === null;
      const bEmpty =
        spec.field === "owner" ? b.owner === null : b.dueDate === null;
      if (aEmpty || bEmpty) {
        if (aEmpty && bEmpty) return 0;
        return aEmpty ? 1 : -1;
      }
    }
    let cmp: number;
    switch (spec.field) {
      case "title":
        cmp = a.title.localeCompare(b.title);
        break;
      case "createdAt":
      case "updatedAt":
        cmp = new Date(a[spec.field]).getTime() - new Date(b[spec.field]).getTime();
        break;
      case "priority":
        cmp = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
        break;
      case "status":
        cmp = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
        break;
      case "owner":
        cmp = (a.owner?.name ?? "").localeCompare(b.owner?.name ?? "");
        break;
      case "dueDate":
        cmp =
          new Date(a.dueDate ?? 0).getTime() - new Date(b.dueDate ?? 0).getTime();
        break;
    }
    return dir * cmp;
  });
  return sorted;
}

// ---------- toolbar Hide popover (Show/Hide Columns) ----------

export type ColumnKey = "task" | "priority" | "status" | "owner" | "dueDate";

const ALL_COLUMNS: { key: ColumnKey; label: string }[] = [
  { key: "task", label: "Task" },
  { key: "priority", label: "Priority" },
  { key: "status", label: "Status" },
  { key: "owner", label: "Owner" },
  { key: "dueDate", label: "Due Date" },
];

export interface VisibleColumn {
  key: ColumnKey;
  label: string;
  /** How many flexible content cells the table grid needs (drives the template). */
  templateCells: number;
}

/** Ordered column list minus whatever the Hide popover turned off. */
export function visibleColumns(hidden: readonly string[]): VisibleColumn[] {
  const hiddenSet = new Set(hidden);
  const cols = ALL_COLUMNS.filter((c) => !hiddenSet.has(c.key));
  return cols.map((c) => ({ ...c, templateCells: cols.length }));
}

// ---------- table footer summary row ----------

export interface GroupSummary {
  items: number;
  done: number;
  /** Up to three priority badges, FIRST-ENCOUNTER order (reference quirk),
   * label lowercase like the reference's "N low" badges. */
  priorities: { label: string; count: number }[];
  /** How many further priority types exist beyond the three shown ("+N"). */
  overflowCount: number;
}

/**
 * The per-group footer row: "N items" + "N low" style priority badges.
 * The reference accumulates counts in task order (JS object insertion
 * order), caps the badge list at three, and appends "+N" for the rest.
 */
export function groupSummary(tasks: TaskDTO[]): GroupSummary {
  const counts = new Map<TaskPriority, number>();
  let done = 0;
  for (const t of tasks) {
    counts.set(t.priority, (counts.get(t.priority) ?? 0) + 1);
    if (t.status === "done") done += 1;
  }
  // Map iteration follows insertion order == first-encounter order.
  const all = [...counts.entries()].map(([value, count]) => ({
    label: value,
    count,
  }));
  return {
    items: tasks.length,
    done,
    priorities: all.slice(0, 3),
    overflowCount: Math.max(0, all.length - 3),
  };
}

// ---------- session-9 seams: kanban avatars, group header dots, people columns ----------

/** The reference's 8-entry kanban-avatar gradient palette (decompiled). */
const AVATAR_GRADIENTS = [
  "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
  "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
  "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)",
  "linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)",
  "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)",
] as const;

/**
 * The reference's kanban-card avatar background: the 8-gradient palette
 * indexed by the owner name's first character code (probed live: "John
 * Doe" -> #4facfe, "Mike Wilson" -> #a8edea).
 */
export function avatarGradient(name: string): string {
  return AVATAR_GRADIENTS[name.charCodeAt(0) % AVATAR_GRADIENTS.length];
}

/**
 * The reference's kanban-card avatar initials: the first TWO characters of
 * the raw string, uppercased — "John Doe" renders "JO", not "JD".
 */
export function avatarInitials(name: string): string {
  const chars = name.trim().substring(0, 2).toUpperCase();
  return chars.length > 0 ? chars : "?";
}

/** One per-status dot in the group header ("w-3 h-3" circle + count). */
export interface StatusHeaderDot {
  label: string;
  color: string;
  count: number;
}

/**
 * The group header's per-status dots, in FIRST-ENCOUNTER order — the
 * reference accumulates a counts object over the group's tasks and renders
 * `Object.entries` order (probed: green "2", yellow "3", gray "4", red "1"
 * for a group whose tasks run done/working/not_started/stuck).
 */
export function statusHeaderDots(tasks: TaskDTO[]): StatusHeaderDot[] {
  const counts = new Map<TaskStatus, number>();
  for (const t of tasks) {
    counts.set(t.status, (counts.get(t.status) ?? 0) + 1);
  }
  return [...counts.entries()].map(([value, count]) => ({
    label: statusMeta(value).label,
    color: statusMeta(value).bg,
    count,
  }));
}

/**
 * Distinct owner names among the tasks, first-encounter order — the source
 * for the kanban People columns and the Person filter's checkbox list
 * (the reference derives both from the items' owner strings, not a
 * member registry).
 */
export function distinctOwnerNames(tasks: TaskDTO[]): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const t of tasks) {
    if (t.owner && !seen.has(t.owner.name)) {
      seen.add(t.owner.name);
      names.push(t.owner.name);
    }
  }
  return names;
}

/** The reference's LE palette for kanban people-column badges (verbatim,
 * including the duplicated #6C5CE7 at indices 0 and 6). */
export const PEOPLE_COLUMN_PALETTE = [
  "#6C5CE7",
  "#A29BFE",
  "#FD79A8",
  "#E17055",
  "#00B894",
  "#0984E3",
  "#6C5CE7",
  "#FDCB6E",
] as const;

// ---------- boards-card relative time ----------

/**
 * Reference-format relative time for board cards:
 * "just now", "N minutes ago", "about N hours ago", "about N days ago",
 * then a calendar date beyond a week. `now` is injectable for tests.
 */
export function relativeBoardTime(date: Date, now: Date = new Date()): string {
  const seconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `about ${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `about ${days} day${days === 1 ? "" : "s"} ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function groupTasksByPerson(tasks: TaskDTO[], members: UserDTO[]): PersonColumn[] {
  const columns: PersonColumn[] = [
    { key: "unassigned", label: "Unassigned", sublabel: "No one assigned", user: null, tasks: [] },
    ...members.map((m) => ({ key: m.id, label: m.name, sublabel: null, user: m, tasks: [] })),
  ];
  const byKey = new Map(columns.map((c) => [c.key, c]));
  for (const t of tasks) {
    const column = t.owner ? byKey.get(t.owner.id) : byKey.get("unassigned");
    column?.tasks.push(t);
  }
  return columns;
}

/** Analytics distribution input: any shape carrying label/count/color. */
export function distributionBars<T extends { label: string; count: number; color: string }>(
  dist: T[],
): (T & { pct: number })[] {
  const total = dist.reduce((sum, d) => sum + d.count, 0);
  return dist.map((d) => ({
    ...d,
    /** Share of the total, 0-100 (integer). */
    pct: total === 0 ? 0 : Math.round((d.count / total) * 100),
  }));
}

/** Board-header autosave indicator, matching the reference's "Saved 11:54:10 PM". */
export function formatSavedAt(date: Date): string {
  let hours = date.getHours();
  const meridiem = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${hours}:${minutes}:${seconds} ${meridiem}`;
}

/**
 * The reference app's real route surface (probed 2026-09-17): the dashboard
 * lives at "/", the boards list at "/Boards", a board detail at "/Board?id=",
 * analytics at "/Analytics". Lowercase spellings are rewrites, not routes.
 */
export const ROUTE_PATHS = {
  dashboard: "/",
  boards: "/Boards",
  board: "/Board",
  analytics: "/Analytics",
} as const;

/**
 * Nav active state (reference drift confirmed 2026-09-17): the reference
 * highlights a nav link ONLY on an exact, case-sensitive pathname === href
 * match — so "/Boards" highlights "My Boards", lowercase "/boards" does not,
 * and "/" highlights nothing (Dashboard's href is "/Dashboard").
 */
export function isNavActive(pathname: string, href: string): boolean {
  return pathname === href;
}

// ---------- calendar month grid ----------

/**
 * Calendar cells for the month in view — exactly the weeks needed, like the
 * reference: ceil((leading-Sunday offset + days in month) / 7) weeks. Sep 2026
 * renders 35 cells (Aug 30 – Oct 3); a month starting on Sunday in a plain
 * February renders 28.
 */
export function calendarCells(cursor: Date): Date[] {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - first.getDay()); // Sun = 0
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const weeks = Math.ceil((first.getDay() + daysInMonth) / 7);
  return Array.from({ length: weeks * 7 }, (_, i) => {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + i);
    return day;
  });
}

// ---------- group summary aggregates (probed 2026-09-17) ----------

/**
 * Summary-row date label: "" when no task has a due date, a single short
 * date ("Sep 25") when every date falls on the same day, and a min-max range
 * ("Sep 18 - Sep 25") otherwise. Input: ISO strings or nulls.
 */
export function summaryDateLabel(dates: (string | null)[]): string {
  const days = dates
    .filter((d): d is string => Boolean(d))
    .map((d) => new Date(d))
    .map((d) => ({ time: d.getTime(), label: formatShortMonthDay(d) }));
  if (days.length === 0) return "";
  const min = days.reduce((a, b) => (a.time <= b.time ? a : b));
  const max = days.reduce((a, b) => (a.time >= b.time ? a : b));
  return min.time === max.time ? min.label : `${min.label} - ${max.label}`;
}

function formatShortMonthDay(date: Date): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

/**
 * Summary-row owner label: "" with no owners, otherwise "N people" — even
 * for a single person, matching the reference's un-pluralized string.
 */
export function summaryOwnerLabel(owners: (string | null)[]): string {
  const count = owners.filter(Boolean).length;
  return count === 0 ? "" : `${count} people`;
}

// ---------- team avatar palettes (probed 2026-09-17) ----------

/**
 * Board-header team row: position-based colors (the reference renders its
 * first three members blue / green / purple). Out-of-range positions clamp
 * to the last color.
 */
export function teamAvatarPalette(index: number): string {
  if (index <= 0) return "bg-blue-500";
  if (index === 1) return "bg-green-500";
  return "bg-purple-500";
}

/**
 * Team popover: the reference colors members by numeric `id % 3`. Cuid ids
 * hash deterministically into the same three-way split.
 */
export function memberPopoverPalette(id: string): string {
  const numeric = /^\d+$/.test(id) ? Number(id) : hashString(id);
  const mod = Math.abs(numeric) % 3;
  if (mod === 0) return "bg-blue-500";
  if (mod === 1) return "bg-green-500";
  return "bg-purple-500";
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return hash;
}

/**
 * The styled 404 page titles itself from the LAST path segment, titlecased:
 * /unassigned -> "Unassigned", /boards/does-not-exist -> "Does Not Exist".
 */
export function notFoundTitle(path: string): string {
  const segments = path.split("/").filter(Boolean);
  const last = segments[segments.length - 1];
  if (!last) return "Not Found";
  return last
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Dashboard "Recent Activity" timestamps (probed 2026-09-17): the reference
 * renders "Sep 17, 1:36 AM" — short month, unpadded day, h:mm meridiem.
 */
export function formatRecentTaskTime(date: Date): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  let hours = date.getHours();
  const meridiem = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${months[date.getMonth()]} ${date.getDate()}, ${hours}:${minutes} ${meridiem}`;
}

// ---------- API payload contracts ----------

export interface UserDTO {
  id: string;
  email: string;
  name: string;
  avatarColor: string;
  /** Team role label shown in the team popover ("Owner" | "Editor" | "Viewer"). */
  role: string;
  /** Mock presence flag driving the green dot on team avatars. */
  online: boolean;
}

export interface BoardSummaryDTO {
  id: string;
  title: string;
  description: string | null;
  color: string;
  visibility: string;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
  taskCount: number;
  doneCount: number;
}

export interface TaskDTO {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  groupId: string;
  boardId: string;
  dueDate: string | null;
  completed: boolean;
  position: number;
  createdAt: string;
  updatedAt: string;
  owner: UserDTO | null;
}

export interface GroupDTO {
  id: string;
  name: string;
  collapsed: boolean;
  position: number;
  /** Group accent color (Add New Group dialog; defaults to Ocean Blue). */
  color: string;
  tasks: TaskDTO[];
}

export interface BoardDetailDTO {
  id: string;
  title: string;
  description: string | null;
  color: string;
  visibility: string;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
  groups: GroupDTO[];
  members: UserDTO[];
}

/** Dashboard "Recent Activity" row (probed 2026-09-17): the reference lists
 *  recently-updated TASKS (title + absolute time), not an event log. */
export interface RecentTaskDTO {
  id: string;
  title: string;
  updatedAt: string;
}

export interface DashboardDTO {
  stats: {
    totalBoards: number;
    completedTasks: number;
    pendingTasks: number;
    completionRate: number;
  };
  recentBoards: BoardSummaryDTO[];
  recentTasks: RecentTaskDTO[];
}

export interface AnalyticsDTO {
  filters: { boardId: string | null; days: number };
  stats: {
    totalTasks: number;
    completionRate: number;
    overdueTasks: number;
    activeBoards: number;
  };
  statusDistribution: { status: TaskStatus; label: string; count: number; color: string }[];
  priorityDistribution: { priority: TaskPriority; label: string; count: number; color: string }[];
  boardPerformance: {
    boardId: string;
    title: string;
    color: string;
    total: number;
    done: number;
    rate: number;
  }[];
}

// Typed envelope for every mutation response — the client never parses throws.
export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };
