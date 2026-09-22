/**
 * In-memory rate limiter for the unauthenticated auth endpoints
 * (session 23 — the PAD §10 open Medium item, closed).
 *
 * Why in-memory: the PAD documents a single Next.js process; the Session
 * table remains the durable auth state, so a restart merely clears failure
 * counters (acceptable — an attacker re-earning 5 failures costs nothing to
 * defend). Why failures-only on login: successful sign-ins never consume
 * budget and reset the key, so a legitimate user with transient typos is
 * never locked out while a brute-force run is throttled to `max` attempts
 * per window per email+IP (the PAD §10 wording).
 *
 * Window semantics: fixed window measured from the FIRST failure — later
 * failures inside the window do not extend it, so a blocked key always has
 * a predictable, monotonic retryAfterSec. Expired entries are pruned on
 * every check; the map caps at `maxKeys` so a key-rotating attacker cannot
 * grow memory unbounded (surviving entries stay functional).
 */

export interface RateLimitOptions {
  /** Window length in ms, measured from the first recorded failure. */
  windowMs: number;
  /** Failures allowed inside a window before the key is blocked. */
  max: number;
  /** Map cap — evictions keep memory bounded under key-rotation attacks. */
  maxKeys?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  /** Attempts still budgeted inside the current window (>= 0). */
  remaining: number;
  /** Seconds until the window ends; 0 when allowed. */
  retryAfterSec: number;
}

interface WindowState {
  failures: number;
  /** Epoch ms at which the current window ends. */
  resetAt: number;
}

export interface RateLimiter {
  /** Gate a request WITHOUT counting it. */
  check(key: string): RateLimitResult;
  /** Count one failed attempt (opens/extends a window at most to its start). */
  recordFailure(key: string): void;
  /** Clear a key — the successful-login path. */
  reset(key: string): void;
  /** Live entry count (test surface for pruning/cap assertions). */
  size(): number;
}

const DEFAULT_MAX_KEYS = 10_000;

export function createRateLimiter(options: RateLimitOptions): RateLimiter {
  const { windowMs, max } = options;
  const maxKeys = options.maxKeys ?? DEFAULT_MAX_KEYS;
  const entries = new Map<string, WindowState>();

  function isLive(state: WindowState, now: number): boolean {
    return state.resetAt > now;
  }

  function prune(now: number): void {
    for (const [key, state] of entries) {
      if (!isLive(state, now)) entries.delete(key);
    }
  }

  function check(key: string): RateLimitResult {
    const now = Date.now();
    prune(now);
    const state = entries.get(key);
    if (!state || !isLive(state, now)) {
      return { allowed: true, remaining: max, retryAfterSec: 0 };
    }
    if (state.failures < max) {
      return { allowed: true, remaining: max - state.failures, retryAfterSec: 0 };
    }
    return {
      allowed: false,
      remaining: 0,
      retryAfterSec: Math.max(1, Math.ceil((state.resetAt - now) / 1000)),
    };
  }

  function recordFailure(key: string): void {
    const now = Date.now();
    prune(now);
    const state = entries.get(key);
    if (!state || !isLive(state, now)) {
      // Fresh window anchored at this failure — and evict if we are at cap.
      if (entries.size >= maxKeys && !entries.has(key)) {
        const oldest = entries.keys().next().value;
        if (oldest !== undefined) entries.delete(oldest);
      }
      entries.set(key, { failures: 1, resetAt: now + windowMs });
      return;
    }
    state.failures += 1;
  }

  function reset(key: string): void {
    entries.delete(key);
  }

  function size(): number {
    return entries.size;
  }

  return { check, recordFailure, reset, size };
}

/**
 * Login throttling: 5 failed attempts per email+IP per 15 minutes —
 * the PAD §10 contract. Module constants (not env vars) per the repo's
 * "no speculative knobs" rule; changing them is a code review, and the
 * values are pinned by the unit suite + the E2E rate-limit spec.
 */
export const LOGIN_RATE_LIMIT = { windowMs: 15 * 60_000, max: 5 } as const;

/**
 * Signup throttling: 10 attempts per IP per 15 minutes — creation is the
 * guarded action (email-enumeration oracle + account spam + scrypt on the
 * happy path), so every parsed POST counts, not just failures.
 */
export const SIGNUP_RATE_LIMIT = { windowMs: 15 * 60_000, max: 10 } as const;

/** Single-process singletons shared across requests in this server. */
export const loginLimiter = createRateLimiter(LOGIN_RATE_LIMIT);
export const signupLimiter = createRateLimiter(SIGNUP_RATE_LIMIT);

/**
 * Best-effort client IP for rate-limit keys. Behind a proxy the forwarded
 * header wins (first hop); direct connections fall back to "unknown" —
 * keys stay stable per source either way. Documented in
 * docs/DEPLOYMENT.md: the proxy must sanitize x-forwarded-for.
 */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip")?.trim() || "unknown";
}
