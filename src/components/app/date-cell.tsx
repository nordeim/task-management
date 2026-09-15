"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function DateCell({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (isoDate: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState<Date>(value ? new Date(value) : new Date());
  const date = value ? new Date(value) : null;
  const overdue = date !== null && date < new Date();

  function handleSelect(day: Date | undefined) {
    if (!day) return;
    // Keep the reference behavior: dates are stored at local noon to avoid
    // timezone edges shifting the rendered day.
    day.setHours(12, 0, 0, 0);
    onChange(day.toISOString());
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={date ? `Due date ${format(date, "MMM d, yyyy")}, change date` : "Set due date"}
          className="flex h-7 w-full max-w-[130px] items-center gap-1.5 rounded-md px-2 text-xs transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <CalendarIcon
            className={`h-3.5 w-3.5 shrink-0 ${overdue ? "text-destructive" : "text-muted-foreground"}`}
            aria-hidden="true"
          />
          {date ? (
            <span
              className={`rounded-full px-2 py-0.5 font-medium ${
                overdue ? "bg-destructive/10 text-destructive" : "text-muted-foreground"
              }`}
            >
              {format(date, "MMM d")}
            </span>
          ) : (
            <span className="text-muted-foreground">Set date</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0" aria-label="Pick a due date">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-medium">
            {value && date ? format(date, "EEE, MMM d yyyy") : "No due date"}
          </span>
          {value && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground"
              aria-label="Clear due date"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
        <Calendar
          mode="single"
          selected={date ?? undefined}
          month={month}
          onMonthChange={setMonth}
          onSelect={handleSelect}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}
