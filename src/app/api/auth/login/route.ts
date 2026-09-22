import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, verifyPassword } from "@/lib/auth";
import { clientIp, loginLimiter } from "@/lib/rate-limit";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
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

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Email and password are required" }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const key = `login:${clientIp(request.headers)}:${email}`;
  // Gate before the scrypt work — a blocked key costs one map lookup.
  const gate = loginLimiter.check(key);
  if (!gate.allowed) {
    return tooManyAttempts(gate.retryAfterSec);
  }

  const user = await db.user.findUnique({ where: { email } });
  if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
    // Uniform message — never reveal whether the email exists. Only FAILED
    // attempts consume budget; successes reset, so transient typos never
    // lock a legitimate user out (see src/lib/rate-limit.ts).
    loginLimiter.recordFailure(key);
    return NextResponse.json({ ok: false, error: "Invalid email or password" }, { status: 401 });
  }

  loginLimiter.reset(key);
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
