import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

const createTaskSchema = z.object({
  title: z.string().trim().min(1, "Task title is required").max(200),
  groupId: z.string().min(1),
});

/** POST /api/tasks — create a task in a group of a board the user owns. */
export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body" }, { status: 400 });
  }
  const parsed = createTaskSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json({ ok: false, error: first?.message ?? "Invalid input" }, { status: 400 });
  }

  const group = await db.group.findFirst({
    where: { id: parsed.data.groupId, board: { ownerId: user.id } },
  });
  if (!group) {
    return NextResponse.json({ ok: false, error: "Group not found" }, { status: 404 });
  }

  const lastTask = await db.task.findFirst({
    where: { groupId: group.id },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  const task = await db.task.create({
    data: {
      title: parsed.data.title,
      groupId: group.id,
      boardId: group.boardId,
      position: (lastTask?.position ?? -1) + 1,
    },
  });

  const board = await db.board.findUnique({ where: { id: group.boardId }, select: { title: true } });

  await db.activity.create({
    data: {
      userId: user.id,
      type: "task_created",
      message: `added task "${task.title}"${board ? ` to "${board.title}"` : ""}`,
      boardId: group.boardId,
    },
  });

  return NextResponse.json({ ok: true, data: { id: task.id } }, { status: 201 });
}

export const dynamic = "force-dynamic";
