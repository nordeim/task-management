"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { AppHeader } from "@/components/app/app-header";
import { AppProvider } from "@/components/app/app-context";
import { api } from "@/lib/api-client";
import type { UserDTO } from "@/lib/domain";

/**
 * Auth context — the shell boots the session once (in the root layout) and
 * shares the user with the /login route, mirroring the reference where a
 * logged-out visit to any protected URL redirects to /login?from_url=<path>
 * and returns after sign-in.
 */
interface AuthContextValue {
  user: UserDTO | null;
  setUser: (user: UserDTO | null) => void;
  booting: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AppShell>");
  return ctx;
}

function BootSplash() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <span
          className="flex h-12 w-12 animate-pulse items-center justify-center rounded-xl text-xl font-bold text-white"
          style={{ backgroundColor: "#0073ea" }}
        >
          T
        </span>
        <p className="text-sm text-muted-foreground">Loading Tuesday.com…</p>
      </div>
    </main>
  );
}

/**
 * App shell for the (app) route group: boots /api/auth/me, redirects
 * logged-out users to /login?from_url=<path>, and wraps authed pages in
 * the header + AppProvider. /login and the styled 404 render bare (outside
 * this shell), exactly like the reference.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserDTO | null>(null);
  const [booting, setBooting] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    void api<UserDTO>("/api/auth/me").then((result) => {
      if (cancelled) return;
      if (result.ok) setUser(result.data);
      setBooting(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Logged-out on a protected route → /login?from_url=<original URL>.
  useEffect(() => {
    if (booting || user) return;
    const current = `${pathname ?? "/"}${window.location.search || ""}`;
    router.replace(`/login?from_url=${encodeURIComponent(current)}`);
  }, [booting, user, pathname, router]);

  const handleSignOut = useCallback(async () => {
    await api<null>("/api/auth/logout", { method: "POST" });
    setUser(null);
  }, []);

  const authValue = useMemo(
    () => ({ user, setUser, booting }),
    [user, booting],
  );

  if (booting || !user) {
    return (
      <AuthContext.Provider value={authValue}>
        <BootSplash />
      </AuthContext.Provider>
    );
  }

  return (
    <AuthContext.Provider value={authValue}>
      <AppProvider user={user} onSignOut={() => void handleSignOut()}>
        {/* Reference app shell (probed 2026-09-17): a flex column whose MAIN
            is the scroll container (flex-1 overflow-y-auto overflow-x-hidden)
            with the nav outside it — so the nav never scrolls and every
            page-level sticky offset is measured from the top of main. */}
        <div className="flex min-h-screen flex-col bg-[#F5F6F8]">
          <AppHeader />
          <main className="flex-1 overflow-x-hidden overflow-y-auto">{children}</main>
          {/* The reference has no app footer (verified: document.querySelectorAll
              ('footer').length === 0) — nothing renders below the main region. */}
        </div>
      </AppProvider>
    </AuthContext.Provider>
  );
}
