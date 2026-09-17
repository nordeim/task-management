"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { LoginView } from "@/components/app/login-view";

/**
 * `/login` — renders bare (outside the app shell, matching the reference,
 * which shows the login form here even with a live session). After sign-in
 * the user returns to ?from_url=<original> or "/": the (app) group's shell
 * boots fresh and picks up the new session cookie.
 */
export function LoginRoute() {
  const router = useRouter();
  const params = useSearchParams();

  const raw = params.get("from_url") ?? "/";
  // Open-redirect guard: only same-origin app paths are honored.
  const target = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";

  return <LoginView onAuth={() => router.push(target)} />;
}
