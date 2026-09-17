import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginRoute } from "@/components/app/routes/login-route";

export const metadata: Metadata = {
  title: "Task Management",
};

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginRoute />
    </Suspense>
  );
}
