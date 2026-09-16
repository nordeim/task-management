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
import { BOARD_COLORS, VISIBILITY_OPTIONS } from "@/lib/domain";
import type { BoardVisibility } from "@/lib/domain";

interface EditBoardTarget {
  id: string;
  title: string;
  description: string | null;
  color: string;
  visibility: string;
}

/**
 * The form lives INSIDE DialogContent: Radix unmounts closed-dialog content,
 * so every open starts from useState initializers — no reset effect needed.
 */
function EditBoardForm({
  board,
  onClose,
  onSaved,
}: {
  board: EditBoardTarget;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(board.title);
  const [description, setDescription] = useState(board.description ?? "");
  const [color, setColor] = useState<string>(
    BOARD_COLORS.find((c) => c.value === board.color)?.value ?? BOARD_COLORS[0].value,
  );
  const [visibility, setVisibility] = useState<BoardVisibility>(
    board.visibility === "public" ? "public" : "private",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const changed =
    title.trim() !== board.title ||
    description.trim() !== (board.description ?? "") ||
    color !== board.color ||
    visibility !== board.visibility;

  async function handleSave() {
    if (!title.trim() || busy) return;
    setBusy(true);
    setError(null);
    const result = await api<null>(`/api/boards/${board.id}`, {
      method: "PATCH",
      body: {
        title: title.trim(),
        description: description.trim(),
        color,
        visibility,
      },
    });
    setBusy(false);
    if (result.ok) {
      toast({ title: "Board updated", description: `"${title.trim()}" was saved.` });
      onSaved();
    } else {
      setError(result.error);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Edit Board</DialogTitle>
        <DialogDescription>Update this board&apos;s details.</DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-2">
        <div className="space-y-2">
          <Label htmlFor="edit-board-title">
            Board Title <span aria-hidden="true" className="text-destructive">*</span>
          </Label>
          <Input
            id="edit-board-title"
            placeholder="e.g. Website Redesign"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-board-description">Description</Label>
          <Textarea
            id="edit-board-description"
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
          <Label htmlFor="edit-board-visibility">Visibility</Label>
          <Select value={visibility} onValueChange={(v) => setVisibility(v as BoardVisibility)}>
            <SelectTrigger id="edit-board-visibility" className="w-full">
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
              {VISIBILITY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <span className="flex items-center gap-2">
                    {option.value === "private" ? (
                      <Lock className="h-4 w-4" />
                    ) : (
                      <Globe className="h-4 w-4" />
                    )}
                    {option.value === "private" ? "Private — only you can access" : "Public — visible to the team"}
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
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button onClick={() => void handleSave()} disabled={!title.trim() || busy || !changed}>
          {busy ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…
            </>
          ) : (
            "Save Changes"
          )}
        </Button>
      </DialogFooter>
    </>
  );
}

export function EditBoardDialog({
  board,
  onOpenChange,
  onSaved,
}: {
  board: EditBoardTarget | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  return (
    <Dialog open={board !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {board && (
          <EditBoardForm
            board={board}
            onClose={() => onOpenChange(false)}
            onSaved={() => {
              onOpenChange(false);
              onSaved();
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
