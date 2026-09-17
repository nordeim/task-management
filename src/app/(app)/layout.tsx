import { AppShell } from "@/components/app/app-shell";

/**
 * Route group layout for every authed surface (`/`, `/boards`, `/board`,
 * `/analytics`): the shell boots the session, redirects logged-out users to
 * /login?from_url=<path>, and wraps authed pages in the header +
 * AppProvider. /login and the styled 404 live OUTSIDE this group so they
 * render bare, exactly like the reference.
 */
export default function AppGroupLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AppShell>{children}</AppShell>;
}
