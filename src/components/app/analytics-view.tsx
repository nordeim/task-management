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
import { useApp } from "@/components/app/app-context";
import { api } from "@/lib/api-client";
import { distributionBars } from "@/lib/domain";
import type { AnalyticsDTO, BoardSummaryDTO } from "@/lib/domain";

const TIME_WINDOWS = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
];

// Solid colored KPI cards matching the reference analytics page. Colors come
// from the documented KPI palette (README design tokens).
const STAT_CARDS = [
  { key: "totalTasks", label: "Total Tasks", hint: "Active tasks tracked", bg: "#3b82f6", icon: ClipboardList },
  { key: "completionRate", label: "Completion Rate", hint: null, bg: "#22c55e", icon: CheckCircle2, suffix: "%" },
  { key: "overdueTasks", label: "Overdue Tasks", hint: "Need attention", bg: "#e93b3b", icon: AlertTriangle },
  { key: "activeBoards", label: "Active Boards", hint: "Boards in use", bg: "#a855f7", icon: FolderKanban },
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

      {/* Stats row — solid colored cards like the reference */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Key metrics">
        {STAT_CARDS.map((card) => {
          const Icon = card.icon;
          const raw = stats ? stats[card.key] : null;
          const value = raw === null ? null : `${raw}${"suffix" in card ? card.suffix : ""}`;
          return (
            <div
              key={card.key}
              className="relative flex min-h-[130px] flex-col justify-between overflow-hidden rounded-xl p-5 text-white shadow-sm"
              style={{ backgroundColor: card.bg }}
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
                <Progress
                  value={stats?.completionRate ?? 0}
                  className="h-1.5 [&>div]:bg-white"
                  aria-label="Completion rate"
                />
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
              <ul className="space-y-4">
                {statusBars.map((bar) => (
                  <li key={bar.status}>
                    <div className="mb-1.5 flex items-center gap-2 text-sm">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: bar.color }} aria-hidden="true" />
                      <span className="flex-1 text-muted-foreground">{bar.label}</span>
                      <span className="font-semibold">{bar.count}</span>
                    </div>
                    <div
                      className="h-2 overflow-hidden rounded-full bg-secondary"
                      role="progressbar"
                      aria-valuenow={bar.pct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${bar.label}: ${bar.count} tasks, ${bar.pct}%`}
                    >
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${bar.pct}%`, backgroundColor: bar.color }}
                      />
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
              <BarChart3 className="h-4 w-4 text-primary" /> Priority Distribution
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
              <ul className="space-y-4">
                {priorityBars.map((bar) => (
                  <li key={bar.priority}>
                    <div className="mb-1.5 flex items-center gap-2 text-sm">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: bar.color }} aria-hidden="true" />
                      <span className="flex-1 text-muted-foreground">{bar.label}</span>
                      <span className="font-semibold">{bar.count}</span>
                    </div>
                    <div
                      className="h-2 overflow-hidden rounded-full bg-secondary"
                      role="progressbar"
                      aria-valuenow={bar.pct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${bar.label}: ${bar.count} tasks, ${bar.pct}%`}
                    >
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${bar.pct}%`, backgroundColor: bar.color }}
                      />
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
