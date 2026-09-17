import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

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
      <body className={`${inter.variable} font-sans antialiased bg-background text-foreground`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
