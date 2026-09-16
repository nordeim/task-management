// Domain vocabulary shared by the API routes and the client views.
// Single source of truth for status/priority metadata and board palette.

export const TASK_STATUSES = [
  { value: "not_started", label: "Not Started", bg: "#e8e9eb", text: "#323338" },
  { value: "working", label: "Working on it", bg: "#fddf3d", text: "#323338" },
  { value: "done", label: "Done", bg: "#00ca72", text: "#ffffff" },
  { value: "stuck", label: "Stuck", bg: "#e2445c", text: "#ffffff" },
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number]["value"];

export const TASK_PRIORITIES = [
  { value: "low", label: "Low", color: "#579bfc" },
  { value: "medium", label: "Medium", color: "#fcc203" },
  { value: "high", label: "High", color: "#ff642e" },
  { value: "critical", label: "Critical", color: "#e2445c" },
] as const;

export type TaskPriority = (typeof TASK_PRIORITIES)[number]["value"];

// The six theme swatches offered by the create-board dialog.
export const BOARD_COLORS = [
  { name: "Ocean Blue", value: "#0073ea" },
  { name: "Success Green", value: "#00ca72" },
  { name: "Warning Orange", value: "#ff642e" },
  { name: "Danger Red", value: "#e2445c" },
  { name: "Purple", value: "#a25ddb" },
  { name: "Teal", value: "#00d5c0" },
] as const;

// Board visibility — the closed vocabulary behind the create/edit board dialogs.
export const VISIBILITY_OPTIONS = [
  { value: "private", label: "Private" },
  { value: "public", label: "Public" },
] as const;

export type BoardVisibility = (typeof VISIBILITY_OPTIONS)[number]["value"];

/** Valid PATCH targets for the edit-board dialog (visibility included). */
export function isBoardVisibility(value: string): value is BoardVisibility {
  return VISIBILITY_OPTIONS.some((v) => v.value === value);
}

export function statusMeta(value: string) {
  return TASK_STATUSES.find((s) => s.value === value) ?? TASK_STATUSES[0];
}

export function priorityMeta(value: string) {
  return TASK_PRIORITIES.find((p) => p.value === value) ?? TASK_PRIORITIES[0];
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
