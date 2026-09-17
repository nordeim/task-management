"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { api } from "@/lib/api-client";
import { GROUP_COLOR_OPTIONS } from "@/lib/domain";

/**
 * Reference "Add New Group" dialog (probed 2026-09-17): a max-w-md form with
 * "Group Title *" (h-12 rounded-xl input, placeholder "e.g., To Do, In
 * Progress") and seven color swatches — selected renders a dark ring +
 * scale-110, unselected scales up on hover. Add Group stays disabled until a
 * title is typed.
 */
function CreateGroupForm({
  boardId,
  onClose,
  onCreated,
}: {
  boardId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(GROUP_COLOR_OPTIONS[0].value);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setError(null);
    const result = await api<{ id: string }>(`/api/boards/${boardId}/groups`, {
      method: "POST",
      body: { name: trimmed, color },
    });
    setBusy(false);
    if (result.ok) {
      toast({ title: "Group added", description: `"${trimmed}" was created.` });
      onCreated();
    } else {
      setError(result.error);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-2xl font-bold tracking-tight text-[#323338]">
          Add New Group
        </DialogTitle>
      </DialogHeader>

      <form
        className="space-y-6 pt-4"
        onSubmit={(e) => {
          e.preventDefault();
          void handleCreate();
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="group-title" className="text-sm font-medium text-[#323338]">
            Group Title *
          </Label>
          <input
            id="group-title"
            autoFocus
            placeholder="e.g., To Do, In Progress"
            value={name}
            maxLength={80}
            onChange={(e) => setName(e.target.value)}
            className="flex h-12 w-full rounded-xl border border-[#E1E5F3] bg-transparent px-3 py-1 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0073EA]/20 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium text-[#323338]">Group Color</Label>
          <div className="flex flex-wrap gap-2">
            {GROUP_COLOR_OPTIONS.map((option) => {
              const selected = option.value === color;
              return (
                <button
                  key={option.value}
                  type="button"
                  title={option.name}
                  aria-label={option.name}
                  aria-pressed={selected}
                  onClick={() => setColor(option.value)}
                  className={`h-8 w-8 rounded-lg border-2 transition-all ${
                    selected
                      ? "scale-110 border-[#323338]"
                      : "border-transparent hover:scale-105"
                  }`}
                  style={{ backgroundColor: option.value }}
                />
              );
            })}
          </div>
        </div>

        {error && (
          <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" disabled={!name.trim() || busy}>
            {busy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Adding…
              </>
            ) : (
              "Add Group"
            )}
          </Button>
        </div>
      </form>
    </>
  );
}

export function CreateGroupDialog({
  open,
  onOpenChange,
  boardId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  boardId: string;
  onCreated: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <CreateGroupForm
          boardId={boardId}
          onClose={() => onOpenChange(false)}
          onCreated={onCreated}
        />
      </DialogContent>
    </Dialog>
  );
}
