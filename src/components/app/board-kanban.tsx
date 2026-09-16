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
import { CalendarDays, Columns3, Plus, User as UserIcon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { TASK_PRIORITIES, TASK_STATUSES, groupTasksByPerson, groupTasksByStatus, priorityMeta, statusMeta } from "@/lib/domain";
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
  const priorityIndex = TASK_PRIORITIES.findIndex((p) => p.value === task.priority);

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      role="button"
      aria-label={`Task card: ${task.title}`}
      className={`cursor-grab touch-none rounded-lg border bg-card p-3 shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      <p className={`text-sm font-medium ${task.completed ? "text-muted-foreground line-through" : ""}`}>
        {task.title}
      </p>
      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {task.owner ? (
            <span
              className="flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-semibold text-white"
              style={{ backgroundColor: task.owner.avatarColor }}
              title={task.owner.name}
            >
              {initialsOf(task.owner.name)}
            </span>
          ) : (
            <UserIcon className="h-3.5 w-3.5 text-muted-foreground/50" aria-label="Unassigned" />
          )}
          {dueDate && (
            <span
              className={`flex items-center gap-1 text-[11px] ${
                overdue ? "font-medium text-destructive" : "text-muted-foreground"
              }`}
            >
              <CalendarDays className="h-3 w-3" aria-hidden="true" />
              {format(dueDate, "MMM d")}
            </span>
          )}
        </div>
        {/* Priority rendered as filled dots — count + color both derive from
            TASK_PRIORITIES so the vocabulary stays closed. */}
        <span className="flex items-center gap-1" aria-label={`Priority ${priorityMeta(task.priority).label}`}>
          {TASK_PRIORITIES.map((level, i) => (
            <span
              key={level.value}
              className="h-1.5 w-1.5 rounded-full"
              style={{
                backgroundColor: i <= (priorityIndex === -1 ? 0 : priorityIndex) ? priorityMeta(task.priority).color : "#d0d4e1",
              }}
            />
          ))}
        </span>
      </div>
    </div>
  );
}

/** The reference's empty-column placeholder: a large colored disc + hint. */
function EmptyColumnHint({ color, onAddTask }: { color: string; onAddTask: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg py-8">
      <button
        type="button"
        aria-label="Add a task to this column"
        onClick={onAddTask}
        className="flex h-14 w-14 items-center justify-center rounded-full text-white shadow-md transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        style={{ backgroundColor: color }}
      >
        <Plus className="h-6 w-6" />
      </button>
      <p className="text-xs text-muted-foreground">Drag tasks here</p>
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
    <div className="flex w-72 shrink-0 flex-col rounded-xl border bg-secondary/30 sm:w-full" data-column={column.id}>
      <div
        ref={setNodeRef}
        className={`flex min-h-[280px] flex-1 flex-col rounded-xl p-3 transition-colors ${
          isOver ? "bg-accent ring-2 ring-primary/30" : ""
        }`}
      >
        <div className="mb-3 flex items-center justify-between px-1">
          <div className="flex min-w-0 items-center gap-2">
            {column.avatar ? (
              <Avatar className="h-6 w-6">
                <AvatarFallback
                  className="text-[9px] font-semibold text-white"
                  style={{ backgroundColor: column.avatar.avatarColor }}
                >
                  {initialsOf(column.avatar.name)}
                </AvatarFallback>
              </Avatar>
            ) : (
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: column.dotColor }} aria-hidden="true" />
            )}
            <h3 className="truncate text-sm font-semibold">{column.label}</h3>
            <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
              {column.tasks.length}
            </span>
          </div>
          <button
            type="button"
            aria-label={`Add task to ${column.label}`}
            onClick={onAddTask}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        {column.sublabel && <p className="-mt-2 mb-2 px-1 text-[11px] text-muted-foreground">{column.sublabel}</p>}
        <div className="flex flex-col gap-2">
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
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
        {/* Reference chrome: heading inside a lavender tile with an icon. */}
        <div className="flex items-center gap-2 rounded-lg bg-[#f0ecfa] px-3 py-2">
          <Columns3 className="h-4 w-4 text-[#a25ddb]" aria-hidden="true" />
          <h2 className="text-base font-semibold">Kanban Board</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Group by:</span>
          <Select value={groupMode} onValueChange={(v) => setGroupMode(v as KanbanGroupMode)}>
            <SelectTrigger className="h-8 w-32" aria-label="Group kanban by">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="status">Status</SelectItem>
              <SelectItem value="person">People</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="p-3">
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-2 lg:grid lg:grid-cols-4 lg:overflow-visible">
            {columns.map((column) => (
              <KanbanColumn key={column.id} column={column} onAddTask={onAddTask}>
                {null}
              </KanbanColumn>
            ))}
          </div>
          <DragOverlay>
            {activeTask ? (
              <div className="w-64 rotate-2 rounded-lg border bg-card p-3 shadow-lg">
                <p className="text-sm font-medium">{activeTask.title}</p>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}
