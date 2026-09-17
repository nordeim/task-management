"use client";

import { useState } from "react";
import { Loader2, Lock, Mail } from "lucide-react";
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
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-md">
        {/* Reference card (probed 2026-09-17): padding lives on an INNER div
            with md: variants; every section (logo, title, Google, divider,
            form, footer) stacks inside ONE space-y-6 sm:space-y-8 column. */}
        <div className="relative overflow-hidden rounded-2xl border-0 bg-white/95 text-card-foreground shadow-2xl backdrop-blur-sm">
          <div
            className="absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200"
            aria-hidden="true"
          />
          <div className="p-8 sm:p-10 md:px-10 md:pb-10 md:pt-12">
            <div className="flex flex-col items-center space-y-6 text-center sm:space-y-8">
              <div className="group relative">
                <div
                  className="absolute inset-0 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 opacity-30 blur-xl transition-opacity group-hover:opacity-40"
                  aria-hidden="true"
                />
                <span className="relative flex h-20 w-20 shrink-0 overflow-hidden rounded-full shadow-lg ring-4 ring-white/50 transition-all duration-300 group-hover:shadow-xl sm:h-24 sm:w-24">
                  <span className="flex h-full w-full items-center justify-center rounded-full bg-muted bg-gradient-to-br from-slate-100 to-slate-200 text-xl font-bold text-slate-700 sm:text-2xl">
                    T
                  </span>
                </span>
              </div>
              <div className="space-y-2 sm:space-y-3">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  Welcome to Task Management
                </h1>
                <p className="text-sm font-medium text-slate-500 sm:text-base">Sign in to continue</p>
              </div>

              <div className="w-full">
                <div className="space-y-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex w-full items-center justify-center gap-3 rounded-xl border-slate-200 bg-white px-5 py-3.5 text-base font-medium text-slate-700 transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm"
                    onClick={handleGoogle}
                    disabled={busy !== null}
                  >
                    {/* Reference quirk: the icon rides in a -ml-4 wrapper so the
                        Google logo sits left of optical center, balancing the
                        trailing text. */}
                    <span className="-ml-4">
                      <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
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
                    </span>
                    Continue with Google
                  </Button>
                </div>
              </div>

              <div className="w-full">
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <span className="h-px w-full bg-slate-200" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-3 font-medium tracking-wider text-slate-500">or</span>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="w-full space-y-4 sm:space-y-5" noValidate>
                <div className="space-y-3 sm:space-y-4">
                  {mode === "signup" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="name" className="text-slate-700">
                        Full name
                      </Label>
                      <Input
                        id="name"
                        autoComplete="name"
                        placeholder="Ada Lovelace"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        minLength={2}
                        className="h-11 rounded-xl border-slate-200 bg-slate-50/50 pl-10 placeholder:text-slate-600 focus:border-slate-400 focus:ring-slate-400 sm:h-12"
                      />
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-slate-700">
                      Email
                    </Label>
                    <div className="relative">
                      <Mail
                        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                        aria-hidden="true"
                      />
                      <Input
                        id="email"
                        type="email"
                        autoComplete="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="h-11 rounded-xl border-slate-200 bg-slate-50/50 pl-10 placeholder:text-slate-600 focus:border-slate-400 focus:ring-slate-400 sm:h-12"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="password" className="text-slate-700">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock
                        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                        aria-hidden="true"
                      />
                      <Input
                        id="password"
                        type="password"
                        autoComplete={mode === "login" ? "current-password" : "new-password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={mode === "signup" ? 8 : undefined}
                        className="h-11 rounded-xl border-slate-200 bg-slate-50/50 pl-10 placeholder:text-slate-600 focus:border-slate-400 focus:ring-slate-400 sm:h-12"
                      />
                    </div>
                    {mode === "signup" && (
                      <p className="text-xs text-muted-foreground">Use at least 8 characters.</p>
                    )}
                  </div>
                </div>

                {error && (
                  <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error}
                  </p>
                )}

                <div className="space-y-3">
                  <Button
                    type="submit"
                    className="h-11 w-full rounded-xl bg-slate-900 px-3 py-2 font-medium text-white shadow-sm transition-all duration-200 hover:bg-slate-800 sm:h-12"
                    disabled={busy !== null}
                  >
                    {busy === "form" ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                        {mode === "login" ? "Signing in…" : "Creating account…"}
                      </>
                    ) : mode === "login" ? (
                      "Sign in"
                    ) : (
                      "Sign up"
                    )}
                  </Button>

                  {/* Reference footer: two text links split apart, inside the
                      form's actions section. "Need an account? Sign up" is ONE
                      button with a font-medium slate-700 span on "Sign up". */}
                  <div className="flex flex-col items-center justify-between gap-2 sm:flex-row sm:gap-0">
                    {mode === "login" ? (
                      <>
                        <button
                          type="button"
                          className="text-sm font-medium text-slate-500 transition-colors hover:text-slate-700"
                          onClick={() =>
                            setError("Password reset is not available on this deployment.")
                          }
                        >
                          Forgot password?
                        </button>
                        <button
                          type="button"
                          className="text-sm text-slate-500 transition-colors hover:text-slate-700"
                          onClick={() => {
                            setMode("signup");
                            setError(null);
                          }}
                        >
                          Need an account? <span className="font-medium text-slate-700">Sign up</span>
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="text-sm text-slate-500 transition-colors hover:text-slate-700"
                        onClick={() => {
                          setMode("login");
                          setError(null);
                        }}
                      >
                        Already have an account?{" "}
                        <span className="font-medium text-slate-700">Sign in</span>
                      </button>
                    )}
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
