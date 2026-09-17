"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TASK_STATUSES } from "@/lib/domain";
import type { TaskStatus } from "@/lib/domain";

/**
 * The reference's StatusCell (decompiled `fZ`): a Badge pill at rest that
 * SWAPS to an open shadcn Select when clicked — the open state renders a
 * bare trigger (`w-full border-none p-0 h-auto focus:ring-0`) whose menu
 * lists the four statuses as color-dot + label items with the stock
 * near-black check. The menu's width follows the trigger/longest label
 * (`min-w-[8rem]`), not a fixed popover width.
 */
export function StatusCell({
  value,
  onChange,
}: {
  value: TaskStatus;
  onChange: (next: TaskStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const meta = TASK_STATUSES.find((s) => s.value === value) ?? TASK_STATUSES[0];

  if (open) {
    return (
      <Select
        open={open}
        onOpenChange={(next) => !next && setOpen(false)}
        value={meta.value}
        onValueChange={(v) => {
          onChange(v as TaskStatus);
          setOpen(false);
        }}
      >
        <SelectTrigger className="h-auto w-full border-none p-0 focus:ring-0">
          <SelectValue />
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
    );
  }

  return (
    <button
      type="button"
      aria-label={`Status: ${meta.label}, change status`}
      onClick={() => setOpen(true)}
      className="flex items-center rounded-md border border-transparent px-3 py-1 text-xs font-medium text-white shadow transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      style={{ backgroundColor: meta.bg }}
    >
      <span className="truncate">{meta.label}</span>
    </button>
  );
}
