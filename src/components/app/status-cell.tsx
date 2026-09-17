"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TASK_STATUSES } from "@/lib/domain";
import type { TaskStatus } from "@/lib/domain";

export function StatusCell({
  value,
  onChange,
}: {
  value: TaskStatus;
  onChange: (next: TaskStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const meta = TASK_STATUSES.find((s) => s.value === value) ?? TASK_STATUSES[0];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Status: ${meta.label}, change status`}
          className="flex items-center rounded-md border border-transparent px-3 py-1 text-xs font-medium text-white shadow transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          style={{ backgroundColor: meta.bg }}
        >
          <span className="truncate">{meta.label}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-44 p-1.5">
        <ul role="listbox" aria-label="Status options" className="space-y-0.5">
          {TASK_STATUSES.map((status) => {
            const selected = status.value === value;
            return (
              <li key={status.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    onChange(status.value);
                    setOpen(false);
                  }}
                  className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-secondary"
                >
                  <span className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: status.bg }}
                      aria-hidden="true"
                    />
                    {status.label}
                  </span>
                  {selected && <Check className="h-4 w-4 text-[#0073EA]" />}
                </button>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
