import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { BOARD_COLORS } from "@/lib/domain";
import type { BoardDetailDTO, TaskDTO } from "@/lib/domain";

const VALID_COLORS = BOARD_COLORS.map((c) => c.value as string);

const updateBoardSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  color: z.string().refine((c) => VALID_COLORS.includes(c), "Unknown board color").optional(),
  // Closed vocabulary — the edit-board dialog's Private/Public combobox.
  visibility: z.enum(["private", "public"]).optional(),
  isFavorite: z.boolean().optional(),
});

function toTaskDTO(
  t: {
    id: string;
    title: string;
    status: string;
    priority: string;
    groupId: string;
    boardId: string;
    dueDate: Date | null;
    completed: boolean;
    position: number;
    createdAt: Date;
    updatedAt: Date;
    owner: { id: string; email: string; name: string; avatarColor: string; role: string; online: boolean } | null;
  },
): TaskDTO {
  return {
    id: t.id,
    title: t.title,
    // Narrow the stored strings to the union types the client switches on.
    status: (t.status as TaskDTO["status"]) ?? "not_started",
    priority: (t.priority as TaskDTO["priority"]) ?? "low",
    groupId: t.groupId,
    boardId: t.boardId,
    dueDate: t.dueDate ? t.dueDate.toISOString() : null,
    completed: t.completed,
    position: t.position,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    owner: t.owner
      ? { id: t.owner.id, email: t.owner.email, name: t.owner.name, avatarColor: t.owner.avatarColor, role: t.owner.role, online: t.owner.online }
      : null,
  };
}

/** GET /api/boards/[id] — full board with groups, tasks, and assignable members. */
export async function GET(_request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }
  const { id } = await ctx.params;

  const board = await db.board.findFirst({
    where: { id, ownerId: user.id },
    include: {
      groups: {
        orderBy: { position: "asc" },
        include: {
          tasks: {
            orderBy: { position: "asc" },
            include: { owner: { select: { id: true, email: true, name: true, avatarColor: true, role: true, online: true } } },
          },
        },
      },
    },
  });
  if (!board) {
    return NextResponse.json({ ok: false, error: "Board not found" }, { status: 404 });
  }

  // The owner-cell picker lists every user — the reference app lets any member
  // be assigned. Members = all users, deduplicated by id.
  const members = await db.user.findMany({
    select: { id: true, email: true, name: true, avatarColor: true, role: true, online: true },
    orderBy: { name: "asc" },
  });

  const data: BoardDetailDTO = {
    id: board.id,
    title: board.title,
    description: board.description,
    color: board.color,
    visibility: board.visibility,
    isFavorite: board.isFavorite,
    createdAt: board.createdAt.toISOString(),
    updatedAt: board.updatedAt.toISOString(),
    groups: board.groups.map((g) => ({
      id: g.id,
      name: g.name,
      collapsed: g.collapsed,
      position: g.position,
      color: g.color,
      tasks: g.tasks.map(toTaskDTO),
    })),
    members,
  };

  return NextResponse.json({ ok: true, data });
}

/** PATCH /api/boards/[id] — rename, recolor, edit description, toggle favorite. */
export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }
  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body" }, { status: 400 });
  }

  const parsed = updateBoardSchema.safeParse(body);
  if (!parsed.success || Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ ok: false, error: "No valid fields to update" }, { status: 400 });
  }

  const board = await db.board.findFirst({ where: { id, ownerId: user.id } });
  if (!board) {
    return NextResponse.json({ ok: false, error: "Board not found" }, { status: 404 });
  }

  await db.board.update({ where: { id }, data: parsed.data });
  return NextResponse.json({ ok: true, data: null });
}

/** DELETE /api/boards/[id] — cascades to groups and tasks via the schema. */
export async function DELETE(_request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }
  const { id } = await ctx.params;

  const board = await db.board.findFirst({ where: { id, ownerId: user.id } });
  if (!board) {
    return NextResponse.json({ ok: false, error: "Board not found" }, { status: 404 });
  }

  await db.board.delete({ where: { id } });
  await db.activity.create({
    data: {
      userId: user.id,
      type: "board_deleted",
      message: `deleted board "${board.title}"`,
    },
  });
  return NextResponse.json({ ok: true, data: null });
}
