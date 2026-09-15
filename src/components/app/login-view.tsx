"use client";

import { useState } from "react";
import { Github, Loader2, LogIn, Sparkles, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api-client";
import type { UserDTO } from "@/lib/domain";

type Mode = "login" | "signup";

export function LoginView({ onAuth }: { onAuth: (user: UserDTO) => void }) {
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"google" | "form" | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setBusy("form");
    try {
      const path = mode === "login" ? "/api/auth/login" : "/api/auth/signup";
      const body = mode === "login" ? { email, password } : { name, email, password };
      const result = await api<UserDTO>(path, { method: "POST", body });
      if (result.ok) {
        onAuth(result.data);
      } else {
        setError(result.error);
      }
    } finally {
      setBusy(null);
    }
  }

  function handleGoogle() {
    // OAuth needs provider credentials that this deployment does not carry;
    // being explicit beats a dead button.
    setError("Google sign-in is not configured on this deployment — use email and password below.");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <span
            className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl text-xl font-bold text-white"
            style={{ backgroundColor: "#0073ea" }}
          >
            T
          </span>
          <h1 className="text-3xl font-bold tracking-tight">Welcome to Task Management</h1>
          <p className="mt-2 text-muted-foreground">Sign in to continue</p>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm sm:p-8">
          <Button
            type="button"
            variant="outline"
            className="mb-5 h-11 w-full text-sm font-medium"
            onClick={handleGoogle}
            disabled={busy !== null}
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z"
              />
            </svg>
            Continue with Google
          </Button>

          <div className="relative mb-5">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">or</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
                  autoComplete="name"
                  placeholder="Ada Lovelace"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  minLength={2}
                  className="h-10"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={mode === "signup" ? 8 : undefined}
                className="h-10"
              />
              {mode === "signup" && (
                <p className="text-xs text-muted-foreground">Use at least 8 characters.</p>
              )}
            </div>

            {error && (
              <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <Button type="submit" className="h-11 w-full text-sm font-semibold" disabled={busy !== null}>
              {busy === "form" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {mode === "login" ? "Signing in…" : "Creating account…"}
                </>
              ) : (
                <>
                  {mode === "login" ? (
                    <>
                      <LogIn className="mr-2 h-4 w-4" /> Sign in
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" /> Sign up
                    </>
                  )}
                </>
              )}
            </Button>
          </form>

          <div className="mt-5 flex flex-col items-center gap-2 text-sm">
            {mode === "login" ? (
              <>
                <button
                  type="button"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() =>
                    setError("Password reset is not available on this deployment.")
                  }
                >
                  Forgot password?
                </button>
                <p className="text-muted-foreground">
                  Need an account?{" "}
                  <button
                    type="button"
                    className="font-medium text-primary hover:underline"
                    onClick={() => {
                      setMode("signup");
                      setError(null);
                    }}
                  >
                    Sign up
                  </button>
                </p>
              </>
            ) : (
              <p className="text-muted-foreground">
                Already have an account?{" "}
                <button
                  type="button"
                  className="font-medium text-primary hover:underline"
                  onClick={() => {
                    setMode("login");
                    setError(null);
                  }}
                >
                  Sign in
                </button>
              </p>
            )}
          </div>
        </div>

        <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
          <Sparkles className="h-3 w-3" aria-hidden="true" />
          Tuesday.com — manage boards, tasks, and teamwork in one place.
        </p>
      </div>
    </main>
  );
}
