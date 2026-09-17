"use client";

import { useMemo } from "react";
import { Target, TrendingUp, Clock, ChartColumn, Users, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  TASK_STATUSES,
  boardStats,
  formatBoardActivityTime,
  recentActivityItems,
  teamWorkload,
} from "@/lib/domain";
import type { TaskDTO } from "@/lib/domain";

interface BoardAnalyticsDialogProps {
  onClose: () => void;
  boardTitle: string;
  tasks: TaskDTO[];
}

/**
 * Board Analytics modal — decompiled from the reference bundle (`Ote`) and
 * live-probed 2026-09-18. Opened from the board header's Analytics button
 * (NOT a navigation): a fixed overlay + `max-w-6xl` panel with three
 * gradient stat cards, a Status Distribution card (vocabulary order — the
 * reference iterates the status column's choices, zero counts included),
 * a first-encounter Team Workload card (hidden when no owners), and a
 * top-5 Recent Activity feed ("MMM d, HH:mm" 24-hour stamps). The
 * reference's Priority Distribution section is dead code (it reads a
 * type:"priority" column that no current board has) — not replicated.
 * All numbers derive from the board's already-loaded tasks, client-side.
 */
export function BoardAnalyticsDialog({ onClose, boardTitle, tasks }: BoardAnalyticsDialogProps) {
  const stats = useMemo(() => boardStats(tasks), [tasks]);
  const workload = useMemo(() => teamWorkload(tasks), [tasks]);
  const activity = useMemo(() => recentActivityItems(tasks), [tasks]);
  const statusRows = useMemo(
    () =>
      TASK_STATUSES.map((s) => ({
        ...s,
        count: tasks.filter((t) => t.status === s.value).length,
      })),
    [tasks],
  );

  return (
    <Dialog open onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[90vh] gap-0 overflow-y-auto rounded-2xl border-0 p-0 shadow-2xl sm:max-w-6xl"
      >
        <DialogTitle className="sr-only">Board Analytics — {boardTitle}</DialogTitle>
        {/* Header (reference): border-b row with title block + × pill. */}
        <div className="flex items-center justify-between border-b border-gray-200 p-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Board Analytics</h2>
            <p className="text-gray-600">Insights and statistics for {boardTitle}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            aria-label="Close board analytics"
            onClick={onClose}
            className="h-8 w-8 rounded-full text-xl font-bold text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            ×
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="border bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg tracking-tight">
                <Target className="h-5 w-5" aria-hidden="true" /> Total Tasks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.total}</div>
              <p className="text-blue-100">Active items in board</p>
            </CardContent>
          </Card>
          <Card className="border bg-gradient-to-r from-green-500 to-green-600 text-white shadow">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg tracking-tight">
                <TrendingUp className="h-5 w-5" aria-hidden="true" /> Completion Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.completionRate}%</div>
              <Progress value={stats.completionRate} className="mt-2 bg-green-300" />
            </CardContent>
          </Card>
          <Card className="border bg-gradient-to-r from-red-500 to-red-600 text-white shadow">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg tracking-tight">
                <Clock className="h-5 w-5" aria-hidden="true" /> Overdue Tasks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.overdue}</div>
              <p className="text-red-100">Need immediate attention</p>
            </CardContent>
          </Card>

          <Card className="border shadow md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ChartColumn className="h-5 w-5" aria-hidden="true" /> Status Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {statusRows.map((row) => (
                  <div key={row.value} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: row.bg }}
                        aria-hidden="true"
                      />
                      <span className="font-medium">{row.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">{row.count} tasks</span>
                      <Badge variant="outline">
                        {stats.total > 0 ? Math.round((row.count / stats.total) * 100) : 0}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {workload.length > 0 && (
            <Card className="border shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" aria-hidden="true" /> Team Workload
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {workload.map((member) => (
                    <div key={member.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-sm font-bold text-white"
                          aria-hidden="true"
                        >
                          {member.name.charAt(0).toUpperCase()}
                        </span>
                        <span className="font-medium">{member.name}</span>
                      </div>
                      <Badge>{member.count} tasks</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {activity.length > 0 && (
            <Card className="border shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" aria-hidden="true" /> Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {activity.map((task) => (
                    <div key={task.id} className="flex flex-col gap-1 rounded bg-gray-50 p-2">
                      <div className="truncate text-sm font-medium">{task.title}</div>
                      <div className="text-xs text-gray-500">
                        Updated {formatBoardActivityTime(new Date(task.updatedAt))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {stats.total === 0 && (
            <Card className="border p-8 text-center text-gray-500 shadow md:col-span-3">
              <CardHeader className="p-0">
                <ChartColumn className="mx-auto mb-4 h-16 w-16 opacity-50" aria-hidden="true" />
                <h3 className="mb-2 text-lg font-medium text-gray-900">No Data Available</h3>
              </CardHeader>
              <CardContent className="p-0">
                <p>Add some tasks to your board to see analytics</p>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
