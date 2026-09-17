import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { TASK_PRIORITIES, TASK_STATUSES, resolveStatusCompletedPatch } from "@/lib/domain";
import type { TaskPriority, TaskStatus } from "@/lib/domain";

// Literal-typed enums keep the Zod output narrowed to the closed vocabulary.
const STATUS_VALUES = TASK_STATUSES.map((s) => s.value) as [TaskStatus, ...TaskStatus[]];
const PRIORITY_VALUES = TASK_PRIORITIES.map((p) => p.value) as [TaskPriority, ...TaskPriority[]];

const updateTaskSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  status: z.enum(STATUS_VALUES).optional(),
  priority: z.enum(PRIORITY_VALUES).optional(),
  ownerId: z.string().nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  completed: z.boolean().optional(),
  /** Drag-reorder: target group and insertion index within that group. */
  groupId: z.string().optional(),
  index: z.number().int().min(0).optional(),
});

/**
 * PATCH /api/tasks/[id] — update any editable task field.
 *
 * Status/checkbox coupling mirrors the reference app: marking a row done
 * (either via checkbox or the status pill) writes both `completed` and the
 * `done` status so the table checkbox, kanban, and analytics always agree.
 */
export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }
  const { id } = await ctx.params;

  const task = await db.task.findFirst({ where: { id, board: { ownerId: user.id } } });
  if (!task) {
    return NextResponse.json({ ok: false, error: "Task not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body" }, { status: 400 });
  }
  const parsed = updateTaskSchema.safeParse(body);
  if (!parsed.success || Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ ok: false, error: "No valid fields to update" }, { status: 400 });
  }

  const patch: Record<string, unknown> = { ...parsed.data };
  // Reorder directives are handled below, not spread into the update.
  delete patch.groupId;
  delete patch.index;
  if (parsed.data.ownerId !== undefined) {
    // Assignment accepts any seeded user; clear by sending null.
    if (parsed.data.ownerId !== null) {
      const owner = await db.user.findUnique({ where: { id: parsed.data.ownerId } });
      if (!owner) {
        return NextResponse.json({ ok: false, error: "Owner not found" }, { status: 404 });
      }
    }
  }
  if (parsed.data.dueDate !== undefined) {
    patch.dueDate = parsed.data.dueDate ? new Date(parsed.data.dueDate) : null;
  }
  // The status <-> completed coupling lives in domain.ts so the client mirror
  // and this handler can never drift apart.
  Object.assign(patch, resolveStatusCompletedPatch(parsed.data));

  // Drag-reorder: place the task at `index` inside `groupId` (stays in its
  // group when only `index` is sent) and renumber siblings 0..n so the
  // position column never accumulates collisions.
  const reorderRequested = parsed.data.groupId !== undefined || parsed.data.index !== undefined;
  if (reorderRequested) {
    const targetGroupId = parsed.data.groupId ?? task.groupId;
    const targetGroup = await db.group.findFirst({
      where: { id: targetGroupId, boardId: task.boardId },
    });
    if (!targetGroup) {
      return NextResponse.json({ ok: false, error: "Group not found" }, { status: 404 });
    }
    const siblings = await db.task.findMany({
      where: { groupId: targetGroupId, id: { not: task.id } },
      orderBy: { position: "asc" },
      select: { id: true },
    });
    const index = Math.min(parsed.data.index ?? siblings.length, siblings.length);
    const ordered = [...siblings.slice(0, index), { id }, ...siblings.slice(index)];
    await db.$transaction(
      ordered.map((t, i) =>
        db.task.update({ where: { id: t.id }, data: { position: i, groupId: targetGroupId } }),
      ),
    );
    // A cross-group move leaves a gap in the old group — close it.
    if (targetGroupId !== task.groupId) {
      const remainders = await db.task.findMany({
        where: { groupId: task.groupId },
        orderBy: { position: "asc" },
        select: { id: true },
      });
      await db.$transaction(
        remainders.map((t, i) => db.task.update({ where: { id: t.id }, data: { position: i } })),
      );
    }
  }

  if (Object.keys(patch).length > 0) {
    await db.task.update({ where: { id }, data: patch });
  } else if (!reorderRequested) {
    return NextResponse.json({ ok: false, error: "No valid fields to update" }, { status: 400 });
  }

  if (parsed.data.status === "done" && task.status !== "done") {
    const board = await db.board.findUnique({ where: { id: task.boardId }, select: { title: true } });
    await db.activity.create({
      data: {
        userId: user.id,
        type: "task_completed",
        message: `completed task "${task.title}"${board ? ` in "${board.title}"` : ""}`,
        boardId: task.boardId,
      },
    });
  }

  return NextResponse.json({ ok: true, data: null });
}

/** DELETE /api/tasks/[id] */
export async function DELETE(_request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }
  const { id } = await ctx.params;

  const task = await db.task.findFirst({ where: { id, board: { ownerId: user.id } } });
  if (!task) {
    return NextResponse.json({ ok: false, error: "Task not found" }, { status: 404 });
  }

  await db.task.delete({ where: { id } });
  return NextResponse.json({ ok: true, data: null });
}
