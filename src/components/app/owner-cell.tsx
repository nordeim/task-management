"use client";

import { useState } from "react";
import { User } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { UserDTO } from "@/lib/domain";

/**
 * The reference's OwnerCell (decompiled `hZ`, probed 2026-09-17): a
 * THREE-STATE free-text cell — no member popover at all.
 *  - empty: the "Assign" affordance (User icon + label, hover pill)
 *  - editing: a bare inline input ("Enter name...", border-none
 *    bg-transparent p-0 h-auto focus:ring-0 text-[#323338]) that commits
 *    on blur/Enter and cancels on Escape
 *  - assigned: a solid-blue 24px circle with the owner's FIRST letter
 *    (`charAt(0).toUpperCase()`) + full name, hover-fade wrapper.
 * The typed name resolves to a member (case-insensitive full match);
 * unmatched input keeps the previous owner — our `ownerId` is a real
 * relation, unlike the reference's free string (documented deviation).
 */
export function OwnerCell({
  owner,
  members,
  onChange,
}: {
  owner: UserDTO | null;
  members: UserDTO[];
  onChange: (userId: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(owner?.name ?? "");

  function commit() {
    const trimmed = draft.trim().toLowerCase();
    const member =
      members.find((m) => m.name.toLowerCase() === trimmed) ?? null;
    if (member && member.id !== owner?.id) onChange(member.id);
    setEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") commit();
    else if (e.key === "Escape") {
      setDraft(owner?.name ?? "");
      setEditing(false);
    }
  }

  if (editing) {
    return (
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        placeholder="Enter name..."
        autoFocus
        className="h-auto border-none bg-transparent p-0 text-[#323338] focus:ring-0"
        aria-label="Enter owner name"
      />
    );
  }

  if (owner) {
    return (
      <button
        type="button"
        aria-label={`Owner: ${owner.name}, change owner`}
        className="cursor-pointer transition-opacity hover:opacity-80"
        onClick={() => {
          setDraft(owner.name);
          setEditing(true);
        }}
      >
        <span className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0073EA]">
            <span className="text-xs font-medium text-white">
              {owner.name.charAt(0).toUpperCase()}
            </span>
          </span>
          <span className="truncate text-sm text-[#323338]">{owner.name}</span>
        </span>
      </button>
    );
  }

  return (
    // Reference empty state: the same affordance shape as "Set date".
    <button
      type="button"
      aria-label="Assign owner"
      className="flex cursor-pointer items-center gap-2 -mx-2 -my-1 px-2 py-1 text-[#676879] transition-colors hover:rounded hover:bg-[#E1E5F3]"
      onClick={() => {
        setDraft("");
        setEditing(true);
      }}
    >
      <User className="h-4 w-4" aria-hidden="true" />
      Assign
    </button>
  );
}
