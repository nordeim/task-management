import type { Metadata } from "next";
import { AnalyticsRoute } from "@/components/app/routes/analytics-route";

export const metadata: Metadata = {
  title: "Analytics | Task Management",
};

export default function AnalyticsPage() {
  return <AnalyticsRoute />;
}
