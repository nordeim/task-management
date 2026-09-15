"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { UserDTO } from "@/lib/domain";

export type ViewName = "dashboard" | "boards" | "board" | "analytics";

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

export function AppProvider({
  user,
  onSignOut,
  children,
}: {
  user: UserDTO;
  onSignOut: () => void;
  children: ReactNode;
}) {
  const [view, setView] = useState<ViewState>({ name: "dashboard", boardId: null });

  const navigate = useCallback((name: ViewName, boardId?: string) => {
    setView({ name, boardId: boardId ?? null });
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0 });
    }
  }, []);

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
