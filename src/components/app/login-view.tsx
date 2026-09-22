"use client";

import { useState } from "react";
import { ArrowLeft, Loader2, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api-client";
import type { UserDTO } from "@/lib/domain";

type Mode = "login" | "signup";

export function LoginView({ onAuth }: { onAuth: (user: UserDTO) => void }) {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"google" | "form" | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    if (mode === "signup" && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setBusy("form");
    try {
      // The redesigned platform signup (session 25) sends no name — the
      // account renders under its email prefix (deriveSignupName server-side).
      const path = mode === "login" ? "/api/auth/login" : "/api/auth/signup";
      const body = mode === "login" ? { email, password } : { email, password };
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

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-md">
        {/* Reference card (probed 2026-09-17, re-probed 2026-09-22 after the
            platform redeploy): padding lives on an INNER div with md:
            variants; every section stacks inside ONE space-y-6 sm:space-y-8
            column. The platform page compiles under the Tailwind v3 PLAY CDN
            (cdn.tailwindcss.com + window.tailwind.config — session 27), so
            v3→v4 renames DO apply on this surface: shadow-sm→shadow-xs,
            backdrop-blur-sm→backdrop-blur-xs. space-y ports verbatim because
            globals.css already restores v3 margin-direction semantics. */}
        <div className="relative overflow-hidden rounded-2xl border-0 bg-white/95 text-card-foreground shadow-2xl backdrop-blur-xs">
          <div
            className="absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200"
            aria-hidden="true"
          />
          <div className="p-8 sm:p-10 md:px-10 md:pb-10 md:pt-12">
            <div className="flex flex-col items-center space-y-6 text-center sm:space-y-8">
              {mode === "login" ? (
                <>
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

              {/* Reference (probed 2026-09-18, re-probed 2026-09-22): the
                  Google button, the OR divider, and the form live inside ONE
                  w-full wrapper — a single column child — with the divider
                  carrying `my-6` itself. The platform's Google button is a
                  PLAIN button (no shadcn base classes — verbatim port below,
                  classic "G" svg paths, trailing `group` verbatim from the
                  redeployed DOM — inert, no group-hover consumer inside). */}
              <div className="w-full">
                <div className="space-y-3">
                  <button
                    type="button"
                    className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-5 py-3.5 font-medium text-[16px] text-slate-700 transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:shadow-xs group"
                    onClick={handleGoogle}
                    disabled={busy !== null}
                  >
                    {/* Reference quirk: the icon rides in a -ml-4 wrapper so the
                        Google logo sits left of optical center, balancing the
                        trailing text. */}
                    <span className="-ml-4 transition-transform duration-200">
                      <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                    </span>
                    Continue with Google
                  </button>
                </div>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <span className="h-px w-full bg-slate-200" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-3 font-medium tracking-wider text-slate-500">or</span>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="w-full space-y-4 sm:space-y-5" noValidate>
                <div className="space-y-3 sm:space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-slate-700 leading-5">
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
                        className="h-11 rounded-xl border-slate-200 bg-slate-50/50 py-2 pl-10 placeholder:text-slate-600 focus:border-slate-400 focus:ring-slate-400 focus-visible:ring-slate-400 focus-visible:ring-2 focus-visible:ring-offset-2 shadow-none sm:h-12"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="password" className="text-slate-700 leading-5">
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
                        className="h-11 rounded-xl border-slate-200 bg-slate-50/50 py-2 pl-10 placeholder:text-slate-600 focus:border-slate-400 focus:ring-slate-400 focus-visible:ring-slate-400 focus-visible:ring-2 focus-visible:ring-offset-2 shadow-none sm:h-12"
                      />
                    </div>
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
                    className="h-11 w-full gap-1 rounded-xl bg-slate-900 px-3 py-2 font-medium text-white shadow-xs transition-all duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 hover:bg-slate-800 sm:h-12"
                    disabled={busy !== null}
                  >
                    {busy === "form" ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                        Signing in…
                      </>
                    ) : (
                      "Sign in"
                    )}
                  </Button>

                  {/* Reference footer: two text links split apart, inside the
                      form's actions section. "Need an account? Sign up" is ONE
                      button with a font-medium slate-700 span on "Sign up". */}
                  <div className="flex flex-col items-center justify-between gap-2 sm:flex-row sm:gap-0">
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
                      onClick={() => switchMode("signup")}
                    >
                      Need an account? <span className="font-medium text-slate-700">Sign up</span>
                    </button>
                  </div>
                </div>
                </form>
              </div>
                </>
              ) : (
                /* Signup mode (platform redesign, probed 2026-09-22): NO logo,
                   NO Google button, NO footer — a Back-to-sign-in link, an h2,
                   and Email / Password / Confirm Password (no Full name; the
                   account renders under its email prefix). Inputs are
                   h-10 sm:h-11 with slate-400 placeholders/icons. */
                <div className="w-full">
                  <div className="space-y-4">
                    <button
                      type="button"
                      className="-mb-2 flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-700"
                      onClick={() => switchMode("login")}
                    >
                      <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to sign in
                    </button>
                    <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">Create your account</h2>
                    <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4" noValidate>
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="signup-email" className="text-slate-700 leading-5">
                            Email
                          </Label>
                          <div className="relative">
                            <Mail
                              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                              aria-hidden="true"
                            />
                            <Input
                              id="signup-email"
                              type="email"
                              autoComplete="email"
                              placeholder="you@example.com"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              required
                              className="h-10 rounded-xl border-slate-200 bg-slate-50/50 py-2 pl-10 text-sm placeholder:text-slate-400 focus:border-slate-400 focus:ring-slate-400 focus-visible:ring-slate-400 focus-visible:ring-2 focus-visible:ring-offset-2 shadow-none sm:h-11 sm:text-base"
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="signup-password" className="text-slate-700 leading-5">
                            Password
                          </Label>
                          <div className="relative">
                            <Lock
                              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                              aria-hidden="true"
                            />
                            <Input
                              id="signup-password"
                              type="password"
                              autoComplete="new-password"
                              placeholder="Min. 8 characters"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              required
                              minLength={8}
                              className="h-10 rounded-xl border-slate-200 bg-slate-50/50 py-2 pl-10 text-sm placeholder:text-slate-400 focus:border-slate-400 focus:ring-slate-400 focus-visible:ring-slate-400 focus-visible:ring-2 focus-visible:ring-offset-2 shadow-none sm:h-11 sm:text-base"
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="signup-confirm" className="text-slate-700 leading-5">
                            Confirm Password
                          </Label>
                          <div className="relative">
                            <Lock
                              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                              aria-hidden="true"
                            />
                            <Input
                              id="signup-confirm"
                              type="password"
                              autoComplete="new-password"
                              placeholder="Re-enter password"
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              required
                              minLength={8}
                              className="h-10 rounded-xl border-slate-200 bg-slate-50/50 py-2 pl-10 text-sm placeholder:text-slate-400 focus:border-slate-400 focus:ring-slate-400 focus-visible:ring-slate-400 focus-visible:ring-2 focus-visible:ring-offset-2 shadow-none sm:h-11 sm:text-base"
                            />
                          </div>
                        </div>
                      </div>

                      {error && (
                        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                          {error}
                        </p>
                      )}

                      <Button
                        type="submit"
                        className="h-10 w-full gap-1 rounded-xl bg-slate-900 px-3 py-2 font-medium text-white shadow-xs transition-all duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 hover:bg-slate-800 sm:h-11"
                        disabled={busy !== null}
                      >
                        {busy === "form" ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                            Creating account…
                          </>
                        ) : (
                          "Create account"
                        )}
                      </Button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Reference (redeployed 2026-09-23, remediation-plan-session29
            Finding 1): a mobile-only spacer footer follows the card — mt-8
            + one text-xs whitespace line, hidden from 640px up. Renders in
            BOTH modes (it sits outside the mode conditional). */}
        <div className="mt-8 text-center text-xs text-slate-400 sm:hidden">
          <p>&nbsp;</p>
        </div>
      </div>
    </main>
  );
}
