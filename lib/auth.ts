import { betterAuth } from "better-auth"
import { pool } from "@/lib/db"

// Better Auth rejects sign-in/sign-up with "Invalid origin" whenever the
// browser's request Origin is not in `trustedOrigins`. Two things make a fixed
// list unreliable here:
//   1. The v0 editor renders the app inside a cross-site iframe whose preview
//      host family (`*.vusercontent.net`, `*.v0.build`, `*.v0.dev`, `*.v0.app`)
//      rotates between builds, and the V0_* URL env vars are frequently unset.
//   2. Deployments (production domain, branch/preview `*.vercel.app`, and the
//      v0 published embed) are served from several Vercel-owned origins, not
//      just VERCEL_PROJECT_PRODUCTION_URL.
//
// Robust fix: evaluate trusted origins PER REQUEST and additionally trust
//   - genuinely SAME-ORIGIN requests (the app calling its own API — inherently
//     safe, this is not cross-site), and
//   - Vercel/v0-owned preview host families.
// This never reflects an arbitrary cross-site origin and never disables the
// CSRF/origin check.
const TRUSTED_HOST_SUFFIXES = [
  '.vercel.app',
  '.vusercontent.net',
  '.v0.build',
  '.v0.dev',
  '.v0.app',
  '.vercel.run',
]

function isTrustedHost(origin: string): boolean {
  try {
    const url = new URL(origin)
    if (url.protocol !== 'https:') return false
    const host = url.hostname.toLowerCase()
    return TRUSTED_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix))
  } catch {
    return false
  }
}

function resolveTrustedOrigins(request?: Request): string[] {
  const trusted: string[] = []

  // Explicit, always-trusted origins from the environment.
  if (process.env.VERCEL_URL) trusted.push(`https://${process.env.VERCEL_URL}`)
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    trusted.push(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`)
  }

  const isDev = process.env.NODE_ENV !== 'production'
  if (isDev) {
    trusted.push('http://localhost:3000')
    for (const url of [
      process.env.V0_RUNTIME_URL,
      process.env.V0_DEV_APP_URL,
      process.env.V0_BUILD_URL,
      process.env.V0_SANDBOX_URL,
    ]) {
      if (url) trusted.push(url)
    }
  }

  // Resolve the browser's actual origin (Origin header preferred, Referer as
  // fallback).
  const rawOrigin = request?.headers.get('origin') ?? null
  const rawReferer = request?.headers.get('referer') ?? null
  let origin = rawOrigin
  if (!origin && rawReferer) {
    try {
      origin = new URL(rawReferer).origin
    } catch {
      origin = null
    }
  }

  if (origin) {
    const secFetchSite = request?.headers.get('sec-fetch-site') ?? null
    const isSameOrigin = secFetchSite === 'same-origin' || secFetchSite === 'none'
    // In dev, trust the resolved origin outright (dev is not a security
    // boundary). In production, trust it only if it is same-origin or a
    // Vercel/v0-owned host.
    if (isDev || isSameOrigin || isTrustedHost(origin)) {
      trusted.push(origin)
    }
  }

  return trusted
}

export const auth = betterAuth({
  database: pool,
  baseURL:
    process.env.BETTER_AUTH_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : process.env.V0_RUNTIME_URL),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
  user: {
    additionalFields: {
      // RBAC role: admin | commander | operator | viewer
      role: {
        type: "string",
        required: false,
        defaultValue: "viewer",
        input: true,
      },
    },
  },
  // Function form: Better Auth evaluates this per request, so we can validate
  // the browser's ACTUAL Origin header against the rules in
  // resolveTrustedOrigins (env URLs, same-origin, and Vercel/v0-owned hosts).
  trustedOrigins: resolveTrustedOrigins,
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  ...(process.env.NODE_ENV === "development"
    ? {
        advanced: {
          // Required by the cross-site v0 preview iframe. Without these
          // attributes, login succeeds but the next request appears signed out.
          defaultCookieAttributes: {
            sameSite: "none" as const,
            secure: true,
          },
        },
      }
    : {}),
})
