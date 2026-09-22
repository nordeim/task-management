"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Briefcase, CircleHelp, Menu, Search, Settings, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { useApp } from "@/components/app/app-context";
import { api } from "@/lib/api-client";
import { toast } from "@/hooks/use-toast";
import type { BoardSummaryDTO } from "@/lib/domain";
import { ROUTE_PATHS, isNavActive } from "@/lib/domain";

// Reference nav hrefs (probed 2026-09-17): /Dashboard, /Boards, /Analytics.
const NAV_ITEMS: { label: string; href: string }[] = [
  { label: "Dashboard", href: "/Dashboard" },
  { label: "My Boards", href: ROUTE_PATHS.boards },
  { label: "Analytics", href: ROUTE_PATHS.analytics },
];

export function AppHeader({ searchPlaceholder }: { searchPlaceholder?: string }) {
  const { navigate, signOut } = useApp();
  const pathname = usePathname() ?? "/";
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [boards, setBoards] = useState<BoardSummaryDTO[] | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const mobileSearchRef = useRef<HTMLInputElement>(null);

  // Fetch the board list lazily, the first time the user actually searches —
  // the header never queries the API on page load.
  useEffect(() => {
    if ((!searchOpen && !menuOpen) || boards) return;
    let cancelled = false;
    api<BoardSummaryDTO[]>("/api/boards").then((result) => {
      if (!cancelled && result.ok) setBoards(result.data);
    });
    return () => {
      cancelled = true;
    };
  }, [searchOpen, menuOpen, boards]);

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
    setMenuOpen(false);
    searchRef.current?.blur();
    mobileSearchRef.current?.blur();
    navigate("board", boardId);
  }

  function searchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && matches.length > 0) {
      e.preventDefault();
      openBoard(matches[0].id);
    }
    if (e.key === "Escape") {
      setSearch("");
      setSearchOpen(false);
    }
  }

  return (
    // Reference nav (probed 2026-09-17): bg-white border-b border-[#E1E5F3]
    // shadow-sm sticky top-0 z-50 — the reference's v3 `shadow-sm` compiles
    // at half of v4's, so we port it as `shadow-xs` (computed-equivalent).
    // The inner row is max-w-full with
    // px-4 sm:px-6 lg:px-8 gutters (not a capped container). The mobile
    // menu is an INLINE collapsible panel under the row (not a sheet).
    <header className="sticky top-0 z-50 border-b border-[#E1E5F3] bg-white shadow-xs">
      <div className="mx-auto max-w-full px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-6 lg:gap-10">
            {/* Reference logo: gradient tile with a white briefcase, linking to
              /Dashboard like the reference's own anchor. */}
            <Link href="/Dashboard" className="flex shrink-0 items-center gap-2" aria-label="Tuesday.com home">
              <span
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r from-[#2563EB] to-[#1D4ED8]"
                aria-hidden="true"
              >
                <Briefcase className="h-5 w-5 text-white" />
              </span>
              {/* Reference logo text (probed at 375px): always visible,
                  text-xl font-bold text-[#323338]. */}
              <span className="text-xl font-bold text-[#323338]">Tuesday.com</span>
            </Link>
            <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
              {NAV_ITEMS.map((item) => {
                // Reference drift (2026-09-17): exact case-sensitive
                // pathname === href gets bg-[#E1E5F3] text-[#0073EA].
                const active = isNavActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={
                      active
                        ? "rounded-md bg-[#E1E5F3] px-3 py-2 text-sm font-medium text-[#0073EA] transition-colors"
                        : "rounded-md px-3 py-2 text-sm font-medium text-[#323338] transition-colors hover:bg-[#F5F6F8] hover:text-[#0073EA]"
                    }
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Desktop search — reference layout: a flex-1 zone, centered from
              md, pushed right from lg. */}
          <div className="hidden flex-1 justify-center px-2 md:flex lg:ml-6 lg:justify-end">
            <div className="relative">
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
                      onKeyDown={searchKeyDown}
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
          </div>

          {/* Desktop right cluster — hidden below md, like the reference. */}
          <div className="hidden items-center space-x-2 md:ml-4 md:flex">
            <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Notifications"
                  className="h-10 w-10 rounded-lg hover:bg-[#E1E5F3]"
                >
                  <Bell className="h-5 w-5 text-[#676879]" />
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
              aria-label="Help"
              className="h-10 w-10 rounded-lg hover:bg-[#E1E5F3]"
              onClick={() =>
                toastNotConfigured("Help center is not configured on this deployment.")
              }
            >
              <CircleHelp className="h-5 w-5 text-[#676879]" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Settings"
              className="h-10 w-10 rounded-lg hover:bg-[#E1E5F3]"
              onClick={() =>
                toastNotConfigured("Settings are not configured on this deployment.")
              }
            >
              <Settings className="h-5 w-5 text-[#676879]" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Open user menu"
                  className="rounded-full outline-none ring-ring focus-visible:ring-2"
                >
                  {/* Reference avatar (decompiled `zq`-era header, verified
                      live session 15): 32px blue→green gradient whose letter
                      is the LITERAL string "U" — mock chrome, not a derived
                      initial (the reference shows "U" while greeting
                      "sepnetflix2023"). */}
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-[#0073EA] to-[#00C875]">
                    <span className="text-xs font-bold text-white">U</span>
                  </span>
                </button>
              </DropdownMenuTrigger>
              {/* Reference user menu: a plain "My Account" label, one
                  separator, and three standard-color items (no icons, no
                  red Sign out). */}
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel className="px-2 py-1.5 text-sm font-semibold">
                  My Account
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => toastNotConfigured("Profiles are not configurable on this deployment.")}>
                  Your Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toastNotConfigured("Settings are not configured on this deployment.")}>
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={signOut}>Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Mobile hamburger — sits on the RIGHT like the reference. */}
          <div className="flex items-center md:hidden">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-lg hover:bg-[#E1E5F3]"
              aria-label="Open main menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile inline panel (reference pattern, probed 2026-09-17):
          conditionally rendered under the header row — nav links, a mobile
          search field, and a user section with footer links. */}
      {menuOpen && (
        <div className="border-t border-[#E1E5F3] md:hidden">
          <div className="space-y-1 px-2 pb-3 pt-2 sm:px-3">
            {NAV_ITEMS.map((item) => {
              const active = isNavActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={
                    active
                      ? "block rounded-md bg-[#E1E5F3] px-3 py-2 text-base font-medium text-[#0073EA] transition-colors"
                      : "block rounded-md px-3 py-2 text-base font-medium text-[#323338] transition-colors hover:bg-[#F5F6F8] hover:text-[#0073EA]"
                  }
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
          <div className="border-t border-gray-200 pb-3 pt-4">
            <div className="px-2">
              <label htmlFor="search-mobile" className="sr-only">
                Search
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Search className="h-5 w-5 text-gray-400" aria-hidden="true" />
                </div>
                <input
                  ref={mobileSearchRef}
                  id="search-mobile"
                  type="search"
                  name="search-mobile"
                  placeholder="Search everything..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={searchKeyDown}
                  className="block h-9 w-full rounded-md border border-gray-300 bg-white py-2 pl-10 pr-3 text-base leading-5 shadow-xs transition-colors placeholder-gray-500 focus:border-[#0073EA] focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-[#0073EA] sm:text-sm"
                />
              </div>
              {query.length > 0 && boards !== null && (
                <ul className="mt-2 max-h-48 overflow-auto rounded-md border border-gray-200 bg-white" aria-label="Search results">
                  {matches.length === 0 ? (
                    <li className="px-3 py-2 text-sm text-gray-500">No boards match “{search.trim()}”.</li>
                  ) : (
                    matches.map((board) => (
                      <li key={board.id}>
                        <button
                          type="button"
                          onClick={() => openBoard(board.id)}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                        >
                          {board.title}
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              )}
            </div>
          </div>
          <div className="border-t border-gray-200 pb-3 pt-4">
            <div className="flex items-center px-5">
              <div className="shrink-0">
                {/* Reference mobile avatar (decompiled): 40px gradient with
                    the LITERAL "U" — same mock chrome as the desktop header. */}
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-[#0073EA] to-[#00C875]">
                  <span className="text-sm font-bold text-white">U</span>
                </div>
              </div>
              <div className="ml-3 min-w-0">
                {/* Reference mobile panel renders LITERAL placeholder texts
                    ("User Name" / "user@example.com") regardless of the
                    authed user — decompiled strings, verified live. */}
                <div className="truncate text-base font-medium text-gray-800">User Name</div>
                <div className="truncate text-sm font-medium text-gray-500">user@example.com</div>
              </div>
              <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Notifications"
                    className="ml-auto h-10 w-10 rounded-lg hover:bg-[#E1E5F3]"
                  >
                    <Bell className="h-5 w-5 text-[#676879]" />
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
            </div>
            <div className="mt-3 space-y-1 px-2">
              <button
                type="button"
                onClick={() => toastNotConfigured("Profiles are not configurable on this deployment.")}
                className="block w-full rounded-md px-3 py-2 text-left text-base font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900"
              >
                Your Profile
              </button>
              <button
                type="button"
                onClick={() => toastNotConfigured("Settings are not configured on this deployment.")}
                className="block w-full rounded-md px-3 py-2 text-left text-base font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900"
              >
                Settings
              </button>
              <button
                type="button"
                onClick={signOut}
                className="block w-full rounded-md px-3 py-2 text-left text-base font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

/** Honest "not configured" feedback — same contract as Integrate/Automate. */
function toastNotConfigured(message: string) {
  toast({ title: "Not available", description: message });
}
