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
import {
  KANBAN_CARD_BORDER,
  PEOPLE_COLUMN_PALETTE,
  TASK_STATUSES,
  avatarGradient,
  avatarInitials,
  distinctOwnerNames,
  groupTasksByStatus,
} from "@/lib/domain";
import type { TaskDTO, TaskStatus, UserDTO } from "@/lib/domain";

export type KanbanGroupMode = "status" | "person";

interface KanbanProps {
  tasks: TaskDTO[];
  members: UserDTO[];
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onOwnerChange: (taskId: string, ownerId: string | null) => void;
  onAddTask: () => void;
  /** Reference: clicking a card (or its Ellipsis) opens the Edit Task modal. */
  onOpenTask: (task: TaskDTO) => void;
}

/** The reference's empty-column placeholder (decompiled): a dashed border
 * box with a tinted disc, colored "Drag tasks here" (the unassigned column
 * reads "Drag unassigned tasks here") + gray hint line. */
function EmptyColumnHint({
  color,
  isUnassigned,
  onAddTask,
}: {
  color: string;
  isUnassigned: boolean;
  onAddTask: () => void;
}) {
  return (
    <div
      className="rounded-2xl border-3 border-dashed px-4 py-8 text-center transition-colors"
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
        {isUnassigned ? "Drag unassigned tasks here" : "Drag tasks here"}
      </p>
      <p className="mt-1 text-xs text-gray-500">or click + to add new</p>
    </div>
  );
}

interface ColumnSpec {
  id: string;
  label: string;
  dotColor: string;
  tasks: TaskDTO[];
  isUnassigned?: boolean;
}

function KanbanColumn({
  column,
  onAddTask,
  onOpenTask,
}: {
  column: ColumnSpec;
  onAddTask: () => void;
  onOpenTask: (task: TaskDTO) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div
      ref={setNodeRef}
      className={`w-80 flex-shrink-0 rounded-2xl p-2 transition-all duration-300 ${
        isOver ? "scale-105 shadow-2xl" : "shadow-lg"
      }`}
      data-column={column.id}
      style={{
        // Reference drag-over: the COLUMN's own color tinted at 12.5%/6.25%
        // (replaces any ring) — neutral slate gradient at rest.
        background: isOver
          ? `linear-gradient(135deg, ${column.dotColor}20 0%, ${column.dotColor}10 100%)`
          : "linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)",
      }}
    >
      {/* Reference column anatomy (probed 2026-09-17): the droppable IS the
          w-80 column div; its two direct children are the header zone and the
          scroll zone — no inner wrapper, no avatar, no sublabel. */}
      <div className="mb-2 px-4 py-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-bold text-gray-800">{column.label}</h3>
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
      </div>
      <div className="tuesday-scroll group max-h-[calc(100vh-300px)] min-h-[200px] overflow-y-auto px-2 pb-2">
        {column.tasks.map((task) => (
          <KanbanCard key={task.id} task={task} onOpenTask={onOpenTask} />
        ))}
        {column.tasks.length === 0 && (
          <EmptyColumnHint
            color={column.dotColor}
            isUnassigned={column.isUnassigned ?? false}
            onAddTask={onAddTask}
          />
        )}
      </div>
    </div>
  );
}

function KanbanCard({
  task,
  onOpenTask,
}: {
  task: TaskDTO;
  onOpenTask: (task: TaskDTO) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  });
  const dueDate = task.dueDate ? new Date(task.dueDate) : null;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      role="button"
      aria-label={`Task card: ${task.title}`}
      onClick={(e) => {
        // Reference: a plain click opens the Edit Task modal; drags still
        // work because PointerSensor needs 6px before it captures.
        if (!isDragging) {
          e.preventDefault();
          onOpenTask(task);
        }
      }}
      className={`group mb-4 cursor-grab touch-none rounded-2xl border-l-4 bg-white p-4 shadow-lg transition-all duration-300 ease-in-out hover:-translate-y-1 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        // Reference drag state (decompiled): ring-4 blue + scale + gradient
        // fill — NOT an opacity dim.
        isDragging
          ? "scale-105 shadow-2xl ring-4 ring-blue-200"
          : ""
      }`}
      style={{
        borderLeftColor: KANBAN_CARD_BORDER,
        background: isDragging
          ? "linear-gradient(135deg, #ffffff 0%, #f8faff 100%)"
          : "white",
      }}
    >
      {/* Card head — title + hover-revealed kebab (reference: h-8 w-8 round,
          opens the Edit Task modal). */}
      <div className="mb-3 flex items-start justify-between">
        <h4 className="pr-2 text-lg font-bold leading-tight text-gray-800">{task.title}</h4>
        <button
          type="button"
          aria-label={`Actions for ${task.title}`}
          onClick={(e) => {
            e.stopPropagation();
            onOpenTask(task);
          }}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-400 opacity-0 transition-opacity hover:bg-gray-100 hover:text-gray-600 focus-visible:opacity-100 group-hover:opacity-100"
        >
          <Ellipsis className="h-4 w-4" />
        </button>
      </div>
      {/* Card footer — reference: due-date chip left (always blue — no
          overdue variant exists on the reference), gradient owner avatar
          right (8-palette by first char code, 2-char initials). */}
      <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 text-xs text-gray-500">
        <div className="flex items-center gap-3">
          {dueDate && (
            <span className="flex items-center gap-1.5 rounded-full bg-blue-50 px-2 py-1">
              <CalendarDays className="h-3.5 w-3.5 text-blue-500" aria-hidden="true" />
              <span className="font-medium text-blue-700">{format(dueDate, "MMM d")}</span>
            </span>
          )}
        </div>
        {task.owner ? (
          <span
            className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white shadow-md"
            style={{ background: avatarGradient(task.owner.name) }}
            title={task.owner.name}
          >
            {avatarInitials(task.owner.name)}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function BoardKanban({
  tasks,
  members,
  onStatusChange,
  onOwnerChange,
  onAddTask,
  onOpenTask,
}: KanbanProps) {
  const [activeTask, setActiveTask] = useState<TaskDTO | null>(null);
  const [groupMode, setGroupMode] = useState<KanbanGroupMode>("status");
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const statusColumns = useMemo(() => {
    const grouped = groupTasksByStatus(tasks);
    return TASK_STATUSES.map((status) => ({
      id: `status:${status.value}`,
      label: status.label,
      dotColor: status.bg,
      tasks: grouped.get(status.value) ?? [],
    })) satisfies ColumnSpec[];
  }, [tasks]);

  // Reference people grouping (`Ste`): columns ONLY for owners who own
  // tasks (distinct owner strings in first-encounter order, badge colors
  // from the LE palette by index) — the Unassigned column renders only
  // when it holds items (or when no people exist at all). No member
  // registry, no header avatar, no sublabel.
  const personColumns = useMemo(() => {
    const ownerNames = distinctOwnerNames(tasks);
    const byName = new Map(members.map((m) => [m.name, m]));
    const columns: ColumnSpec[] = ownerNames.map((name, index) => ({
      id: `person:${byName.get(name)?.id ?? name}`,
      label: name,
      dotColor: PEOPLE_COLUMN_PALETTE[index % PEOPLE_COLUMN_PALETTE.length]!,
      tasks: tasks.filter((t) => t.owner?.name === name),
    }));
    const unassigned = tasks.filter((t) => t.owner === null);
    if (unassigned.length > 0 || ownerNames.length === 0) {
      columns.unshift({
        id: "person:unassigned",
        label: "Unassigned",
        dotColor: "#9CA3AF",
        tasks: unassigned,
        isUnassigned: true,
      });
    }
    return columns;
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
            <KanbanColumn
              key={column.id}
              column={column}
              onAddTask={onAddTask}
              onOpenTask={onOpenTask}
            />
          ))}
        </div>
        <DragOverlay>
          {activeTask ? (
            <div
              className="w-64 rotate-2 rounded-2xl border-l-4 bg-white p-4 shadow-xl ring-4 ring-blue-200"
              style={{ borderLeftColor: KANBAN_CARD_BORDER }}
            >
              <p className="text-lg font-bold leading-tight text-gray-800">{activeTask.title}</p>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
