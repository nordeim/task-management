"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  FolderKanban,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { useApp } from "@/components/app/app-context";
import { api } from "@/lib/api-client";
import type { AnalyticsDTO, BoardSummaryDTO } from "@/lib/domain";

const TIME_WINDOWS = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
];

export function AnalyticsView() {
  const { navigate } = useApp();
  const [data, setData] = useState<AnalyticsDTO | null>(null);
  const [boards, setBoards] = useState<BoardSummaryDTO[] | null>(null);
  const [boardId, setBoardId] = useState<string>("all");
  const [days, setDays] = useState<string>("30");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api<BoardSummaryDTO[]>("/api/boards").then((result) => {
      if (!cancelled && result.ok) setBoards(result.data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const load = useCallback(
    () => api<AnalyticsDTO>(`/api/analytics?boardId=${boardId}&days=${days}`),
    [boardId, days],
  );

  function applyResult(result: { ok: boolean; data?: AnalyticsDTO; error?: string }) {
    if (result.ok && result.data) {
      setData(result.data);
      setError(null);
    } else {
      setError(result.error ?? "Request failed");
    }
  }

  useEffect(() => {
    let cancelled = false;
    load().then((result) => {
      if (!cancelled) applyResult(result);
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  const statusChart = useMemo(
    () => data?.statusDistribution.filter((s) => s.count > 0) ?? [],
    [data],
  );
  const priorityChart = useMemo(
    () => data?.priorityDistribution.filter((p) => p.count > 0) ?? [],
    [data],
  );

  if (error) {
    return (
      <div className="mx-auto max-w-[1400px] p-6">
        <Card>
          <CardContent className="py-10 text-center">
            <p className="mb-2 font-medium">Could not load analytics</p>
            <p className="mb-4 text-sm text-muted-foreground">{error}</p>
            <Button onClick={() => load().then(applyResult)}>Try again</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stats = data?.stats;

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Analytics Dashboard</h1>
          <p className="mt-1 text-muted-foreground">Insights and metrics across your boards and tasks</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={boardId} onValueChange={setBoardId}>
            <SelectTrigger className="w-40" aria-label="Filter by board">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Boards</SelectItem>
              {(boards ?? []).map((board) => (
                <SelectItem key={board.id} value={board.id}>
                  {board.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-36" aria-label="Filter by time window">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIME_WINDOWS.map((w) => (
                <SelectItem key={w.value} value={w.value}>
                  {w.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats row */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
              <ClipboardList className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-muted-foreground">Total Tasks</p>
              <p className="text-2xl font-bold">{stats ? stats.totalTasks : "—"}</p>
              <p className="text-xs text-muted-foreground">Active tasks tracked</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#00ca72]/10 text-[#00ca72]">
                <CheckCircle2 className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-muted-foreground">Completion Rate</p>
                <p className="text-2xl font-bold">{stats ? `${stats.completionRate}%` : "—"}</p>
              </div>
            </div>
            <Progress value={stats?.completionRate ?? 0} className="mt-3 h-1.5" aria-label="Completion rate" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-muted-foreground">Overdue Tasks</p>
              <p className="text-2xl font-bold">{stats ? stats.overdueTasks : "—"}</p>
              <p className="text-xs text-muted-foreground">Need attention</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
              <FolderKanban className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-muted-foreground">Active Boards</p>
              <p className="text-2xl font-bold">{stats ? stats.activeBoards : "—"}</p>
              <p className="text-xs text-muted-foreground">Boards in use</p>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Distribution charts */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-primary" /> Task Status Distribution
            </CardTitle>
            <CardDescription>Where your tasks stand right now</CardDescription>
          </CardHeader>
          <CardContent>
            {!data ? (
              <Skeleton className="h-56 w-full" />
            ) : statusChart.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                No tasks in this window yet
              </p>
            ) : (
              <div className="flex flex-col items-center gap-4 sm:flex-row">
                <div className="h-52 w-52 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusChart}
                        dataKey="count"
                        nameKey="label"
                        innerRadius={48}
                        outerRadius={72}
                        paddingAngle={2}
                        strokeWidth={0}
                      >
                        {statusChart.map((entry) => (
                          <Cell key={entry.status} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ borderRadius: 8, border: "1px solid #e6e9ef", fontSize: 12 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="w-full flex-1 space-y-2">
                  {data.statusDistribution.map((s) => (
                    <li key={s.status} className="flex items-center gap-2 text-sm">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                      <span className="flex-1 text-muted-foreground">{s.label}</span>
                      <span className="font-semibold">{s.count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4 text-primary" /> Priority Distribution
            </CardTitle>
            <CardDescription>How urgent the workload is</CardDescription>
          </CardHeader>
          <CardContent>
            {!data ? (
              <Skeleton className="h-56 w-full" />
            ) : priorityChart.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                No tasks in this window yet
              </p>
            ) : (
              <div className="flex flex-col items-center gap-4 sm:flex-row">
                <div className="h-52 w-52 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={priorityChart}
                        dataKey="count"
                        nameKey="label"
                        innerRadius={48}
                        outerRadius={72}
                        paddingAngle={2}
                        strokeWidth={0}
                      >
                        {priorityChart.map((entry) => (
                          <Cell key={entry.priority} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ borderRadius: 8, border: "1px solid #e6e9ef", fontSize: 12 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="w-full flex-1 space-y-2">
                  {data.priorityDistribution.map((p) => (
                    <li key={p.priority} className="flex items-center gap-2 text-sm">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: p.color }} />
                      <span className="flex-1 text-muted-foreground">{p.label}</span>
                      <span className="font-semibold">{p.count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Board performance */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Board Performance</CardTitle>
          <CardDescription>Completion rate per board</CardDescription>
        </CardHeader>
        <CardContent>
          {!data ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : data.boardPerformance.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center">
              <p className="font-semibold">No boards to report</p>
              <p className="mt-1 text-sm text-muted-foreground">Create a board to see performance here</p>
              <Button className="mt-4" onClick={() => navigate("boards")}>
                Go to My Boards
              </Button>
            </div>
          ) : (
            <ul className="space-y-4">
              {data.boardPerformance.map((board) => (
                <li key={board.boardId}>
                  <button
                    type="button"
                    onClick={() => navigate("board", board.boardId)}
                    className="w-full rounded-lg p-2 text-left transition-colors hover:bg-secondary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div className="mb-1.5 flex items-center gap-2">
                      <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: board.color }} />
                      <span className="flex-1 truncate text-sm font-semibold">{board.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {board.done} of {board.total} tasks completed
                      </span>
                      <span className="text-sm font-bold" style={{ color: board.color }}>
                        {board.rate}%
                      </span>
                    </div>
                    <Progress value={board.rate} className="h-2" aria-label={`${board.title} completion`} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
