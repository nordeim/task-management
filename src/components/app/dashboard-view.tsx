"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  ArrowRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock,
  FolderKanban,
  Globe,
  Lock,
  Plus,
  Sparkles,
  TrendingUp,
  UserPlus,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useApp } from "@/components/app/app-context";
import { api } from "@/lib/api-client";
import type { DashboardDTO } from "@/lib/domain";

const STAT_CARDS = [
  { key: "totalBoards", label: "Total Boards", bg: "#3b82f6", icon: FolderKanban, target: "boards" as const },
  { key: "completedTasks", label: "Completed Tasks", bg: "#22c55e", icon: CheckCircle2, target: "analytics" as const },
  { key: "pendingTasks", label: "Pending Tasks", bg: "#f97316", icon: Clock, target: "boards" as const },
  { key: "completionRate", label: "Completion Rate", bg: "#a855f7", icon: TrendingUp, target: "analytics" as const, suffix: "%" },
] as const;

const QUICK_ACTIONS = [
  { label: "Create Board", hint: "Start new project", bg: "#06b6d4", icon: Plus, action: "create" as const },
  { label: "Invite Team", hint: "Add collaborators", bg: "#22c55e", icon: UserPlus, action: "invite" as const },
  { label: "Calendar", hint: "View deadlines", bg: "#f97316", icon: CalendarDays, action: "calendar" as const },
  { label: "Analytics", hint: "View insights", bg: "#d946ef", icon: BarChart3, action: "analytics" as const },
] as const;

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function timeAgo(iso: string): string {
  const seconds = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** The reference renders "Updated Sep 15, 2026" on board cards. */
function formatUpdatedDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function DashboardView({ onCreateBoard }: { onCreateBoard: () => void }) {
  const { user, navigate } = useApp();
  const [data, setData] = useState<DashboardDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inviteNote, setInviteNote] = useState<string | null>(null);

  const load = useCallback(() => api<DashboardDTO>("/api/dashboard"), []);

  useEffect(() => {
    let cancelled = false;
    load().then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setData(result.data);
        setError(null);
      } else {
        setError(result.error);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  function handleQuickAction(action: (typeof QUICK_ACTIONS)[number]["action"]) {
    if (action === "create") {
      onCreateBoard();
    } else if (action === "analytics") {
      navigate("analytics");
    } else if (action === "calendar") {
      navigate("boards");
    } else if (action === "invite") {
      setInviteNote("Team invitations are managed per board — open a board and use the member picker.");
      window.setTimeout(() => setInviteNote(null), 4000);
    }
  }

  function retry() {
    load().then((result) => {
      if (result.ok) {
        setData(result.data);
        setError(null);
      } else {
        setError(result.error);
      }
    });
  }

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-10 text-center">
            <p className="mb-2 font-medium">Could not load your dashboard</p>
            <p className="mb-4 text-sm text-muted-foreground">{error}</p>
            <Button onClick={retry}>Try again</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stats = data?.stats;
  const firstName = user.name.split(" ")[0] || user.name;

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Hero */}
      <section className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white"
              style={{ backgroundColor: "#0073ea" }}
              aria-hidden="true"
            >
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                {greeting()}, {firstName}!
              </h1>
              <p className="mt-1 text-muted-foreground">
                Ready to make today productive?
                {stats && stats.pendingTasks > 0
                  ? ` You have ${stats.pendingTasks} task${stats.pendingTasks === 1 ? "" : "s"} waiting.`
                  : ""}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" className="font-semibold" onClick={() => navigate("boards")}>
              View All Boards <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" className="font-semibold" onClick={() => navigate("analytics")}>
              <BarChart3 className="mr-1 h-4 w-4" /> View Analytics
            </Button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Key metrics">
        {STAT_CARDS.map((card) => {
          const Icon = card.icon;
          const value = stats
            ? card.key === "completionRate"
              ? `${stats.completionRate}${card.suffix}`
              : String(stats[card.key as "totalBoards" | "completedTasks" | "pendingTasks"])
            : null;
          return (
            <button
              key={card.key}
              type="button"
              onClick={() => navigate(card.target)}
              className="stat-card-deco relative flex min-h-[120px] flex-col justify-between overflow-hidden rounded-xl p-5 text-left text-white shadow-sm transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              style={{ backgroundColor: card.bg }}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20">
                {stats ? <Icon className="h-5 w-5" /> : <Skeleton className="h-5 w-5 bg-white/30" />}
              </span>
              <span>
                <span className="block text-sm font-medium opacity-90">{card.label}</span>
                <span className="block text-3xl font-bold">{value ?? "—"}</span>
              </span>
            </button>
          );
        })}
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Recent boards */}
        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-3">
              <span
                className="flex h-10 w-10 items-center justify-center rounded-lg text-white"
                style={{ backgroundColor: "#a855f7" }}
                aria-hidden="true"
              >
                <FolderKanban className="h-5 w-5" />
              </span>
              <div>
                <CardTitle className="text-lg">Recent Boards</CardTitle>
                <CardDescription>Your latest project boards</CardDescription>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate("boards")}
              className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              View All <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </CardHeader>
          <CardContent>
            {!data ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : data.recentBoards.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-center">
                <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
                  <FolderKanban className="h-7 w-7" />
                </span>
                <p className="font-semibold">No boards yet</p>
                <p className="mb-5 mt-1 text-sm text-muted-foreground">
                  Create your first board to get started
                </p>
                <Button onClick={onCreateBoard}>
                  <Plus className="mr-1 h-4 w-4" /> Create Board
                </Button>
              </div>
            ) : (
              <ul className="space-y-2">
                {data.recentBoards.map((board) => {
                  const pct = board.taskCount === 0 ? 0 : Math.round((board.doneCount / board.taskCount) * 100);
                  return (
                    <li key={board.id}>
                      <button
                        type="button"
                        onClick={() => navigate("board", board.id)}
                        className="flex w-full items-center gap-4 rounded-lg border p-4 text-left transition-colors hover:bg-secondary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <span
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
                          style={{ backgroundColor: board.color }}
                          aria-hidden="true"
                        >
                          {board.title.slice(0, 1).toUpperCase()}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="truncate font-semibold">{board.title}</span>
                            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                              {board.visibility === "private" ? (
                                <Lock className="h-3 w-3" aria-hidden="true" />
                              ) : (
                                <Globe className="h-3 w-3" aria-hidden="true" />
                              )}
                              {board.visibility}
                            </span>
                          </span>
                          <span className="mt-0.5 block truncate text-sm text-muted-foreground">
                            Updated {formatUpdatedDate(board.updatedAt)}
                            {board.description ? ` — ${board.description}` : ` — ${board.taskCount} tasks`}
                          </span>
                          <span className="mt-2 flex items-center gap-2">
                            <span className="h-1.5 w-28 overflow-hidden rounded-full bg-secondary">
                              <span
                                className="block h-full rounded-full"
                                style={{ width: `${pct}%`, backgroundColor: "#00ca72" }}
                              />
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {board.doneCount}/{board.taskCount} done · {pct}%
                            </span>
                          </span>
                        </span>
                        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Sidebar: quick actions + activity */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-white"
                  style={{ backgroundColor: "#ec4899" }}
                  aria-hidden="true"
                >
                  <Zap className="h-5 w-5" />
                </span>
                <div>
                  <CardTitle className="text-lg">Quick Actions</CardTitle>
                  <CardDescription>Get things done faster</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {inviteNote && (
                <p role="status" className="rounded-md bg-accent px-3 py-2 text-xs text-accent-foreground">
                  {inviteNote}
                </p>
              )}
              {QUICK_ACTIONS.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.label}
                    type="button"
                    onClick={() => handleQuickAction(action.action)}
                    className="flex w-full items-center gap-3 rounded-lg p-3 text-left text-white shadow-sm transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    style={{ backgroundColor: action.bg }}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/20">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold">{action.label}</span>
                      <span className="block text-xs opacity-90">{action.hint}</span>
                    </span>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-white"
                  style={{ backgroundColor: "#10b981" }}
                  aria-hidden="true"
                >
                  <Activity className="h-5 w-5" />
                </span>
                <div>
                  <CardTitle className="text-lg">Recent Activity</CardTitle>
                  <CardDescription>Latest updates</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {!data ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : data.activity.length === 0 ? (
                <div className="flex flex-col items-center py-6 text-center text-muted-foreground">
                  <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
                    <Activity className="h-6 w-6" />
                  </span>
                  <p className="text-sm">No recent activity</p>
                  <p className="text-xs">Actions you take will show up here</p>
                </div>
              ) : (
                <ul className="space-y-1">
                  {data.activity.slice(0, 6).map((item) => (
                    <li key={item.id} className="flex items-start gap-3 rounded-md px-2 py-2 hover:bg-secondary/60">
                      <span
                        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                        style={{ backgroundColor: item.user.avatarColor }}
                        aria-hidden="true"
                      >
                        {item.user.name.slice(0, 1).toUpperCase()}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm leading-snug">
                          <span className="font-medium">{item.user.name.split(" ")[0]}</span>{" "}
                          {item.message}
                        </span>
                        <span className="text-xs text-muted-foreground">{timeAgo(item.createdAt)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
