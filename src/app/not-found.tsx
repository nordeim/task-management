import { NotFoundView } from "@/components/app/not-found-view";

/**
 * Safety net for notFound() calls (none today) and edge cases the catch-all
 * cannot handle — renders the same styled screen with a generic path.
 */
export default function RootNotFound() {
  return <NotFoundView path="" />;
}
