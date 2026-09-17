"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TASK_PRIORITIES, TASK_STATUSES } from "@/lib/domain";
import type { TaskDTO, TaskPriority, TaskStatus, UserDTO } from "@/lib/domain";

/** The patch the dialog emits — same shape board-view's updateTask takes. */
export interface EditTaskPatch {
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  owner: UserDTO | null;
  dueDate: string | null;
}

/**
 * The reference's Edit Task modal (decompiled + probed 2026-09-17):
 * `sm:max-w-2xl max-h-[80vh] overflow-y-auto`, "Edit Task" text-2xl title
 * with an X close, a Task Title field, a two-column grid of column fields
 * (Priority select, Status select, Owner free-text, Due Date calendar
 * popover), and a `pt-4 border-t` footer: Delete Task (red, behind a
 * window.confirm) | Cancel + Save Changes (blue). Opened by clicking a
 * kanban card, its Ellipsis button, or a calendar chip.
 *
 * Owner is free text like the reference; the typed name resolves to a
 * member (case-insensitive full match) because our `ownerId` is a real
 * relation — unmatched input keeps the previous owner (documented
 * deviation: the reference stores arbitrary strings).
 */
function EditTaskForm({
  task,
  members,
  onClose,
  onSave,
  onDelete,
}: {
  task: TaskDTO;
  members: UserDTO[];
  onClose: () => void;
  onSave: (patch: EditTaskPatch) => void;
  onDelete: () => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  // The owner input starts as the current owner's name ("" when unassigned).
  const [ownerName, setOwnerName] = useState(task.owner?.name ?? "");
  const [dueDate, setDueDate] = useState<Date | null>(
    task.dueDate ? new Date(task.dueDate) : null,
  );
  const [dateOpen, setDateOpen] = useState(false);

  function handleSave() {
    if (!title.trim()) return;
    const trimmed = ownerName.trim().toLowerCase();
    const member = members.find((m) => m.name.toLowerCase() === trimmed) ?? null;
    // Noon-stable storage like date-cell.tsx: pick the date, keep 12:00
    // local so timezone edges never shift the rendered day.
    const stored = dueDate
      ? new Date(
          dueDate.getFullYear(),
          dueDate.getMonth(),
          dueDate.getDate(),
          12,
          0,
          0,
        ).toISOString()
      : null;
    onSave({ title: title.trim(), status, priority, owner: member, dueDate: stored });
    onClose();
  }

  function handleDelete() {
    if (window.confirm("Are you sure you want to delete this task?")) {
      onDelete();
      onClose();
    }
  }

  return (
    <DialogContent className="max-h-[80vh] gap-0 overflow-y-auto sm:max-w-2xl">
      <DialogHeader className="space-y-0">
        <DialogTitle className="flex items-center justify-between text-2xl font-bold text-[#323338]">
          Edit Task
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Close"
            onClick={onClose}
            className="h-9 w-9"
          >
            <X className="h-5 w-5" />
          </Button>
        </DialogTitle>
      </DialogHeader>
      <div className="space-y-6 py-4">
        <div className="space-y-2">
          <Label className="text-base font-medium text-[#323338]">Task Title</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter task title..."
            className="text-lg font-medium"
          />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label className="font-medium text-[#323338]">Priority</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                {TASK_PRIORITIES.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    <span className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: p.color }}
                        aria-hidden="true"
                      />
                      {p.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="font-medium text-[#323338]">Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {TASK_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    <span className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: s.bg }}
                        aria-hidden="true"
                      />
                      {s.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="font-medium text-[#323338]">Owner</Label>
            <Input
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              placeholder="Enter person name..."
            />
          </div>
          <div className="space-y-2">
            <Label className="font-medium text-[#323338]">Due Date</Label>
            <Popover open={dateOpen} onOpenChange={setDateOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dueDate ?? undefined}
                  onSelect={(day) => {
                    setDueDate(day ?? null);
                    setDateOpen(false);
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <div className="flex justify-between border-t pt-4">
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            className="bg-red-500 hover:bg-red-600"
          >
            Delete Task
          </Button>
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={!title.trim()}
              className="bg-[#0073EA] hover:bg-[#0056B3]"
            >
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </DialogContent>
  );
}

export function EditTaskDialog({
  task,
  members,
  onClose,
  onSave,
  onDelete,
}: {
  task: TaskDTO | null;
  members: UserDTO[];
  onClose: () => void;
  onSave: (taskId: string, patch: EditTaskPatch) => void;
  onDelete: (taskId: string) => void;
}) {
  return (
    <Dialog open={task !== null} onOpenChange={(open) => !open && onClose()}>
      {task ? (
        <EditTaskForm
          task={task}
          members={members}
          onClose={onClose}
          onSave={(patch) => onSave(task.id, patch)}
          onDelete={() => onDelete(task.id)}
        />
      ) : null}
    </Dialog>
  );
}
