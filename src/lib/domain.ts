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
// (probed from the reference 2026-09-17: green→#00c875, third swatch is
// yellow, sixth is cyan — the session-3 orange/teal are gone).
export const BOARD_COLORS = [
  { name: "Ocean Blue", value: "#0073ea" },
  { name: "Success Green", value: "#00c875" },
  { name: "Sunny Yellow", value: "#ffcb00" },
  { name: "Danger Red", value: "#e2445c" },
  { name: "Purple", value: "#a25ddb" },
  { name: "Cyan", value: "#00d9ff" },
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
  personId?: string | null;
  statuses?: readonly TaskStatus[];
  priorities?: readonly TaskPriority[];
}

/**
 * The board toolbar's filter pipeline. Empty/absent criteria are no-ops —
 * an empty status set must NOT mean "match nothing".
 */
export function filterTasks(tasks: TaskDTO[], criteria: TaskFilterCriteria): TaskDTO[] {
  const query = criteria.search?.trim().toLowerCase() ?? "";
  const statuses = criteria.statuses ?? [];
  const priorities = criteria.priorities ?? [];
  return tasks.filter((t) => {
    if (query && !t.title.toLowerCase().includes(query)) return false;
    if (criteria.personId && t.owner?.id !== criteria.personId) return false;
    if (statuses.length > 0 && !statuses.includes(t.status)) return false;
    if (priorities.length > 0 && !priorities.includes(t.priority)) return false;
    return true;
  });
}

// ---------- toolbar Sort popover (Task Name / Created Date / Updated Date) ----------

export type SortField = "title" | "createdAt" | "updatedAt";
export type SortDir = "asc" | "desc";

export interface SortSpec {
  field: SortField;
  dir: SortDir;
}

/** Sorts a copy — the input array is never mutated. */
export function sortTasks(tasks: TaskDTO[], spec: SortSpec): TaskDTO[] {
  const sorted = [...tasks];
  sorted.sort((a, b) => {
    let cmp: number;
    if (spec.field === "title") {
      cmp = a.title.localeCompare(b.title);
    } else {
      const av = new Date(a[spec.field]).getTime();
      const bv = new Date(b[spec.field]).getTime();
      cmp = av - bv;
    }
    return spec.dir === "asc" ? cmp : -cmp;
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
  /** Priorities with non-zero counts, vocabulary order, label lowercase. */
  priorities: { label: string; count: number }[];
}

/** The per-group footer row: "N items" + "N low" style priority badges. */
export function groupSummary(tasks: TaskDTO[]): GroupSummary {
  const counts = new Map<TaskPriority, number>();
  let done = 0;
  for (const t of tasks) {
    counts.set(t.priority, (counts.get(t.priority) ?? 0) + 1);
    if (t.status === "done") done += 1;
  }
  return {
    items: tasks.length,
    done,
    priorities: TASK_PRIORITIES.filter((p) => (counts.get(p.value) ?? 0) > 0).map((p) => ({
      label: p.value,
      count: counts.get(p.value) ?? 0,
    })),
  };
}

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

export const ACTIVITY_TYPES = {
  board_created: { icon: "board", color: "#0073ea" },
  board_deleted: { icon: "board", color: "#e2445c" },
  task_created: { icon: "task", color: "#00ca72" },
  task_completed: { icon: "check", color: "#00ca72" },
  task_updated: { icon: "task", color: "#fcc203" },
  group_created: { icon: "group", color: "#a25ddb" },
} as const;

export type ActivityType = keyof typeof ACTIVITY_TYPES;

// ---------- API payload contracts ----------

export interface UserDTO {
  id: string;
  email: string;
  name: string;
  avatarColor: string;
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

export interface ActivityDTO {
  id: string;
  type: string;
  message: string;
  createdAt: string;
  user: UserDTO;
}

export interface DashboardDTO {
  stats: {
    totalBoards: number;
    completedTasks: number;
    pendingTasks: number;
    completionRate: number;
  };
  recentBoards: BoardSummaryDTO[];
  activity: ActivityDTO[];
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
