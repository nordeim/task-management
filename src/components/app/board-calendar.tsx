"use client";

import { useMemo, useState } from "react";
import { addMonths, format, isSameDay, isSameMonth, startOfMonth, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TaskDTO, TaskStatus } from "@/lib/domain";
import { statusMeta } from "@/lib/domain";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

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
    // Build a Mon-first 6-week grid covering the month in view.
    const first = startOfMonth(cursor);
    const startOffset = (first.getDay() + 6) % 7; // Mon=0 … Sun=6
    const gridStart = new Date(first);
    gridStart.setDate(first.getDate() - startOffset);
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
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-base font-semibold">{format(cursor, "MMMM yyyy")}</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" aria-label="Previous month" onClick={() => setCursor((c) => subMonths(c, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCursor(startOfMonth(new Date()))}>
            Today
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" aria-label="Next month" onClick={() => setCursor((c) => addMonths(c, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b bg-secondary/30 text-center text-xs font-medium text-muted-foreground">
        {WEEKDAYS.map((day) => (
          <div key={day} className="py-2">
            {day}
          </div>
        ))}
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
              className={`min-h-[96px] border-b border-r border-border/60 p-1.5 last:border-r-0 ${
                inMonth ? "bg-card" : "bg-secondary/20"
              }`}
            >
              <div className="mb-1 flex items-center justify-between">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                    isToday ? "bg-primary text-primary-foreground" : inMonth ? "text-foreground" : "text-muted-foreground/60"
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
                {dayTasks.slice(0, 3).map((task) => {
                  const meta = statusMeta(task.status);
                  return (
                    <li key={task.id}>
                      <button
                        type="button"
                        onClick={() => onOpenTask?.(task)}
                        title={task.title}
                        className="w-full truncate rounded px-1.5 py-1 text-left text-[11px] font-medium transition-transform hover:scale-[1.02]"
                        style={{ backgroundColor: meta.bg, color: meta.text }}
                      >
                        {task.title}
                      </button>
                    </li>
                  );
                })}
                {dayTasks.length > 3 && (
                  <li className="px-1.5 text-[10px] text-muted-foreground">+{dayTasks.length - 3} more</li>
                )}
              </ul>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-4 border-t px-4 py-3">
        <span className="text-xs font-medium text-muted-foreground">Legend:</span>
        {(["not_started", "working", "done", "stuck"] as TaskStatus[]).map((status) => {
          const meta = statusMeta(status);
          return (
            <span key={status} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: meta.bg }} aria-hidden="true" />
              {meta.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}
