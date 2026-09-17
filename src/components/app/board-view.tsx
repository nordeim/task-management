"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  ArrowUpNarrowWide,
  Calendar as CalendarIcon,
  Check,
  Eye,
  Filter,
  GanttChartSquare,
  Group,
  KanbanSquare,
  Pencil as PenLine,
  Plus,
  Search,
  Star,
  Table2,
  TrendingUp,
  UserRound,
  Users,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "@/hooks/use-toast";
import { useApp } from "@/components/app/app-context";
import { api } from "@/lib/api-client";
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  VIEW_TRIGGER_LABELS,
  filterTasks,
  formatSavedAt,
  resolveStatusCompletedPatch,
  sortTasks,
} from "@/lib/domain";
import type {
  BoardDetailDTO,
  ColumnKey,
  SortDir,
  SortField,
  TaskDTO,
  TaskPriority,
  TaskStatus,
  UserDTO,
} from "@/lib/domain";
import { BoardTable } from "@/components/app/board-table";
import { BoardKanban } from "@/components/app/board-kanban";
import { BoardCalendar } from "@/components/app/board-calendar";
import { BoardTimeline } from "@/components/app/board-timeline";
import { CreateTaskDialog } from "@/components/app/create-task-dialog";
import { CreateGroupDialog } from "@/components/app/create-group-dialog";

type BoardSubView = "table" | "kanban" | "calendar" | "timeline" | "unassigned";

/** How the Main Table groups its rows — mirrors the reference 'Group by' menu. */
type GroupByMode = "default" | "status" | "person" | "priority";

const GROUP_BY_OPTIONS: { value: GroupByMode; label: string }[] = [
  { value: "default", label: "Default Groups" },
  { value: "status", label: "Status" },
  { value: "person", label: "Person" },
  { value: "priority", label: "Priority" },
];

/** Sort popover options — mirrors the reference 'Sort By' menu. */
const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: "title", label: "Task Name" },
  { value: "createdAt", label: "Created Date" },
  { value: "updatedAt", label: "Updated Date" },
];

interface SortState {
  field: SortField;
  dir: SortDir;
}

/** Column keys the Hide popover can toggle (Task/Priority/Status/Owner/Due Date). */
const COLUMN_KEYS: ColumnKey[] = ["task", "priority", "status", "owner", "dueDate"];

const COLUMN_LABELS: Record<ColumnKey, string> = {
  task: "Task",
  priority: "Priority",
  status: "Status",
  owner: "Owner",
  dueDate: "Due Date",
};

const SUB_VIEWS: { value: BoardSubView; label: string; icon: typeof Table2 }[] = [
  { value: "table", label: "Main Table", icon: Table2 },
  { value: "kanban", label: "Kanban Board", icon: KanbanSquare },
  { value: "calendar", label: "Calendar View", icon: CalendarIcon },
  { value: "timeline", label: "Timeline", icon: GanttChartSquare },
  { value: "unassigned", label: "Unassigned Tasks", icon: UserRound },
];

/** Optimistic-insert skeleton for an inline-created task (server fills the rest on reload). */
function newTaskShape(title: string): Omit<TaskDTO, "id" | "groupId"> {
  const now = new Date().toISOString();
  return {
    title,
    status: "not_started",
    priority: "low",
    boardId: "", // filled by the caller's spread below — see createTaskInline
    dueDate: null,
    completed: false,
    position: Number.MAX_SAFE_INTEGER,
    createdAt: now,
    updatedAt: now,
    owner: null,
  };
}

function initialsOf(name: string): string {
  return (
    name
      .split(" ")
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

interface TaskPatch {
  title?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  owner?: UserDTO | null;
  dueDate?: string | null;
  completed?: boolean;
}

export function BoardView({ boardId }: { boardId: string }) {
  const { navigate } = useApp();
  const [board, setBoard] = useState<BoardDetailDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [subView, setSubView] = useState<BoardSubView>("table");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortState | null>(null);
  const [personFilter, setPersonFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<TaskStatus[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority[]>([]);
  const [hiddenColumns, setHiddenColumns] = useState<ColumnKey[]>([]);
  const [groupBy, setGroupBy] = useState<GroupByMode>("default");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [taskDialog, setTaskDialog] = useState<{ open: boolean; groupId: string | null }>({
    open: false,
    groupId: null,
  });
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [deleteGroupTarget, setDeleteGroupTarget] = useState<string | null>(null);
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  // Blue header strip (probed live): a binary "has scrolled" marker — the
  // reference renders scaleX(0) at window.scrollY 0 and removes the transform
  // (full width) once scrollY >= 32. The page scrolls on the BODY (main's
  // overflow makes the nested stickies inert), so we track window scroll.
  const [scrolled, setScrolled] = useState(false);

  const load = useCallback(() => api<BoardDetailDTO>(`/api/boards/${boardId}`), [boardId]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY >= 32);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function applyResult(result: { ok: boolean; data?: BoardDetailDTO; error?: string }) {
    if (result.ok && result.data) {
      setBoard(result.data);
      setError(null);
      setLastSavedAt(new Date());
    } else {
      setError(result.error ?? "Request failed");
    }
  }

  // BoardView is keyed by boardId in the page shell, so switching boards
  // remounts this component — no view-state reset effect needed.
  useEffect(() => {
    let cancelled = false;
    load().then((result) => {
      if (!cancelled) applyResult(result);
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  const allTasks = useMemo(() => board?.groups.flatMap((g) => g.tasks) ?? [], [board]);

  // The whole toolbar pipeline (search + person + status/priority + sort) runs
  // through the unit-tested pure seams in domain.ts.
  const visibleTasks = useMemo(() => {
    const filtered = filterTasks(allTasks, {
      search,
      personId: personFilter,
      statuses: statusFilter,
      priorities: priorityFilter,
    });
    return sort ? sortTasks(filtered, sort) : filtered;
  }, [allTasks, search, personFilter, statusFilter, priorityFilter, sort]);

  const filtersActive = statusFilter.length > 0 || priorityFilter.length > 0;

  function toggleStatusFilter(value: TaskStatus) {
    setStatusFilter((prev) =>
      prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value],
    );
  }

  function togglePriorityFilter(value: TaskPriority) {
    setPriorityFilter((prev) =>
      prev.includes(value) ? prev.filter((p) => p !== value) : [...prev, value],
    );
  }

  function toggleHiddenColumn(key: ColumnKey) {
    setHiddenColumns((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  /** Clicking a sort field cycles asc → desc → off, like the reference. */
  function applySortField(field: SortField) {
    setSort((prev) => {
      if (!prev || prev.field !== field) return { field, dir: "asc" };
      if (prev.dir === "asc") return { field, dir: "desc" };
      return null;
    });
  }

  /** The table renders either the board's real groups or synthetic sections
   *  built from the Group-by choice — same row component either way. */
  const tableSections = useMemo(() => {
    const byId = new Map(visibleTasks.map((t) => [t.id, t]));
    const filtered = (tasks: TaskDTO[]) => tasks.filter((t) => byId.has(t.id));
    if (groupBy === "default") {
      return (board?.groups ?? []).map((g) => ({
        id: g.id,
        name: g.name,
        // Each group owns its accent (Add New Group dialog swatch).
        color: g.color,
        tasks: filtered(g.tasks),
        group: g,
      }));
    }
    if (groupBy === "status") {
      return TASK_STATUSES.map((s) => ({
        id: `status-${s.value}`,
        name: s.label,
        color: s.bg,
        tasks: visibleTasks.filter((t) => t.status === s.value),
        group: null,
      }));
    }
    if (groupBy === "priority") {
      return [...TASK_PRIORITIES].reverse().map((p) => ({
        id: `priority-${p.value}`,
        name: p.label,
        color: p.color,
        tasks: visibleTasks.filter((t) => t.priority === p.value),
        group: null,
      }));
    }
    const sections = [
      {
        id: "person-unassigned",
        name: "Unassigned",
        color: "#6b7385",
        tasks: visibleTasks.filter((t) => t.owner === null),
        group: null,
      },
      ...(board?.members ?? []).map((m) => ({
        id: `person-${m.id}`,
        name: m.name,
        color: m.avatarColor,
        tasks: visibleTasks.filter((t) => t.owner?.id === m.id),
        group: null,
      })),
    ];
    return sections;
  }, [board, visibleTasks, groupBy]);

  // ---------- mutations: every one patches local state after the API confirms ----------

  const updateTask = useCallback(
    async (taskId: string, patch: TaskPatch) => {
      const result = await api<null>(`/api/tasks/${taskId}`, {
        method: "PATCH",
        body: {
          title: patch.title,
          status: patch.status,
          priority: patch.priority,
          ownerId: patch.owner ? patch.owner.id : patch.owner === null ? null : undefined,
          dueDate: patch.dueDate,
          completed: patch.completed,
        },
      });
      if (!result.ok) {
        toast({ title: "Could not update task", description: result.error, variant: "destructive" });
        return;
      }
      // Mirror the server's status<->completed coupling (shared helper in
      // domain.ts) so the checkbox, status pill, kanban, and analytics never
      // disagree locally.
      const localPatch = resolveStatusCompletedPatch(patch);
      setBoard((prev) =>
        prev
          ? {
              ...prev,
              groups: prev.groups.map((g) => ({
                ...g,
                tasks: g.tasks.map((t) => (t.id === taskId ? { ...t, ...localPatch } : t)),
              })),
            }
          : prev,
      );
      setLastSavedAt(new Date());
    },
    [],
  );

  const deleteTask = useCallback(async (taskId: string) => {
    const result = await api<null>(`/api/tasks/${taskId}`, { method: "DELETE" });
    if (!result.ok) {
      toast({ title: "Could not delete task", description: result.error, variant: "destructive" });
      return;
    }
    setBoard((prev) =>
      prev
        ? { ...prev, groups: prev.groups.map((g) => ({ ...g, tasks: g.tasks.filter((t) => t.id !== taskId) })) }
        : prev,
    );
    setLastSavedAt(new Date());
  }, []);

  /** Inline add-task rows create in place — Enter commits, the row stays open. */
  const createTaskInline = useCallback(
    async (groupId: string, title: string): Promise<boolean> => {
      const result = await api<{ id: string; position: number }>("/api/tasks", {
        method: "POST",
        body: { title, groupId },
      });
      if (!result.ok) {
        toast({ title: "Could not create task", description: result.error, variant: "destructive" });
        return false;
      }
      setBoard((prev) =>
        prev
          ? {
              ...prev,
              groups: prev.groups.map((g) =>
                g.id === groupId
                  ? { ...g, tasks: [...g.tasks, { ...newTaskShape(title), id: result.data.id, groupId, boardId }] }
                  : g,
              ),
            }
          : prev,
      );
      setLastSavedAt(new Date());
      return true;
    },
    [boardId],
  );

  /** Drag-reorder: optimistic local move, then the API confirms (or we reload). */
  const reorderTask = useCallback(
    async (taskId: string, targetGroupId: string, index: number) => {
      const result = await api<null>(`/api/tasks/${taskId}`, {
        method: "PATCH",
        body: { groupId: targetGroupId, index },
      });
      if (!result.ok) {
        toast({ title: "Could not move task", description: result.error, variant: "destructive" });
        load().then(applyResult);
        return;
      }
      setBoard((prev) => {
        if (!prev) return prev;
        let moved: TaskDTO | null = null;
        const stripped = prev.groups.map((g) => ({
          ...g,
          tasks: g.tasks.filter((t) => {
            if (t.id === taskId) {
              moved = t;
              return false;
            }
            return true;
          }),
        }));
        if (!moved) return prev;
        const task = moved as TaskDTO;
        return {
          ...prev,
          groups: stripped.map((g) => {
            if (g.id !== targetGroupId) return g;
            const tasks = [...g.tasks];
            tasks.splice(Math.max(0, Math.min(index, tasks.length)), 0, { ...task, groupId: targetGroupId });
            return { ...g, tasks };
          }),
        };
      });
      setLastSavedAt(new Date());
    },
    [load],
  );

  const toggleCollapse = useCallback(async (groupId: string, collapsed: boolean) => {
    // Optimistic collapse — a failed toggle is re-synced on next board load.
    setBoard((prev) =>
      prev ? { ...prev, groups: prev.groups.map((g) => (g.id === groupId ? { ...g, collapsed } : g)) } : prev,
    );
    const result = await api<null>(`/api/groups/${groupId}`, { method: "PATCH", body: { collapsed } });
    if (!result.ok) {
      setBoard((prev) =>
        prev ? { ...prev, groups: prev.groups.map((g) => (g.id === groupId ? { ...g, collapsed: !collapsed } : g)) } : prev,
      );
    }
  }, []);

  const deleteGroup = useCallback(async (groupId: string) => {
    const result = await api<null>(`/api/groups/${groupId}`, { method: "DELETE" });
    if (!result.ok) {
      toast({ title: "Could not delete group", description: result.error, variant: "destructive" });
      return;
    }
    setBoard((prev) => (prev ? { ...prev, groups: prev.groups.filter((g) => g.id !== groupId) } : prev));
    setLastSavedAt(new Date());
    toast({ title: "Group deleted", description: "Its tasks were removed too." });
  }, []);

  const toggleFavorite = useCallback(async () => {
    if (!board) return;
    const next = !board.isFavorite;
    const result = await api<null>(`/api/boards/${board.id}`, {
      method: "PATCH",
      body: { isFavorite: next },
    });
    if (!result.ok) {
      toast({ title: "Could not update favorite", description: result.error, variant: "destructive" });
      return;
    }
    setBoard((prev) => (prev ? { ...prev, isFavorite: next } : prev));
    setLastSavedAt(new Date());
  }, [board]);

  const renameBoard = useCallback(async () => {
    if (!board) return;
    const next = titleDraft.trim();
    setEditingTitle(false);
    if (!next || next === board.title) return;
    const result = await api<null>(`/api/boards/${board.id}`, { method: "PATCH", body: { title: next } });
    if (!result.ok) {
      toast({ title: "Could not rename board", description: result.error, variant: "destructive" });
      return;
    }
    setBoard((prev) => (prev ? { ...prev, title: next } : prev));
    setLastSavedAt(new Date());
  }, [board, titleDraft]);

  if (error) {
    // Reference pattern (probed at /Board?id=<unknown>): an in-app card on
    // the page background — "Board not found" + a blue Back to Boards pill.
    return (
      <div className="min-h-screen bg-[#F5F6F8] p-8">
        <div className="mx-auto max-w-7xl">
          <div className="py-16 text-center">
            <h2 className="mb-4 text-2xl font-bold text-[#323338]">Board not found</h2>
            <p className="mb-4 text-sm text-[#676879]">{error}</p>
            <Button
              className="h-9 rounded-xl bg-[#0073EA] px-4 font-medium shadow hover:bg-[#0056B3]"
              onClick={() => navigate("boards")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
              Back to Boards
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!board) {
    return (
      <div className="min-h-screen bg-[#F5F6F8]">
        <div className="max-w-full">
          <div className="sticky top-0 z-20 bg-[#F5F6F8] pb-4">
            <div className="sticky top-16 z-40 border-b border-[#E1E5F3] bg-white shadow-sm">
              <div className="px-4 py-3">
                <Skeleton className="h-12 w-72" />
              </div>
            </div>
          </div>
          <div className="space-y-6 px-6 py-6">
            <Skeleton className="h-[74px] w-full rounded-xl" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  const total = allTasks.length;
  // Reference: the TRIGGER shows the short label, the menu the long one.
  const currentViewLabel = VIEW_TRIGGER_LABELS[subView] ?? "Main table";

  return (
    <div className="min-h-screen bg-[#F5F6F8]">
      <div className="max-w-full">
      {/* Board chrome (probed 2026-09-17): the reference wraps the full-width
          white bar (sticky top-16 z-40, edge to edge) in a gray sticky wrapper
          (top-0 z-20 pb-4) — content scrolls beneath that gray band. One row
          inside: back arrow + tile + [title over view|favorites|meta] on the
          left; Analytics/Integrate/Automate + avatars on the right. */}
      <div className="sticky top-0 z-20 bg-[#F5F6F8] pb-4">
      <div className="sticky top-16 z-40 border-b border-[#E1E5F3] bg-white shadow-sm">
        <div
          aria-hidden="true"
          className="absolute left-0 right-0 top-0 h-1 bg-[#0073EA]"
          style={{ transform: scrolled ? undefined : "scaleX(0)" }}
        />
        <div className="px-4 py-3">
        <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
            {/* Reference: a real anchor to /Boards wraps the compact back
                button (Next Link renders the same <a href="/Boards">). */}
            <Link href="/Boards" aria-label="Back to boards">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-lg transition-all duration-200 hover:scale-105 hover:bg-[#E1E5F3]"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
            <span
              className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl shadow-lg"
              style={{ backgroundColor: board.color }}
              aria-hidden="true"
            >
              <Table2 className="h-5 w-5 text-white" />
              {/* Reference detail: translucent shine across the tile. */}
              <span className="absolute inset-0 bg-white/20" />
            </span>
            <div className="min-w-0 space-y-1">
          {editingTitle ? (
            <input
              autoFocus
              aria-label="Board title"
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={() => void renameBoard()}
              onKeyDown={(e) => {
                if (e.key === "Enter") void renameBoard();
                if (e.key === "Escape") {
                  setTitleDraft(board.title);
                  setEditingTitle(false);
                }
              }}
              maxLength={120}
              className="rounded-md border-none bg-accent px-2 py-1 text-xl font-bold outline-none ring-1 ring-primary/40"
            />
          ) : (
            <h1 className="group flex min-w-0 cursor-pointer items-center gap-2 text-xl font-bold text-[#323338] transition-colors hover:text-[#0073EA]">
              <button
                type="button"
                onClick={() => {
                  setTitleDraft(board.title);
                  setEditingTitle(true);
                }}
                title="Rename board"
                className="flex min-w-0 items-center gap-2 rounded-md px-2 py-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="truncate">{board.title}</span>
                {/* Reference detail: pencil revealed on hover only. */}
                <PenLine className="h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
              </button>
            </h1>
          )}

          {/* Sub-row — view dropdown | favorites | items ▪ Saved. */}
          <div className="flex items-center gap-3 text-xs">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 rounded-md px-2 text-xs font-medium text-[#676879] hover:bg-[#E1E5F3]"
              >
                <Table2 className="mr-1 h-3 w-3" aria-hidden="true" />
                {currentViewLabel}
                <svg className="ml-1 h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
                </svg>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {SUB_VIEWS.map((view) => (
                <DropdownMenuItem key={view.value} onClick={() => setSubView(view.value)}>
                  <view.icon className="mr-2 h-4 w-4" />
                  {view.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <span className="text-muted-foreground/50" aria-hidden="true">|</span>

          <Button
            variant="ghost"
            size="sm"
            className={`h-6 rounded-md px-2 text-xs font-medium transition-all duration-200 hover:bg-accent hover:text-yellow-500 ${
              board.isFavorite ? "text-[#ca8a04]" : "text-[#676879]"
            }`}
            onClick={() => void toggleFavorite()}
            aria-pressed={board.isFavorite}
          >
            <Star className={`mr-1 h-3 w-3 ${board.isFavorite ? "fill-current" : ""}`} aria-hidden="true" />
            <span>{board.isFavorite ? "Favorited" : "Add to favorites"}</span>
          </Button>

          <span className="text-muted-foreground/50" aria-hidden="true">|</span>

          {/* Item count + autosave indicator, mirroring the reference header. */}
          <div className="flex items-center gap-2">
            <span className="text-[#A0A0A0]">
              {total} item{total === 1 ? "" : "s"}
            </span>
            <span aria-hidden="true" className="text-[#A0A0A0]">▪</span>
            {lastSavedAt && <span className="text-[#A0A0A0]">Saved {formatSavedAt(lastSavedAt)}</span>}
          </div>
          </div>
          </div>
          </div>
        </div>

        {/* Right group — action buttons, then the overlapping member avatars. */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 rounded-md border-[#E1E5F3] px-3 text-xs hover:border-green-500 hover:text-green-600"
            onClick={() => navigate("analytics")}
          >
            <TrendingUp className="mr-1 h-3 w-3" aria-hidden="true" /> Analytics
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 rounded-md border-[#E1E5F3] px-3 text-xs hover:border-blue-500"
            onClick={() =>
              toast({
                title: "Integrate",
                description: "Connectors are not configured on this deployment.",
              })
            }
          >
            <Activity className="mr-1 h-3 w-3" aria-hidden="true" /> Integrate
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="relative h-8 rounded-md border-[#E1E5F3] px-3 text-xs hover:border-purple-500"
            onClick={() =>
              toast({
                title: "Automate",
                description: "Automation recipes are not configured on this deployment.",
              })
            }
          >
            <Zap className="mr-1 h-3 w-3" aria-hidden="true" /> Automate
            {/* Reference detail: decorative notification dot on Automate. */}
            <span
              aria-hidden="true"
              className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-purple-500"
            />
          </Button>

          {/* Member avatars — reference layout: overlapping row that opens a
              member list. Presence dots are decorative chrome (aria-hidden). */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label="Board members"
                className="flex cursor-pointer items-center -space-x-2 rounded-full px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {board.members.slice(0, 4).map((member) => (
                  <span key={member.id} className="relative">
                    <Avatar className="h-8 w-8 border-2 border-white">
                      <AvatarFallback
                        className="text-xs font-medium text-white"
                        style={{ backgroundColor: member.avatarColor }}
                      >
                        {initialsOf(member.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span
                      aria-hidden="true"
                      className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#00c875]"
                    />
                  </span>
                ))}
                {board.members.length > 4 && (
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-secondary text-[10px] font-semibold text-muted-foreground">
                    +{board.members.length - 4}
                  </span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56 p-0">
              <div className="border-b px-3 py-2.5 text-sm font-bold">Board Members</div>
              <ul className="max-h-64 overflow-auto p-1" aria-label="Board members">
                {board.members.map((member) => (
                  <li
                    key={member.id}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm"
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarFallback
                        className="text-[10px] font-semibold text-white"
                        style={{ backgroundColor: member.avatarColor }}
                      >
                        {initialsOf(member.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 flex-1 truncate">{member.name}</span>
                  </li>
                ))}
              </ul>
            </PopoverContent>
          </Popover>
        </div>
        </div>
        </div>
      </div>
      </div>

      {/* Content zone (probed): px-6 py-6 gutters, full width; only the Main
          Table renders the toolbar card, and it sits mb-6 above the table. */}
      <div className="px-6 py-6">
      {subView === "table" && (
        <div className="mb-6 flex items-center justify-between rounded-xl border border-[#E1E5F3] bg-white p-4 shadow-sm">
          <div className="flex items-center gap-4">
          <Button
            className="h-10 rounded-lg bg-[#0073EA] px-4 font-medium shadow hover:bg-[#0056B3]"
            onClick={() => setTaskDialog({ open: true, groupId: null })}
          >
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" /> New Task
          </Button>
          <div className="relative">
            <Input
              type="search"
              aria-label="Search tasks in board"
              placeholder="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-64 rounded-lg border-none bg-[#F5F6F8] pl-10 focus:bg-white focus:ring-2 focus:ring-[#0073EA]/20"
            />
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#676879]" />
          </div>
          {/* Filter by Person — single-select member filter like the reference. */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={`h-10 rounded-lg border-[#E1E5F3] px-4 ${personFilter ? "border-primary text-primary" : ""}`}
              >
                <Users className="mr-2 h-4 w-4" aria-hidden="true" /> Person
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-64 p-0">
              <div className="border-b px-3 py-2.5 text-sm font-bold">Filter by Person</div>
              <ul role="listbox" aria-label="Filter by person" className="max-h-64 overflow-auto p-1">
                {board.members.length === 0 ? (
                  <li className="px-2 py-3 text-sm text-muted-foreground">No people assigned yet</li>
                ) : (
                  board.members.map((member) => {
                    const selected = personFilter === member.id;
                    return (
                      <li key={member.id}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={selected}
                          onClick={() => setPersonFilter(selected ? null : member.id)}
                          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-secondary"
                        >
                          <Avatar className="h-6 w-6">
                            <AvatarFallback
                              className="text-[10px] font-semibold text-white"
                              style={{ backgroundColor: member.avatarColor }}
                            >
                              {initialsOf(member.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="min-w-0 flex-1 truncate">{member.name}</span>
                          {selected && <Check className="h-4 w-4 shrink-0 text-primary" />}
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>
              {personFilter && (
                <button
                  type="button"
                  onClick={() => setPersonFilter(null)}
                  className="w-full border-t px-3 py-2 text-left text-sm text-primary hover:bg-secondary"
                >
                  Clear person filter
                </button>
              )}
            </PopoverContent>
          </Popover>
          {/* Filter — Status + Priority checkboxes, like the reference "Filter Items". */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={`h-10 rounded-lg border-[#E1E5F3] px-4 ${filtersActive ? "border-primary text-primary" : ""}`}
                aria-pressed={filtersActive}
              >
                <Filter className="mr-2 h-4 w-4" aria-hidden="true" /> Filter
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-56 p-0">
              <div className="border-b px-3 py-2.5 text-sm font-bold">Filter Items</div>
              <div className="p-2">
                <p className="px-1 pb-1 pt-0.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Status
                </p>
                <ul className="mb-2 space-y-0.5" aria-label="Filter by status">
                  {TASK_STATUSES.map((status) => {
                    const checked = statusFilter.includes(status.value);
                    return (
                      <li key={status.value}>
                        <button
                          type="button"
                          role="menuitemcheckbox"
                          aria-checked={checked}
                          onClick={() => toggleStatusFilter(status.value)}
                          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-secondary"
                        >
                          <span
                            className="h-4 w-4 shrink-0 rounded-md border border-black/10"
                            style={{ backgroundColor: status.bg }}
                            aria-hidden="true"
                          />
                          <span className="flex-1">{status.label}</span>
                          {checked && <Check className="h-4 w-4 shrink-0 text-primary" />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <p className="px-1 pb-1 pt-0.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Priority
                </p>
                <ul aria-label="Filter by priority">
                  {TASK_PRIORITIES.map((priority) => {
                    const checked = priorityFilter.includes(priority.value);
                    return (
                      <li key={priority.value}>
                        <button
                          type="button"
                          role="menuitemcheckbox"
                          aria-checked={checked}
                          onClick={() => togglePriorityFilter(priority.value)}
                          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-secondary"
                        >
                          <span
                            className="h-3 w-3 shrink-0 rounded-full"
                            style={{ backgroundColor: priority.color }}
                            aria-hidden="true"
                          />
                          <span className="flex-1">{priority.label}</span>
                          {checked && <Check className="h-4 w-4 shrink-0 text-primary" />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
              {filtersActive && (
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter([]);
                    setPriorityFilter([]);
                  }}
                  className="w-full border-t px-3 py-2 text-left text-sm text-primary hover:bg-secondary"
                >
                  Clear filters
                </button>
              )}
            </PopoverContent>
          </Popover>
          {/* Sort — Task Name / Created Date / Updated Date, cycling asc → desc → off. */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={`h-10 rounded-lg border-[#E1E5F3] px-4 ${sort ? "border-primary text-primary" : ""}`}
                aria-pressed={sort !== null}
              >
                <ArrowUpNarrowWide className="mr-2 h-4 w-4" aria-hidden="true" />
                {sort
                  ? `Sort: ${
                      SORT_OPTIONS.find((o) => o.value === sort.field)?.label ?? ""
                    } ${sort.dir === "asc" ? "↑" : "↓"}`
                  : "Sort"}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-52 p-1.5">
              <p className="px-2 pb-1 pt-0.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Sort By
              </p>
              <ul role="listbox" aria-label="Sort tasks by">
                {SORT_OPTIONS.map((option) => {
                  const active = sort?.field === option.value;
                  return (
                    <li key={option.value}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={active}
                        onClick={() => applySortField(option.value)}
                        className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-secondary"
                      >
                        <span>{option.label}</span>
                        {active && (
                          <span className="flex items-center gap-0.5 text-primary">
                            {sort?.dir === "asc" ? "↑" : "↓"}
                            <Check className="h-4 w-4" />
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
              {sort && (
                <button
                  type="button"
                  onClick={() => setSort(null)}
                  className="mt-1 w-full border-t px-3 py-2 text-left text-sm text-primary hover:bg-secondary"
                >
                  Clear sort
                </button>
              )}
            </PopoverContent>
          </Popover>
          {/* Hide — Show/Hide Columns toggles like the reference. */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={`h-10 rounded-lg border-[#E1E5F3] px-4 ${hiddenColumns.length > 0 ? "border-primary text-primary" : ""}`}
              >
                <Eye className="mr-2 h-4 w-4" aria-hidden="true" /> Hide
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-52 p-1.5">
              <p className="px-2 pb-1 pt-0.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Show/Hide Columns
              </p>
              <ul aria-label="Toggle table columns">
                {COLUMN_KEYS.map((key) => {
                  const shown = !hiddenColumns.includes(key);
                  return (
                    <li key={key}>
                      <button
                        type="button"
                        role="menuitemcheckbox"
                        aria-checked={shown}
                        onClick={() => toggleHiddenColumn(key)}
                        className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-secondary"
                      >
                        {COLUMN_LABELS[key]}
                        {shown && <Check className="h-4 w-4 text-primary" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </PopoverContent>
          </Popover>
          {/* Group by — regroups the Main Table rows like the reference. */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={`h-10 rounded-lg border-[#E1E5F3] px-4 ${groupBy !== "default" ? "border-primary text-primary" : ""}`}
              >
                <Group className="mr-2 h-4 w-4" aria-hidden="true" /> Group by
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-52 p-1.5">
              <p className="px-2 pb-1 pt-0.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Group By</p>
              <ul role="listbox" aria-label="Group table by">
                {GROUP_BY_OPTIONS.map((option) => (
                  <li key={option.value}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={groupBy === option.value}
                      onClick={() => setGroupBy(option.value)}
                      className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-secondary"
                    >
                      {option.label}
                      {groupBy === option.value && <Check className="h-4 w-4 text-primary" />}
                    </button>
                  </li>
                ))}
              </ul>
            </PopoverContent>
          </Popover>
          </div>
        </div>
      )}

      {/* View body */}
      {subView === "table" && (
        <BoardTable
          sections={tableSections}
          members={board.members}
          groupBy={groupBy}
          hiddenColumns={hiddenColumns}
          boardColor={board.color}
          onUpdateTask={(taskId, patch) => void updateTask(taskId, patch)}
          onDeleteTask={(taskId) => void deleteTask(taskId)}
          onCreateTask={createTaskInline}
          onToggleCollapse={(groupId, collapsed) => void toggleCollapse(groupId, collapsed)}
          onDeleteGroup={(groupId) => setDeleteGroupTarget(groupId)}
          onAddGroup={() => setGroupDialogOpen(true)}
          onToggleColumn={toggleHiddenColumn}
          onReorderTask={(taskId, groupId, index) => void reorderTask(taskId, groupId, index)}
        />
      )}

      {subView === "kanban" && (
        <BoardKanban
          tasks={visibleTasks}
          members={board.members}
          onStatusChange={(taskId, status) => void updateTask(taskId, { status })}
          onOwnerChange={(taskId, ownerId) => {
            const member = ownerId ? board.members.find((m) => m.id === ownerId) ?? null : null;
            void updateTask(taskId, { owner: member });
          }}
          onAddTask={() => setTaskDialog({ open: true, groupId: null })}
        />
      )}

      {subView === "calendar" && (
        <BoardCalendar tasks={visibleTasks} onAddTask={() => setTaskDialog({ open: true, groupId: null })} />
      )}

      {subView === "timeline" && (
        <BoardTimeline tasks={visibleTasks} onAddTask={() => setTaskDialog({ open: true, groupId: null })} />
      )}

      {subView === "unassigned" && (
        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="text-base font-semibold">Unassigned Tasks</h2>
            <p className="text-xs text-muted-foreground">
              {allTasks.filter((t) => t.owner === null).length} waiting for an owner
            </p>
          </div>
          {allTasks.filter((t) => t.owner === null).length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">Every task has an owner. Nice work.</p>
          ) : (
            <ul className="divide-y">
              {allTasks
                .filter((t) => t.owner === null)
                .map((task) => (
                  <li key={task.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-muted-foreground/40" aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate text-sm">{task.title}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => {
                        setSubView("table");
                        toast({ title: "Assign it in the table", description: "Open the Owner column to pick a teammate." });
                      }}
                    >
                      Assign
                    </Button>
                  </li>
                ))}
            </ul>
          )}
        </div>
      )}
      </div>
    </div>

      <CreateTaskDialog
        open={taskDialog.open}
        onOpenChange={(open) => setTaskDialog((prev) => ({ ...prev, open }))}
        groups={board.groups}
        defaultGroupId={taskDialog.groupId}
        onCreated={async (_taskId, groupId, title) => {
          setTaskDialog((prev) => ({ ...prev, open: false }));
          // Insert optimistically using the group + title we know, then re-sync.
          setBoard((prev) =>
            prev
              ? {
                  ...prev,
                  groups: prev.groups.map((g) =>
                    g.id === groupId
                      ? {
                          ...g,
                          tasks: [
                            ...g.tasks,
                            {
                              id: `optimistic-${Date.now()}`,
                              title,
                              status: "not_started" as TaskStatus,
                              priority: "low" as TaskPriority,
                              groupId,
                              boardId: prev.id,
                              dueDate: null,
                              completed: false,
                              position: g.tasks.length,
                              createdAt: new Date().toISOString(),
                              updatedAt: new Date().toISOString(),
                              owner: null,
                            },
                          ],
                        }
                      : g,
                  ),
                }
              : prev,
          );
          load().then(applyResult);
        }}
      />

      <AlertDialog open={deleteGroupTarget !== null} onOpenChange={(open) => !open && setDeleteGroupTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this group?</AlertDialogTitle>
            <AlertDialogDescription>
              The group and all tasks inside it will be permanently removed from this board.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                if (deleteGroupTarget) void deleteGroup(deleteGroupTarget);
                setDeleteGroupTarget(null);
              }}
            >
              Delete group
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reference "Add New Group" dialog — title + color swatches. */}
      <CreateGroupDialog
        open={groupDialogOpen}
        onOpenChange={setGroupDialogOpen}
        boardId={boardId}
        onCreated={() => {
          setGroupDialogOpen(false);
          load().then(applyResult);
        }}
      />
    </div>
  );
}
