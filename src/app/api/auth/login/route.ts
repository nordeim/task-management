import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, verifyPassword } from "@/lib/auth";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body" }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Email and password are required" }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const user = await db.user.findUnique({ where: { email } });
  if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
    // Uniform message — never reveal whether the email exists.
    return NextResponse.json({ ok: false, error: "Invalid email or password" }, { status: 401 });
  }

  await createSession(user.id);
  return NextResponse.json({
    ok: true,
    data: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarColor: user.avatarColor,
    },
  });
}
