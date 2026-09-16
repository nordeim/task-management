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
import { CalendarDays, Plus, User as UserIcon } from "lucide-react";
import { TASK_STATUSES } from "@/lib/domain";
import type { TaskDTO, TaskStatus } from "@/lib/domain";

interface KanbanProps {
  tasks: TaskDTO[];
  onStatusChange: (taskId: string, status: TaskStatus) => void;
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
        {/* Priority rendered as filled dots matching the table's bar colors. */}
        <span className="flex items-center gap-1" aria-label={`Priority ${task.priority}`}>
          {["low", "medium", "high", "critical"].map((level, i) => (
            <span
              key={level}
              className="h-1.5 w-1.5 rounded-full"
              style={{
                backgroundColor:
                  i <= ["low", "medium", "high", "critical"].indexOf(task.priority)
                    ? { low: "#579bfc", medium: "#fcc203", high: "#ff642e", critical: "#e2445c" }[task.priority]
                    : "#d0d4e1",
              }}
            />
          ))}
        </span>
      </div>
    </div>
  );
}

function KanbanColumn({
  status,
  tasks,
  onAddTask,
}: {
  status: (typeof TASK_STATUSES)[number];
  tasks: TaskDTO[];
  onAddTask: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status.value });

  return (
    <div className="flex w-72 shrink-0 flex-col rounded-xl border bg-secondary/30 sm:w-full" data-status={status.value}>
      <div
        ref={setNodeRef}
        className={`flex min-h-[280px] flex-1 flex-col rounded-xl p-3 transition-colors ${
          isOver ? "bg-accent ring-2 ring-primary/30" : ""
        }`}
      >
        <div className="mb-3 flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: status.bg }} aria-hidden="true" />
            <h3 className="text-sm font-semibold">{status.label}</h3>
            <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
              {tasks.length}
            </span>
          </div>
          <button
            type="button"
            aria-label={`Add task to ${status.label}`}
            onClick={onAddTask}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {tasks.map((task) => (
            <KanbanCard key={task.id} task={task} />
          ))}
          {tasks.length === 0 && (
            <p className="rounded-lg border border-dashed py-6 text-center text-xs text-muted-foreground">
              Drop tasks here
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function BoardKanban({ tasks, onStatusChange, onAddTask }: KanbanProps) {
  const [activeTask, setActiveTask] = useState<TaskDTO | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const byStatus = useMemo(() => {
    const map = new Map<string, TaskDTO[]>();
    for (const status of TASK_STATUSES) map.set(status.value, []);
    for (const task of tasks) {
      const bucket = map.get(task.status);
      if (bucket) bucket.push(task);
    }
    return map;
  }, [tasks]);

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
    const targetStatus = over.id as string;
    if (targetStatus !== task.status) {
      onStatusChange(task.id, targetStatus as TaskStatus);
    }
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-2 lg:grid lg:grid-cols-4 lg:overflow-visible">
        {TASK_STATUSES.map((status) => (
          <KanbanColumn
            key={status.value}
            status={status}
            tasks={byStatus.get(status.value) ?? []}
            onAddTask={onAddTask}
          />
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
  );
}
