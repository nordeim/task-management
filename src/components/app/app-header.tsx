"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, HelpCircle, Settings } from "lucide-react";
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
import { useApp } from "@/components/app/app-context";
import type { ViewName } from "@/components/app/app-context";

const NAV_ITEMS: { label: string; view: ViewName }[] = [
  { label: "Dashboard", view: "dashboard" },
  { label: "My Boards", view: "boards" },
  { label: "Analytics", view: "analytics" },
];

export function AppHeader({ searchPlaceholder }: { searchPlaceholder?: string }) {
  const { user, view, navigate, signOut } = useApp();
  const [search, setSearch] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);

  const initials = user.name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-50 border-b bg-card">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-6 lg:gap-10">
          <Link
            href="#"
            onClick={(e) => {
              e.preventDefault();
              navigate("dashboard");
            }}
            className="flex shrink-0 items-center gap-2"
            aria-label="Tuesday.com home"
          >
            <span
              className="flex h-7 w-7 items-center justify-center rounded-md text-sm font-bold text-white"
              style={{ backgroundColor: "#0073ea" }}
            >
              T
            </span>
            <span className="hidden text-lg font-bold tracking-tight sm:inline">Tuesday.com</span>
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2" aria-label="Primary">
            {NAV_ITEMS.map((item) => {
              const active = view.name === item.view;
              return (
                <button
                  key={item.view}
                  type="button"
                  onClick={() => navigate(item.view)}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors sm:px-3 ${
                    active
                      ? "text-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="relative hidden md:block">
            <Input
              type="search"
              aria-label="Search"
              placeholder={searchPlaceholder ?? "Search"}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-44 border-input bg-card pl-9 text-sm lg:w-56"
            />
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" />
            </svg>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="relative h-9 w-9 text-muted-foreground"
            aria-label={`Notifications${showNotifications ? ", unread" : ""}`}
            onClick={() => setShowNotifications((v) => !v)}
          >
            <Bell className="h-5 w-5" />
            {showNotifications && (
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="hidden h-9 w-9 text-muted-foreground sm:inline-flex"
            aria-label="Help"
            onClick={() => navigate("dashboard")}
          >
            <HelpCircle className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="hidden h-9 w-9 text-muted-foreground sm:inline-flex"
            aria-label="Settings"
            onClick={() => navigate("dashboard")}
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
                    {initials || "U"}
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
              <DropdownMenuItem onClick={() => navigate("dashboard")}>Your Profile</DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("dashboard")}>Settings</DropdownMenuItem>
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
