"use client"

import * as React from "react"
import * as SwitchPrimitive from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

/**
 * OLD shadcn/ui switch anatomy — decompiled from the reference bundle
 * (`index-BuEJAhK4.js`) and computed-style-verified live on 2026-09-18:
 * h-5 w-9 track with border-2 (transparent), thumb h-4 w-4 with
 * shadow-lg and translate-x-4 (the reference's checked thumb sits 18px
 * from the track's left edge; the 2024 "new shadcn" geometry renders a
 * 1px border and a 15px offset with no thumb shadow). The reference's v3
 * `shadow-sm` track is ported as v4 `shadow-xs` (identical computed
 * value). Exported constants are contract-locked by primitives.test.ts;
 * see docs/remediation-plan-session13.md.
 */
export const SWITCH_TRACK_CLASS =
  "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input"

export const SWITCH_THUMB_CLASS =
  "pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0"

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(SWITCH_TRACK_CLASS, className)}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(SWITCH_THUMB_CLASS)}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
