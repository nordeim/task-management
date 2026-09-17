import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

/** GET /api/users — assignable people (owner column picker, avatars). */
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  const users = await db.user.findMany({
    select: { id: true, email: true, name: true, avatarColor: true, role: true, online: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ ok: true, data: users });
}

export const dynamic = "force-dynamic";
