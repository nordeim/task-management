import { House } from "lucide-react";
import Link from "next/link";

/**
 * The reference's styled "Page Not Found" screen (probed 2026-09-17):
 * a slate page — 404 in text-7xl font-light slate-300, a hairline divider,
 * the offending path quoted in the message, and a white "Go Home" button
 * with a home icon. Server-renderable: the path arrives as a prop.
 */
export function NotFoundView({ path }: { path: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md">
        <div className="space-y-6 text-center">
          <div className="space-y-2">
            <h1 className="text-7xl font-light text-slate-300">404</h1>
            <div className="mx-auto h-0.5 w-16 bg-slate-200" />
          </div>
          <div className="space-y-3">
            <h2 className="text-2xl font-medium text-slate-800">Page Not Found</h2>
            <p className="leading-relaxed text-slate-600">
              The page <span className="font-medium text-slate-700">&quot;{path}&quot;</span> could
              not be found in this application.
            </p>
          </div>
          <div className="pt-6">
            <Link
              href="/"
              className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors duration-200 hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
            >
              <House className="mr-2 h-4 w-4" />
              Go Home
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
