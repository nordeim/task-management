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
import { relativeBoardTime, visibilityLabel } from "@/lib/domain";
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
      <div className="p-4 md:p-6">
        <div className="mx-auto max-w-7xl">
          <Card>
            <CardContent className="py-10 text-center">
              <p className="mb-2 font-medium">Could not load your boards</p>
              <p className="mb-4 text-sm text-muted-foreground">{error}</p>
              <Button onClick={() => load().then(applyResult)}>Try again</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    // Reference shell (probed 2026-09-17): p-4 md:p-6 page padding OUTSIDE
    // the max-w-7xl container.
    <div className="p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-2xl font-bold text-[#323338] md:text-3xl">My Boards</h1>
            <p className="mt-1 text-sm text-[#676879]">Manage your projects and workflows</p>
          </div>
          <Button
            className="h-10 rounded-lg bg-gradient-to-r from-[#0073EA] to-[#0056B3] px-5 py-2 text-sm font-medium shadow-md transition-all hover:from-[#0056B3] hover:to-[#0073EA] hover:shadow-lg"
            onClick={onCreateBoard}
          >
            <Plus className="mr-2 h-4 w-4" /> Create Board
          </Button>
        </div>

        {/* Toolbar (reference): search left, toggles + actions right. */}
        <div className="mb-6 flex flex-col gap-3 md:flex-row">
          <div className="relative max-w-md flex-1">
            <Input
              type="search"
              aria-label="Search boards"
              placeholder="Search boards..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 rounded-lg border-[#E1E5F3] bg-white pl-9 text-sm focus:ring-2 focus:ring-[#0073EA]/20"
            />
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#676879]" />
          </div>
          <div className="flex gap-2">
            <Button
              aria-pressed={layout === "grid"}
              aria-label="Grid layout"
              onClick={() => setLayout("grid")}
              className={
                layout === "grid"
                  ? "h-10 rounded-lg bg-[#0073EA] px-3 py-2 text-white shadow hover:bg-[#0056B3]"
                  : "h-10 rounded-lg border-[#E1E5F3] bg-background px-3 py-2 text-[#323338] shadow-sm hover:bg-accent hover:text-accent-foreground"
              }
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              variant={layout === "list" ? "default" : "outline"}
              aria-pressed={layout === "list"}
              aria-label="List layout"
              onClick={() => setLayout("list")}
              className={
                layout === "list"
                  ? "h-10 rounded-lg bg-[#0073EA] px-3 py-2 text-white shadow hover:bg-[#0056B3]"
                  : "h-10 rounded-lg border-[#E1E5F3] bg-background px-3 py-2 text-[#323338] shadow-sm hover:bg-accent hover:text-accent-foreground"
              }
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-10 rounded-lg border-[#E1E5F3] bg-background px-3 py-2 text-sm text-[#323338] shadow-sm hover:bg-accent hover:text-accent-foreground"
              onClick={() => navigate("analytics")}
            >
              <ChartNoAxesColumnIncreasing className="mr-1.5 h-4 w-4" /> Analytics
            </Button>
            <Button
              variant="outline"
              className={`h-10 rounded-lg border-[#E1E5F3] bg-background px-3 py-2 text-sm shadow-sm hover:bg-accent hover:text-accent-foreground ${
                filter === "favorites" ? "text-[#0073EA]" : "text-[#323338]"
              }`}
              onClick={() => setFilter((f) => (f === "favorites" ? "all" : "favorites"))}
            >
              <Star className={`mr-1.5 h-4 w-4 ${filter === "favorites" ? "fill-[#0073EA]" : ""}`} />
              Favorites
            </Button>
          </div>
        </div>

        {!visible ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-48 w-full rounded-xl" />
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
        ) : layout === "grid" ? (
          /* Reference grid cards (probed 2026-09-17): color bar on top,
             p-5 body, timestamp row mt-auto pt-4 border-t, and a p-2
             bg-gray-50/50 footer zone with a full-width centered Options. */
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visible.map((board) => (
              <div
                key={board.id}
                className="group flex h-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white text-card-foreground shadow transition-all duration-300 hover:shadow-lg"
              >
                <div className="h-2 w-full" style={{ backgroundColor: board.color }} aria-hidden="true" />
                <div
                  role="link"
                  tabIndex={0}
                  aria-label={`Open ${board.title}`}
                  onClick={() => navigate("board", board.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") navigate("board", board.id);
                  }}
                  className="flex-grow block cursor-pointer p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0073EA]"
                >
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
                      {visibilityLabel(board.visibility, true)}
                    </span>
                  </div>

                  <h3 className="mb-2 text-lg font-semibold text-gray-800 transition-colors group-hover:text-primary">
                    {board.title}
                  </h3>

                  <p className="mb-5 line-clamp-2 flex-grow text-sm text-gray-600">
                    {board.description || "No description"}
                  </p>

                  <div className="mt-auto flex items-center justify-between border-t border-gray-100 pt-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1.5">
                      {board.isFavorite && (
                        <Star className="h-3 w-3 fill-[#ca8a04] text-[#ca8a04]" aria-label="Favorite" />
                      )}
                      {relativeBoardTime(new Date(board.updatedAt))}
                    </span>
                  </div>
                </div>
                <div className="border-t border-gray-100 bg-gray-50/50 p-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="h-8 w-full justify-center rounded-md px-3 text-xs font-medium text-gray-600 hover:bg-gray-200/70 hover:text-gray-800"
                      >
                        <MoreHorizontal className="h-4 w-4" /> Options
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
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
              </div>
            ))}
          </div>
        ) : (
          /* Reference list cards (probed 2026-09-17): rounded-lg row with a
             w-1.5 color stripe, p-3 body, folder tile, truncated title/desc,
             badge + timestamp + kebab on the right. */
          <div className="space-y-3">
            {visible.map((board) => (
              <div
                key={board.id}
                className="group overflow-hidden rounded-lg border border-gray-200 bg-white text-card-foreground shadow transition-all duration-200 hover:shadow-md"
              >
                <div className="flex items-center">
                  <div className="h-16 w-1.5 shrink-0" style={{ backgroundColor: board.color }} aria-hidden="true" />
                  <div className="flex-1 p-3">
                    <div className="flex items-center justify-between">
                      <div
                        role="link"
                        tabIndex={0}
                        aria-label={`Open ${board.title}`}
                        onClick={() => navigate("board", board.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") navigate("board", board.id);
                        }}
                        className="flex min-w-0 flex-grow cursor-pointer items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0073EA] focus-visible:rounded-md"
                      >
                        <span
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md"
                          style={{ backgroundColor: `${board.color}20` }}
                          aria-hidden="true"
                        >
                          <Folder className="h-4 w-4" style={{ color: board.color }} />
                        </span>
                        <span className="min-w-0 flex-grow">
                          <span className="block truncate text-sm font-semibold text-gray-800 transition-colors group-hover:text-primary">
                            {board.title}
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-gray-500">
                            {board.description || "No description"}
                          </span>
                        </span>
                      </div>
                      <div className="ml-3 flex shrink-0 items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                            board.visibility === "private"
                              ? "bg-rose-100 text-rose-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {board.visibility === "private" ? (
                            <Lock className="h-2.5 w-2.5" aria-hidden="true" />
                          ) : (
                            <Globe className="h-2.5 w-2.5" aria-hidden="true" />
                          )}
                          {visibilityLabel(board.visibility, true)}
                        </span>
                        <div className="hidden text-right sm:block">
                          <p className="text-xs text-gray-400">
                            {board.isFavorite && (
                              <Star className="mr-1 inline h-3 w-3 fill-[#ca8a04] text-[#ca8a04]" aria-label="Favorite" />
                            )}
                            {relativeBoardTime(new Date(board.updatedAt))}
                          </p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              aria-label={`Options for ${board.title}`}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-100 hover:text-accent-foreground"
                            >
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
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
                    </div>
                  </div>
                </div>
              </div>
            ))}
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
    </div>
  );
}
