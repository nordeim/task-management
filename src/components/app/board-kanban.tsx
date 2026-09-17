"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { format } from "date-fns";
import { CalendarDays, Ellipsis, List, Plus } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { KANBAN_CARD_BORDER, TASK_STATUSES, groupTasksByPerson, groupTasksByStatus, statusMeta } from "@/lib/domain";
import type { TaskDTO, TaskStatus, UserDTO } from "@/lib/domain";

export type KanbanGroupMode = "status" | "person";

interface KanbanProps {
  tasks: TaskDTO[];
  members: UserDTO[];
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onOwnerChange: (taskId: string, ownerId: string | null) => void;
  onAddTask: () => void;
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

function KanbanCard({ task }: { task: TaskDTO }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  });
  const dueDate = task.dueDate ? new Date(task.dueDate) : null;
  const overdue = dueDate !== null && dueDate < new Date() && task.status !== "done";

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      role="button"
      aria-label={`Task card: ${task.title}`}
      className={`group mb-4 cursor-grab touch-none rounded-2xl border-l-4 bg-white p-4 shadow-lg transition-all duration-300 ease-in-out hover:-translate-y-1 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        isDragging ? "opacity-40" : ""
      }`}
      style={{ borderLeftColor: KANBAN_CARD_BORDER }}
    >
      {/* Card head — title + hover-revealed kebab (reference: h-8 w-8 round). */}
      <div className="mb-3 flex items-start justify-between">
        <h4 className="pr-2 text-lg font-bold leading-tight text-gray-800">{task.title}</h4>
        <button
          type="button"
          aria-label={`Actions for ${task.title}`}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-400 opacity-0 transition-opacity hover:bg-gray-100 hover:text-gray-600 focus-visible:opacity-100 group-hover:opacity-100"
        >
          <Ellipsis className="h-4 w-4" />
        </button>
      </div>
      {/* Card footer — reference: due-date chip left, owner avatar right. */}
      <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 text-xs text-gray-500">
        <div className="flex items-center gap-3">
          {dueDate && (
            <span
              className={`flex items-center gap-1.5 rounded-full px-2 py-1 ${
                overdue ? "bg-red-50" : "bg-blue-50"
              }`}
            >
              <CalendarDays
                className={`h-3.5 w-3.5 ${overdue ? "text-red-500" : "text-blue-500"}`}
                aria-hidden="true"
              />
              <span className={`font-medium ${overdue ? "text-red-700" : "text-blue-700"}`}>
                {format(dueDate, "MMM d")}
              </span>
            </span>
          )}
        </div>
        {task.owner ? (
          <span
            className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white shadow-md"
            style={{ backgroundColor: task.owner.avatarColor }}
            title={task.owner.name}
          >
            {initialsOf(task.owner.name)}
          </span>
        ) : null}
      </div>
    </div>
  );
}

/** The reference's empty-column placeholder (probed 2026-09-17): a dashed
 *  border box with a tinted disc, colored "Drag tasks here" + hint line. */
function EmptyColumnHint({ color, onAddTask }: { color: string; onAddTask: () => void }) {
  return (
    <div
      className="rounded-2xl border-3 border-dashed px-4 py-8 transition-colors"
      style={{ borderColor: `${color}40` }}
    >
      <button
        type="button"
        aria-label="Add a task to this column"
        onClick={onAddTask}
        className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        style={{ backgroundColor: `${color}20` }}
      >
        <Plus className="h-6 w-6" style={{ color }} />
      </button>
      <p className="text-sm font-medium" style={{ color }}>
        Drag tasks here
      </p>
      <p className="mt-1 text-xs text-gray-500">or click + to add new</p>
    </div>
  );
}

interface ColumnSpec {
  id: string;
  label: string;
  sublabel: string | null;
  dotColor: string;
  tasks: TaskDTO[];
  avatar?: UserDTO | null;
}

function KanbanColumn({
  column,
  onAddTask,
  children,
}: {
  column: ColumnSpec;
  onAddTask: () => void;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div
      className="w-80 flex-shrink-0 rounded-2xl p-2 shadow-lg transition-all duration-300"
      data-column={column.id}
      style={{ background: "linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)" }}
    >
      <div ref={setNodeRef} className="flex flex-col">
        <div className="mb-2 px-4 py-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex min-w-0 items-center gap-3">
              {column.avatar ? (
                <Avatar className="h-6 w-6">
                  <AvatarFallback
                    className="text-[9px] font-semibold text-white"
                    style={{ backgroundColor: column.avatar.avatarColor }}
                  >
                    {initialsOf(column.avatar.name)}
                  </AvatarFallback>
                </Avatar>
              ) : null}
              {/* Reference column header: bold title + tinted count badge (no dot). */}
              <h3 className="truncate text-lg font-bold text-gray-800">{column.label}</h3>
              <span
                className="rounded-full px-2.5 py-1 text-sm font-bold shadow-sm"
                style={{ backgroundColor: `${column.dotColor}20`, color: column.dotColor }}
              >
                {column.tasks.length}
              </span>
            </div>
            <button
              type="button"
              aria-label={`Add task to ${column.label}`}
              onClick={onAddTask}
              className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-white/50"
            >
              <Plus className="h-5 w-5" style={{ color: column.dotColor }} />
            </button>
          </div>
          {column.sublabel && <p className="-mt-1 text-[11px] text-muted-foreground">{column.sublabel}</p>}
        </div>
        <div
          className={`tuesday-scroll group max-h-[calc(100vh-300px)] min-h-[200px] overflow-y-auto px-2 pb-2 transition-colors ${
            isOver ? "rounded-2xl bg-accent ring-2 ring-[#0073EA]/30" : ""
          }`}
        >
          {column.tasks.map((task) => (
            <KanbanCard key={task.id} task={task} />
          ))}
          {column.tasks.length === 0 && <EmptyColumnHint color={column.dotColor} onAddTask={onAddTask} />}
        </div>
        {children}
      </div>
    </div>
  );
}

export function BoardKanban({ tasks, members, onStatusChange, onOwnerChange, onAddTask }: KanbanProps) {
  const [activeTask, setActiveTask] = useState<TaskDTO | null>(null);
  const [groupMode, setGroupMode] = useState<KanbanGroupMode>("status");
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const statusColumns = useMemo(() => {
    const grouped = groupTasksByStatus(tasks);
    return TASK_STATUSES.map((status) => ({
      id: `status:${status.value}`,
      label: status.label,
      sublabel: null,
      dotColor: status.bg,
      tasks: grouped.get(status.value) ?? [],
      avatar: null,
    })) satisfies ColumnSpec[];
  }, [tasks]);

  const personColumns = useMemo(() => {
    return groupTasksByPerson(tasks, members).map((column) => ({
      id: `person:${column.key}`,
      label: column.label,
      sublabel: column.sublabel,
      dotColor: column.user ? column.user.avatarColor : statusMeta("not_started").bg,
      tasks: column.tasks,
      avatar: column.user,
    })) satisfies ColumnSpec[];
  }, [tasks, members]);

  const columns = groupMode === "status" ? statusColumns : personColumns;

  function handleDragStart(event: DragStartEvent) {
    const task = event.active.data.current?.task as TaskDTO | undefined;
    setActiveTask(task ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;
    const task = active.data.current?.task as TaskDTO | undefined;
    if (!task) return;
    const target = String(over.id);

    if (target.startsWith("status:")) {
      const status = target.slice("status:".length);
      if (status !== task.status) onStatusChange(task.id, status as TaskStatus);
      return;
    }
    if (target.startsWith("person:")) {
      const key = target.slice("person:".length);
      const nextOwner = key === "unassigned" ? null : key;
      if ((task.owner?.id ?? null) !== nextOwner) onOwnerChange(task.id, nextOwner);
    }
  }

  return (
    <div>
      {/* Reference heading tile (probed 2026-09-17): standalone gradient band
          with a gradient icon tile, title + subtitle, and the Group by selector. */}
      <div className="mb-6 flex items-center justify-between rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-purple-50 p-4">
        <div className="flex items-center gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white"
            aria-hidden="true"
          >
            <Ellipsis className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-xl font-bold text-gray-800">Kanban Board</h2>
            <p className="text-sm text-gray-600">Drag and drop to manage your tasks</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700">Group by:</span>
          <Select value={groupMode} onValueChange={(v) => setGroupMode(v as KanbanGroupMode)}>
            <SelectTrigger
              className="h-9 w-32 rounded-xl border-2 border-gray-200 bg-white"
              aria-label="Group kanban by"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="status">
                <span className="flex items-center gap-2">
                  <List className="h-4 w-4" aria-hidden="true" />
                  Status
                </span>
              </SelectItem>
              <SelectItem value="person">
                <span className="flex items-center gap-2">
                  <List className="h-4 w-4" aria-hidden="true" />
                  People
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        {/* Reference columns row (probed): a bare flex scroller — no outer
            card wrapper — with fixed w-80 shadow columns. */}
        <div className="flex gap-6 overflow-x-auto p-2 pb-8">
          {columns.map((column) => (
            <KanbanColumn key={column.id} column={column} onAddTask={onAddTask}>
              {null}
            </KanbanColumn>
          ))}
        </div>
        <DragOverlay>
          {activeTask ? (
            <div className="w-64 rotate-2 rounded-2xl border-l-4 bg-white p-4 shadow-xl" style={{ borderLeftColor: KANBAN_CARD_BORDER }}>
              <p className="text-lg font-bold leading-tight text-gray-800">{activeTask.title}</p>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
