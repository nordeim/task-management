"use client";

import { useMemo, useState } from "react";
import { addDays, isSameDay, isSameMonth, isToday, subDays, subMonths, addMonths } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { timelineRange, statusMeta } from "@/lib/domain";
import type { TaskDTO, TimelineMode } from "@/lib/domain";

const MODES: { value: TimelineMode; label: string }[] = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
];

interface BoardTimelineProps {
  tasks: TaskDTO[];
  onAddTask: () => void;
}

/**
 * Gantt-style timeline — day columns with status-colored bars pinned to each
 * task's due date, zoomable Day/Week/Month like the reference app. Tasks
 * without a due date are listed below the grid so nothing is silently lost.
 */
export function BoardTimeline({ tasks, onAddTask }: BoardTimelineProps) {
  const [mode, setMode] = useState<TimelineMode>("week");
  const [cursor, setCursor] = useState(() => new Date());

  const range = useMemo(() => timelineRange(mode, cursor), [mode, cursor]);

  const scheduled = useMemo(
    () => tasks.filter((t) => t.dueDate !== null),
    [tasks],
  );
  const unscheduled = useMemo(
    () => tasks.filter((t) => t.dueDate === null),
    [tasks],
  );

  function step(direction: 1 | -1) {
    setCursor((current) => {
      if (mode === "day") return direction === 1 ? addDays(current, 1) : subDays(current, 1);
      if (mode === "month") return direction === 1 ? addMonths(current, 1) : subMonths(current, 1);
      return direction === 1 ? addDays(current, 7) : subDays(current, 7);
    });
  }

  const columnWidth = mode === "day" ? "min-w-[320px]" : mode === "week" ? "min-w-[120px]" : "min-w-[44px]";

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      {/* Window controls: ‹ label Today › + Day/Week/Month zoom */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" aria-label="Previous period" onClick={() => step(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="min-w-40 text-center text-base font-semibold">{range.label}</h2>
          <Button variant="outline" size="icon" className="h-8 w-8" aria-label="Next period" onClick={() => step(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCursor(new Date())}>
            Today
          </Button>
        </div>
        <Select value={mode} onValueChange={(v) => setMode(v as TimelineMode)}>
          <SelectTrigger className="w-28" aria-label="Timeline zoom">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MODES.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {scheduled.length === 0 ? (
        <p className="px-4 py-12 text-center text-sm text-muted-foreground">
          No items with valid start and end dates to display in the timeline.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-fit">
            {/* Day header row */}
            <div className="flex border-b bg-secondary/30">
              <div className="sticky left-0 z-10 w-48 shrink-0 border-r bg-secondary/30 px-3 py-2 text-xs font-medium text-muted-foreground">
                Task
              </div>
              {range.days.map((day) => {
                const inMonth = mode !== "month" || isSameMonth(day, cursor);
                const today = isToday(day);
                return (
                  <div
                    key={day.toISOString()}
                    className={`${columnWidth} flex-1 px-2 py-2 text-center text-xs ${
                      inMonth ? (today ? "font-bold text-primary" : "font-medium text-muted-foreground") : "text-muted-foreground/50"
                    }`}
                  >
                    <span className="block">
                      {mode === "month"
                        ? day.getDate()
                        : day.toLocaleDateString(undefined, { weekday: "short" })}
                    </span>
                    <span className={`block ${today ? "text-primary" : ""}`}>{day.getDate()}</span>
                  </div>
                );
              })}
            </div>

            {/* Task rows: one bar per task, pinned to its due-date column */}
            <ul className="divide-y">
              {scheduled.map((task) => {
                const due = task.dueDate ? new Date(task.dueDate) : null;
                const meta = statusMeta(task.status);
                const dayIndex = due
                  ? range.days.findIndex((day) => isSameDay(day, due))
                  : -1;
                return (
                  <li key={task.id} className="flex items-stretch hover:bg-secondary/20">
                    <div className="sticky left-0 z-10 flex w-48 shrink-0 items-center gap-2 border-r bg-card px-3 py-2">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: meta.bg }}
                        aria-hidden="true"
                      />
                      <span
                        className={`truncate text-sm ${task.completed ? "text-muted-foreground line-through" : ""}`}
                        title={task.title}
                      >
                        {task.title}
                      </span>
                    </div>
                    <div className="relative flex flex-1">
                      {range.days.map((day, i) => (
                        <div
                          key={day.toISOString()}
                          className={`${columnWidth} flex-1 border-r border-border/40 last:border-r-0 ${
                            isToday(day) ? "bg-accent/40" : ""
                          }`}
                          aria-hidden={i === dayIndex ? undefined : true}
                        >
                          {i === dayIndex && (
                            <span
                              className="mx-1 my-1.5 block truncate rounded-md px-2 py-1 text-[11px] font-medium"
                              style={{ backgroundColor: meta.bg, color: meta.text }}
                              title={task.title}
                            >
                              {task.title}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      {/* Tasks without due dates stay reachable instead of vanishing. */}
      {unscheduled.length > 0 && (
        <div className="border-t px-4 py-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            {unscheduled.length} task{unscheduled.length === 1 ? "" : "s"} without a due date
          </p>
          <ul className="space-y-1">
            {unscheduled.slice(0, 5).map((task) => (
              <li key={task.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" aria-hidden="true" />
                <span className="truncate">{task.title}</span>
              </li>
            ))}
            {unscheduled.length > 5 && (
              <li className="text-xs text-muted-foreground">+{unscheduled.length - 5} more</li>
            )}
          </ul>
          <Button variant="ghost" size="sm" className="mt-2 text-muted-foreground" onClick={onAddTask}>
            Set dates from the table view
          </Button>
        </div>
      )}
    </div>
  );
}
