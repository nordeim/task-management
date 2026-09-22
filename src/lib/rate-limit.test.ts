import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createRateLimiter } from "./rate-limit";

/**
 * Contract suite for the in-memory auth rate limiter (session 23 — the PAD
 * §10 open Medium item). The limiter guards POST /api/auth/login and
 * POST /api/auth/signup; these tests pin the window semantics that the
 * route handlers rely on:
 *
 *  - failures only count via recordFailure (successes never consume budget)
 *  - a fixed window measured from the FIRST failure
 *  - check() gates without counting; 429s carry retryAfterSec
 *  - reset() clears a key (successful login un-blocks a transient user)
 *  - expired entries prune; the map caps at maxKeys
 */
describe("createRateLimiter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows requests while failures stay under max", () => {
    const limiter = createRateLimiter({ windowMs: 15 * 60_000, max: 5 });
    for (let i = 0; i < 4; i++) {
      limiter.recordFailure("k");
    }
    expect(limiter.check("k")).toEqual({
      allowed: true,
      remaining: 1,
      retryAfterSec: 0,
    });
  });

  it("blocks the key once failures reach max, with retryAfterSec", () => {
    const limiter = createRateLimiter({ windowMs: 15 * 60_000, max: 5 });
    for (let i = 0; i < 5; i++) {
      limiter.recordFailure("k");
    }
    const result = limiter.check("k");
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfterSec).toBe(15 * 60);
  });

  it("check() never counts — only recordFailure does", () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 2 });
    for (let i = 0; i < 50; i++) {
      expect(limiter.check("k").allowed).toBe(true);
    }
    expect(limiter.check("k").remaining).toBe(2);
  });

  it("counts per key — other keys are unaffected", () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 2 });
    limiter.recordFailure("a");
    limiter.recordFailure("a");
    expect(limiter.check("a").allowed).toBe(false);
    expect(limiter.check("b")).toEqual({
      allowed: true,
      remaining: 2,
      retryAfterSec: 0,
    });
  });

  it("the window expires and counting restarts", () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 2 });
    limiter.recordFailure("k");
    limiter.recordFailure("k");
    expect(limiter.check("k").allowed).toBe(false);

    vi.advanceTimersByTime(60_001);
    expect(limiter.check("k")).toEqual({
      allowed: true,
      remaining: 2,
      retryAfterSec: 0,
    });
  });

  it("the window is fixed from the FIRST failure — later failures do not extend it", () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 3 });
    limiter.recordFailure("k");
    vi.advanceTimersByTime(50_000);
    limiter.recordFailure("k");
    // Window still ends at t=60s from the first failure, not t=110s.
    vi.advanceTimersByTime(10_001);
    expect(limiter.check("k").remaining).toBe(3);
  });

  it("retryAfterSec reports the seconds until the window ends", () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 1 });
    limiter.recordFailure("k");
    vi.advanceTimersByTime(15_000);
    expect(limiter.check("k").retryAfterSec).toBe(45);
  });

  it("reset() clears a blocked key (successful login path)", () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 1 });
    limiter.recordFailure("k");
    expect(limiter.check("k").allowed).toBe(false);
    limiter.reset("k");
    expect(limiter.check("k")).toEqual({
      allowed: true,
      remaining: 1,
      retryAfterSec: 0,
    });
  });

  it("reset() on an unknown key is a no-op", () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 1 });
    expect(() => limiter.reset("nope")).not.toThrow();
  });

  it("prunes expired entries so the map does not retain stale keys", () => {
    const limiter = createRateLimiter({ windowMs: 1_000, max: 1 });
    limiter.recordFailure("old");
    vi.advanceTimersByTime(1_001);
    limiter.recordFailure("new");
    expect(limiter.size()).toBe(1); // "old" pruned, only "new" retained
  });

  it("caps the map at maxKeys by evicting when the cap is exceeded", () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 1, maxKeys: 3 });
    limiter.recordFailure("a");
    limiter.recordFailure("b");
    limiter.recordFailure("c");
    limiter.recordFailure("d");
    expect(limiter.size()).toBeLessThanOrEqual(3);
    // The surviving keys must all still be functional.
    const survivors = ["a", "b", "c", "d"].filter((k) => limiter.check(k).remaining === 0);
    expect(survivors.length).toBeGreaterThanOrEqual(1);
  });

  it("recordFailure after expiry starts a fresh window at 1 failure", () => {
    const limiter = createRateLimiter({ windowMs: 1_000, max: 2 });
    limiter.recordFailure("k");
    vi.advanceTimersByTime(1_001);
    limiter.recordFailure("k");
    expect(limiter.check("k").remaining).toBe(1);
  });
});
