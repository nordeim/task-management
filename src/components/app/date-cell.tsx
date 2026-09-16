"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, X } from "lucide-react";

/** yyyy-mm-dd for the native input's value attribute. */
function toDateInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Reference parity: the due-date cell shows an icon + label and swaps to a
 * native date input on click. Dates are stored at local noon so timezone
 * edges can never shift the rendered day.
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
  const overdue = date !== null && date < new Date();

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
        className="h-7 w-full max-w-[130px] rounded-md border border-input bg-card px-2 py-0 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    );
  }

  return (
    <button
      type="button"
      aria-label={date ? `Due date ${format(date, "MMM d, yyyy")}, change date` : "Set due date"}
      onClick={() => setEditing(true)}
      className="group/date flex h-7 w-full max-w-[130px] items-center gap-1.5 rounded-md px-2 text-xs transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <CalendarIcon
        className={`h-3.5 w-3.5 shrink-0 ${overdue ? "text-destructive" : "text-muted-foreground"}`}
        aria-hidden="true"
      />
      {date ? (
        <span
          className={`font-medium ${overdue ? "text-destructive" : "text-muted-foreground"}`}
        >
          {format(date, "MMM d")}
        </span>
      ) : (
        <span className="text-muted-foreground">Set date</span>
      )}
      {date && (
        <span className="hidden shrink-0 rounded p-0.5 group-hover/date:block" title="Clear due date">
          <X
            className="h-3 w-3 text-muted-foreground hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onChange(null);
            }}
            aria-label="Clear due date"
          />
        </span>
      )}
    </button>
  );
}
