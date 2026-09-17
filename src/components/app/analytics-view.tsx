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

// Gradient KPI cards (reference DOM probed 2026-09-17): to-right 500→600
// gradients, icon INLINE with the text-lg label, text-3xl value, and a
// color-100 subtitle; the Completion Rate card adds a full-width bg-green-300
// progress track below the value.
const STAT_CARDS = [
  {
    key: "totalTasks",
    label: "Total Tasks",
    hint: "Active tasks tracked",
    gradient: "from-blue-500 to-blue-600",
    subtitle: "text-blue-100",
    icon: Target,
  },
  {
    key: "completionRate",
    label: "Completion Rate",
    hint: null,
    gradient: "from-green-500 to-green-600",
    subtitle: "text-green-100",
    icon: CircleCheck,
    suffix: "%",
  },
  {
    key: "overdueTasks",
    label: "Overdue Tasks",
    hint: "Need attention",
    gradient: "from-red-500 to-red-600",
    subtitle: "text-red-100",
    icon: Clock,
  },
  {
    key: "activeBoards",
    label: "Active Boards",
    hint: "Boards in use",
    gradient: "from-purple-500 to-purple-600",
    subtitle: "text-purple-100",
    icon: Folder,
  },
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
      <div className="p-6">
        <div className="mx-auto max-w-7xl">
          <Card>
            <CardContent className="py-10 text-center">
              <p className="mb-2 font-medium">Could not load analytics</p>
              <p className="mb-4 text-sm text-muted-foreground">{error}</p>
              <Button onClick={() => load().then(applyResult)}>Try again</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const stats = data?.stats;

  return (
    // Reference shell (probed 2026-09-17): p-6 page padding OUTSIDE the
    // max-w-7xl container, so the container itself keeps the full 1280px.
    <div className="p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-3xl font-bold text-[#323338]">Analytics Dashboard</h1>
            <p className="mt-2 text-[#676879]">Insights and metrics across your boards and tasks</p>
          </div>
          <div className="flex gap-3">
            <Select value={boardId} onValueChange={setBoardId}>
              <SelectTrigger className="w-48" aria-label="Filter by board">
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
              <SelectTrigger className="w-40" aria-label="Filter by time window">
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
        <section className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4" aria-label="Key metrics">
          {STAT_CARDS.map((card) => {
            const Icon = card.icon;
            const raw = stats ? stats[card.key] : null;
            const value = raw === null ? null : `${raw}${"suffix" in card ? card.suffix : ""}`;
            return (
              <div
                key={card.key}
                className={`rounded-xl border bg-gradient-to-r ${card.gradient} text-white shadow`}
              >
                <div className="flex flex-col space-y-1.5 p-6 pb-2">
                  <div className="flex items-center gap-2 font-semibold tracking-tight text-lg">
                    {stats ? <Icon className="h-5 w-5" /> : <Skeleton className="h-5 w-5 bg-white/30" />}
                    {card.label}
                  </div>
                </div>
                <div className="p-6 pt-0">
                  <div className="text-3xl font-bold">{value ?? "—"}</div>
                  {card.hint && <p className={`text-sm ${card.subtitle}`}>{card.hint}</p>}
                  {"suffix" in card && (
                    <div
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={stats?.completionRate ?? 0}
                      aria-label="Completion rate"
                      className="relative mt-2 h-2 w-full overflow-hidden rounded-full bg-green-300"
                    >
                      {/* Reference fill (probed): near-black #171717, full
                          width, revealed by a translateX(-{100-value}%) — so 0%
                          renders nothing visible. */}
                      <div
                        className="h-full w-full flex-1 bg-[#171717] transition-all"
                        style={{ transform: `translateX(-${100 - (stats?.completionRate ?? 0)}%)` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </section>

        {/* Distribution charts — horizontal bars like the reference */}
        <section className="mb-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-500" /> Task Status Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!data ? (
                <div className="space-y-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-full" />
                  ))}
                </div>
              ) : statusBars.every((b) => b.count === 0) ? (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  No tasks in this window yet
                </p>
              ) : (
                <div className="space-y-4">
                  {statusBars.map((bar) => (
                    <div key={bar.status} className="flex items-center justify-between">
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
                            className="block h-full transition-all duration-500"
                            style={{ width: `${bar.pct}%`, backgroundColor: bar.color }}
                          />
                        </span>
                        <span className="w-12 text-sm text-gray-600">{bar.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-orange-500" /> Priority Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!data ? (
                <div className="space-y-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-full" />
                  ))}
                </div>
              ) : priorityBars.every((b) => b.count === 0) ? (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  No tasks in this window yet
                </p>
              ) : (
                <div className="space-y-4">
                  {priorityBars.map((bar) => (
                    <div key={bar.priority} className="flex items-center justify-between">
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
                            className="block h-full transition-all duration-500"
                            style={{ width: `${bar.pct}%`, backgroundColor: bar.color }}
                          />
                        </span>
                        <span className="w-12 text-sm text-gray-600">{bar.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Board performance — reference rows: gray-50 cards with bar + chip */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ChartColumn className="h-5 w-5 text-green-500" /> Board Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!data ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
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
              <div className="space-y-4">
                {data.boardPerformance.map((board) => (
                  <button
                    key={board.boardId}
                    type="button"
                    onClick={() => navigate("board", board.boardId)}
                    className="flex w-full items-center justify-between rounded-lg bg-gray-50 p-4 text-left transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div className="flex items-center gap-3">
                      <span className="h-4 w-4 shrink-0 rounded-lg" style={{ backgroundColor: board.color }} aria-hidden="true" />
                      <span>
                        <span className="block font-medium text-gray-900">{board.title}</span>
                        <span className="block text-sm text-gray-500">
                          {board.done} of {board.total} tasks completed
                        </span>
                      </span>
                    </div>
                    <span className="flex items-center gap-4">
                      <span className="h-2 w-32 overflow-hidden rounded-full bg-gray-200" aria-hidden="true">
                        <span
                          className="block h-full bg-green-500 transition-all duration-500"
                          style={{ width: `${board.rate}%` }}
                        />
                      </span>
                      <span className="inline-flex min-w-[3rem] items-center justify-center rounded-md border px-2.5 py-0.5 text-xs font-semibold text-foreground">
                        {board.rate}%
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
