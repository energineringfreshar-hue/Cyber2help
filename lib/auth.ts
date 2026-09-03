import { betterAuth } from "better-auth"
import { pool } from "@/lib/db"

// The v0 development preview renders the app inside an iframe served from the
// project's `*.vusercontent.net` host (and mirrored on `*.v0.build`). The
// provided env vars carry ONE snapshot of these URLs, but the trailing
// deployment hash in the subdomain rotates between builds, so an exact-origin
// match silently breaks and Better Auth rejects sign-in/sign-up with
// "Invalid origin".
//
// Fix: derive the STABLE, project-specific subdomain prefix (e.g.
// `v0-energineringfreshar-5579`) from the known v0 hosts and emit a
// hash-tolerant wildcard scoped to THIS project on the v0 preview domains.
// This is intentionally NOT a shared-domain wildcard (never `*.vusercontent.net`)
// and never reflects an arbitrary request origin — it only trusts this
// project's own preview deployments regardless of their build hash.
function deriveV0PreviewOrigins(): string[] {
  const origins = new Set<string>()
  const V0_HASH_DOMAINS = ['v0.build', 'vusercontent.net', 'v0.dev']
  for (const raw of [
    process.env.V0_RUNTIME_URL,
    process.env.V0_BUILD_URL,
    process.env.V0_DEV_APP_URL,
  ]) {
    if (!raw) continue
    try {
      const { host } = new URL(raw)
      // Always trust the exact host we were given.
      origins.add(`https://${host}`)

      const dotIndex = host.indexOf('.')
      if (dotIndex <= 0) continue
      const sub = host.slice(0, dotIndex) // e.g. v0-energineringfreshar-5579-6353d8aa
      // Only wildcard the v0 hash-rotating preview subdomains.
      if (!sub.startsWith('v0-')) continue
      // Strip the trailing "-<hash>" segment to get the stable project prefix.
      const prefix = sub.replace(/-[^-]+$/, '') // e.g. v0-energineringfreshar-5579
      // Guard: keep at least the project slug (v0-<team>...), never bare "v0".
      if (prefix === 'v0' || !prefix.includes('-')) continue
      for (const domain of V0_HASH_DOMAINS) {
        origins.add(`https://${prefix}-*.${domain}`)
      }
    } catch {
      // ignore malformed URLs
    }
  }
  return [...origins]
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
  trustedOrigins: [
    ...(process.env.NODE_ENV === "development"
      ? [
          "http://localhost:3000",
          ...(process.env.V0_RUNTIME_URL ? [process.env.V0_RUNTIME_URL] : []),
          ...(process.env.V0_DEV_APP_URL ? [process.env.V0_DEV_APP_URL] : []),
          ...(process.env.V0_BUILD_URL ? [process.env.V0_BUILD_URL] : []),
          ...(process.env.V0_SANDBOX_URL ? [process.env.V0_SANDBOX_URL] : []),
          // The actual iframe origin used by the v0 preview surface.
          ...deriveV0PreviewOrigins(),
        ]
      : []),
    ...(process.env.NODE_ENV === "production"
      ? [
          ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
          ...(process.env.VERCEL_PROJECT_PRODUCTION_URL
            ? [`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`]
            : []),
        ]
      : []),
  ],
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
