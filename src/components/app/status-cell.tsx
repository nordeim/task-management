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
          className="flex h-7 w-full max-w-[140px] items-center justify-between gap-1 rounded-md border border-black/10 px-3 text-xs font-semibold transition-colors hover:border-black/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          style={{ backgroundColor: meta.bg, color: meta.text }}
        >
          <span className="truncate">{meta.label}</span>
          <svg
            className="h-3 w-3 shrink-0 opacity-70"
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
                      className="h-4 w-4 rounded-full border border-black/5"
                      style={{ backgroundColor: status.bg }}
                      aria-hidden="true"
                    />
                    {status.label}
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
