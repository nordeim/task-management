"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  Calendar as CalendarIcon,
  Filter,
  GanttChartSquare,
  KanbanSquare,
  Plus,
  Search,
  Sigma,
  Star,
  Table2,
  UserRound,
  UsersRound,
  Zap,
  EyeOff,
  ArrowUpDown,
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
import { toast } from "@/hooks/use-toast";
import { useApp } from "@/components/app/app-context";
import { api } from "@/lib/api-client";
import { format } from "date-fns";
import type { BoardDetailDTO, TaskPriority, TaskStatus, UserDTO } from "@/lib/domain";
import { BoardTable } from "@/components/app/board-table";
import { BoardKanban } from "@/components/app/board-kanban";
import { BoardCalendar } from "@/components/app/board-calendar";
import { CreateTaskDialog } from "@/components/app/create-task-dialog";

type BoardSubView = "table" | "kanban" | "calendar" | "timeline" | "unassigned";

const SUB_VIEWS: { value: BoardSubView; label: string; icon: typeof Table2 }[] = [
  { value: "table", label: "Main Table", icon: Table2 },
  { value: "kanban", label: "Kanban Board", icon: KanbanSquare },
  { value: "calendar", label: "Calendar View", icon: CalendarIcon },
  { value: "timeline", label: "Timeline", icon: GanttChartSquare },
  { value: "unassigned", label: "Unassigned Tasks", icon: UserRound },
];

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
  const [sortDesc, setSortDesc] = useState(false);
  const [showPersonOnly, setShowPersonOnly] = useState(false);
  const [taskDialog, setTaskDialog] = useState<{ open: boolean; groupId: string | null }>({
    open: false,
    groupId: null,
  });
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [deleteGroupTarget, setDeleteGroupTarget] = useState<string | null>(null);

  const load = useCallback(() => api<BoardDetailDTO>(`/api/boards/${boardId}`), [boardId]);

  function applyResult(result: { ok: boolean; data?: BoardDetailDTO; error?: string }) {
    if (result.ok && result.data) {
      setBoard(result.data);
      setError(null);
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

  const visibleTasks = useMemo(() => {
    let tasks = allTasks;
    const query = search.trim().toLowerCase();
    if (query) {
      tasks = tasks.filter((t) => t.title.toLowerCase().includes(query));
    }
    if (showPersonOnly) {
      tasks = tasks.filter((t) => t.owner === null);
    }
    if (sortDesc) {
      tasks = [...tasks].sort((a, b) => a.title.localeCompare(b.title));
    }
    return tasks;
  }, [allTasks, search, showPersonOnly, sortDesc]);

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
      // Mirror the server's status<->completed coupling so the checkbox,
      // status pill, kanban, and analytics never disagree locally.
      const localPatch: TaskPatch = { ...patch };
      if (patch.status !== undefined) {
        localPatch.completed = patch.status === "done";
      } else if (patch.completed !== undefined) {
        localPatch.status = patch.completed ? "done" : "not_started";
      }
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
  }, []);

  const addGroup = useCallback(async () => {
    const result = await api<{ id: string }>(`/api/boards/${boardId}/groups`, {
      method: "POST",
      body: { name: "New Group" },
    });
    if (!result.ok) {
      toast({ title: "Could not add group", description: result.error, variant: "destructive" });
      return;
    }
    load().then(applyResult);
  }, [boardId, load]);

  const renameGroup = useCallback(async (groupId: string, name: string) => {
    const result = await api<null>(`/api/groups/${groupId}`, { method: "PATCH", body: { name } });
    if (!result.ok) {
      toast({ title: "Could not rename group", description: result.error, variant: "destructive" });
      return;
    }
    setBoard((prev) =>
      prev ? { ...prev, groups: prev.groups.map((g) => (g.id === groupId ? { ...g, name } : g)) } : prev,
    );
  }, []);

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
  }, [board, titleDraft]);

  if (error) {
    return (
      <div className="mx-auto max-w-[1400px] p-6">
        <Button variant="ghost" className="mb-4" onClick={() => navigate("boards")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to boards
        </Button>
        <div className="rounded-xl border bg-card py-10 text-center">
          <p className="mb-2 font-medium">Could not load this board</p>
          <p className="mb-4 text-sm text-muted-foreground">{error}</p>
          <Button onClick={() => load().then(applyResult)}>Try again</Button>
        </div>
      </div>
    );
  }

  if (!board) {
    return (
      <div className="mx-auto max-w-[1400px] space-y-4 p-4 sm:p-6 lg:p-8">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-9 w-96" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  const total = allTasks.length;
  const currentViewLabel = SUB_VIEWS.find((v) => v.value === subView)?.label ?? "Main table";

  // Timeline: tasks with due dates sorted chronologically, laid out as rows.
  const timelineTasks = [...allTasks]
    .filter((t) => t.dueDate !== null)
    .sort((a, b) => new Date(a.dueDate ?? 0).getTime() - new Date(b.dueDate ?? 0).getTime());

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 p-4 sm:p-6 lg:p-8">
      {/* Board header */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" aria-label="Back to boards" onClick={() => navigate("boards")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-base font-bold text-white"
            style={{ backgroundColor: board.color }}
            aria-hidden="true"
          >
            {board.title.slice(0, 1).toUpperCase()}
          </span>
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
            <button
              type="button"
              onClick={() => {
                setTitleDraft(board.title);
                setEditingTitle(true);
              }}
              title="Rename board"
              className="rounded-md px-2 py-1 text-left text-xl font-bold transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {board.title}
            </button>
          )}

          <span className="hidden text-muted-foreground/50 xl:inline" aria-hidden="true">|</span>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
                {(() => {
                  const Icon = SUB_VIEWS.find((v) => v.value === subView)?.icon ?? Table2;
                  return <Icon className="h-4 w-4" />;
                })()}
                {currentViewLabel}
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} aria-hidden="true">
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

          <span className="hidden text-muted-foreground/50 xl:inline" aria-hidden="true">|</span>

          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground"
            onClick={() => void toggleFavorite()}
            aria-pressed={board.isFavorite}
          >
            <Star className={`h-4 w-4 ${board.isFavorite ? "fill-[#fcc203] text-[#fcc203]" : ""}`} />
            <span className="hidden sm:inline">{board.isFavorite ? "Remove from favorites" : "Add to favorites"}</span>
          </Button>

          <span className="hidden items-center gap-0.5 xl:flex" aria-label="Board members">
            {board.members.slice(0, 4).map((member, i) => (
              <Avatar key={member.id} className="h-8 w-8 border-2 border-card" style={{ marginLeft: i === 0 ? 0 : -8 }}>
                <AvatarFallback
                  className="text-[10px] font-semibold text-white"
                  style={{ backgroundColor: member.avatarColor }}
                >
                  {initialsOf(member.name)}
                </AvatarFallback>
              </Avatar>
            ))}
            {board.members.length > 4 && (
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-card bg-secondary text-[10px] font-semibold text-muted-foreground"
                style={{ marginLeft: -8 }}
              >
                +{board.members.length - 4}
              </span>
            )}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" className="text-muted-foreground" onClick={() => navigate("analytics")}>
            <BarChart3 className="mr-1 h-4 w-4" /> Analytics
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-muted-foreground"
            onClick={() =>
              toast({
                title: "Integrate",
                description: "Connectors are not configured on this deployment.",
              })
            }
          >
            <Sigma className="mr-1 h-4 w-4" /> Integrate
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-muted-foreground"
            onClick={() =>
              toast({
                title: "Automate",
                description: "Automation recipes are not configured on this deployment.",
              })
            }
          >
            <Zap className="mr-1 h-4 w-4" /> Automate
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" className="font-semibold" onClick={() => setTaskDialog({ open: true, groupId: null })}>
          <Plus className="mr-1 h-4 w-4" /> New Task
        </Button>
        <div className="relative min-w-40 flex-1 sm:max-w-56">
          <Input
            type="search"
            aria-label="Search tasks in board"
            placeholder="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8"
          />
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        </div>
        <Button
          variant="outline"
          size="sm"
          className={showPersonOnly ? "border-primary text-primary" : "text-muted-foreground"}
          aria-pressed={showPersonOnly}
          onClick={() => setShowPersonOnly((v) => !v)}
        >
          <UsersRound className="mr-1 h-4 w-4" /> Person
        </Button>
        <Button variant="outline" size="sm" className="text-muted-foreground">
          <Filter className="mr-1 h-4 w-4" /> Filter
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-muted-foreground"
          aria-pressed={sortDesc}
          onClick={() => setSortDesc((v) => !v)}
        >
          <ArrowUpDown className="mr-1 h-4 w-4" /> Sort
        </Button>
        <Button variant="outline" size="sm" className="text-muted-foreground" onClick={() => setSearch("")}>
          <EyeOff className="mr-1 h-4 w-4" /> Hide
        </Button>
        <span className="ml-auto text-xs text-muted-foreground">
          {total} item{total === 1 ? "" : "s"}
        </span>
      </div>

      {/* View body */}
      {subView === "table" && (
        <BoardTable
          board={board}
          onUpdateTask={(taskId, patch) => void updateTask(taskId, patch)}
          onDeleteTask={(taskId) => void deleteTask(taskId)}
          onAddTask={(groupId) => setTaskDialog({ open: true, groupId })}
          onRenameGroup={(groupId, name) => void renameGroup(groupId, name)}
          onToggleCollapse={(groupId, collapsed) => void toggleCollapse(groupId, collapsed)}
          onDeleteGroup={(groupId) => setDeleteGroupTarget(groupId)}
          onAddGroup={() => void addGroup()}
        />
      )}

      {subView === "kanban" && (
        <BoardKanban
          tasks={visibleTasks}
          onStatusChange={(taskId, status) => void updateTask(taskId, { status })}
          onAddTask={() => setTaskDialog({ open: true, groupId: null })}
        />
      )}

      {subView === "calendar" && (
        <BoardCalendar tasks={allTasks} onAddTask={() => setTaskDialog({ open: true, groupId: null })} />
      )}

      {subView === "timeline" && (
        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="text-base font-semibold">Timeline</h2>
            <p className="text-xs text-muted-foreground">{timelineTasks.length} scheduled tasks</p>
          </div>
          {timelineTasks.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No tasks with due dates — set a due date to see them on the timeline.
            </p>
          ) : (
            <ul className="divide-y">
              {timelineTasks.map((task) => {
                const due = task.dueDate ? new Date(task.dueDate) : null;
                const overdue = due !== null && due < new Date() && task.status !== "done";
                return (
                  <li key={task.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: board.color }}
                      aria-hidden="true"
                    />
                    <span className={`min-w-0 flex-1 truncate text-sm ${task.completed ? "text-muted-foreground line-through" : ""}`}>
                      {task.title}
                    </span>
                    {task.owner && (
                      <span
                        className="hidden h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold text-white sm:flex"
                        style={{ backgroundColor: task.owner.avatarColor }}
                      >
                        {initialsOf(task.owner.name)}
                      </span>
                    )}
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        overdue ? "bg-destructive/10 text-destructive" : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      <CalendarDays className="mr-1 inline h-3 w-3" aria-hidden="true" />
                      {due ? format(due, "MMM d, yyyy") : "—"}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
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
    </div>
  );
}
