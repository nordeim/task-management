import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import type { BoardSummaryDTO, DashboardDTO } from "@/lib/domain";

/** GET /api/dashboard — hero stats, recent boards, and the activity feed. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  const boards = await db.board.findMany({
    where: { ownerId: user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      groups: {
        select: {
          id: true,
          tasks: { select: { status: true } },
        },
      },
    },
  });

  let completedTasks = 0;
  let pendingTasks = 0;
  const summaries: BoardSummaryDTO[] = boards.map((b) => {
    const tasks = b.groups.flatMap((g) => g.tasks);
    const done = tasks.filter((t) => t.status === "done").length;
    completedTasks += done;
    pendingTasks += tasks.length - done;
    return {
      id: b.id,
      title: b.title,
      description: b.description,
      color: b.color,
      visibility: b.visibility,
      isFavorite: b.isFavorite,
      createdAt: b.createdAt.toISOString(),
      updatedAt: b.updatedAt.toISOString(),
      taskCount: tasks.length,
      doneCount: done,
    };
  });

  const totalTasks = completedTasks + pendingTasks;
  const completionRate = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  const activity = await db.activity.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 12,
    include: { user: { select: { id: true, email: true, name: true, avatarColor: true } } },
  });

  const data: DashboardDTO = {
    stats: {
      totalBoards: boards.length,
      completedTasks,
      pendingTasks,
      completionRate,
    },
    recentBoards: summaries.slice(0, 5),
    activity: activity.map((a) => ({
      id: a.id,
      type: a.type,
      message: a.message,
      createdAt: a.createdAt.toISOString(),
      user: a.user,
    })),
  };

  return NextResponse.json({ ok: true, data });
}

export const dynamic = "force-dynamic";
