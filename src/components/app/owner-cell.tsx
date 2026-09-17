"use client";

import { useState } from "react";
import { Check, Search, User, X } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { UserDTO } from "@/lib/domain";

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

export function OwnerCell({
  owner,
  members,
  onChange,
}: {
  owner: UserDTO | null;
  members: UserDTO[];
  onChange: (userId: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  // The reference picker opens with a searchable "Enter name…" input over the
  // member list — typing filters by name or email.
  const filter = query.trim().toLowerCase();
  const matches = filter
    ? members.filter(
        (m) =>
          m.name.toLowerCase().includes(filter) || m.email.toLowerCase().includes(filter),
      )
    : members;

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <PopoverTrigger asChild>
        {owner ? (
          // Reference assigned state (probed 2026-09-17): hover-fade
          // wrapper over a 24px solid-blue avatar + dark name label.
          <button
            type="button"
            aria-label={`Owner: ${owner.name}, change owner`}
            className="cursor-pointer transition-opacity hover:opacity-80"
          >
            <span className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0073EA]">
                <span className="text-xs font-medium text-white">{initialsOf(owner.name)}</span>
              </span>
              <span className="truncate text-sm text-[#323338]">{owner.name}</span>
            </span>
          </button>
        ) : (
          // Reference empty state: the same affordance shape as "Set date".
          <button
            type="button"
            aria-label="Assign owner"
            className="flex cursor-pointer items-center gap-2 -mx-2 -my-1 px-2 py-1 text-[#676879] transition-colors hover:rounded hover:bg-[#E1E5F3]"
          >
            <User className="h-4 w-4" aria-hidden="true" />
            Assign
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-0">
        <div className="relative border-b">
          <Input
            autoFocus
            type="search"
            aria-label="Search people"
            placeholder="Enter name..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-9 rounded-none border-0 pl-8 focus-visible:ring-0"
          />
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        </div>
        {owner && (
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 border-b px-3 py-2 text-sm text-destructive transition-colors hover:bg-secondary"
          >
            <X className="h-4 w-4" /> Unassign
          </button>
        )}
        <ScrollArea className="h-56">
          <ul role="listbox" aria-label="Assign owner" className="p-1">
            {matches.length === 0 ? (
              <li className="px-2 py-3 text-sm text-muted-foreground">No matching people</li>
            ) : (
              matches.map((member) => {
                const selected = owner?.id === member.id;
                return (
                  <li key={member.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() => {
                        onChange(member.id);
                        setOpen(false);
                      }}
                      className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-secondary"
                    >
                      <span className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback
                            className="text-[10px] font-semibold text-white"
                            style={{ backgroundColor: member.avatarColor }}
                          >
                            {initialsOf(member.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="min-w-0">
                          <span className="block truncate">{member.name}</span>
                          <span className="block truncate text-xs text-muted-foreground">{member.email}</span>
                        </span>
                      </span>
                      {selected && <Check className="h-4 w-4 shrink-0 text-[#0073EA]" />}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
