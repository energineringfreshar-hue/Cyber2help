import { betterAuth } from "better-auth"
import { pool } from "@/lib/db"

// The v0 editor renders the running app inside a cross-site iframe served from
// several v0/Vercel-owned preview host families (e.g. `*.vusercontent.net`,
// `*.v0.build`, `*.v0.dev`, `*.vercel.run`). The env vars only carry ONE
// snapshot of these URLs and the subdomain hash rotates between builds, so
// hardcoding a single origin — or reconstructing it — silently breaks and
// Better Auth rejects sign-in/sign-up with "Invalid origin".
//
// Robust fix: validate the browser's ACTUAL request Origin against this bounded
// allowlist of v0/Vercel-owned preview domain suffixes. This is not arbitrary
// reflection (only v0-controlled preview hosts qualify) and it is DEVELOPMENT
// ONLY — production stays locked to the exact Vercel URLs below.
const V0_PREVIEW_HOST_SUFFIXES = [
  '.vusercontent.net',
  '.v0.build',
  '.v0.dev',
  '.v0.app',
  '.vercel.run',
]

function isTrustedV0PreviewOrigin(origin: string | null | undefined): boolean {
  if (!origin) return false
  try {
    const url = new URL(origin)
    if (url.protocol !== 'https:') return false
    const host = url.hostname.toLowerCase()
    return V0_PREVIEW_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix))
  } catch {
    return false
  }
}

// Evaluated per request. Returns the concrete origins Better Auth should trust
// for THIS request, appended to any static origins.
function resolveTrustedOrigins(request?: Request): string[] {
  if (process.env.NODE_ENV === 'production') {
    const prod: string[] = []
    if (process.env.VERCEL_URL) prod.push(`https://${process.env.VERCEL_URL}`)
    if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
      prod.push(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`)
    }
    return prod
  }

  // Development / v0 preview.
  const dev: string[] = ['http://localhost:3000']
  for (const url of [
    process.env.V0_RUNTIME_URL,
    process.env.V0_DEV_APP_URL,
    process.env.V0_BUILD_URL,
    process.env.V0_SANDBOX_URL,
  ]) {
    if (url) dev.push(url)
  }

  // Trust the browser's real origin when it belongs to a v0 preview host.
  const rawOrigin = request?.headers.get('origin') ?? null
  const rawReferer = request?.headers.get('referer') ?? null
  const secFetchSite = request?.headers.get('sec-fetch-site') ?? null
  const origin =
    rawOrigin ?? (rawReferer ? new URL(rawReferer).origin : null)

  // DEV ONLY: a same-origin request means the app is calling its own API from
  // the page the browser already loaded. That is inherently safe and covers
  // ANY v0 preview host family (vusercontent / v0.build / v0.dev / future),
  // so trust the resolved origin. Cross-site requests fall through to the
  // explicit v0 preview allowlist below. This never reflects an arbitrary
  // cross-site origin and never disables the CSRF/origin check.
  const isSameOrigin = secFetchSite === 'same-origin' || secFetchSite === 'none'
  if (origin && (isSameOrigin || isTrustedV0PreviewOrigin(origin))) {
    dev.push(origin)
  }

  return dev
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
  // the browser's ACTUAL Origin header against the v0 preview allowlist.
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
