"use client";

import type { ActionResult } from "@/lib/domain";

/**
 * Thin typed fetch layer for the app's JSON API.
 * Every handler returns the ActionResult envelope — errors surface as
 * { ok: false, error } and never throw, so callers can render them inline.
 */
export async function api<T>(
  path: string,
  init?: { method?: string; body?: unknown },
): Promise<ActionResult<T>> {
  try {
    const response = await fetch(path, {
      method: init?.method ?? "GET",
      headers: init?.body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
      credentials: "same-origin",
    });

    const json = (await response.json().catch(() => null)) as ActionResult<T> | null;
    if (!json) {
      return { ok: false, error: `Request failed (${response.status})` };
    }
    return json;
  } catch (error) {
    console.error("api request failed:", path, error);
    return { ok: false, error: "Network error — check your connection and try again" };
  }
}
