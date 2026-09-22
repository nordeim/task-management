import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * OLD-shadcn Textarea anatomy — decompiled 2026-09-22 from the reference's
 * Create Board dialog textarea (see docs/remediation-plan-session25.md,
 * Finding 3). The reference renders `px-3 py-2`, v3 `shadow-sm`, a thin
 * `focus-visible:ring-1` ring — and NO `field-sizing-content` (the v3
 * textarea never auto-grows; the NEW-shadcn auto-grow changes the field's
 * height while typing). v3→v4 renames applied when porting: v3 `shadow-sm`
 * → v4 `shadow-xs`, `focus-visible:outline-none` →
 * `focus-visible:outline-hidden`. Locked by primitives.test.ts.
 */
const TEXTAREA_CLASS =
  "flex w-full border bg-transparent px-3 py-2 text-base shadow-xs placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(TEXTAREA_CLASS, className)}
      {...props}
    />
  )
}

export { Textarea, TEXTAREA_CLASS }
