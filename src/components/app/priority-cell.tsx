"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TASK_PRIORITIES, priorityBadgeStyle } from "@/lib/domain";
import type { TaskPriority } from "@/lib/domain";

/**
 * The reference (2026-09-17 probe) renders priority as a tinted text badge —
 * background at 12.5% alpha over the priority color, label as text — inside a
 * borderless combobox trigger. The recipe lives in `priorityBadgeStyle`.
 */
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
          className="flex h-7 w-full max-w-[120px] items-center justify-between gap-1 rounded-md px-1 text-sm transition-colors hover:bg-secondary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span
            className="inline-flex items-center rounded-md border border-transparent px-2.5 py-0.5 text-xs font-medium"
            style={priorityBadgeStyle(value)}
          >
            {meta.label}
          </span>
          <svg
            className="h-3 w-3 shrink-0 text-muted-foreground opacity-70"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={3}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
          </svg>
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
                    <span
                      className="inline-flex min-w-14 items-center justify-center rounded-md px-2 py-0.5 text-xs font-medium"
                      style={priorityBadgeStyle(priority.value)}
                    >
                      {priority.label}
                    </span>
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
