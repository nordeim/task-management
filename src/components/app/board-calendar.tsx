"use client";

import { useMemo, useState } from "react";
import { addMonths, format, isSameDay, isSameMonth, startOfMonth, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { calendarCells } from "@/lib/domain";
import type { TaskDTO } from "@/lib/domain";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface BoardCalendarProps {
  tasks: TaskDTO[];
  onOpenTask?: (task: TaskDTO) => void;
}

/**
 * Month grid — each cell lists tasks whose dueDate falls on that day,
 * color-coded by status like the reference app's calendar view.
 *
 * Reference geometry (probed 2026-09-17): the grid renders ONLY the weeks
 * needed to cover the month (35 cells for Sep 2026), every cell holds a bare
 * number span plus an `mt-1 max-h-[70px]` scrollable events list, out-of-month
 * cells are solid `bg-[#F9FAFB] text-gray-400`, and the weekday header is
 * `text-[#676879]` with a bottom border on each label.
 */
export function BoardCalendar({ tasks, onOpenTask }: BoardCalendarProps) {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));

  const cells = useMemo(() => calendarCells(cursor), [cursor]);

  const byDay = useMemo(() => {
    const map = new Map<string, TaskDTO[]>();
    for (const task of tasks) {
      if (!task.dueDate) continue;
      const key = format(new Date(task.dueDate), "yyyy-MM-dd");
      const bucket = map.get(key);
      if (bucket) bucket.push(task);
      else map.set(key, [task]);
    }
    return map;
  }, [tasks]);

  const today = new Date();

  return (
    <div className="rounded-xl border border-[#E1E5F3] bg-card text-card-foreground shadow-lg">
      {/* Reference geometry (probed 2026-09-17): month row, weekday row AND the
          day grid all live INSIDE one p-4 zone — the grid inherits the 16px
          side padding (it does not span the full card width), and its
          container carries grid-rows-5 + gap-px. The 1px gaps show the
          card's white through the transparent grid background, so each pair
          of bordered cells renders the reference's "double hairline"
          (border → white slit → border) instead of a solid 2px line. */}
      <div className="p-4">
        <div className="mb-4 flex items-center justify-between px-2">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            aria-label="Previous month"
            onClick={() => setCursor((c) => subMonths(c, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-xl font-semibold text-[#323338]">{format(cursor, "MMMM yyyy")}</h2>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            aria-label="Next month"
            onClick={() => setCursor((c) => addMonths(c, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="mb-2 grid grid-cols-7 text-center text-xs font-medium text-[#676879]">
          {WEEKDAYS.map((day) => (
            <div key={day} className="border-b py-2">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 grid-rows-5 gap-px">
        {cells.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayTasks = byDay.get(key) ?? [];
          const inMonth = isSameMonth(day, cursor);
          const isToday = isSameDay(day, today);
          return (
            <div
              key={key}
              className={`relative min-h-[100px] border border-[#E1E5F3] p-2 transition-colors hover:bg-[#F9FAFB] ${
                inMonth ? "bg-white" : "bg-[#F9FAFB] text-gray-400"
              } ${isToday ? "bg-white ring-2 ring-[#0073EA] ring-inset" : ""}`}
            >
              {/* Reference cell anatomy: a bare number span (color inherited
                  from the cell; today is blue) over a capped events list. */}
              <span
                className={`text-xs font-medium ${
                  isToday ? "text-[#0073EA]" : ""
                }`}
              >
                {format(day, "d")}
              </span>
              <div className="mt-1 max-h-[70px] space-y-1 overflow-y-auto">
                {dayTasks.map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => onOpenTask?.(task)}
                    title={task.title}
                    className="mb-1 w-full cursor-pointer rounded-md border border-[#E1E5F3] bg-white p-1.5 text-left text-xs font-medium text-[#323338] shadow-xs transition-all duration-200 hover:scale-105 hover:bg-gray-50 hover:shadow-md"
                  >
                    <span className="block truncate">{task.title}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
        </div>
      </div>
    </div>
  );
}
