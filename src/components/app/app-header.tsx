"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, Briefcase, HelpCircle, Menu, Search, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useApp } from "@/components/app/app-context";
import { api } from "@/lib/api-client";
import { toast } from "@/hooks/use-toast";
import type { ViewName } from "@/components/app/app-context";
import type { BoardSummaryDTO } from "@/lib/domain";
import { ROUTE_PATHS } from "@/lib/domain";

const NAV_ITEMS: { label: string; view: ViewName; href: string }[] = [
  { label: "Dashboard", view: "dashboard", href: "/Dashboard" },
  { label: "My Boards", view: "boards", href: ROUTE_PATHS.boards },
  { label: "Analytics", view: "analytics", href: ROUTE_PATHS.analytics },
];

function initialsOf(name: string): string {
  return (
    name
      .split(" ")
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

export function AppHeader({ searchPlaceholder }: { searchPlaceholder?: string }) {
  const { user, view, navigate, signOut } = useApp();
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [boards, setBoards] = useState<BoardSummaryDTO[] | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Fetch the board list lazily, the first time the user actually searches —
  // the header never queries the API on page load.
  useEffect(() => {
    if (!searchOpen || boards) return;
    let cancelled = false;
    api<BoardSummaryDTO[]>("/api/boards").then((result) => {
      if (!cancelled && result.ok) setBoards(result.data);
    });
    return () => {
      cancelled = true;
    };
  }, [searchOpen, boards]);

  const query = search.trim().toLowerCase();
  const matches =
    query && boards
      ? boards
          .filter(
            (b) =>
              b.title.toLowerCase().includes(query) ||
              (b.description ?? "").toLowerCase().includes(query),
          )
          .slice(0, 6)
      : [];

  function openBoard(boardId: string) {
    setSearch("");
    setSearchOpen(false);
    searchRef.current?.blur();
    navigate("board", boardId);
  }

  return (
    <header className="sticky top-0 z-50 border-b bg-card shadow-sm">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-6 lg:gap-10">
          {/* Reference logo: gradient tile with a white briefcase, linking to
              /Dashboard like the reference's own anchor. */}
          <Link href="/Dashboard" className="flex shrink-0 items-center gap-2" aria-label="Tuesday.com home">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r from-[#2563EB] to-[#1D4ED8]"
              aria-hidden="true"
            >
              <Briefcase className="h-5 w-5 text-white" />
            </span>
            <span className="hidden text-lg font-bold tracking-tight sm:inline">Tuesday.com</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
            {NAV_ITEMS.map((item) => {
              const active = view.name === item.view;
              return (
                <Link
                  key={item.view}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className="rounded-md px-3 py-2 text-sm font-medium text-[#323338] transition-colors hover:bg-[#F5F6F8] hover:text-[#0073EA]"
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          {/* Reference mobile pattern: hamburger opens the nav drawer. */}
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-muted-foreground md:hidden"
                aria-label="Open main menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <SheetHeader className="border-b px-4 py-4">
                <SheetTitle className="flex items-center gap-2 text-left">
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r from-[#2563EB] to-[#1D4ED8]"
                    aria-hidden="true"
                  >
                    <Briefcase className="h-5 w-5 text-white" />
                  </span>
                  Tuesday.com
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 p-3" aria-label="Mobile primary">
                {NAV_ITEMS.map((item) => {
                  const active = view.name === item.view;
                  return (
                    <Link
                      key={item.view}
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className="rounded-md px-3 py-2 text-left text-sm font-medium text-[#323338] transition-colors hover:bg-[#F5F6F8] hover:text-[#0073EA]"
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </SheetContent>
          </Sheet>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Global search — jump straight to a matching board. Reference chrome:
              wide field, "Search everything..." placeholder. */}
          <div className="relative hidden md:block">
            <Popover open={searchOpen && query.length > 0} onOpenChange={setSearchOpen}>
              <PopoverTrigger asChild>
                <div className="relative">
                  <Input
                    ref={searchRef}
                    type="search"
                    role="searchbox"
                    aria-label="Search everything"
                    placeholder={searchPlaceholder ?? "Search everything..."}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && matches.length > 0) {
                        e.preventDefault();
                        openBoard(matches[0].id);
                      }
                      if (e.key === "Escape") {
                        setSearch("");
                        setSearchOpen(false);
                      }
                    }}
                    className="h-9 w-72 bg-white pl-9 text-base lg:w-80"
                  />
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                </div>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72 p-1.5" onOpenAutoFocus={(e) => e.preventDefault()}>
                {boards === null ? (
                  <p className="px-2 py-3 text-sm text-muted-foreground">Searching…</p>
                ) : matches.length === 0 ? (
                  <p className="px-2 py-3 text-sm text-muted-foreground">
                    No boards match “{search.trim()}”.
                  </p>
                ) : (
                  <ul className="max-h-72 overflow-auto" aria-label="Search results">
                    {matches.map((board) => (
                      <li key={board.id}>
                        <button
                          type="button"
                          onClick={() => openBoard(board.id)}
                          className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-secondary"
                        >
                          <span
                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-bold text-white"
                            style={{ backgroundColor: board.color }}
                            aria-hidden="true"
                          >
                            {board.title.slice(0, 1).toUpperCase()}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium">{board.title}</span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {board.doneCount}/{board.taskCount} done
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </PopoverContent>
            </Popover>
          </div>

          <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative h-9 w-9 text-muted-foreground"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 p-0">
              <p className="border-b px-3 py-2.5 text-sm font-semibold">Notifications</p>
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                No new notifications.
                <span className="mt-0.5 block text-xs">Board activity will show up here.</span>
              </p>
            </PopoverContent>
          </Popover>
          <Button
            variant="ghost"
            size="icon"
            className="hidden h-9 w-9 text-muted-foreground sm:inline-flex"
            aria-label="Help"
            onClick={() =>
              toastNotConfigured("Help center is not configured on this deployment.")
            }
          >
            <HelpCircle className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="hidden h-9 w-9 text-muted-foreground sm:inline-flex"
            aria-label="Settings"
            onClick={() =>
              toastNotConfigured("Settings are not configured on this deployment.")
            }
          >
            <Settings className="h-5 w-5" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Open user menu"
                className="rounded-full outline-none ring-ring focus-visible:ring-2"
              >
                <Avatar className="h-9 w-9 border-2 border-transparent transition-colors hover:border-input">
                  <AvatarFallback
                    className="text-sm font-semibold text-white"
                    style={{ backgroundColor: user.avatarColor }}
                  >
                    {initialsOf(user.name)}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel className="font-normal">
                <p className="truncate text-sm font-semibold">{user.name}</p>
                <p className="truncate text-xs text-muted-foreground">{user.email}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => toastNotConfigured("Profiles are not configurable on this deployment.")}>
                Your Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toastNotConfigured("Settings are not configured on this deployment.")}>
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

/** Honest "not configured" feedback — same contract as Integrate/Automate. */
function toastNotConfigured(message: string) {
  toast({ title: "Not available", description: message });
}
