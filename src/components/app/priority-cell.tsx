"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TASK_PRIORITIES } from "@/lib/domain";
import type { TaskPriority } from "@/lib/domain";

/**
 * The reference app renders priority as a signal-bar flag. The bar count
 * encodes urgency (1=Low … 4=Critical) so the column stays scannable
 * without relying on color alone.
 */
function PriorityFlag({ value }: { value: TaskPriority }) {
  const index = TASK_PRIORITIES.findIndex((p) => p.value === value);
  const meta = TASK_PRIORITIES[index] ?? TASK_PRIORITIES[0];
  const bars = index + 1;
  return (
    <span className="flex h-4 items-end gap-[2px]" aria-hidden="true">
      {[1, 2, 3, 4].map((n) => (
        <span
          key={n}
          className="w-[3px] rounded-sm"
          style={{
            height: `${5 + n * 3}px`,
            backgroundColor: n <= bars ? meta.color : "#d0d4e1",
          }}
        />
      ))}
    </span>
  );
}

export function PriorityCell({
  value,
  onChange,
}: {
  value: TaskPriority;
  onChange: (next: TaskPriority) => void;
}) {
  const [open, setOpen] = useState(false);
  const meta = TASK_PRIORITIES.find((p) => p.value === value) ?? TASK_PRIORITIES[0];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Priority: ${meta.label}, change priority`}
          className="flex h-7 w-full max-w-[110px] items-center gap-2 rounded-md px-2 text-xs font-medium transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <PriorityFlag value={value} />
          <span className="truncate text-muted-foreground">{meta.label}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-40 p-1.5">
        <ul role="listbox" aria-label="Priority options" className="space-y-0.5">
          {TASK_PRIORITIES.map((priority) => {
            const selected = priority.value === value;
            return (
              <li key={priority.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    onChange(priority.value);
                    setOpen(false);
                  }}
                  className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-secondary"
                >
                  <span className="flex items-center gap-2">
                    <PriorityFlag value={priority.value} />
                    {priority.label}
                  </span>
                  {selected && <Check className="h-4 w-4 text-primary" />}
                </button>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
