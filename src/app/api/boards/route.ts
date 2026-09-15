import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { BOARD_COLORS } from "@/lib/domain";
import type { BoardSummaryDTO } from "@/lib/domain";

const VALID_COLORS = BOARD_COLORS.map((c) => c.value as string);

const createBoardSchema = z.object({
  title: z.string().trim().min(1, "Board title is required").max(120),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  color: z.string().refine((c) => VALID_COLORS.includes(c), "Unknown board color").default(BOARD_COLORS[0].value),
  visibility: z.enum(["private", "public"]).default("private"),
});

/** GET /api/boards — all boards owned by the signed-in user, newest first. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  const boards = await db.board.findMany({
    where: { ownerId: user.id },
    orderBy: { updatedAt: "desc" },
    include: { groups: { select: { id: true } } },
  });

  // One aggregate query per board is fine at this scale, but a single grouped
  // query keeps the boards grid at O(1) round trips as boards grow.
  const groupIds = boards.flatMap((b) => b.groups.map((g) => g.id));
  const statusRows = await db.task.groupBy({
    by: ["groupId", "status"],
    where: { groupId: { in: groupIds } },
    _count: { _all: true },
  });

  const doneByBoard = new Map<string, { total: number; done: number }>();
  const groupToBoard = new Map<string, string>();
  for (const board of boards) {
    for (const g of board.groups) groupToBoard.set(g.id, board.id);
    doneByBoard.set(board.id, { total: 0, done: 0 });
  }
  for (const row of statusRows) {
    const boardId = groupToBoard.get(row.groupId);
    if (!boardId) continue;
    const agg = doneByBoard.get(boardId);
    if (!agg) continue;
    agg.total += row._count._all;
    if (row.status === "done") agg.done += row._count._all;
  }

  const data: BoardSummaryDTO[] = boards.map((b) => {
    const agg = doneByBoard.get(b.id) ?? { total: 0, done: 0 };
    return {
      id: b.id,
      title: b.title,
      description: b.description,
      color: b.color,
      visibility: b.visibility,
      isFavorite: b.isFavorite,
      createdAt: b.createdAt.toISOString(),
      updatedAt: b.updatedAt.toISOString(),
      taskCount: agg.total,
      doneCount: agg.done,
    };
  });

  return NextResponse.json({ ok: true, data });
}

/** POST /api/boards — create a board with its default "New Group". */
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

  const parsed = createBoardSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json({ ok: false, error: first?.message ?? "Invalid input" }, { status: 400 });
  }

  const board = await db.board.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description || null,
      color: parsed.data.color,
      visibility: parsed.data.visibility,
      ownerId: user.id,
      groups: {
        create: { name: "New Group", position: 0 },
      },
    },
    include: { groups: true },
  });

  await db.activity.create({
    data: {
      userId: user.id,
      type: "board_created",
      message: `created board "${board.title}"`,
      boardId: board.id,
    },
  });

  return NextResponse.json({ ok: true, data: { id: board.id } }, { status: 201 });
}
