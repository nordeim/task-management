"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import { ChevronDown, ChevronRight, GripVertical, Plus, Settings, Trash2, Users, Calendar as CalendarIcon } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusCell } from "@/components/app/status-cell";
import { PriorityCell } from "@/components/app/priority-cell";
import { OwnerCell } from "@/components/app/owner-cell";
import { DateCell } from "@/components/app/date-cell";
import { groupSummary, visibleColumns, TASK_STATUSES, summaryDateLabel, summaryOwnerLabel, statusHeaderDots } from "@/lib/domain";
import { toast } from "@/hooks/use-toast";
import type { ColumnKey, GroupDTO, TaskDTO, TaskPriority, TaskStatus, UserDTO } from "@/lib/domain";

/** How the table rows are grouped — set from the board toolbar's Group-by popover. */
export type TableGroupBy = "default" | "status" | "person" | "priority";

/**
 * One renderable section: either a real board group (group !== null, editable)
 * or a synthetic section derived from status/priority/owner (read-only shell).
 */
export interface TableSection {
  id: string;
  name: string;
  color: string;
  tasks: TaskDTO[];
  group: GroupDTO | null;
}

interface BoardTableProps {
  sections: TableSection[];
  members: UserDTO[];
  groupBy: TableGroupBy;
  /** Columns turned off by the toolbar's Hide popover. */
  hiddenColumns: ColumnKey[];
  /** Board color — drives the group-header left accent bar (reference). */
  boardColor: string;
  onUpdateTask: (taskId: string, patch: Partial<Pick<TaskDTO, "title" | "status" | "priority" | "owner" | "dueDate" | "completed">>) => void;
  onDeleteTask: (taskId: string) => void;
  /** Inline add-task row + empty-group "Add Item": creates the task in-place. */
  onCreateTask: (groupId: string, title: string) => Promise<boolean>;
  onToggleCollapse: (groupId: string, collapsed: boolean) => void;
  onDeleteGroup: (groupId: string) => void;
  onAddGroup: () => void;
  /** Column header gear menu → "Hide from Group" wires into the Hide popover state. */
  onToggleColumn: (key: ColumnKey) => void;
  /** Drag-reorder: place a task at `index` inside `groupId`. */
  onReorderTask: (taskId: string, groupId: string, index: number) => void;
}

// ---------- reference geometry (probed 2026-09-17) ----------
//
// Rows are flex with STICKY columns inside a per-group overflow-x-auto
// scroller: 24px drag-handle rail (sticky left 0), 32px checkbox rail
// (sticky left 24), 250px Task column (sticky left 56), fixed data columns,
// a flex-1 spacer, and a 50px action rail (sticky right). All visible
// columns total exactly 926px — the reference's row min-width.

const RAIL_HANDLE = 24;
const RAIL_CHECK = 32;
const RAIL_ACTION = 50;

/** Fixed pixel widths per column — Due Date is 150 on the reference. */
const COLUMN_WIDTHS: Record<ColumnKey, number> = {
  task: 250,
  priority: 120,
  status: 150,
  owner: 150,
  dueDate: 150,
};

/** Row min-width = rails + every visible column (926px with all five shown). */
function rowMinWidth(columns: { key: ColumnKey }[]): number {
  return (
    RAIL_HANDLE +
    RAIL_CHECK +
    columns.reduce((sum, c) => sum + COLUMN_WIDTHS[c.key], 0) +
    RAIL_ACTION
  );
}

type CellProps = { children?: React.ReactNode; className?: string; style?: React.CSSProperties };

/** Gutter rails — sticky left with an opaque background like the reference.
 *  Backgrounds are CLASS-based so group-hover variants can co-exist. */
function HandleRail({ children, bg = "bg-white", className = "" }: { children?: React.ReactNode; bg?: string; className?: string }) {
  return (
    <div
      aria-hidden={!children}
      className={`flex shrink-0 items-center justify-center ${bg} ${children ? "" : " pointer-events-none"} ${className}`}
      style={{ width: RAIL_HANDLE, position: "sticky", left: 0, zIndex: 1 }}
    >
      {children}
    </div>
  );
}

function CheckRail({ children, bg = "bg-white", className = "" }: { children?: React.ReactNode; bg?: string; className?: string }) {
  return (
    <div
      aria-hidden={!children}
      className={`flex shrink-0 items-center justify-center ${bg} ${children ? "" : " pointer-events-none"} ${className}`}
      style={{ width: RAIL_CHECK, position: "sticky", left: RAIL_HANDLE, zIndex: 1 }}
    >
      {children}
    </div>
  );
}

/** Data cell — border-left divider plus the fixed reference width. */
function DataCell({ width, first, stickyLeft, children, className = "", style }: CellProps & { width: number; first?: boolean; stickyLeft?: number }) {
  const sticky = stickyLeft !== undefined;
  return (
    <div
      className={`flex items-center px-3 py-2${first ? "" : " border-l border-[#E1E5F3]"} group-hover:bg-[#F5F6F8]${className}`}
      style={{
        width,
        minWidth: width,
        ...(sticky ? { position: "sticky" as const, left: stickyLeft, zIndex: 1, backgroundColor: "white" } : {}),
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function ActionRail({ children, bg = "bg-white", className = "" }: { children?: React.ReactNode; bg?: string; className?: string }) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center ${bg} ${className}`}
      style={{ width: RAIL_ACTION, position: "sticky", right: 0, zIndex: 1 }}
    >
      {children}
    </div>
  );
}

// ---------- task row ----------

function TaskRow({
  task,
  members,
  columns,
  minW,
  canDrag,
  onUpdateTask,
  onDeleteTask,
}: {
  task: TaskDTO;
  members: UserDTO[];
  columns: { key: ColumnKey; label: string }[];
  minW: number;
  canDrag: boolean;
  onUpdateTask: BoardTableProps["onUpdateTask"];
  onDeleteTask: BoardTableProps["onDeleteTask"];
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.title);

  // Drag: listeners live on the HANDLE only, so clicks/typing still work.
  const { listeners: dragListeners, setNodeRef: setDragNodeRef, isDragging } = useDraggable({
    id: task.id,
    data: { task },
    disabled: !canDrag,
  });
  const { setNodeRef: setDropNodeRef } = useDroppable({ id: `row:${task.id}`, data: { task } });

  function commitTitle() {
    setEditing(false);
    const next = draft.trim();
    if (next && next !== task.title) {
      onUpdateTask(task.id, { title: next });
    } else {
      setDraft(task.title);
    }
  }

  const setNodeRefs = (node: HTMLElement | null) => {
    setDragNodeRef(node);
    setDropNodeRef(node);
  };

  return (
    <div
      ref={setNodeRefs}
      className={`group flex items-stretch border-b border-[#E1E5F3] transition-colors min-h-[48px] hover:bg-[#F5F6F8] ${
        isDragging ? "opacity-40" : ""
      }`}
      style={{ minWidth: minW }}
    >
      {/* Drag-handle rail — reference zone: cursor-grab, zone-level
          hover-reveal, p-1, white bg tinting on row hover. */}
      <HandleRail className="cursor-grab opacity-0 transition-opacity hover:cursor-grabbing group-hover:bg-[#F5F6F8] group-hover:opacity-100">
        {canDrag && (
          <span
            {...dragListeners}
            aria-label={`Reorder ${task.title}`}
            title="Drag to reorder"
            className="flex cursor-grab items-center justify-center focus-visible:outline-none"
          >
            <GripVertical className="h-3 w-3 text-[#676879]" />
          </span>
        )}
      </HandleRail>

      {/* Checkbox rail — hover-revealed, sticky left 24. Checked state is
          the reference's near-black bg-primary (#171717). */}
      <CheckRail className="group-hover:bg-[#F5F6F8]">
        <Checkbox
          aria-label={task.completed ? `Mark "${task.title}" not done` : `Mark "${task.title}" done`}
          checked={task.completed}
          onCheckedChange={(checked) =>
            onUpdateTask(task.id, {
              completed: checked === true,
              status: checked === true ? "done" : "not_started",
            })
          }
          className="opacity-0 transition-opacity group-hover:opacity-100 data-[state=checked]:opacity-100"
        />
      </CheckRail>

      {columns.map((col, i) => {
        if (col.key === "task") {
          return (
            <DataCell key={col.key} width={COLUMN_WIDTHS.task} first={i === 0} stickyLeft={RAIL_HANDLE + RAIL_CHECK}>
              {editing ? (
                <input
                  autoFocus
                  aria-label="Task title"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={commitTitle}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitTitle();
                    if (e.key === "Escape") {
                      setDraft(task.title);
                      setEditing(false);
                    }
                  }}
                  className="w-full rounded-md border-none bg-transparent p-0 font-medium text-[#323338] outline-none focus:ring-0"
                />
              ) : (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setEditing(true)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setEditing(true);
                    }
                  }}
                  title={task.title}
                  /* Reference title cell (decompiled yZ): NO text-size class —
                     inherits text-base 16px/24px, which is what makes 2-line
                     titles 56px tall on the reference; hover:rounded (not
                     always-rounded). Our focus-visible ring stays (a11y floor). */
                  className="cursor-pointer px-2 py-1 font-medium text-[#323338] transition-colors -mx-2 -my-1 hover:rounded hover:bg-[#E1E5F3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {task.title}
                </div>
              )}
            </DataCell>
          );
        }
        if (col.key === "priority") {
          return (
            <DataCell key={col.key} width={COLUMN_WIDTHS.priority} first={i === 0}>
              <PriorityCell
                value={task.priority}
                onChange={(priority: TaskPriority) => onUpdateTask(task.id, { priority })}
              />
            </DataCell>
          );
        }
        if (col.key === "status") {
          return (
            <DataCell key={col.key} width={COLUMN_WIDTHS.status} first={i === 0}>
              <StatusCell
                value={task.status}
                onChange={(status: TaskStatus) => onUpdateTask(task.id, { status })}
              />
            </DataCell>
          );
        }
        if (col.key === "owner") {
          return (
            <DataCell key={col.key} width={COLUMN_WIDTHS.owner} first={i === 0}>
              <OwnerCell
                owner={task.owner}
                members={members}
                onChange={(ownerId) => {
                  const member = ownerId ? members.find((m) => m.id === ownerId) ?? null : null;
                  onUpdateTask(task.id, { owner: member });
                }}
              />
            </DataCell>
          );
        }
        return (
          <DataCell key={col.key} width={COLUMN_WIDTHS.dueDate} first={i === 0}>
            <DateCell value={task.dueDate} onChange={(isoDate) => onUpdateTask(task.id, { dueDate: isoDate })} />
          </DataCell>
        );
      })}

      {/* Spacer so the row spans full width like the reference. */}
      <div className="min-w-0 flex-1 bg-white group-hover:bg-[#F5F6F8]" aria-hidden="true" />

      <ActionRail className="border-l border-[#E1E5F3] group-hover:bg-[#F5F6F8]">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`Actions for ${task.title}`}
              className="flex h-6 w-6 items-center justify-center rounded-md opacity-0 transition-opacity hover:bg-[#E1E5F3] focus-visible:opacity-100 group-hover:opacity-100"
            >
              <Trash2 className="h-3 w-3 text-[#676879]" />
            </button>
          </DropdownMenuTrigger>
          {/* Reference row menu: a single standard-color "Delete Task" item
              (their delete is client-side only; ours keeps the real API). */}
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onDeleteTask(task.id)}>
              Delete Task
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </ActionRail>
    </div>
  );
}

// ---------- inline add-task row ----------

/**
 * Reference add-task affordance: an EMPTY task row (same chrome) whose title
 * cell holds a hover-revealed grey "+ Add task" text button; clicking swaps
 * in a borderless inline input. Enter creates, Escape/blur cancels.
 */
function AddTaskRow({
  groupId,
  columns,
  minW,
  active,
  onActivate,
  onCreateTask,
}: {
  groupId: string;
  columns: { key: ColumnKey; label: string }[];
  minW: number;
  active: boolean;
  onActivate: () => void;
  onCreateTask: BoardTableProps["onCreateTask"];
}) {
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  async function commit() {
    const next = title.trim();
    if (!next || busy) {
      if (!next) onActivate(); // let the parent collapse the row
      return;
    }
    setBusy(true);
    const ok = await onCreateTask(groupId, next);
    setBusy(false);
    if (ok) setTitle("");
  }

  return (
    <div
      className="group flex items-center border-b border-[#E1E5F3] hover:bg-[#F5F6F8] min-h-[48px]"
      style={{ minWidth: minW }}
    >
      {/* Reference add-task row: every zone is transparent (the row-level
          hover tint shows through) and the title zone is flex-1, not a
          fixed-width sticky cell. */}
      <HandleRail bg="" />
      <CheckRail bg="" />
      {columns.map((col, i) => {
        if (col.key === "task") {
          return (
            <div key={col.key} className="flex-1 px-3 py-2">
              {active ? (
                <input
                  autoFocus
                  aria-label="New task title"
                  placeholder="Enter item name..."
                  value={title}
                  disabled={busy}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={() => void commit()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void commit();
                    if (e.key === "Escape") {
                      setTitle("");
                      onActivate();
                    }
                  }}
                  className="w-full rounded-md border-none bg-transparent p-0 text-sm font-medium text-[#323338] outline-none placeholder:text-muted-foreground focus:ring-0"
                />
              ) : (
                <button
                  type="button"
                  onClick={onActivate}
                  className="inline-flex h-auto items-center gap-2 whitespace-nowrap rounded-md p-0 text-sm font-normal text-[#676879] opacity-0 transition-opacity hover:text-[#0073EA] focus-visible:opacity-100 group-hover:opacity-100"
                >
                  <Plus className="mr-2 h-4 w-4" />Add task
                </button>
              )}
            </div>
          );
        }
        return <DataCell key={col.key} width={COLUMN_WIDTHS[col.key]} first={i === 0} />;
      })}
      <div className="min-w-0 flex-1" aria-hidden="true" />
      <ActionRail bg="" />
    </div>
  );
}

/** Empty-group state: a centered "Add Item" button in a padded zone. */
function EmptyGroupZone({ onActivate }: { onActivate: () => void }) {
  return (
    <div className="p-8 text-center">
      <button
        type="button"
        onClick={onActivate}
        className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-[#E1E5F3] bg-white px-4 py-2 text-sm font-medium shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        <Plus className="mr-2 h-4 w-4" /> Add Item
      </button>
    </div>
  );
}

// ---------- summary row ----------

/** The per-group footer row: "N items" + priority chips + status bars + dashes. */
function SummaryRow({
  tasks,
  columns,
  minW,
}: {
  tasks: TaskDTO[];
  columns: { key: ColumnKey; label: string }[];
  minW: number;
}) {
  const summary = useMemo(() => groupSummary(tasks), [tasks]);
  // One bar per status with a non-zero count — reference renders w-2 h-4
  // rounded-sm chips titled "N <Status>" instead of text.
  const statusBars = useMemo(
    () =>
      TASK_STATUSES.map((s) => ({ ...s, count: tasks.filter((t) => t.status === s.value).length })).filter(
        (s) => s.count > 0,
      ),
    [tasks],
  );
  return (
    <div
      className="flex items-stretch border-b border-[#E1E5F3] bg-gray-50 text-xs min-h-[40px]"
      style={{ minWidth: minW }}
      aria-label="Group summary"
    >
      <HandleRail bg="bg-gray-50" />
      <CheckRail bg="bg-gray-50" />
      {columns.map((col, i) => (
        <DataCell
          key={col.key}
          width={COLUMN_WIDTHS[col.key]}
          first={i === 0}
          stickyLeft={col.key === "task" ? RAIL_HANDLE + RAIL_CHECK : undefined}
          style={col.key === "task" ? { backgroundColor: "#f9fafb" } : undefined}
          className=" bg-gray-50"
        >
          {col.key === "task" && (
            <span className="flex items-center gap-1 text-xs text-gray-600">
              {summary.items} item{summary.items === 1 ? "" : "s"}
            </span>
          )}
          {col.key === "priority" && (
            <span className="flex flex-wrap gap-1">
              {summary.priorities.map((p) => (
                <span
                  key={p.label}
                  className="inline-flex items-center rounded-md border px-1.5 py-0.5 text-xs font-semibold text-foreground"
                >
                  {p.count} {p.label}
                </span>
              ))}
              {/* Reference "+N" overflow: extra priority TYPES past three. */}
              {summary.overflowCount > 0 && (
                <span className="text-xs text-gray-400">+{summary.overflowCount}</span>
              )}
              {summary.priorities.length === 0 && <span className="px-1">-</span>}
            </span>
          )}
          {col.key === "status" &&
            (statusBars.length > 0 ? (
              <span className="flex flex-wrap items-center gap-0.5">
                {statusBars.map((s) => (
                  <span
                    key={s.value}
                    className="h-4 w-2 rounded-sm"
                    style={{ backgroundColor: s.bg }}
                    title={`${s.count} ${s.label}`}
                  />
                ))}
              </span>
            ) : (
              <span className="px-1">-</span>
            ))}
          {col.key === "owner" && (() => {
            // Reference aggregate (probed): users icon + "N people".
            const label = summaryOwnerLabel(tasks.map((t) => t.owner?.id ?? null));
            return label ? (
              <span className="flex items-center gap-1 text-xs text-gray-600">
                <Users className="h-3 w-3" aria-hidden="true" />
                {label}
              </span>
            ) : (
              <span className="px-1">-</span>
            );
          })()}
          {col.key === "dueDate" && (() => {
            // Reference aggregate (probed): calendar icon + "Sep 25" or a
            // "Sep 18 - Sep 25" range; dash when the group has no dates.
            const label = summaryDateLabel(tasks.map((t) => t.dueDate));
            return label ? (
              <span className="flex items-center gap-1 text-xs text-gray-600">
                <CalendarIcon className="h-3 w-3" aria-hidden="true" />
                {label}
              </span>
            ) : (
              <span className="px-1">-</span>
            );
          })()}
        </DataCell>
      ))}
      <div className="min-w-0 flex-1 bg-gray-50" aria-hidden="true" />
      <ActionRail bg="bg-gray-50" />
    </div>
  );
}

// ---------- column header row ----------

/**
 * Reference header: a sticky grey band of column labels, each opening a
 * settings dropdown (Rename / Change Type / Configure / Hide from Group),
 * with a blue plus in the action rail to add a task to this group.
 */
function ColumnHeaderRow({
  columns,
  minW,
  onToggleColumn,
  onAddTask,
}: {
  columns: { key: ColumnKey; label: string }[];
  minW: number;
  onToggleColumn: BoardTableProps["onToggleColumn"];
  onAddTask: () => void;
}) {
  function notConfigured(feature: string) {
    toast({ title: "Not available", description: `${feature} is not configurable on this deployment.` });
  }

  return (
    <div
      className="sticky top-0 z-10 flex border-b border-[#E1E5F3] bg-[#F5F6F8]"
      style={{ minWidth: minW }}
      role="row"
    >
      <HandleRail bg="bg-[#F5F6F8]" />
      <CheckRail bg="bg-[#F5F6F8]" />
      {columns.map((col, i) => (
        <div
          key={col.key}
          className={`group flex cursor-pointer items-center justify-between px-3 py-3 transition-colors hover:bg-white${
            i === 0 ? "" : " border-l border-[#E1E5F3]"
          }`}
          style={{
            width: COLUMN_WIDTHS[col.key],
            minWidth: COLUMN_WIDTHS[col.key],
            ...(i === 0
              ? { position: "sticky" as const, left: RAIL_HANDLE + RAIL_CHECK, zIndex: 1, backgroundColor: "#F5F6F8" }
              : {}),
          }}
        >
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span className="truncate text-sm font-medium text-[#323338]">{col.label}</span>
          </div>
          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label={`Column settings for ${col.label}`}
                  className="rounded p-0.5"
                >
                  <Settings className="h-3 w-3 text-gray-500 hover:text-gray-700" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => notConfigured("Renaming columns")}>Rename Column</DropdownMenuItem>
                <DropdownMenuItem onClick={() => notConfigured("Column types")}>Change Column Type</DropdownMenuItem>
                <DropdownMenuItem onClick={() => notConfigured("Column configuration")}>Configure Column</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onToggleColumn(col.key)}>Hide from Group</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      ))}
      <div className="min-w-0 flex-1 bg-[#F5F6F8]" aria-hidden="true" />
      <ActionRail bg="bg-[#F5F6F8]" className="border-l border-[#E1E5F3] px-3 py-3">
        <button
          type="button"
          aria-label="Add task to this group"
          onClick={onAddTask}
          className="flex h-6 w-6 items-center justify-center rounded-md hover:bg-white"
        >
          <Plus className="h-4 w-4 text-[#0073EA]" />
        </button>
      </ActionRail>
    </div>
  );
}

// ---------- group zone ----------

function GroupZone({
  section,
  members,
  columns,
  onUpdateTask,
  onDeleteTask,
  onCreateTask,
  onToggleCollapse,
  onDeleteGroup,
  onToggleColumn,
}: {
  section: TableSection;
  members: UserDTO[];
  columns: { key: ColumnKey; label: string }[];
  onUpdateTask: BoardTableProps["onUpdateTask"];
  onDeleteTask: BoardTableProps["onDeleteTask"];
  onCreateTask: BoardTableProps["onCreateTask"];
  onToggleCollapse: BoardTableProps["onToggleCollapse"];
  onDeleteGroup: BoardTableProps["onDeleteGroup"];
  onToggleColumn: BoardTableProps["onToggleColumn"];
}) {
  // Synthetic sections (status/priority/person) have no backing group row to
  // edit — they are read-only shells around the same task rows.
  const group = section.group;
  const [adding, setAdding] = useState(false);

  const minW = rowMinWidth(columns);
  const total = section.tasks.length;
  const done = section.tasks.filter((t) => t.status === "done").length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  const collapsed = group?.collapsed ?? false;
  // Reference group header (probed with 10 tasks): ONE DOT PER STATUS with
  // its count, in first-encounter order — not a single total dot.
  const dots = statusHeaderDots(section.tasks);

  // Droppable target for the whole rows area (drop = append at end).
  const { setNodeRef: setRowsNodeRef } = useDroppable({ id: `rows:${section.id}`, data: { section } });

  function toggleCollapse() {
    if (group) onToggleCollapse(group.id, !collapsed);
  }

  return (
    <div className="border-b border-[#E1E5F3] last:border-b-0">
      {/* Group header — the WHOLE row toggles collapse on the reference
          (cursor-pointer, chevron flips down/right). No rename affordance. */}
      <div
        role={group ? "button" : undefined}
        tabIndex={group ? 0 : undefined}
        aria-label={group ? `Toggle group ${section.name}` : undefined}
        aria-expanded={group ? !collapsed : undefined}
        onClick={toggleCollapse}
        onKeyDown={(e) => {
          if (group && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            toggleCollapse();
          }
        }}
        className="relative flex cursor-pointer items-center justify-between p-4 transition-colors hover:bg-[#F5F6F8]"
        style={{ borderLeft: `4px solid ${section.color}` }}
      >
        <div className="flex items-center gap-3">
          <span className="flex h-6 w-6 items-center justify-center rounded-md transition-colors hover:bg-[#E1E5F3]">
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </span>
          <h3 className="text-lg font-bold text-[#323338]">{section.name}</h3>
          <span className="text-sm text-[#676879]">({total})</span>
        </div>
        <div className="flex items-center gap-2">
          {total > 0 && (
            <>
              {/* Per-status dots with counts, first-encounter order. */}
              <span className="flex items-center gap-2">
                {dots.map((dot) => (
                  <span key={dot.label} className="flex items-center gap-1">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: dot.color }}
                      aria-label={`${dot.count} ${dot.label}`}
                      aria-hidden="true"
                    />
                    <span className="text-xs text-[#676879]">{dot.count}</span>
                  </span>
                ))}
              </span>
              <span className="flex items-center gap-2">
                <span className="h-2 w-16 overflow-hidden rounded-full bg-[#E1E5F3]" aria-hidden="true">
                  <span
                    className="block h-full rounded-full transition-all duration-300"
                    style={{ width: `${pct}%`, backgroundColor: "var(--group-progress-fill)" }}
                  />
                </span>
                <span className="text-xs text-[#676879]">{pct}%</span>
              </span>
            </>
          )}
          {group && (
            <button
              type="button"
              aria-label={`Delete group ${section.name}`}
              title="Delete group"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteGroup(group.id);
              }}
              className="flex h-7 w-7 items-center justify-center rounded-md text-red-500 opacity-50 transition-all hover:bg-red-100 hover:text-red-600 hover:opacity-100"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {!collapsed && (
        <div className="overflow-hidden">
          <div className="relative overflow-x-auto" ref={setRowsNodeRef}>
            <ColumnHeaderRow
              columns={columns}
              minW={minW}
              onToggleColumn={onToggleColumn}
              onAddTask={() => setAdding(true)}
            />

            {group ? (
              <>
                {section.tasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    members={members}
                    columns={columns}
                    minW={minW}
                    canDrag
                    onUpdateTask={onUpdateTask}
                    onDeleteTask={onDeleteTask}
                  />
                ))}
                {section.tasks.length === 0 && !adding && <EmptyGroupZone onActivate={() => setAdding(true)} />}
                {(section.tasks.length > 0 || adding) && (
                  <AddTaskRow
                    groupId={group.id}
                    columns={columns}
                    minW={minW}
                    active={adding}
                    onActivate={() => setAdding((prev) => !prev)}
                    onCreateTask={onCreateTask}
                  />
                )}
                <SummaryRow tasks={section.tasks} columns={columns} minW={minW} />
              </>
            ) : (
              <>
                {section.tasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    members={members}
                    columns={columns}
                    minW={minW}
                    canDrag={false}
                    onUpdateTask={onUpdateTask}
                    onDeleteTask={onDeleteTask}
                  />
                ))}
                <SummaryRow tasks={section.tasks} columns={columns} minW={minW} />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- board table (one card for every group) ----------

export function BoardTable(props: BoardTableProps) {
  const { sections, groupBy, hiddenColumns } = props;
  const columns = useMemo(() => visibleColumns(hiddenColumns), [hiddenColumns]);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  /**
   * Drop resolution: over a ROW → insert before/after it depending on the
   * translated drag rectangle's center; over the rows AREA → append at the
   * end. Cross-group drops move the task (the reference drags between
   * groups too).
   */
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const dragged = active.data.current?.task as TaskDTO | undefined;
    if (!dragged) return;

    const overId = String(over.id);
    const sectionsById = new Map(props.sections.map((s) => [s.id, s]));
    const zoneOf = (groupId: string) => sectionsById.get(groupId);

    if (overId.startsWith("row:")) {
      const target = over.data.current?.task as TaskDTO | undefined;
      if (!target) return;
      const zone = zoneOf(target.groupId);
      if (!zone?.group) return; // synthetic sections cannot accept drops
      const list = zone.tasks;
      const targetIndex = list.findIndex((t) => t.id === target.id);
      if (targetIndex < 0) return;
      const activeRect = active.rect.current.translated;
      const after =
        activeRect && over.rect ? activeRect.top + activeRect.height / 2 > over.rect.top + over.rect.height / 2 : true;
      // Dropping onto your own old slot is a no-op.
      const index = target.id === dragged.id ? targetIndex : after ? targetIndex + 1 : targetIndex;
      if (dragged.id === target.id) return;
      props.onReorderTask(dragged.id, zone.group.id, Math.max(0, Math.min(index, list.length)));
      return;
    }

    if (overId.startsWith("rows:")) {
      const zoneId = overId.slice("rows:".length);
      const zone = zoneOf(zoneId);
      if (!zone?.group) return;
      if (dragged.groupId === zone.group.id) return; // same-group append handled above
      props.onReorderTask(dragged.id, zone.group.id, zone.tasks.length);
    }
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      {/* Reference architecture: ONE white card wraps every group zone plus
          the Add New Group zone (probed 2026-09-17). */}
      <div className="overflow-hidden rounded-xl border border-[#E1E5F3] bg-white shadow-xs">
        {sections.map((section) => (
          <GroupZone
            key={section.id}
            section={section}
            members={props.members}
            columns={columns}
            onUpdateTask={props.onUpdateTask}
            onDeleteTask={props.onDeleteTask}
            onCreateTask={props.onCreateTask}
            onToggleCollapse={props.onToggleCollapse}
            onDeleteGroup={props.onDeleteGroup}
            onToggleColumn={props.onToggleColumn}
          />
        ))}

        {groupBy === "default" && (
          <div className="border-t border-[#E1E5F3] p-4">
            <button
              type="button"
              onClick={props.onAddGroup}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[#0073EA] bg-white px-4 py-2 text-sm font-medium text-[#0073EA] transition-colors hover:bg-[#0073EA]/10"
            >
              <Plus className="h-4 w-4" /> Add New Group
            </button>
          </div>
        )}
      </div>
    </DndContext>
  );
}
