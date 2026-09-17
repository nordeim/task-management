"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { TASK_PRIORITIES, priorityBadgeStyle } from "@/lib/domain";
import type { TaskPriority } from "@/lib/domain";

/**
 * The reference's PriorityCell (decompiled `xZ` — the live boards use the
 * dropdown-type renderer): ALWAYS a shadcn Select whose trigger is a bare
 * `h-full w-full p-1 border-none bg-transparent text-sm focus:ring-0
 * shadow-none` wrapping the tinted badge; the menu lists priorities as
 * color-dot + label items with the stock near-black check. The
 * priority-type variant (`wZ`) adds a 1px colored badge border, but no
 * current reference board has a priority-type column — transparent border
 * matches every live board.
 */
export function PriorityCell({
  value,
  onChange,
}: {
  value: TaskPriority;
  onChange: (next: TaskPriority) => void;
}) {
  const meta = TASK_PRIORITIES.find((p) => p.value === value) ?? TASK_PRIORITIES[0];

  return (
    <Select value={meta.value} onValueChange={(v) => onChange(v as TaskPriority)}>
      <SelectTrigger
        aria-label={`Priority: ${meta.label}, change priority`}
        className="h-full w-full border-none bg-transparent p-1 text-sm shadow-none focus:ring-0"
      >
        <span
          className="inline-flex items-center rounded-md border border-transparent px-2.5 py-0.5 text-xs font-normal shadow"
          style={priorityBadgeStyle(value)}
        >
          {meta.label}
        </span>
      </SelectTrigger>
      <SelectContent>
        {TASK_PRIORITIES.map((p) => (
          <SelectItem key={p.value} value={p.value}>
            <span className="flex items-center gap-2">
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: p.color }}
                aria-hidden="true"
              />
              {p.label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
