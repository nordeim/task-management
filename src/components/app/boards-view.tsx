"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChartNoAxesColumnIncreasing,
  Folder,
  Globe,
  Grid3x3,
  List,
  Lock,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { useApp } from "@/components/app/app-context";
import { api } from "@/lib/api-client";
import { relativeBoardTime } from "@/lib/domain";
import { EditBoardDialog } from "@/components/app/edit-board-dialog";
import type { BoardSummaryDTO } from "@/lib/domain";

type Layout = "grid" | "list";
type FilterKind = "all" | "favorites";

export function BoardsView({ onCreateBoard }: { onCreateBoard: () => void }) {
  const { navigate } = useApp();
  const [boards, setBoards] = useState<BoardSummaryDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [layout, setLayout] = useState<Layout>("grid");
  const [filter, setFilter] = useState<FilterKind>("all");
  const [deleteTarget, setDeleteTarget] = useState<BoardSummaryDTO | null>(null);
  const [editTarget, setEditTarget] = useState<BoardSummaryDTO | null>(null);

  const load = useCallback(() => api<BoardSummaryDTO[]>("/api/boards"), []);

  function applyResult(result: { ok: boolean; data?: BoardSummaryDTO[]; error?: string }) {
    if (result.ok && result.data) {
      setBoards(result.data);
      setError(null);
    } else {
      setError(result.error ?? "Request failed");
    }
  }

  useEffect(() => {
    let cancelled = false;
    load().then((result) => {
      if (!cancelled) applyResult(result);
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  const visible = useMemo(() => {
    if (!boards) return null;
    const query = search.trim().toLowerCase();
    return boards.filter((b) => {
      if (filter === "favorites" && !b.isFavorite) return false;
      if (!query) return true;
      return (
        b.title.toLowerCase().includes(query) ||
        (b.description ?? "").toLowerCase().includes(query)
      );
    });
  }, [boards, search, filter]);

  // Favorites are toggled from the board header (star) — the boards page only
  // reads the flag (card badge + Favorites filter).

  async function confirmDelete() {
    if (!deleteTarget) return;
    const result = await api<null>(`/api/boards/${deleteTarget.id}`, { method: "DELETE" });
    if (result.ok) {
      setBoards((prev) => (prev ? prev.filter((b) => b.id !== deleteTarget.id) : prev));
      toast({ title: "Board deleted", description: `"${deleteTarget.title}" was removed.` });
    } else {
      toast({ title: "Could not delete board", description: result.error, variant: "destructive" });
    }
    setDeleteTarget(null);
  }

  if (error) {
    return (
      <div className="mx-auto max-w-[1400px] p-6">
        <Card>
          <CardContent className="py-10 text-center">
            <p className="mb-2 font-medium">Could not load your boards</p>
            <p className="mb-4 text-sm text-muted-foreground">{error}</p>
            <Button onClick={() => load().then(applyResult)}>Try again</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">My Boards</h1>
          <p className="mt-1 text-muted-foreground">Manage your projects and workflows</p>
        </div>
        <Button size="lg" className="font-semibold" onClick={onCreateBoard}>
          <Plus className="mr-1 h-4 w-4" /> Create Board
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-52 flex-1 sm:max-w-xs">
          <Input
            type="search"
            aria-label="Search boards"
            placeholder="Search boards..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-9"
          />
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        </div>
        <div className="flex items-center rounded-lg border bg-card p-0.5" role="group" aria-label="Layout">
          <button
            type="button"
            aria-pressed={layout === "grid"}
            aria-label="Grid layout"
            onClick={() => setLayout("grid")}
            className={`rounded-md p-1.5 ${layout === "grid" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Grid3x3 className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-pressed={layout === "list"}
            aria-label="List layout"
            onClick={() => setLayout("list")}
            className={`rounded-md p-1.5 ${layout === "list" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
        <Button
          variant="outline"
          size="sm"
          className={filter === "favorites" ? "border-primary text-primary" : ""}
          onClick={() => setFilter((f) => (f === "favorites" ? "all" : "favorites"))}
        >
          <Star className={`mr-1 h-4 w-4 ${filter === "favorites" ? "fill-primary" : ""}`} />
          Favorites
        </Button>
        <Button variant="outline" size="sm" onClick={() => navigate("analytics")}>
          <ChartNoAxesColumnIncreasing className="mr-1 h-4 w-4" /> Analytics
        </Button>
      </div>

      {!visible ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full rounded-xl" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16 text-center">
            <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
              <Folder className="h-7 w-7" />
            </span>
            {boards && boards.length > 0 ? (
              <>
                <p className="font-semibold">No boards match your filters</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Try a different search or clear the favorites filter.
                </p>
                <Button
                  variant="outline"
                  className="mt-5"
                  onClick={() => {
                    setSearch("");
                    setFilter("all");
                  }}
                >
                  Clear filters
                </Button>
              </>
            ) : (
              <>
                <p className="font-semibold">No boards yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Create your first board to start organizing your work
                </p>
                <Button size="lg" className="mt-5 font-semibold" onClick={onCreateBoard}>
                  <Plus className="mr-1 h-4 w-4" /> Create Your First Board
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div
          className={
            layout === "grid"
              ? "grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
              : "flex flex-col gap-3"
          }
        >
          {visible.map((board) => {
            return (
              <Card
                key={board.id}
                className="group cursor-pointer transition-shadow hover:shadow-lg"
                onClick={() => navigate("board", board.id)}
              >
                <CardContent className="p-5">
                  {/* Reference card: tinted folder tile top-left, visibility badge top-right. */}
                  <div className="mb-4 flex items-start justify-between gap-2">
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                      style={{ backgroundColor: `${board.color}20` }}
                      aria-hidden="true"
                    >
                      <Folder className="h-5 w-5" style={{ color: board.color }} />
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                        board.visibility === "private"
                          ? "bg-rose-100 text-rose-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {board.visibility === "private" ? (
                        <Lock className="h-3 w-3" aria-hidden="true" />
                      ) : (
                        <Globe className="h-3 w-3" aria-hidden="true" />
                      )}
                      {board.visibility}
                    </span>
                  </div>

                  <h3 className="mb-2 text-lg font-semibold leading-tight transition-colors group-hover:text-primary">
                    {board.title}
                  </h3>

                  {board.description ? (
                    <p className="mb-5 line-clamp-2 text-sm text-muted-foreground">
                      {board.description}
                    </p>
                  ) : (
                    <p className="mb-5 line-clamp-2 text-sm text-muted-foreground/70">No description</p>
                  )}

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      {board.isFavorite && (
                        <Star className="h-3 w-3 fill-[#fcc203] text-[#fcc203]" aria-label="Favorite" />
                      )}
                      {relativeBoardTime(new Date(board.updatedAt))}
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          aria-label={`Options for ${board.title}`}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuItem onClick={() => setEditTarget(board)}>
                          <Pencil className="mr-2 h-4 w-4" /> Edit Board
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleteTarget(board)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete Board
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <EditBoardDialog
        board={editTarget}
        onOpenChange={(open) => !open && setEditTarget(null)}
        onSaved={() => load().then(applyResult)}
      />

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{deleteTarget?.title}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the board, its groups, and all tasks inside it. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => void confirmDelete()}
            >
              Delete board
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
