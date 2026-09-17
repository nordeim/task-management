"use client";

import { useMemo, useState } from "react";
import { addMonths, format, isSameDay, isSameMonth, startOfMonth, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TaskDTO } from "@/lib/domain";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface BoardCalendarProps {
  tasks: TaskDTO[];
  onAddTask: () => void;
  onOpenTask?: (task: TaskDTO) => void;
}

/**
 * Month grid — each cell lists tasks whose dueDate falls on that day,
 * color-coded by status like the reference app's calendar view.
 */
export function BoardCalendar({ tasks, onAddTask, onOpenTask }: BoardCalendarProps) {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));

  const cells = useMemo(() => {
    // Sun-first 6-week grid covering the month in view, matching the reference.
    const first = startOfMonth(cursor);
    const gridStart = new Date(first);
    gridStart.setDate(first.getDate() - first.getDay()); // Sun=0
    return Array.from({ length: 42 }, (_, i) => {
      const day = new Date(gridStart);
      day.setDate(gridStart.getDate() + i);
      return day;
    });
  }, [cursor]);

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
    <div className="overflow-hidden rounded-xl border border-[#E1E5F3] bg-card shadow-lg">
      {/* Reference header (probed 2026-09-17): a p-4 zone with the arrows
          flanking the CENTERED text-xl month title — no border divider. */}
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

        <div className="grid grid-cols-7 text-center text-xs font-medium text-muted-foreground">
          {WEEKDAYS.map((day) => (
            <div key={day} className="py-2">
              {day}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-7">
        {cells.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayTasks = byDay.get(key) ?? [];
          const inMonth = isSameMonth(day, cursor);
          const isToday = isSameDay(day, today);
          return (
            <div
              key={key}
              className={`relative min-h-[100px] border border-[#E1E5F3] p-2 transition-colors hover:bg-[#F9FAFB] ${
                inMonth ? "" : "bg-[#F9FAFB]/60"
              } ${isToday ? "bg-white ring-2 ring-[#0073EA] ring-inset" : ""}`}
            >
              <div className="mb-1 flex items-center justify-between">
                {/* Reference today marker: blue TEXT, no filled circle. */}
                <span
                  className={`text-xs font-medium ${
                    isToday
                      ? "text-[#0073EA]"
                      : inMonth
                        ? "text-foreground"
                        : "text-muted-foreground/60"
                  }`}
                >
                  {format(day, "d")}
                </span>
                {dayTasks.length === 0 && isToday && (
                  <button
                    type="button"
                    aria-label="Add task today"
                    onClick={onAddTask}
                    className="rounded p-0.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                )}
              </div>
              <ul className="space-y-1">
                {dayTasks.slice(0, 3).map((task) => (
                  <li key={task.id}>
                    {/* Reference chips: white bordered cards with dark text. */}
                    <button
                      type="button"
                      onClick={() => onOpenTask?.(task)}
                      title={task.title}
                      className="mb-1 cursor-pointer rounded-md border border-[#E1E5F3] bg-white p-1.5 text-left text-xs font-medium text-[#323338] shadow-sm transition-all duration-200 hover:scale-105 hover:bg-gray-50 hover:shadow-md"
                    >
                      <span className="block truncate">{task.title}</span>
                    </button>
                  </li>
                ))}
                {dayTasks.length > 3 && (
                  <li className="px-1.5 text-[10px] text-muted-foreground">+{dayTasks.length - 3} more</li>
                )}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
