"use client";

import { useCallback, useEffect, useState } from "react";
import { AppHeader } from "@/components/app/app-header";
import { AppProvider, useApp } from "@/components/app/app-context";
import { LoginView } from "@/components/app/login-view";
import { DashboardView } from "@/components/app/dashboard-view";
import { BoardsView } from "@/components/app/boards-view";
import { BoardView } from "@/components/app/board-view";
import { AnalyticsView } from "@/components/app/analytics-view";
import { CreateBoardDialog } from "@/components/app/create-board-dialog";
import { api } from "@/lib/api-client";
import type { UserDTO } from "@/lib/domain";

/**
 * Root route: an auth gate in front of the app shell. Everything below the
 * gate lives inside AppProvider, so any view can call navigate()/signOut().
 */
function AuthedShell() {
  const { view, navigate } = useApp();
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader />
      <main className="flex-1">
        {view.name === "dashboard" && <DashboardView onCreateBoard={() => setCreateOpen(true)} />}
        {view.name === "boards" && <BoardsView onCreateBoard={() => setCreateOpen(true)} />}
        {view.name === "board" && view.boardId && <BoardView key={view.boardId} boardId={view.boardId} />}
        {view.name === "analytics" && <AnalyticsView />}
      </main>
      {/* The reference has no app footer (verified: document.querySelectorAll
          ('footer').length === 0) — nothing renders below the main region. */}
      <CreateBoardDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(boardId) => {
          setCreateOpen(false);
          navigate("board", boardId);
        }}
      />
    </div>
  );
}

export default function Home() {
  const [user, setUser] = useState<UserDTO | null>(null);
  const [booting, setBooting] = useState(true);

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

  const handleSignOut = useCallback(async () => {
    await api<null>("/api/auth/logout", { method: "POST" });
    setUser(null);
  }, []);

  if (booting) {
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

  if (!user) {
    return <LoginView onAuth={setUser} />;
  }

  return (
    <AppProvider user={user} onSignOut={() => void handleSignOut()}>
      <AuthedShell />
    </AppProvider>
  );
}
