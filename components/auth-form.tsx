"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { GovHeader } from "@/components/brand/gov-header"
import { SeemaRakshakLogo } from "@/components/brand/seema-rakshak-logo"
import { ROLES, ROLE_LABELS, ROLE_DESCRIPTIONS, type Role } from "@/lib/rbac"

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<Role>("operator")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const isSignUp = mode === "sign-up"

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = isSignUp
      ? await authClient.signUp.email({ email, password, name, role } as never)
      : await authClient.signIn.email({ email, password })

    setLoading(false)

    if (error) {
      setError(error.message ?? "Authentication failed. Check your credentials.")
      return
    }

    router.push("/dashboard")
    router.refresh()
  }

  return (
    <main className="relative flex min-h-svh flex-col overflow-hidden bg-[oklch(0.07_0.015_260)] text-foreground">
      {/* Ambient gold + tricolour glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 50% at 30% 40%, oklch(0.3 0.07 70 / 0.28), transparent 70%), radial-gradient(50% 50% at 85% 90%, oklch(0.3 0.09 152 / 0.15), transparent 70%)",
        }}
      />

      {/* Government branding bar */}
      <header className="relative z-10 border-b border-white/10 px-5 py-3 backdrop-blur-sm sm:px-8">
        <GovHeader />
      </header>

      <div className="relative z-10 mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 items-center gap-10 px-5 py-10 lg:grid-cols-2 lg:gap-16 lg:px-8">
        {/* Emblem hero */}
        <section className="flex flex-col items-center text-center">
          <div className="relative flex items-center justify-center">
            <div
              aria-hidden="true"
              className="absolute size-64 rounded-full blur-2xl sm:size-72"
              style={{ background: "radial-gradient(circle, oklch(0.7 0.14 80 / 0.35), transparent 65%)" }}
            />
            <Image
              src="/ashoka-stambh.png"
              alt="Lion Capital of Ashoka — State Emblem of India"
              width={320}
              height={320}
              priority
              className="relative h-56 w-auto object-contain mix-blend-screen sm:h-64"
              style={{
                WebkitMaskImage:
                  'radial-gradient(ellipse 62% 68% at 50% 48%, black 60%, transparent 82%)',
                maskImage:
                  'radial-gradient(ellipse 62% 68% at 50% 48%, black 60%, transparent 82%)',
              }}
            />
          </div>

          <p className="mt-2 font-serif text-xs tracking-wide text-muted-foreground">
            Hon&apos;ble Union Home Minister: Shri Amit Shah
          </p>

          <div className="mt-8 flex flex-col items-center gap-3">
            <div className="flex items-center gap-3">
              <SeemaRakshakLogo className="h-11 w-11" />
              <div className="text-left leading-tight">
                <p className="text-xl font-semibold tracking-tight">
                  Seema Rakshak <span className="font-normal text-muted-foreground">सीमा रक्षक</span>
                </p>
                <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                  SSB / MHA · Border Security Platform
                </p>
              </div>
            </div>
            <div className="flex h-1 w-44 overflow-hidden rounded-full" aria-hidden="true">
              <span className="flex-1 bg-[var(--india-saffron)]" />
              <span className="flex-1 bg-white/85" />
              <span className="flex-1 bg-[var(--india-green)]" />
            </div>
          </div>
        </section>

        {/* Glass form card */}
        <section className="w-full">
          <div className="mx-auto w-full max-w-md rounded-2xl border border-white/10 bg-[oklch(0.15_0.03_260_/_0.6)] p-6 shadow-2xl backdrop-blur-xl sm:p-8">
            <div className="mb-6">
              <h1 className="text-2xl font-semibold tracking-tight text-balance">
                {isSignUp ? "Register operator access" : "Command center sign-in"}
              </h1>
              <p className="mt-1 text-sm text-pretty text-muted-foreground">
                {isSignUp
                  ? "Create a screening account. Role determines your permissions."
                  : "Authenticate to access the screening command center."}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {isSignUp && (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="name">Full name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    autoComplete="name"
                    placeholder="Officer name"
                    className="border-white/15 bg-white/5 focus-visible:border-[var(--india-saffron)] focus-visible:ring-[var(--india-green)]/40"
                  />
                </div>
              )}
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="officer@ssb.gov.in"
                  className="border-white/15 bg-white/5 focus-visible:border-[var(--india-saffron)] focus-visible:ring-[var(--india-green)]/40"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  placeholder="At least 8 characters"
                  className="border-white/15 bg-white/5 focus-visible:border-[var(--india-saffron)] focus-visible:ring-[var(--india-green)]/40"
                />
              </div>

              {isSignUp && (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="role">Assigned role</Label>
                  <select
                    id="role"
                    value={role}
                    onChange={(e) => setRole(e.target.value as Role)}
                    className="h-9 rounded-md border border-white/15 bg-white/5 px-3 text-sm text-foreground focus-visible:border-[var(--india-saffron)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--india-green)]/40"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r} className="bg-popover text-popover-foreground">
                        {ROLE_LABELS[r]}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">{ROLE_DESCRIPTIONS[role]}</p>
                </div>
              )}

              {error && (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Authenticating..." : isSignUp ? "Create account" : "Sign in"}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              {isSignUp ? "Already registered? " : "Need an account? "}
              <Link
                href={isSignUp ? "/sign-in" : "/sign-up"}
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                {isSignUp ? "Sign in" : "Register"}
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}
