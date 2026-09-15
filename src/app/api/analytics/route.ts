import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { TASK_PRIORITIES, TASK_STATUSES } from "@/lib/domain";
import type { AnalyticsDTO } from "@/lib/domain";

const ALLOWED_WINDOWS = [7, 30, 90];

/**
 * GET /api/analytics?boardId=<id|all>&days=<7|30|90>
 *
 * The `days` window bounds which tasks count by their updatedAt timestamp —
 * matching the "Last 30 days" combobox on the reference Analytics page.
 */
export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  const boardIdParam = request.nextUrl.searchParams.get("boardId");
  const daysParam = Number(request.nextUrl.searchParams.get("days") ?? 30);
  const days = ALLOWED_WINDOWS.includes(daysParam) ? daysParam : 30;

  const boardFilter = boardIdParam && boardIdParam !== "all" ? { id: boardIdParam } : {};
  const boards = await db.board.findMany({
    where: { ownerId: user.id, ...boardFilter },
    include: { groups: { select: { id: true } } },
  });

  if (boards.length === 0) {
    const empty: AnalyticsDTO = {
      filters: { boardId: boardIdParam ?? null, days },
      stats: { totalTasks: 0, completionRate: 0, overdueTasks: 0, activeBoards: 0 },
      statusDistribution: TASK_STATUSES.map((s) => ({
        status: s.value,
        label: s.label,
        count: 0,
        color: s.bg,
      })),
      priorityDistribution: TASK_PRIORITIES.map((p) => ({
        priority: p.value,
        label: p.label,
        count: 0,
        color: p.color,
      })),
      boardPerformance: [],
    };
    return NextResponse.json({ ok: true, data: empty });
  }

  const boardIds = boards.map((b) => b.id);
  const windowStart = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const tasks = await db.task.findMany({
    where: {
      boardId: { in: boardIds },
      // Tasks edited inside the window; a brand-new task has updatedAt=createdAt.
      updatedAt: { gte: windowStart },
    },
    select: { status: true, priority: true, dueDate: true, boardId: true },
  });

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.status === "done").length;
  const overdueTasks = tasks.filter(
    (t) => t.dueDate !== null && t.dueDate < new Date() && t.status !== "done",
  ).length;
  const completionRate = totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100);

  const statusCounts = new Map<string, number>(TASK_STATUSES.map((s) => [s.value as string, 0]));
  const priorityCounts = new Map<string, number>(TASK_PRIORITIES.map((p) => [p.value as string, 0]));
  for (const t of tasks) {
    statusCounts.set(t.status, (statusCounts.get(t.status) ?? 0) + 1);
    priorityCounts.set(t.priority, (priorityCounts.get(t.priority) ?? 0) + 1);
  }

  // Board performance uses unbounded task counts (a board isn't "inactive"
  // just because its tasks weren't edited inside the analytics window).
  const allTasks = await db.task.findMany({
    where: { boardId: { in: boardIds } },
    select: { status: true, boardId: true },
  });
  const perBoard = new Map<string, { total: number; done: number }>(
    boards.map((b) => [b.id, { total: 0, done: 0 }]),
  );
  for (const t of allTasks) {
    const agg = perBoard.get(t.boardId);
    if (!agg) continue;
    agg.total += 1;
    if (t.status === "done") agg.done += 1;
  }

  const data: AnalyticsDTO = {
    filters: { boardId: boardIdParam ?? null, days },
    stats: { totalTasks, completionRate, overdueTasks, activeBoards: boards.length },
    statusDistribution: TASK_STATUSES.map((s) => ({
      status: s.value,
      label: s.label,
      count: statusCounts.get(s.value as string) ?? 0,
      color: s.bg,
    })),
    priorityDistribution: TASK_PRIORITIES.map((p) => ({
      priority: p.value,
      label: p.label,
      count: priorityCounts.get(p.value as string) ?? 0,
      color: p.color,
    })),
    boardPerformance: boards
      .map((b) => {
        const agg = perBoard.get(b.id) ?? { total: 0, done: 0 };
        return {
          boardId: b.id,
          title: b.title,
          color: b.color,
          total: agg.total,
          done: agg.done,
          rate: agg.total === 0 ? 0 : Math.round((agg.done / agg.total) * 100),
        };
      })
      .sort((a, b) => b.rate - a.rate),
  };

  return NextResponse.json({ ok: true, data });
}

export const dynamic = "force-dynamic";
