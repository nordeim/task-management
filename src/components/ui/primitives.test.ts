import { describe, expect, it } from "vitest";

import { badgeVariants } from "./badge";
import { buttonVariants } from "./button";
import { INPUT_CLASS } from "./input";
import { LABEL_CLASS } from "./label";
import { SELECT_ITEM_CLASS, SELECT_TRIGGER_CLASS } from "./select";
import { SWITCH_THUMB_CLASS, SWITCH_TRACK_CLASS } from "./switch";
import { TEXTAREA_CLASS } from "./textarea";

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

/**
 * Button anatomy contract (session 21, decompiled live 2026-09-22 from the
 * reference's header ghost icon buttons — see
 * docs/remediation-plan-session21.md, Finding 3). The reference ships the
 * OLD shadcn Button: `transition-colors`, a thin `focus-visible:ring-1`
 * ring, no dark-mode hover variants, no aria-invalid variants, and OLD
 * size utilities (`h-9 w-9` icon, not `size-9`). Same drift class as the
 * Badge/Switch/Select fixes (sessions 13/15) — locked here so future
 * dependency refreshes cannot silently regress the keyboard-focus chrome.
 * v3→v4 renames applied when porting: `focus-visible:outline-none` →
 * `focus-visible:outline-hidden`, v3 `shadow` → v4 `shadow-sm`, v3
 * `shadow-sm` → v4 `shadow-xs`.
 */
describe("button anatomy (decompiled reference contract)", () => {
  it("base uses the old-shadcn tokens: transition-colors, ring-1, gap-2", () => {
    const cls = buttonVariants();
    expect(cls).toContain("transition-colors");
    expect(cls).toContain("focus-visible:outline-hidden");
    expect(cls).toContain("focus-visible:ring-1");
    expect(cls).toContain("focus-visible:ring-ring");
    expect(cls).toContain("gap-2");
    expect(cls).toContain("whitespace-nowrap");
    expect(cls).toContain("disabled:pointer-events-none");
    expect(cls).toContain("disabled:opacity-50");
    expect(cls).toContain("[&_svg]:size-4");
    expect(cls).toContain("[&_svg]:shrink-0");
    expect(cls).toContain("[&_svg]:pointer-events-none");
  });

  it("base drops NEW-shadcn-only classes (transition-all, ring-[3px], data-slot)", () => {
    const cls = buttonVariants();
    expect(cls).not.toContain("transition-all");
    expect(cls).not.toContain("ring-[3px]");
    expect(cls).not.toContain("focus-visible:border-ring");
    expect(cls).not.toContain("ring-ring/50");
    expect(cls).not.toContain("aria-invalid");
    expect(cls).not.toContain("[&_svg:not([class*='size-'])]:size-4");
  });

  it("ghost variant: plain accent hover, no dark-mode extras", () => {
    const cls = buttonVariants({ variant: "ghost" });
    expect(cls).toContain("hover:bg-accent");
    expect(cls).toContain("hover:text-accent-foreground");
    expect(cls).not.toContain("dark:hover:bg-accent/50");
  });

  it("default variant: v3 shadow → v4 shadow-sm mapping", () => {
    const cls = buttonVariants({ variant: "default" });
    expect(cls).toContain("bg-primary");
    expect(cls).toContain("text-primary-foreground");
    expect(cls).toContain("shadow-sm");
    expect(cls).not.toContain("shadow-xs");
    expect(cls).toContain("hover:bg-primary/90");
  });

  it("outline variant: border-input + v3 shadow-sm → v4 shadow-xs, no dark extras", () => {
    const cls = buttonVariants({ variant: "outline" });
    expect(cls).toContain("border");
    expect(cls).toContain("border-input");
    expect(cls).toContain("bg-background");
    expect(cls).toContain("shadow-xs");
    expect(cls).toContain("hover:bg-accent");
    expect(cls).not.toContain("dark:bg-input/30");
    expect(cls).not.toContain("dark:border-input");
  });

  it("sizes use the old geometry (h-9 w-9 icon, not size-9)", () => {
    expect(buttonVariants({ size: "icon" })).toContain("h-9");
    expect(buttonVariants({ size: "icon" })).toContain("w-9");
    expect(buttonVariants({ size: "icon" })).not.toContain("size-9");
    expect(buttonVariants({ size: "sm" })).toContain("h-8");
    expect(buttonVariants({ size: "sm" })).toContain("text-xs");
    expect(buttonVariants({ size: "lg" })).toContain("h-10");
    expect(buttonVariants({ size: "lg" })).toContain("px-8");
    expect(buttonVariants({ size: "default" })).toContain("h-9");
    expect(buttonVariants({ size: "default" })).toContain("px-4");
    expect(buttonVariants({ size: "default" })).not.toContain("has-[>svg]:px-3");
  });
});

/**
 * Input / Textarea / Label anatomy contracts (session 25, decompiled live
 * 2026-09-22 from the reference's authed app — the Edit Task modal title
 * input, the Create Board dialog's input+textarea, and every dialog label;
 * see docs/remediation-plan-session25.md, Findings 3–5). Same drift class
 * as the Badge/Switch/Select/Button fixes: the scaffold shipped NEW-shadcn
 * anatomy (ring-[3px]/ring-ring/50 focus rings, `field-sizing-content`
 * auto-grow textarea, selection:/dark:/aria-invalid extras) while the
 * reference renders the OLD anatomy. v3→v4 renames applied when porting:
 * v3 `shadow-sm` → v4 `shadow-xs`, `focus-visible:outline-none` →
 * `focus-visible:outline-hidden`.
 */
describe("input anatomy (decompiled reference contract)", () => {
  it("base uses the old-shadcn tokens: h-9, px-3 py-1, text-base, ring-1", () => {
    const cls = INPUT_CLASS;
    expect(cls).toContain("flex");
    expect(cls).toContain("h-9");
    expect(cls).toContain("w-full");
    expect(cls).toContain("rounded-md");
    expect(cls).toContain("border");
    expect(cls).toContain("border-input");
    expect(cls).toContain("bg-transparent");
    expect(cls).toContain("px-3");
    expect(cls).toContain("py-1");
    expect(cls).toContain("text-base");
    expect(cls).toContain("md:text-sm");
    expect(cls).toContain("transition-colors");
    expect(cls).toContain("placeholder:text-muted-foreground");
  });

  it("focus ring is the old pattern (ring-1, crisp ring color)", () => {
    const cls = INPUT_CLASS;
    expect(cls).toContain("focus-visible:outline-hidden");
    expect(cls).toContain("focus-visible:ring-1");
    expect(cls).toContain("focus-visible:ring-ring");
  });

  it("v3 shadow-sm → v4 shadow-xs mapping", () => {
    const cls = INPUT_CLASS;
    expect(cls).toContain("shadow-xs");
    expect(cls).not.toContain("shadow-sm");
  });

  it("drops NEW-shadcn-only classes", () => {
    const cls = INPUT_CLASS;
    expect(cls).not.toContain("min-w-0");
    expect(cls).not.toContain("selection:bg-primary");
    expect(cls).not.toContain("dark:bg-input/30");
    expect(cls).not.toContain("file:inline-flex");
    expect(cls).not.toContain("file:h-7");
    expect(cls).not.toContain("transition-[color,box-shadow]");
    expect(cls).not.toContain("outline-none"); // plain outline-none (non-focus-visible)
    expect(cls).not.toContain("ring-[3px]");
    expect(cls).not.toContain("ring-ring/50");
    expect(cls).not.toContain("focus-visible:border-ring");
    expect(cls).not.toContain("aria-invalid");
  });
});

describe("textarea anatomy (decompiled reference contract)", () => {
  it("base uses the old-shadcn tokens: px-3 py-2, text-base, ring-1", () => {
    const cls = TEXTAREA_CLASS;
    expect(cls).toContain("flex");
    expect(cls).toContain("w-full");
    expect(cls).toContain("bg-transparent");
    expect(cls).toContain("px-3");
    expect(cls).toContain("py-2");
    expect(cls).toContain("text-base");
    expect(cls).toContain("md:text-sm");
    expect(cls).toContain("placeholder:text-muted-foreground");
  });

  it("focus ring is the old pattern (ring-1) and NO auto-grow field-sizing", () => {
    const cls = TEXTAREA_CLASS;
    expect(cls).toContain("focus-visible:outline-hidden");
    expect(cls).toContain("focus-visible:ring-1");
    expect(cls).toContain("focus-visible:ring-ring");
    // The reference's v3 textarea never auto-grows — field-sizing-content is
    // a v4 NEW-shadcn behavior change (typing multi-line changes height).
    expect(cls).not.toContain("field-sizing-content");
    expect(cls).not.toContain("min-h-16");
    expect(cls).not.toContain("rounded-md");
    expect(cls).not.toContain("border-input");
  });

  it("v3 shadow-sm → v4 shadow-xs mapping; no NEW extras", () => {
    const cls = TEXTAREA_CLASS;
    expect(cls).toContain("shadow-xs");
    expect(cls).not.toContain("shadow-sm");
    expect(cls).not.toContain("transition-[color,box-shadow]");
    expect(cls).not.toContain("ring-[3px]");
    expect(cls).not.toContain("ring-ring/50");
    expect(cls).not.toContain("aria-invalid");
    expect(cls).not.toContain("dark:bg-input/30");
  });
});

describe("label anatomy (decompiled reference contract)", () => {
  it("base uses the old-shadcn tokens: text-sm font-medium leading-none", () => {
    const cls = LABEL_CLASS;
    expect(cls).toContain("text-sm");
    expect(cls).toContain("font-medium");
    expect(cls).toContain("leading-none");
    expect(cls).toContain("peer-disabled:cursor-not-allowed");
    expect(cls).toContain("peer-disabled:opacity-70");
  });

  it("drops NEW-shadcn-only classes", () => {
    const cls = LABEL_CLASS;
    expect(cls).not.toContain("inline");
    expect(cls).not.toContain("select-none");
    expect(cls).not.toContain("group-data-[disabled=true]");
  });
});
