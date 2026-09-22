"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Calendar,
  ChartColumn,
  CircleCheck,
  Clock,
  Folder,
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
import { formatRecentTaskTime, visibilityLabel } from "@/lib/domain";
import type { DashboardDTO } from "@/lib/domain";

/**
 * Reference KPI cards (probed 2026-09-17): Tailwind gradient pairs with a
 * `group perspective-1000` wrapper, deco discs, hover particles, an icon tile
 * (w-10 bg-white/20 backdrop-blur-sm under the reference's v3-valued custom
 * v4 theme = blur(4px); we port backdrop-blur-xs — session 27), and a
 * space-y-1 value zone.
 */
const STAT_CARDS = [
  {
    key: "totalBoards",
    label: "Total Boards",
    gradient: "from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700",
    icon: Folder,
    target: "boards" as const,
  },
  {
    key: "completedTasks",
    label: "Completed Tasks",
    gradient: "from-green-500 to-green-600 hover:from-green-600 hover:to-green-700",
    icon: CircleCheck,
    target: "analytics" as const,
  },
  {
    key: "pendingTasks",
    label: "Pending Tasks",
    gradient: "from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600",
    icon: Clock,
    target: "boards" as const,
  },
  {
    key: "completionRate",
    label: "Completion Rate",
    gradient: "from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700",
    icon: TrendingUp,
    target: "analytics" as const,
    suffix: "%",
  },
] as const;

/** Hover particle positions probed from the reference (left/top %). */
const STAT_PARTICLES = [
  { left: "20%", top: "20%" },
  { left: "35%", top: "30%" },
  { left: "50%", top: "40%" },
  { left: "65%", top: "50%" },
  { left: "80%", top: "60%" },
  { left: "95%", top: "70%" },
] as const;

/** Reference quick actions: gradient rows with white/20 icon tiles. */
const QUICK_ACTIONS = [
  {
    label: "Create Board",
    hint: "Start new project",
    gradient: "from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600",
    icon: Plus,
    action: "create" as const,
  },
  {
    label: "Invite Team",
    hint: "Add collaborators",
    gradient: "from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600",
    icon: UserPlus,
    action: "invite" as const,
  },
  {
    label: "Calendar",
    hint: "View deadlines",
    gradient: "from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600",
    icon: Calendar,
    action: "calendar" as const,
  },
  {
    label: "Analytics",
    hint: "View insights",
    gradient: "from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600",
    icon: ChartColumn,
    action: "analytics" as const,
  },
] as const;

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
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
      <div className="min-h-screen bg-[#F5F6F8] p-4 md:p-8">
        <Card className="mx-auto max-w-7xl">
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
    // Reference shell (probed): responsive padding lives OUTSIDE the
    // max-w-7xl container, on the page background itself.
    <div className="min-h-screen bg-[#F5F6F8] p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
      {/* Hero — white gradient card (probed 2026-09-17): NO deco circles;
          icon row `flex items-center gap-3 mb-3` (tile beside title, centered)
          and a SEPARATE card-level buttons row `flex flex-wrap gap-3 mt-6`
          wrapped in real anchors like the reference. */}
      <section className="rounded-2xl border border-white/60 bg-gradient-to-br from-white via-white to-blue-50/30 p-6 shadow-xs md:p-8">
        <div className="relative z-10">
          <div className="mb-3 flex items-center gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg"
              aria-hidden="true"
            >
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold leading-tight text-[#323338] md:text-3xl">
                {greeting()}, {firstName}!
              </h1>
              <p className="mt-1 text-base text-[#676879]">
                Ready to make today productive?
                {stats && stats.pendingTasks > 0
                  ? ` You have ${stats.pendingTasks} task${stats.pendingTasks === 1 ? "" : "s"} waiting.`
                  : ""}
              </p>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/Boards">
              <Button
                className="h-10 rounded-xl bg-[#0073EA] px-5 py-2 font-medium shadow-lg transition-all duration-200 hover:bg-[#0056B3] hover:shadow-xl"
              >
                <Folder className="mr-2 h-4 w-4" aria-hidden="true" /> View All Boards
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Button>
            </Link>
            <Link href="/Analytics">
              <Button
                variant="outline"
                className="h-10 rounded-xl border-2 border-[#E1E5F3] bg-background px-5 py-2 font-medium shadow-xs transition-all duration-200 hover:border-[#0073EA] hover:bg-[#0073EA]/5"
              >
                <ChartColumn className="mr-2 h-4 w-4" aria-hidden="true" /> View Analytics
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats — the reference's gradient KPI cards. */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Key metrics">
        {STAT_CARDS.map((card) => {
          const Icon = card.icon;
          const value = stats
            ? card.key === "completionRate"
              ? `${stats.completionRate}${card.suffix}`
              : String(stats[card.key as "totalBoards" | "completedTasks" | "pendingTasks"])
            : null;
          return (
            <div key={card.key} className="group perspective-1000">
              <button
                type="button"
                onClick={() => navigate(card.target)}
                className={`relative w-full cursor-pointer transform-gpu overflow-hidden rounded-xl border-0 bg-gradient-to-br text-left shadow-lg transition-all duration-500 hover:shadow-2xl ${card.gradient}`}
              >
                <div className="relative p-4">
                  {/* Deco discs */}
                  <div
                    aria-hidden="true"
                    className="absolute right-0 top-0 h-16 w-16 translate-x-4 -translate-y-4 rounded-full bg-white/10 transition-transform duration-500 group-hover:scale-150"
                  />
                  <div
                    aria-hidden="true"
                    className="absolute bottom-0 left-0 h-12 w-12 -translate-x-2 translate-y-2 rounded-full bg-white/5 transition-transform duration-500 group-hover:scale-150"
                  />
                  {/* Hover particles */}
                  <div aria-hidden="true" className="absolute inset-0 opacity-0 group-hover:opacity-100">
                    {STAT_PARTICLES.map((pos) => (
                      <span
                        key={`${pos.left}-${pos.top}`}
                        className="absolute h-1 w-1 rounded-full bg-white/40"
                        style={pos}
                      />
                    ))}
                  </div>
                  <div className="relative z-10">
                    <div className="mb-3 flex items-center justify-between">
                      <span
                        className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/20 bg-white/20 shadow-lg backdrop-blur-xs transition-all duration-300 group-hover:bg-white/30"
                        aria-hidden="true"
                      >
                        <Icon className="h-5 w-5 text-white" />
                      </span>
                      <span
                        aria-hidden="true"
                        className="h-6 w-6 rounded-full bg-white/10 transition-colors duration-300 group-hover:bg-white/20"
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-white/80 transition-colors duration-300 group-hover:text-white">
                        {card.label}
                      </p>
                      <p className="text-2xl font-bold text-white">{value ?? "—"}</p>
                    </div>
                  </div>
                </div>
                {/* Shine sweep + hover ring */}
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100"
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-0 rounded-xl border-2 border-white/30 opacity-0 group-hover:opacity-100"
                />
              </button>
            </div>
          );
        })}
      </section>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-4">
        {/* Recent boards — gradient card spanning 3 of 4 columns. */}
        <Card className="border-0 bg-gradient-to-br from-white via-white to-indigo-50/30 shadow-lg backdrop-blur-xs xl:col-span-3">
          <CardHeader className="flex flex-col p-6 pb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span
                  className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-lg"
                  aria-hidden="true"
                >
                  <Folder className="h-6 w-6" />
                </span>
                <div>
                  <CardTitle className="text-xl font-bold tracking-tight text-[#323338]">Recent Boards</CardTitle>
                  <CardDescription className="text-sm text-[#676879]">Your latest project boards</CardDescription>
                </div>
              </div>
              {/* Reference: a real /Boards anchor wrapping a shadcn button
                  (h-9 px-4 py-2, hover:bg-[#0073EA]/10) with an ArrowRight
                  w-4 h-4 ml-2 — not a bare underlined text button. */}
              <Link href="/Boards">
                <Button
                  type="button"
                  variant="ghost"
                  className="h-9 rounded-xl px-4 py-2 font-medium text-[#0073EA] hover:bg-[#0073EA]/10"
                >
                  View All
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {!data ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : data.recentBoards.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-center">
                <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
                  <Folder className="h-7 w-7" />
                </span>
                <p className="font-semibold">No boards yet</p>
                <p className="mb-5 mt-1 text-sm text-muted-foreground">
                  Create your first board to get started
                </p>
                <Button onClick={onCreateBoard}>
                  <Plus className="mr-1 h-4 w-4" aria-hidden="true" /> Create Board
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {data.recentBoards.map((board) => {
                  return (
                    <div key={board.id} className="group">
                      {/* Reference: a real /Board?id= anchor (not a button) with a
                          transparent border that tints blue on hover. */}
                      <Link
                        href={`/Board?id=${board.id}`}
                        className="flex items-center gap-4 rounded-xl border border-transparent p-4 transition-all duration-200 hover:border-blue-100 hover:bg-gradient-to-r hover:from-blue-50/80 hover:to-purple-50/80 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {/* Reference card: full-color folder tile + title + "Updated …" + visibility badge. */}
                        <span
                          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl shadow-lg transition-transform duration-200 group-hover:scale-110"
                          style={{ backgroundColor: board.color }}
                          aria-hidden="true"
                        >
                          <Folder className="h-6 w-6 text-white" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="truncate font-semibold text-[#323338] transition-colors group-hover:text-[#0073EA]">
                              {board.title}
                            </span>
                          </span>
                          <span className="mt-1 block truncate text-sm text-[#676879]">
                            Updated {formatUpdatedDate(board.updatedAt)}
                          </span>
                        </span>
                        {/* Reference: the visibility badge sits in the right
                            zone with the chevron; a shadcn Badge with GRADIENT
                            fills (orange→red private, green→emerald shared). */}
                        <span className="flex shrink-0 items-center gap-3">
                          <span
                            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold shadow-xs transition-colors hover:bg-secondary/80 ${
                              board.visibility === "private"
                                ? "bg-gradient-to-r from-orange-100 to-red-100 text-orange-700"
                                : "bg-gradient-to-r from-green-100 to-emerald-100 text-green-700"
                            }`}
                          >
                            {board.visibility === "private" ? (
                              <Lock className="mr-1 h-3 w-3" aria-hidden="true" />
                            ) : (
                              <Globe className="mr-1 h-3 w-3" aria-hidden="true" />
                            )}
                            {visibilityLabel(board.visibility, true)}
                          </span>
                          <ArrowRight
                            className="h-4 w-4 text-gray-400 transition-colors group-hover:text-[#0073EA]"
                            aria-hidden="true"
                          />
                        </span>
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sidebar: quick actions + recent activity */}
        <div className="space-y-8">
          <Card className="border-0 bg-gradient-to-br from-white via-white to-purple-50/30 shadow-lg backdrop-blur-xs">
            <CardHeader className="flex flex-row items-center gap-3 pb-4">
              <span
                className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg"
                aria-hidden="true"
              >
                <Zap className="h-6 w-6" />
              </span>
              <div>
                <CardTitle className="text-lg font-bold tracking-tight text-[#323338]">Quick Actions</CardTitle>
                <CardDescription className="text-sm text-[#676879]">Get things done faster</CardDescription>
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
                    className={`flex w-full cursor-pointer items-center gap-4 rounded-xl bg-gradient-to-r p-4 text-left text-white shadow-md transition-all duration-200 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${action.gradient}`}
                  >
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/20 bg-white/20 backdrop-blur-xs"
                      aria-hidden="true"
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="flex-1">
                      <span className="block font-medium text-white">{action.label}</span>
                      <span className="block text-sm text-white/80">{action.hint}</span>
                    </span>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-white via-white to-green-50/30 shadow-lg backdrop-blur-xs">
            <CardHeader className="flex flex-row items-center gap-3 pb-4">
              <span
                className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-teal-500 text-white shadow-lg"
                aria-hidden="true"
              >
                <Activity className="h-6 w-6" />
              </span>
              <div>
                <CardTitle className="text-lg font-bold tracking-tight text-[#323338]">Recent Activity</CardTitle>
                <CardDescription className="text-sm text-[#676879]">Latest updates</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {!data ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : data.recentTasks.length === 0 ? (
                <div className="flex flex-col items-center py-6 text-center text-muted-foreground">
                  <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
                    <Activity className="h-6 w-6" />
                  </span>
                  <p className="text-sm">No recent activity</p>
                  <p className="text-xs">Tasks you update will show up here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {data.recentTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex cursor-pointer items-center gap-3 rounded-lg p-3 transition-all duration-200 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-green-50/50"
                    >
                      <span
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-gray-500 to-slate-500 text-white shadow-lg"
                        aria-hidden="true"
                      >
                        <Clock className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-[#323338]">{task.title}</span>
                        <span className="block text-xs text-[#676879]">
                          {formatRecentTaskTime(new Date(task.updatedAt))}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      </div>
    </div>
  );
}
