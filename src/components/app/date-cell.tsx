"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, X } from "lucide-react";

import { isOverdueDate } from "@/lib/domain";

/** yyyy-mm-dd for the native input's value attribute. */
function toDateInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Due-date cell (reference states probed 2026-09-17):
 * - empty: calendar icon + "Set date" in #676879, hover bg #E1E5F3
 * - set: plain "Sep 29" text-sm #323338 with hover:opacity-80 and NO icon;
 *   past dates render as a red-tinted chip (bg #E2445C/10, text #E2445C)
 * - editing: borderless native date input
 * Dates are stored at local noon so timezone edges can never shift the
 * rendered day. The overdue boundary is the decompiled `pZ` rule
 * (`isOverdueDate`): before now AND not today — a task due TODAY never
 * renders red, even after local noon (verified live, session 15).
 */
export function DateCell({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (isoDate: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const date = value ? new Date(value) : null;
  const overdue = date !== null && isOverdueDate(date);

  function handleChange(next: string) {
    if (!next) {
      onChange(null);
      return;
    }
    const day = new Date(`${next}T12:00:00`);
    if (Number.isNaN(day.getTime())) return;
    // Keep the app-wide convention: due dates live at local noon.
    day.setHours(12, 0, 0, 0);
    onChange(day.toISOString());
    setEditing(false);
  }

  if (editing) {
    return (
      <input
        autoFocus
        type="date"
        aria-label="Set due date"
        value={date ? toDateInputValue(date) : ""}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={() => setEditing(false)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setEditing(false);
        }}
        className="h-7 w-full max-w-[130px] rounded-md border border-input bg-card px-2 py-0 text-xs text-[#323338] outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    );
  }

  if (!date) {
    return (
      <button
        type="button"
        aria-label="Set due date"
        onClick={() => setEditing(true)}
        className="flex cursor-pointer items-center gap-2 px-2 py-1 -mx-2 -my-1 text-[#676879] transition-colors hover:rounded hover:bg-[#E1E5F3]"
      >
        <CalendarIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>Set date</span>
      </button>
    );
  }

  return (
    <div className="group/date relative">
      <button
        type="button"
        aria-label={`Due date ${format(date, "MMM d, yyyy")}, change date`}
        onClick={() => setEditing(true)}
        className={`cursor-pointer rounded px-2 py-1 -mx-2 -my-1 text-sm transition-opacity hover:opacity-80 ${
          overdue ? "bg-[#E2445C]/10 text-[#E2445C]" : "text-[#323338]"
        }`}
      >
        {format(date, "MMM d")}
      </button>
      {/* Functional nicety kept from earlier passes: clear without reopening
          the editor (the reference requires re-editing to remove a date). */}
      <span
        className="absolute -right-1 -top-1 hidden shrink-0 rounded p-0.5 group-hover/date:block"
        title="Clear due date"
      >
        <X
          className="h-3 w-3 text-muted-foreground hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onChange(null);
          }}
          aria-label="Clear due date"
        />
      </span>
    </div>
  );
}
