import { describe, expect, it } from "vitest";

import { badgeVariants } from "./badge";
import { SELECT_ITEM_CLASS, SELECT_TRIGGER_CLASS } from "./select";
import { SWITCH_THUMB_CLASS, SWITCH_TRACK_CLASS } from "./switch";

/**
 * Vendored-primitive anatomy contracts — decompiled 2026-09-18 from the
 * reference bundle (`/assets/index-BuEJAhK4.js`, unchanged since session 9)
 * and confirmed with live computed-style probes (see
 * docs/remediation-plan-session13.md). The reference ships the OLD
 * shadcn/ui primitives; these tests lock our vendored copies to that
 * anatomy so future dependency refreshes cannot silently drift the
 * geometry (badge padding/weight/shadow, switch track border/thumb
 * offset/thumb shadow).
 *
 * Tailwind v3 → v4 shadow renames were applied when porting (equivalent
 * computed values, verified live): v3 `shadow` → v4 `shadow-sm`, v3
 * `shadow-sm` → v4 `shadow-xs`; `shadow-lg` is identical in both.
 */

const badgeContract = (variant: "default" | "secondary" | "destructive" | "outline") =>
  badgeVariants({ variant });

describe("badge anatomy (decompiled reference contract)", () => {
  it("base uses the old-shadcn geometry: px-2.5, py-0.5, font-semibold", () => {
    for (const variant of ["default", "secondary", "destructive", "outline"] as const) {
      const cls = badgeContract(variant);
      expect(cls).toContain("px-2.5");
      expect(cls).toContain("py-0.5");
      expect(cls).toContain("font-semibold");
      expect(cls).toContain("rounded-md");
      expect(cls).toContain("text-xs");
    }
  });

  it("base drops NEW-shadcn-only classes (font-medium, w-fit, shrink-0)", () => {
    for (const variant of ["default", "secondary", "destructive", "outline"] as const) {
      const cls = badgeContract(variant);
      expect(cls).not.toContain("font-medium");
      expect(cls).not.toContain("w-fit");
      expect(cls).not.toContain("shrink-0");
      expect(cls).not.toContain("justify-center");
    }
  });

  it("default variant: primary fill + shadow + hover 80", () => {
    const cls = badgeContract("default");
    expect(cls).toContain("border-transparent");
    expect(cls).toContain("bg-primary");
    expect(cls).toContain("text-primary-foreground");
    // v3 `shadow` == v4 `shadow-sm` (computed 0 1px 3px rgb(0 0 0/.1) ...)
    expect(cls).toContain("shadow-sm");
    expect(cls).not.toContain("shadow-xs");
    expect(cls).toContain("hover:bg-primary/80");
  });

  it("secondary variant: secondary fill, no shadow", () => {
    const cls = badgeContract("secondary");
    expect(cls).toContain("border-transparent");
    expect(cls).toContain("bg-secondary");
    expect(cls).toContain("text-secondary-foreground");
    expect(cls).toContain("hover:bg-secondary/80");
    expect(cls).not.toContain("shadow-sm");
  });

  it("destructive variant: destructive fill + shadow", () => {
    const cls = badgeContract("destructive");
    expect(cls).toContain("border-transparent");
    expect(cls).toContain("bg-destructive");
    expect(cls).toContain("text-destructive-foreground");
    expect(cls).toContain("shadow-sm");
    expect(cls).toContain("hover:bg-destructive/80");
  });

  it("outline variant: text-foreground only, transparent background", () => {
    const cls = badgeContract("outline");
    expect(cls).toContain("text-foreground");
    expect(cls).not.toContain("bg-primary");
    expect(cls).not.toContain("bg-secondary");
    expect(cls).not.toContain("bg-accent");
  });

  it("focus ring is the old pattern (ring-2 + ring-offset-2)", () => {
    for (const variant of ["default", "secondary", "destructive", "outline"] as const) {
      const cls = badgeContract(variant);
      expect(cls).toContain("focus:ring-2");
      expect(cls).toContain("focus:ring-offset-2");
    }
  });
});

describe("switch anatomy (decompiled reference contract)", () => {
  it("track is h-5 w-9 with border-2 and the old focus ring", () => {
    const cls = SWITCH_TRACK_CLASS;
    expect(cls).toContain("h-5");
    expect(cls).toContain("w-9");
    expect(cls).toContain("border-2");
    expect(cls).toContain("border-transparent");
    // v3 `shadow-sm` == v4 `shadow-xs` (track computed shadow ~0 1px 2px)
    expect(cls).toContain("shadow-xs");
    expect(cls).toContain("rounded-full");
    expect(cls).toContain("data-[state=checked]:bg-primary");
    expect(cls).toContain("data-[state=unchecked]:bg-input");
    expect(cls).toContain("focus-visible:ring-2");
    expect(cls).toContain("focus-visible:ring-offset-2");
  });

  it("track drops NEW-shadcn-only geometry (h-[1.15rem], w-8, ring-[3px])", () => {
    const cls = SWITCH_TRACK_CLASS;
    expect(cls).not.toContain("h-[1.15rem]");
    expect(cls).not.toContain("w-8");
    expect(cls).not.toContain("ring-[3px]");
    expect(cls).not.toContain("transition-all");
  });

  it("thumb is h-4 w-4 with shadow-lg and translate-x-4 steps", () => {
    const cls = SWITCH_THUMB_CLASS;
    expect(cls).toContain("h-4");
    expect(cls).toContain("w-4");
    expect(cls).toContain("bg-background");
    expect(cls).toContain("shadow-lg");
    expect(cls).toContain("data-[state=checked]:translate-x-4");
    expect(cls).toContain("data-[state=unchecked]:translate-x-0");
    expect(cls).toContain("rounded-full");
  });

  it("thumb drops the NEW-shadcn calc translate", () => {
    const cls = SWITCH_THUMB_CLASS;
    expect(cls).not.toContain("translate-x-[calc");
    expect(cls).not.toContain("size-4");
  });
});

describe("select anatomy (decompiled reference contract)", () => {
  /**
   * The reference's vendored Select is the OLD shadcn anatomy (decompiled
   * 2026-09-19 from the unchanged bundle; see
   * docs/remediation-plan-session15.md). The load-bearing detail: the
   * trigger's height is the PLAIN `h-9` utility — so a consumer's `h-full`
   * (priority cell) or `h-auto` (status cell open state) merges it away in
   * cn()/tailwind-merge and wins, exactly like the reference. The NEW-shadcn
   * `data-[size=default]:h-9` attribute variant cannot be merged away and
   * pins the trigger at 36px — which inflated every board-table row by ~5px
   * vs the reference (verified live, session 15).
   */
  it("trigger uses the old geometry: plain h-9, w-full, px-3 py-2", () => {
    const cls = SELECT_TRIGGER_CLASS;
    expect(cls).toContain("h-9");
    expect(cls).toContain("w-full");
    expect(cls).toContain("px-3");
    expect(cls).toContain("py-2");
    expect(cls).toContain("text-sm");
    expect(cls).toContain("items-center");
    expect(cls).toContain("justify-between");
    expect(cls).toContain("whitespace-nowrap");
    expect(cls).toContain("rounded-md");
    expect(cls).toContain("border-input");
    // v3 `shadow-sm` == v4 `shadow-xs` (trigger computed shadow 0 1px 2px)
    expect(cls).toContain("shadow-xs");
    expect(cls).toContain("[&>span]:line-clamp-1");
    expect(cls).toContain("data-[placeholder]:text-muted-foreground");
  });

  it("trigger height is a plain utility, NOT the NEW data-size variant", () => {
    const cls = SELECT_TRIGGER_CLASS;
    expect(cls).not.toContain("data-[size=default]:h-9");
    expect(cls).not.toContain("data-[size=sm]:h-8");
    expect(cls).not.toContain("w-fit");
    expect(cls).not.toContain("focus-visible:ring-[3px]");
    expect(cls).not.toContain("transition-[color,box-shadow]");
  });

  it("trigger keeps the old focus ring (ring-1 + offset background)", () => {
    const cls = SELECT_TRIGGER_CLASS;
    expect(cls).toContain("focus:ring-1");
    expect(cls).toContain("focus:ring-ring");
    expect(cls).toContain("ring-offset-background");
    expect(cls).toContain("focus:outline-hidden");
  });

  it("item uses the old geometry: py-1.5 pl-2 pr-8, absolute indicator", () => {
    const cls = SELECT_ITEM_CLASS;
    expect(cls).toContain("py-1.5");
    expect(cls).toContain("pl-2");
    expect(cls).toContain("pr-8");
    expect(cls).toContain("text-sm");
    expect(cls).toContain("rounded-sm");
    expect(cls).toContain("focus:bg-accent");
    expect(cls).toContain("focus:text-accent-foreground");
    expect(cls).not.toContain("gap-2");
  });
});
