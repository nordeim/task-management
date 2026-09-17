import type { Metadata } from "next";
import { NotFoundView } from "@/components/app/not-found-view";

/**
 * Catch-all for every unknown path — the reference (a CSR SPA) serves its
 * styled 404 content for ALL unknown URLs, so this page replicates that
 * with a server-rendered per-path title:
 * "/boards/does-not-exist" → "Does Not Exist | Task Management".
 */

function titlecaseSegment(segment: string): string {
  return segment
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ path: string[] }>;
}): Promise<Metadata> {
  const { path } = await params;
  const last = path[path.length - 1] ?? "";
  const title = last ? titlecaseSegment(last) : "Not Found";
  return { title: `${title} | Task Management` };
}

export default async function CatchAllPage({
  params,
}: {
  params: Promise<{ path: string[] }>;
}) {
  const { path } = await params;
  // The reference quotes the full path without the leading slash,
  // e.g. The page "boards/does-not-exist" could not be found…
  return <NotFoundView path={path.join("/")} />;
}
