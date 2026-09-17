"use client";

import { useSearchParams } from "next/navigation";
import { BoardView } from "@/components/app/board-view";
import { BoardNotFound } from "@/components/app/board-not-found";

/**
 * `/Board?id=<boardId>` — a board's five sub-views (table, kanban, calendar,
 * timeline, unassigned). The sub-view is client state on the reference; the
 * URL never changes when switching between them. A missing id renders the
 * reference's in-app "Board not found" card (the reference itself dead-ends
 * on "Loading board…" there). The shell (auth + header) comes from the root
 * layout's AppShell.
 */
export function BoardRoute() {
  const params = useSearchParams();
  const id = params.get("id");

  return id ? <BoardView key={id} boardId={id} /> : <BoardNotFound />;
}
