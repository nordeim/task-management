import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { TASK_STATUSES, TASK_PRIORITIES, distributionEntries } from "@/lib/domain";
import type { AnalyticsDTO, TaskStatus, TaskPriority } from "@/lib/domain";

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
      statusDistribution: [],
      priorityDistribution: [],
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
    // Reference probe (2026-09-18): the analytics page iterates its items in
    // updated_date DESC order and renders Object.entries of the counts
    // object, so distribution rows follow FIRST-ENCOUNTER order over this
    // sequence and zero-count rows never appear.
    orderBy: { updatedAt: "desc" },
    select: { status: true, priority: true, dueDate: true, boardId: true },
  });

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.status === "done").length;
  const overdueTasks = tasks.filter(
    (t) => t.dueDate !== null && t.dueDate < new Date() && t.status !== "done",
  ).length;
  const completionRate = totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100);

  const statusEntries = distributionEntries(tasks, (t) => t.status);
  const priorityEntries = distributionEntries(tasks, (t) => t.priority);

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
    statusDistribution: statusEntries.flatMap((entry) => {
      const meta = TASK_STATUSES.find((s) => s.value === entry.key);
      if (!meta) return [];
      return [{ status: meta.value as TaskStatus, label: meta.label, count: entry.count, color: meta.bg }];
    }),
    priorityDistribution: priorityEntries.flatMap((entry) => {
      const meta = TASK_PRIORITIES.find((p) => p.value === entry.key);
      if (!meta) return [];
      return [{ priority: meta.value as TaskPriority, label: meta.label, count: entry.count, color: meta.color }];
    }),
    boardPerformance: boards.map((b) => {
      const agg = perBoard.get(b.id) ?? { total: 0, done: 0 };
      return {
        boardId: b.id,
        title: b.title,
        color: b.color,
        total: agg.total,
        done: agg.done,
        rate: agg.total === 0 ? 0 : Math.round((agg.done / agg.total) * 100),
      };
    }),
  };

  return NextResponse.json({ ok: true, data });
}

export const dynamic = "force-dynamic";
