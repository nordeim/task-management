import type { Metadata } from "next";
import { Suspense } from "react";
import { BoardRoute } from "@/components/app/routes/board-route";

export const metadata: Metadata = {
  title: "Board | Task Management",
};

export default function BoardPage() {
  return (
    <Suspense fallback={null}>
      <BoardRoute />
    </Suspense>
  );
}
