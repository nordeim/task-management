"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  ChartColumn,
  CircleCheck,
  Clock,
  Folder,
  Target,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useApp } from "@/components/app/app-context";
import { api } from "@/lib/api-client";
import { distributionBars } from "@/lib/domain";
import type { AnalyticsDTO, BoardSummaryDTO } from "@/lib/domain";

const TIME_WINDOWS = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
];

// Gradient KPI cards matching the reference analytics page (pairs probed from
// the live app 2026-09-16: to-right gradients, green completion bar).
const STAT_CARDS = [
  { key: "totalTasks", label: "Total Tasks", hint: "Active tasks tracked", from: "#3b82f6", to: "#2563eb", icon: Target },
  { key: "completionRate", label: "Completion Rate", hint: null, from: "#22c55e", to: "#16a34a", icon: CircleCheck, suffix: "%" },
  { key: "overdueTasks", label: "Overdue Tasks", hint: "Need attention", from: "#ef4444", to: "#dc2626", icon: Clock },
  { key: "activeBoards", label: "Active Boards", hint: "Boards in use", from: "#a855f7", to: "#9333ea", icon: Folder },
] as const;

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

  const statusBars = useMemo(
    () => (data ? distributionBars(data.statusDistribution) : []),
    [data],
  );
  const priorityBars = useMemo(
    () => (data ? distributionBars(data.priorityDistribution) : []),
    [data],
  );

  if (error) {
    return (
      <div className="mx-auto max-w-7xl p-6">
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
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
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

      {/* Stats row — gradient cards like the reference (analytics runs to-right). */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Key metrics">
        {STAT_CARDS.map((card) => {
          const Icon = card.icon;
          const raw = stats ? stats[card.key] : null;
          const value = raw === null ? null : `${raw}${"suffix" in card ? card.suffix : ""}`;
          return (
            <div
              key={card.key}
              className="stat-card-deco relative flex min-h-[136px] flex-col justify-between overflow-hidden rounded-xl p-5 text-white shadow-sm"
              style={{ background: `linear-gradient(to right, ${card.from}, ${card.to})` }}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20">
                {stats ? <Icon className="h-5 w-5" /> : <Skeleton className="h-5 w-5 bg-white/30" />}
              </span>
              <span>
                <span className="block text-sm font-medium opacity-90">{card.label}</span>
                <span className="block text-3xl font-bold">{value ?? "—"}</span>
                {card.hint && <span className="block text-xs opacity-80">{card.hint}</span>}
              </span>
              {"suffix" in card && (
                <span className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/25" aria-label="Completion rate">
                  <span
                    className="block h-full rounded-full bg-white"
                    style={{ width: `${stats?.completionRate ?? 0}%` }}
                  />
                </span>
              )}
            </div>
          );
        })}
      </section>

      {/* Distribution charts — horizontal bars like the reference */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-primary" /> Task Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!data ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : statusBars.every((b) => b.count === 0) ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                No tasks in this window yet
              </p>
            ) : (
              <ul className="space-y-3">
                {statusBars.map((bar) => (
                  <li key={bar.status} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="h-4 w-4 shrink-0 rounded-full" style={{ backgroundColor: bar.color }} aria-hidden="true" />
                      <span className="text-sm font-medium">{bar.label}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className="h-2 w-24 overflow-hidden rounded-full bg-gray-200"
                        role="progressbar"
                        aria-valuenow={bar.pct}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${bar.label}: ${bar.count} tasks, ${bar.pct}%`}
                      >
                        <span
                          className="block h-full rounded-full transition-all duration-500"
                          style={{ width: `${bar.pct}%`, backgroundColor: bar.color }}
                        />
                      </span>
                      <span className="w-12 text-sm text-gray-600">{bar.count}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-primary" /> Priority Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!data ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : priorityBars.every((b) => b.count === 0) ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                No tasks in this window yet
              </p>
            ) : (
              <ul className="space-y-3">
                {priorityBars.map((bar) => (
                  <li key={bar.priority} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="h-4 w-4 shrink-0 rounded-full" style={{ backgroundColor: bar.color }} aria-hidden="true" />
                      <span className="text-sm font-medium">{bar.label}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className="h-2 w-24 overflow-hidden rounded-full bg-gray-200"
                        role="progressbar"
                        aria-valuenow={bar.pct}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${bar.label}: ${bar.count} tasks, ${bar.pct}%`}
                      >
                        <span
                          className="block h-full rounded-full transition-all duration-500"
                          style={{ width: `${bar.pct}%`, backgroundColor: bar.color }}
                        />
                      </span>
                      <span className="w-12 text-sm text-gray-600">{bar.count}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Board performance */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <ChartColumn className="h-4 w-4 text-primary" /> Board Performance
          </CardTitle>
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
