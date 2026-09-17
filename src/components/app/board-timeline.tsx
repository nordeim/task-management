"use client";

import { useMemo, useState } from "react";
import { addDays, isSameDay, subDays, subMonths, addMonths } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
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
 *
 * Reference chrome (probed 2026-09-17): the toolbar's right cluster is
 * `flex items-center gap-1` with a NATIVE <select> zoom
 * (`h-8 border border-gray-300 rounded-md px-2 text-sm`). Day header cells
 * always stack weekday over number, keep their border-r on EVERY column
 * (no last:border-r-0), and the number inherits the near-black foreground.
 * Month-mode columns are a FIXED ~171.43px (the reference computes 1200/7,
 * viewport-independent). With no scheduled tasks the day header row still
 * renders, followed by a `p-8 text-center text-gray-500` message.
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

  // Reference day columns (probed 2026-09-17): week mode = FIXED 40px
  // (w-10); month mode = FIXED ~171.43px (their computed 1200/7,
  // viewport-independent). Day mode keeps a usable single wide column (the
  // reference's own day mode renders 5.71px cells — a defect we do not copy).
  const columnWidth =
    mode === "day" ? "min-w-[320px] shrink-0" : mode === "month" ? "w-[171.43px] shrink-0" : "w-10 shrink-0";

  return (
    <div className="overflow-hidden rounded-xl border border-[#E1E5F3] bg-card shadow-lg">
      {/* Window controls (reference): title LEFT, ‹ Today › + zoom RIGHT. */}
      <div className="sticky top-0 z-10 flex flex-row items-center justify-between space-y-1.5 border-b bg-white p-3">
        <h2 className="tracking-tight text-base font-semibold text-[#323338]">{range.label}</h2>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8" aria-label="Previous period" onClick={() => step(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" className="h-8 px-3 text-xs" onClick={() => setCursor(new Date())}>
            Today
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" aria-label="Next period" onClick={() => step(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          {/* Reference zoom: a NATIVE select, not a shadcn Select. */}
          <select
            className="h-8 rounded-md border border-gray-300 px-2 text-sm"
            value={mode}
            aria-label="Timeline zoom"
            onChange={(e) => setMode(e.target.value as TimelineMode)}
          >
            {MODES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto p-0">
        <div className="min-w-fit">
          {/* Day header row (reference): gray-50 strip, 200px Task column,
              day cells with stacked weekday/number, border-r on every column. */}
          <div className="sticky top-[53px] z-[5] flex border-b bg-gray-50">
            <div className="w-[200px] shrink-0 border-r p-2 text-xs font-medium text-gray-600">
              Task
            </div>
            {range.days.map((day) => (
              <div
                key={day.toISOString()}
                className={`${columnWidth} border-r p-1 text-center`}
              >
                <span className="block text-xs text-gray-500">
                  {day.toLocaleDateString(undefined, { weekday: "short" })}
                </span>
                <span className="block text-sm font-medium">{day.getDate()}</span>
              </div>
            ))}
          </div>

          {/* Task rows: one bar per task, pinned to its due-date column */}
          {scheduled.length > 0 ? (
            <ul className="divide-y">
              {scheduled.map((task) => {
                const due = task.dueDate ? new Date(task.dueDate) : null;
                const meta = statusMeta(task.status);
                const dayIndex = due
                  ? range.days.findIndex((day) => isSameDay(day, due))
                  : -1;
                return (
                  <li key={task.id} className="flex items-stretch hover:bg-secondary/20">
                    <div className="sticky left-0 z-[5] flex w-[200px] shrink-0 items-center gap-2 border-r bg-card px-2 py-2">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: meta.bg }}
                        aria-hidden="true"
                      />
                      <span
                        className={`truncate text-sm ${task.completed ? "text-muted-foreground" : ""}`}
                        title={task.title}
                      >
                        {task.title}
                      </span>
                    </div>
                    <div className="relative flex">
                      {range.days.map((day, i) => (
                        <div
                          key={day.toISOString()}
                          className={`${columnWidth} border-r border-border/40`}
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
          ) : (
            /* Reference empty state: the header row above still renders,
               followed by this centered gray note. */
            <div className="relative">
              <div className="p-8 text-center text-gray-500">
                No items with valid start and end dates to display in the timeline.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tasks without due dates stay reachable instead of vanishing. */}
      {unscheduled.length > 0 && (
        <div className="border-t border-[#E1E5F3] px-4 py-3">
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
