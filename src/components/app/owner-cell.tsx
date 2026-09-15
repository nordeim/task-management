"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={owner ? `Owner: ${owner.name}, change owner` : "Assign owner"}
          className="flex h-7 w-full max-w-[130px] items-center gap-1.5 rounded-md px-1.5 text-xs transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {owner ? (
            <>
              <Avatar className="h-6 w-6">
                <AvatarFallback
                  className="text-[10px] font-semibold text-white"
                  style={{ backgroundColor: owner.avatarColor }}
                >
                  {initialsOf(owner.name)}
                </AvatarFallback>
              </Avatar>
              <span className="truncate text-muted-foreground">{owner.name}</span>
            </>
          ) : (
            <span className="flex items-center gap-1 text-muted-foreground">
              <Avatar className="h-6 w-6 border border-dashed border-input">
                <AvatarFallback className="bg-secondary text-[10px] text-muted-foreground">?</AvatarFallback>
              </Avatar>
              Assign
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-0">
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
            {members.map((member) => {
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
                    {selected && <Check className="h-4 w-4 shrink-0 text-primary" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
