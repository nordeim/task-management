"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, MoreHorizontal, Plus, Trash2 } from "lucide-react";
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
import { groupSummary, visibleColumns } from "@/lib/domain";
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
  onUpdateTask: (taskId: string, patch: Partial<Pick<TaskDTO, "title" | "status" | "priority" | "owner" | "dueDate" | "completed">>) => void;
  onDeleteTask: (taskId: string) => void;
  onAddTask: (groupId: string) => void;
  onRenameGroup: (groupId: string, name: string) => void;
  onToggleCollapse: (groupId: string, collapsed: boolean) => void;
  onDeleteGroup: (groupId: string) => void;
  onAddGroup: () => void;
}

/** Fixed pixel widths per column — the Task column is the flexible one. */
const COLUMN_WIDTHS: Record<ColumnKey, string> = {
  task: "minmax(180px,1fr)",
  priority: "110px",
  status: "150px",
  owner: "150px",
  dueDate: "130px",
};

/** Builds the grid template from the checkbox + visible columns + actions rail. */
function gridTemplate(columns: { key: ColumnKey }[]): string {
  const cells = ["36px", ...columns.map((c) => COLUMN_WIDTHS[c.key]), "36px"];
  return cells.join(" ");
}

function TaskRow({
  task,
  members,
  columns,
  grid,
  onUpdateTask,
  onDeleteTask,
}: {
  task: TaskDTO;
  members: UserDTO[];
  columns: { key: ColumnKey }[];
  grid: string;
  onUpdateTask: BoardTableProps["onUpdateTask"];
  onDeleteTask: BoardTableProps["onDeleteTask"];
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.title);

  function commitTitle() {
    setEditing(false);
    const next = draft.trim();
    if (next && next !== task.title) {
      onUpdateTask(task.id, { title: next });
    } else {
      setDraft(task.title);
    }
  }

  return (
    <div className="group grid items-center border-b border-border/60 bg-card py-1.5 transition-colors last:border-b-0 hover:bg-secondary/40" style={{ gridTemplateColumns: grid }}>
      <div className="flex justify-center">
        <Checkbox
          aria-label={task.completed ? `Mark "${task.title}" not done` : `Mark "${task.title}" done`}
          checked={task.completed}
          onCheckedChange={(checked) =>
            onUpdateTask(task.id, {
              completed: checked === true,
              status: checked === true ? "done" : "not_started",
            })
          }
          className="data-[state=checked]:border-[#00ca72] data-[state=checked]:bg-[#00ca72] data-[state=checked]:text-white"
        />
      </div>

      {columns.some((c) => c.key === "task") && (
        <div className="min-w-0 px-2">
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
              className="w-full rounded-sm border-none bg-accent px-1.5 py-0.5 text-sm outline-none ring-1 ring-primary/40"
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className={`w-full truncate rounded-sm px-1.5 py-0.5 text-left text-sm transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                task.completed ? "text-muted-foreground line-through" : ""
              }`}
              title={task.title}
            >
              {task.title}
            </button>
          )}
        </div>
      )}

      {columns.some((c) => c.key === "priority") && (
        <div className="px-1">
          <PriorityCell
            value={task.priority}
            onChange={(priority: TaskPriority) => onUpdateTask(task.id, { priority })}
          />
        </div>
      )}
      {columns.some((c) => c.key === "status") && (
        <div className="px-1">
          <StatusCell
            value={task.status}
            onChange={(status: TaskStatus) => onUpdateTask(task.id, { status })}
          />
        </div>
      )}
      {columns.some((c) => c.key === "owner") && (
        <div className="px-1">
          <OwnerCell
            owner={task.owner}
            members={members}
            onChange={(ownerId) => {
              const member = ownerId ? members.find((m) => m.id === ownerId) ?? null : null;
              onUpdateTask(task.id, { owner: member });
            }}
          />
        </div>
      )}
      {columns.some((c) => c.key === "dueDate") && (
        <div className="px-1">
          <DateCell value={task.dueDate} onChange={(isoDate) => onUpdateTask(task.id, { dueDate: isoDate })} />
        </div>
      )}

      <div className="flex justify-center opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`Actions for ${task.title}`}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setEditing(true)}>Rename</DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => onDeleteTask(task.id)}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete task
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

/** The per-group footer row: "N items" + priority count badges + dash cells. */
function SummaryRow({
  tasks,
  columns,
  grid,
}: {
  tasks: TaskDTO[];
  columns: { key: ColumnKey; label: string }[];
  grid: string;
}) {
  const summary = useMemo(() => groupSummary(tasks), [tasks]);
  return (
    <div
      className="grid items-center border-t border-[#E1E5F3] bg-gray-50 text-xs text-muted-foreground"
      style={{ gridTemplateColumns: grid }}
      aria-label="Group summary"
    >
      <div aria-hidden="true" />
      {columns.map((col) => (
        <div key={col.key} className="border-l border-[#E1E5F3] px-3 py-2 first:border-l-0">
          {col.key === "task" && (
            <span className="flex items-center gap-1 text-gray-600">
              {summary.items} item{summary.items === 1 ? "" : "s"}
            </span>
          )}
          {col.key === "priority" && (
            <span className="flex flex-wrap gap-1">
              {summary.priorities.map((p) => (
                <span
                  key={p.label}
                  className="inline-flex items-center rounded-md border bg-card px-1.5 py-0.5 font-semibold"
                >
                  {p.count} {p.label}
                </span>
              ))}
              {summary.priorities.length === 0 && <span className="px-1">-</span>}
            </span>
          )}
          {col.key === "status" && (
            <span className="px-1">{summary.done > 0 ? `${summary.done} done` : "-"}</span>
          )}
          {col.key === "owner" && <span className="px-1">-</span>}
          {col.key === "dueDate" && <span className="px-1">-</span>}
        </div>
      ))}
      <div aria-hidden="true" />
    </div>
  );
}

function GroupSection({
  section,
  members,
  columns,
  onUpdateTask,
  onDeleteTask,
  onAddTask,
  onRenameGroup,
  onToggleCollapse,
  onDeleteGroup,
}: {
  section: TableSection;
  members: UserDTO[];
  columns: { key: ColumnKey; label: string }[];
  onUpdateTask: BoardTableProps["onUpdateTask"];
  onDeleteTask: BoardTableProps["onDeleteTask"];
  onAddTask: BoardTableProps["onAddTask"];
  onRenameGroup: BoardTableProps["onRenameGroup"];
  onToggleCollapse: BoardTableProps["onToggleCollapse"];
  onDeleteGroup: BoardTableProps["onDeleteGroup"];
}) {
  // Synthetic sections (status/priority/person) have no backing group row to
  // edit — they are read-only shells around the same task rows.
  const group = section.group;
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(section.name);

  const total = section.tasks.length;
  const done = section.tasks.filter((t) => t.status === "done").length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  const collapsed = group?.collapsed ?? false;
  const grid = gridTemplate(columns);

  function commitName() {
    setEditingName(false);
    if (!group) return;
    const next = nameDraft.trim();
    if (next && next !== group.name) {
      onRenameGroup(group.id, next);
    } else {
      setNameDraft(group.name);
    }
  }

  return (
    <section className="overflow-hidden rounded-xl border border-[#E1E5F3] bg-card shadow-sm" aria-label={`Group ${section.name}`}>
      {/* Group header — reference layout: p-4 row with h3 + (count) on the left
          and the colored dot, count, progress bar, percentage, and delete on
          the right (no left accent bar). */}
      <div className="flex items-center justify-between border-b border-[#E1E5F3] p-4 transition-colors hover:bg-[#F5F6F8]">
        <div className="flex items-center gap-3">
          {group ? (
            <button
              type="button"
              aria-label={collapsed ? `Expand group ${section.name}` : `Collapse group ${section.name}`}
              aria-expanded={!collapsed}
              onClick={() => onToggleCollapse(group.id, !collapsed)}
              className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-[#E1E5F3] hover:text-accent-foreground"
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          ) : (
            <span className="w-6" aria-hidden="true" />
          )}
          {editingName && group ? (
            <input
              autoFocus
              aria-label="Group name"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitName();
                if (e.key === "Escape") {
                  setNameDraft(group.name);
                  setEditingName(false);
                }
              }}
              className="rounded-sm border-none bg-accent px-1.5 py-0.5 text-lg font-bold outline-none ring-1 ring-primary/40"
            />
          ) : (
            <h3 className="flex items-center gap-2 text-lg font-bold">
              <button
                type="button"
                onClick={() => group && setEditingName(true)}
                className={`rounded-sm px-1.5 py-0.5 transition-colors ${
                  group ? "hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" : "cursor-default"
                }`}
              >
                {section.name}
              </button>
              <span className="text-sm font-normal text-[#676879]">({total})</span>
            </h3>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: section.color }}
              aria-hidden="true"
            />
            <span className="text-xs text-[#676879]">{total}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-16 overflow-hidden rounded-full bg-[#E1E5F3]" aria-hidden="true">
              <span
                className="block h-full rounded-full transition-all duration-300"
                style={{ width: `${pct}%`, backgroundColor: "var(--group-progress-fill)" }}
              />
            </span>
            <span className="text-xs text-[#676879]">{pct}%</span>
          </div>
          {group && (
            <button
              type="button"
              aria-label={`Delete group ${section.name}`}
              onClick={() => onDeleteGroup(group.id)}
              className="rounded-md p-1.5 text-[#676879] transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {!collapsed && (
        <>
          {/* Column headers — light gray band like the reference. */}
          <div
            className="grid border-b border-[#E1E5F3] bg-[var(--table-header-bg)] text-xs font-medium text-[#323338]"
            style={{ gridTemplateColumns: grid }}
          >
            <div className="flex items-center justify-center py-2" aria-hidden="true" />
            {columns.map((col) => (
              <div key={col.key} className="px-3 py-2 first:px-2">
                {col.label}
              </div>
            ))}
            <div className="py-2" aria-hidden="true" />
          </div>

          {section.tasks.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">No items in this group</div>
          ) : (
            section.tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                members={members}
                columns={columns}
                grid={grid}
                onUpdateTask={onUpdateTask}
                onDeleteTask={onDeleteTask}
              />
            ))
          )}

          {group && (
            <div className="flex-1 px-3 py-2">
              <button
                type="button"
                onClick={() => onAddTask(group.id)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-[#E1E5F3] hover:text-foreground"
              >
                <Plus className="h-4 w-4" /> Add task
              </button>
            </div>
          )}

          <SummaryRow tasks={section.tasks} columns={columns} grid={grid} />
        </>
      )}
    </section>
  );
}

export function BoardTable(props: BoardTableProps) {
  const { sections, onAddGroup, groupBy, hiddenColumns } = props;
  const columns = useMemo(() => visibleColumns(hiddenColumns), [hiddenColumns]);

  return (
    <div className="space-y-4">
      {sections.map((section) => (
        <GroupSection
          key={section.id}
          section={section}
          members={props.members}
          columns={columns}
          onUpdateTask={props.onUpdateTask}
          onDeleteTask={props.onDeleteTask}
          onAddTask={props.onAddTask}
          onRenameGroup={props.onRenameGroup}
          onToggleCollapse={props.onToggleCollapse}
          onDeleteGroup={props.onDeleteGroup}
        />
      ))}

      {groupBy === "default" && (
        <button
          type="button"
          onClick={onAddGroup}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-primary py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-[#F5F6F8] hover:text-foreground"
        >
          <Plus className="h-4 w-4" /> Add New Group
        </button>
      )}
    </div>
  );
}
