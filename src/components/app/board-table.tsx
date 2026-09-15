"use client";

import { useState } from "react";
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
import type { BoardDetailDTO, GroupDTO, TaskDTO, TaskPriority, TaskStatus, UserDTO } from "@/lib/domain";

interface BoardTableProps {
  board: BoardDetailDTO;
  onUpdateTask: (taskId: string, patch: Partial<Pick<TaskDTO, "title" | "status" | "priority" | "owner" | "dueDate" | "completed">>) => void;
  onDeleteTask: (taskId: string) => void;
  onAddTask: (groupId: string) => void;
  onRenameGroup: (groupId: string, name: string) => void;
  onToggleCollapse: (groupId: string, collapsed: boolean) => void;
  onDeleteGroup: (groupId: string) => void;
  onAddGroup: () => void;
}

function TaskRow({
  task,
  members,
  onUpdateTask,
  onDeleteTask,
}: {
  task: TaskDTO;
  members: UserDTO[];
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
    <div className="group grid grid-cols-[36px_minmax(180px,1fr)_110px_150px_140px_130px_36px] items-center border-b border-border/60 bg-card py-1.5 transition-colors last:border-b-0 hover:bg-secondary/40">
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

      <div className="px-1">
        <PriorityCell
          value={task.priority}
          onChange={(priority: TaskPriority) => onUpdateTask(task.id, { priority })}
        />
      </div>
      <div className="px-1">
        <StatusCell
          value={task.status}
          onChange={(status: TaskStatus) => onUpdateTask(task.id, { status })}
        />
      </div>
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
      <div className="px-1">
        <DateCell value={task.dueDate} onChange={(isoDate) => onUpdateTask(task.id, { dueDate: isoDate })} />
      </div>

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

function GroupSection({
  group,
  color,
  members,
  onUpdateTask,
  onDeleteTask,
  onAddTask,
  onRenameGroup,
  onToggleCollapse,
  onDeleteGroup,
}: {
  group: GroupDTO;
  color: string;
  members: UserDTO[];
  onUpdateTask: BoardTableProps["onUpdateTask"];
  onDeleteTask: BoardTableProps["onDeleteTask"];
  onAddTask: BoardTableProps["onAddTask"];
  onRenameGroup: BoardTableProps["onRenameGroup"];
  onToggleCollapse: BoardTableProps["onToggleCollapse"];
  onDeleteGroup: BoardTableProps["onDeleteGroup"];
}) {
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(group.name);

  const total = group.tasks.length;
  const done = group.tasks.filter((t) => t.status === "done").length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  function commitName() {
    setEditingName(false);
    const next = nameDraft.trim();
    if (next && next !== group.name) {
      onRenameGroup(group.id, next);
    } else {
      setNameDraft(group.name);
    }
  }

  return (
    <section className="overflow-hidden rounded-xl border bg-card" aria-label={`Group ${group.name}`}>
      {/* Group header — left accent bar like the reference app */}
      <div className="flex items-center gap-2 border-b bg-secondary/30 px-3 py-2">
        <span className="h-6 w-1 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
        <button
          type="button"
          aria-label={group.collapsed ? `Expand group ${group.name}` : `Collapse group ${group.name}`}
          aria-expanded={!group.collapsed}
          onClick={() => onToggleCollapse(group.id, !group.collapsed)}
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          {group.collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {editingName ? (
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
            className="rounded-sm border-none bg-accent px-1.5 py-0.5 text-sm font-semibold outline-none ring-1 ring-primary/40"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditingName(true)}
            className="rounded-sm px-1.5 py-0.5 text-sm font-semibold transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {group.name}
          </button>
        )}
        <span className="text-xs text-muted-foreground">
          ({total}) {pct}%
        </span>
        <div className="ml-2 hidden h-1.5 w-24 overflow-hidden rounded-full bg-secondary sm:block">
          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
        </div>
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            aria-label={`Delete group ${group.name}`}
            onClick={() => onDeleteGroup(group.id)}
            className="rounded-md p-1.5 text-muted-foreground/60 transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {!group.collapsed && (
        <>
          {/* Column headers */}
          <div className="grid grid-cols-[36px_minmax(180px,1fr)_110px_150px_140px_130px_36px] border-b bg-card text-xs font-medium text-muted-foreground">
            <div className="flex items-center justify-center py-2" aria-hidden="true" />
            <div className="px-3 py-2">Task</div>
            <div className="px-2 py-2">Priority</div>
            <div className="px-2 py-2">Status</div>
            <div className="px-2 py-2">Owner</div>
            <div className="px-2 py-2">Due Date</div>
            <div className="py-2" aria-hidden="true" />
          </div>

          {group.tasks.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">No items in this group</div>
          ) : (
            group.tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                members={members}
                onUpdateTask={onUpdateTask}
                onDeleteTask={onDeleteTask}
              />
            ))
          )}

          <button
            type="button"
            onClick={() => onAddTask(group.id)}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-secondary/40 hover:text-foreground"
          >
            <Plus className="h-4 w-4" /> Add task
          </button>
        </>
      )}
    </section>
  );
}

export function BoardTable(props: BoardTableProps) {
  const { board, onAddGroup } = props;

  return (
    <div className="space-y-4">
      {board.groups.map((group) => (
        <GroupSection
          key={group.id}
          group={group}
          color={board.color}
          members={board.members}
          onUpdateTask={props.onUpdateTask}
          onDeleteTask={props.onDeleteTask}
          onAddTask={props.onAddTask}
          onRenameGroup={props.onRenameGroup}
          onToggleCollapse={props.onToggleCollapse}
          onDeleteGroup={props.onDeleteGroup}
        />
      ))}

      <button
        type="button"
        onClick={onAddGroup}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed py-3 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-secondary/40 hover:text-foreground"
      >
        <Plus className="h-4 w-4" /> Add New Group
      </button>
    </div>
  );
}
