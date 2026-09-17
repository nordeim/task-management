import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { GROUP_COLOR_OPTIONS } from "@/lib/domain";

const GROUP_COLORS = GROUP_COLOR_OPTIONS.map((c) => c.value) as [string, ...string[]];

const createGroupSchema = z.object({
  name: z.string().trim().min(1, "Group name is required").max(80),
  color: z.enum(GROUP_COLORS).default("#0073ea"),
});

/** POST /api/boards/[id]/groups — append a group to the end of the board. */
export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }
  const { id } = await ctx.params;

  const board = await db.board.findFirst({ where: { id, ownerId: user.id } });
  if (!board) {
    return NextResponse.json({ ok: false, error: "Board not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body" }, { status: 400 });
  }
  const parsed = createGroupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Group name is required" }, { status: 400 });
  }

  const lastGroup = await db.group.findFirst({
    where: { boardId: id },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  const group = await db.group.create({
    data: {
      name: parsed.data.name,
      boardId: id,
      position: (lastGroup?.position ?? -1) + 1,
      color: parsed.data.color,
    },
  });

  await db.activity.create({
    data: {
      userId: user.id,
      type: "group_created",
      message: `added group "${group.name}" to "${board.title}"`,
      boardId: board.id,
    },
  });

  return NextResponse.json({ ok: true, data: { id: group.id } }, { status: 201 });
}
