import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

// No webfont: the reference ships Tailwind v4's DEFAULT system font stack
// (ui-sans-serif, system-ui, …; zero @font-face, verified live + in its
// stylesheet index-DjjZtFMQ.css during session 15). Removing the Inter
// override makes both apps render in the OS font — identical metrics,
// identical truncation boundaries. The reference's body also renders with
// font-smoothing "auto" (NOT antialiased), so that class is gone too.

export const metadata: Metadata = {
  // Reference <title> is exactly "Task Management" on the dashboard and login
  // routes; every other route appends " | Task Management".
  title: "Task Management",
  description:
    "Monday-style task management: boards, groups, kanban, calendar, and analytics for teams that ship.",
  keywords: ["task management", "project boards", "kanban", "teamwork", "productivity"],
  icons: {
    icon: "/icon.svg",
  },
  openGraph: {
    title: "Task Management",
    description: "Boards, tasks, and teamwork in one place.",
    siteName: "Tuesday.com",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans bg-background text-foreground">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
