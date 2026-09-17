"use client";

import { AnalyticsView } from "@/components/app/analytics-view";

/** `/Analytics` — the cross-board analytics dashboard. The shell (auth +
 * header) comes from the root layout's AppShell. */
export function AnalyticsRoute() {
  return <AnalyticsView />;
}
