import type { Metadata } from "next";
import { DashboardRoute } from "@/components/app/routes/dashboard-route";

export const metadata: Metadata = {
  title: "Task Management",
};

export default function Home() {
  return <DashboardRoute />;
}
