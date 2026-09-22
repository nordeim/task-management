"use client"

import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"

import { cn } from "@/lib/utils"

/**
 * OLD-shadcn Label anatomy — decompiled 2026-09-22 from the reference's
 * dialog labels (`text-sm font-medium leading-none peer-disabled:…`; see
 * docs/remediation-plan-session25.md, Finding 3). The NEW-shadcn extras
 * (`inline`, `select-none`, `group-data-[disabled=true]:…`) are dropped.
 * Locked by primitives.test.ts.
 */
const LABEL_CLASS =
  "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"

function Label({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(LABEL_CLASS, className)}
      {...props}
    />
  )
}

export { Label, LABEL_CLASS }
