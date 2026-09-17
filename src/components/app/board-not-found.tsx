"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/**
 * The reference's in-app "Board not found" state (probed 2026-09-17 at
 * /Board?id=<unknown>): a p-8 page on #F5F6F8 with a centered card —
 * "Board not found" in text-2xl font-bold #323338 and a blue "Back to
 * Boards" pill that links to /Boards.
 */
export function BoardNotFound() {
  return (
    <div className="min-h-screen bg-[#F5F6F8] p-8">
      <div className="mx-auto max-w-7xl">
        <div className="py-16 text-center">
          <h2 className="mb-4 text-2xl font-bold text-[#323338]">Board not found</h2>
          <Link
            href="/Boards"
            className="inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[#0073EA] px-4 py-2 text-sm font-medium text-white shadow transition-colors hover:bg-[#0056B3]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to Boards
          </Link>
        </div>
      </div>
    </div>
  );
}
