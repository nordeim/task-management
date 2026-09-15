import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

const updateGroupSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  collapsed: z.boolean().optional(),
});

async function authorize(groupId: string, userId: string) {
  // A group is editable only through a board the user owns.
  const group = await db.group.findFirst({
    where: { id: groupId, board: { ownerId: userId } },
  });
  return group;
}

/** PATCH /api/groups/[id] — rename or collapse/expand a group. */
export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }
  const { id } = await ctx.params;

  const group = await authorize(id, user.id);
  if (!group) {
    return NextResponse.json({ ok: false, error: "Group not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body" }, { status: 400 });
  }
  const parsed = updateGroupSchema.safeParse(body);
  if (!parsed.success || Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ ok: false, error: "No valid fields to update" }, { status: 400 });
  }

  await db.group.update({ where: { id }, data: parsed.data });
  return NextResponse.json({ ok: true, data: null });
}

/** DELETE /api/groups/[id] — deletes the group and its tasks (cascade). */
export async function DELETE(_request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }
  const { id } = await ctx.params;

  const group = await authorize(id, user.id);
  if (!group) {
    return NextResponse.json({ ok: false, error: "Group not found" }, { status: 404 });
  }

  await db.group.delete({ where: { id } });
  return NextResponse.json({ ok: true, data: null });
}
