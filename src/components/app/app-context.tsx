"use client";

import { createContext, useCallback, useContext, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import type { UserDTO } from "@/lib/domain";
import { ROUTE_PATHS } from "@/lib/domain";

export type ViewName = keyof typeof ROUTE_PATHS;

interface ViewState {
  name: ViewName;
  boardId: string | null;
}

interface AppContextValue {
  user: UserDTO;
  view: ViewState;
  navigate: (name: ViewName, boardId?: string) => void;
  signOut: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

/**
 * Route-aware app context. The reference serves real URLs (`/`, `/Boards`,
 * `/Board?id=`, `/Analytics`) — navigate() pushes those paths and the active
 * view is DERIVED from the pathname, so browser back/forward and deep links
 * always land on the right screen.
 */
export function AppProvider({
  user,
  onSignOut,
  children,
}: {
  user: UserDTO;
  onSignOut: () => void;
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  // Rewrites keep the typed URL (e.g. "/boards"), so compare lowercased.
  const view = useMemo<ViewState>(() => {
    const p = (pathname ?? "/").toLowerCase();
    if (p.startsWith("/boards")) return { name: "boards", boardId: null };
    if (p.startsWith("/board")) return { name: "board", boardId: null };
    if (p.startsWith("/analytics")) return { name: "analytics", boardId: null };
    return { name: "dashboard", boardId: null };
  }, [pathname]);

  const navigate = useCallback(
    (name: ViewName, boardId?: string) => {
      const base = ROUTE_PATHS[name];
      router.push(name === "board" && boardId ? `${base}?id=${boardId}` : base);
    },
    [router],
  );

  const signOut = useCallback(() => {
    onSignOut();
  }, [onSignOut]);

  const value = useMemo(
    () => ({ user, view, navigate, signOut }),
    [user, view, navigate, signOut],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside <AppProvider>");
  return ctx;
}
