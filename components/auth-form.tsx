"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ShieldCheck } from "lucide-react"
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
    <main className="min-h-svh bg-background flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-8">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold tracking-tight text-foreground">SecureBorder</p>
            <p className="text-xs text-muted-foreground font-mono">SSB / MHA · Screening Platform</p>
          </div>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-balance text-foreground">
            {isSignUp ? "Register operator access" : "Command center sign-in"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1 text-pretty">
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
            />
          </div>

          {isSignUp && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="role">Assigned role</Label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className="h-9 rounded-md border border-input bg-input/30 px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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

        <p className="text-sm text-muted-foreground text-center mt-6">
          {isSignUp ? "Already registered? " : "Need an account? "}
          <Link
            href={isSignUp ? "/sign-in" : "/sign-up"}
            className="text-primary font-medium underline-offset-4 hover:underline"
          >
            {isSignUp ? "Sign in" : "Register"}
          </Link>
        </p>
      </div>
    </main>
  )
}
