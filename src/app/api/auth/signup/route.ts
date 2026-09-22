import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, hashPassword } from "@/lib/auth";
import { clientIp, signupLimiter } from "@/lib/rate-limit";

const AVATAR_COLORS = ["#00d5c0", "#0073ea", "#a25ddb", "#ff642e", "#e2445c", "#fcc203"];

const signupSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

function tooManyAttempts(retryAfterSec: number): NextResponse {
  const minutes = Math.max(1, Math.ceil(retryAfterSec / 60));
  return NextResponse.json(
    {
      ok: false,
      error: `Too many attempts. Please try again in about ${minutes} minute${minutes === 1 ? "" : "s"}.`,
    },
    { status: 429, headers: { "Retry-After": String(retryAfterSec) } },
  );
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body" }, { status: 400 });
  }

  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json({ ok: false, error: first?.message ?? "Invalid input" }, { status: 400 });
  }

  // Every parsed POST counts (not just failures) — the guarded action is
  // account creation itself: enumeration oracle + spam + scrypt on the happy
  // path. See src/lib/rate-limit.ts.
  const key = `signup:${clientIp(request.headers)}`;
  const gate = signupLimiter.check(key);
  if (!gate.allowed) {
    return tooManyAttempts(gate.retryAfterSec);
  }
  signupLimiter.recordFailure(key);

  const email = parsed.data.email.toLowerCase();
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ ok: false, error: "An account with this email already exists" }, { status: 409 });
  }

  const user = await db.user.create({
    data: {
      name: parsed.data.name,
      email,
      passwordHash: hashPassword(parsed.data.password),
      avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
    },
  });

  await createSession(user.id);
  return NextResponse.json({
    ok: true,
    data: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarColor: user.avatarColor,
      role: user.role,
      online: user.online,
    },
  });
}
