import type { Metadata } from "next";
import { BoardsRoute } from "@/components/app/routes/boards-route";

export const metadata: Metadata = {
  title: "Boards | Task Management",
};

export default function BoardsPage() {
  return <BoardsRoute />;
}
