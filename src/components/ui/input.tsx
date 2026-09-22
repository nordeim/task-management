import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * OLD-shadcn Input anatomy — decompiled 2026-09-22 from the reference's
 * authed bundle (Edit Task modal title input / Create Board dialog input /
 * toolbar + table search inputs; see docs/remediation-plan-session25.md,
 * Finding 3). The reference renders the 2024-era shadcn anatomy: `px-3 py-1`,
  * v3 `shadow-sm`, a thin `focus-visible:ring-1` keyboard ring, and NO
 * selection:/dark:/aria-invalid extras. v3→v4 renames applied when porting:
 * v3 `shadow-sm` → v4 `shadow-xs` (computed-equal), `focus-visible:outline-none`
 * → `focus-visible:outline-hidden`. Locked by primitives.test.ts.
 */
const INPUT_CLASS =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(INPUT_CLASS, className)}
      {...props}
    />
  )
}

export { Input, INPUT_CLASS }
