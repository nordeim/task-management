"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { api } from "@/lib/api-client";
import type { GroupDTO } from "@/lib/domain";

/**
 * Form state lives inside DialogContent — Radix unmounts it when the dialog
 * closes, so each open starts fresh without a reset effect.
 */
function CreateTaskForm({
  groups,
  defaultGroupId,
  onClose,
  onCreated,
}: {
  groups: GroupDTO[];
  defaultGroupId: string | null;
  onClose: () => void;
  onCreated: (taskId: string, groupId: string, title: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [groupId, setGroupId] = useState<string>(defaultGroupId ?? groups[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!title.trim() || !groupId || busy) return;
    setBusy(true);
    setError(null);
    const result = await api<{ id: string }>("/api/tasks", {
      method: "POST",
      body: { title: title.trim(), groupId },
    });
    setBusy(false);
    if (result.ok) {
      toast({ title: "Task created", description: `"${title.trim()}" was added.` });
      onCreated(result.data.id, groupId, title.trim());
    } else {
      setError(result.error);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Create New Task</DialogTitle>
        <DialogDescription>Add a task to one of this board&apos;s groups.</DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-2">
        <div className="space-y-2">
          <Label htmlFor="task-title">
            Task Title <span aria-hidden="true" className="text-destructive">*</span>
          </Label>
          <Input
            id="task-title"
            placeholder="e.g. Review the launch checklist"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && title.trim() && groupId) {
                void handleCreate();
              }
            }}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="task-group">Group</Label>
          <Select value={groupId} onValueChange={setGroupId}>
            <SelectTrigger id="task-group" className="w-full">
              <SelectValue placeholder={groups.length === 0 ? "No groups yet" : "Pick a group"} />
            </SelectTrigger>
            <SelectContent>
              {groups.map((group) => (
                <SelectItem key={group.id} value={group.id}>
                  {group.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {error && (
          <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button onClick={() => void handleCreate()} disabled={!title.trim() || !groupId || busy}>
          {busy ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating…
            </>
          ) : (
            "Create Task"
          )}
        </Button>
      </DialogFooter>
    </>
  );
}

export function CreateTaskDialog({
  open,
  onOpenChange,
  groups,
  defaultGroupId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: GroupDTO[];
  defaultGroupId: string | null;
  onCreated: (taskId: string, groupId: string, title: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <CreateTaskForm
          groups={groups}
          defaultGroupId={defaultGroupId}
          onClose={() => onOpenChange(false)}
          onCreated={onCreated}
        />
      </DialogContent>
    </Dialog>
  );
}
