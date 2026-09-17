"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
        <DialogTitle className="text-2xl font-bold tracking-tight text-[#323338]">
          Create New Task
        </DialogTitle>
      </DialogHeader>

      {/* Reference form chrome (probed 2026-09-17): h-12 rounded-xl inputs on
          #E1E5F3 borders, blue focus ring, group dots in the Select. */}
      <form
        className="space-y-6 pt-4"
        onSubmit={(e) => {
          e.preventDefault();
          void handleCreate();
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="task-title" className="text-sm font-medium text-[#323338]">
            Task Title <span aria-hidden="true" className="text-destructive">*</span>
          </Label>
          <input
            id="task-title"
            autoFocus
            placeholder="Enter task title..."
            value={title}
            maxLength={200}
            onChange={(e) => setTitle(e.target.value)}
            className="flex h-12 w-full rounded-xl border border-[#E1E5F3] bg-transparent px-3 py-1 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0073EA]/20 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="task-group" className="text-sm font-medium text-[#323338]">
            Group
          </Label>
          <Select value={groupId} onValueChange={setGroupId}>
            <SelectTrigger
              id="task-group"
              className="h-12 w-full rounded-xl border-[#E1E5F3] text-sm shadow-sm focus:ring-[#0073EA]/20"
            >
              <SelectValue placeholder={groups.length === 0 ? "No groups yet" : "Pick a group"} />
            </SelectTrigger>
            <SelectContent>
              {groups.map((group) => (
                <SelectItem key={group.id} value={group.id}>
                  <span className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: group.color }}
                      aria-hidden="true"
                    />
                    {group.name}
                  </span>
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

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" disabled={!title.trim() || !groupId || busy}>
            {busy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating…
              </>
            ) : (
              "Create Task"
            )}
          </Button>
        </DialogFooter>
      </form>
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
      {/* Reference Create Task dialog is max-w-lg (the Add Group one is md). */}
      <DialogContent className="sm:max-w-lg">
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
