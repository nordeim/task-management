"use client";

import { useState } from "react";
import { Loader2, Lock, Globe } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { api } from "@/lib/api-client";
import { BOARD_COLORS } from "@/lib/domain";

/**
 * The form lives INSIDE DialogContent: Radix unmounts closed-dialog content,
 * so every open starts from useState initializers — no reset effect needed.
 */
function CreateBoardForm({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (boardId: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState<string>(BOARD_COLORS[0].value);
  const [visibility, setVisibility] = useState<"private" | "public">("private");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!title.trim() || busy) return;
    setBusy(true);
    setError(null);
    const result = await api<{ id: string }>("/api/boards", {
      method: "POST",
      body: { title: title.trim(), description: description.trim(), color, visibility },
    });
    setBusy(false);
    if (result.ok) {
      toast({ title: "Board created", description: `"${title.trim()}" is ready.` });
      onCreated(result.data.id);
    } else {
      setError(result.error);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Create New Board</DialogTitle>
        <DialogDescription>Set up a workspace for your next project.</DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-2">
        <div className="space-y-2">
          <Label htmlFor="board-title">
            Board Title <span aria-hidden="true" className="text-destructive">*</span>
          </Label>
          <Input
            id="board-title"
            placeholder="e.g. Website Redesign"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="board-description">Description</Label>
          <Textarea
            id="board-description"
            placeholder="What is this board for?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            maxLength={500}
          />
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Color Theme</legend>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Color theme">
            {BOARD_COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                role="radio"
                aria-checked={color === c.value}
                title={c.name}
                onClick={() => setColor(c.value)}
                className="h-9 w-9 rounded-lg transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                style={{
                  backgroundColor: c.value,
                  outline: color === c.value ? "2px solid #323338" : "none",
                  outlineOffset: 2,
                  transform: color === c.value ? "scale(1.1)" : "none",
                }}
              >
                <span className="sr-only">{c.name}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <div className="space-y-2">
          <Label htmlFor="board-visibility">Visibility</Label>
          <Select value={visibility} onValueChange={(v) => setVisibility(v as "private" | "public")}>
            <SelectTrigger id="board-visibility" className="w-full">
              <div className="flex items-center gap-2">
                {visibility === "private" ? (
                  <Lock className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Globe className="h-4 w-4 text-muted-foreground" />
                )}
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="private">
                <span className="flex items-center gap-2">
                  <Lock className="h-4 w-4" /> Private — only you can access
                </span>
              </SelectItem>
              <SelectItem value="public">
                <span className="flex items-center gap-2">
                  <Globe className="h-4 w-4" /> Shared — visible to the team
                </span>
              </SelectItem>
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
        <Button onClick={() => void handleCreate()} disabled={!title.trim() || busy}>
          {busy ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating…
            </>
          ) : (
            "Create Board"
          )}
        </Button>
      </DialogFooter>
    </>
  );
}

export function CreateBoardDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (boardId: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <CreateBoardForm onClose={() => onOpenChange(false)} onCreated={onCreated} />
      </DialogContent>
    </Dialog>
  );
}
