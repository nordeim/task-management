"use client";

import { useState } from "react";
import { useApp } from "@/components/app/app-context";
import { BoardsView } from "@/components/app/boards-view";
import { CreateBoardDialog } from "@/components/app/create-board-dialog";

/** `/Boards` — the boards list, with the shell-level Create Board dialog. */
export function BoardsRoute() {
  const { navigate } = useApp();
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <>
      <BoardsView onCreateBoard={() => setCreateOpen(true)} />
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
