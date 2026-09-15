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

export function statusMeta(value: string) {
  return TASK_STATUSES.find((s) => s.value === value) ?? TASK_STATUSES[0];
}

export function priorityMeta(value: string) {
  return TASK_PRIORITIES.find((p) => p.value === value) ?? TASK_PRIORITIES[0];
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
