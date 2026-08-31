import { betterAuth } from "better-auth"
import { pool } from "@/lib/db"

// The v0 development preview renders the app inside an iframe whose document
// origin is the project's `*.vusercontent.net` host, but the provided env vars
// only carry the `*.v0.build`, `*.vercel.run`, and dev-app origins. Without the
// vusercontent origin in trustedOrigins, Better Auth rejects sign-in/sign-up
// with "Invalid origin". We derive the EXACT project-specific vusercontent
// origin from the known v0 hosts (never a wildcard, never a reflected origin).
function deriveV0PreviewOrigins(): string[] {
  const origins = new Set<string>()
  for (const raw of [process.env.V0_RUNTIME_URL, process.env.V0_BUILD_URL]) {
    if (!raw) continue
    try {
      const { host } = new URL(raw)
      // e.g. v0-<slug>.v0.build -> v0-<slug>.vusercontent.net
      const vuser = host.replace(/\.v0\.build$/, ".vusercontent.net")
      if (vuser !== host) origins.add(`https://${vuser}`)
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
