"use client";

import { useState } from "react";
import { useApp } from "@/components/app/app-context";
import { DashboardView } from "@/components/app/dashboard-view";
import { CreateBoardDialog } from "@/components/app/create-board-dialog";

/** `/` — the dashboard, with the shell-level Create Board dialog. */
export function DashboardRoute() {
  const { navigate } = useApp();
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <>
      <DashboardView onCreateBoard={() => setCreateOpen(true)} />
      <CreateBoardDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(boardId) => {
          setCreateOpen(false);
          navigate("board", boardId);
        }}
      />
    </>
  );
}
