import { betterAuth } from "better-auth"
import { pool } from "@/lib/db"

// The v0 editor renders the running app inside a cross-site iframe whose
// preview host family (e.g. `*.vusercontent.net`, `*.v0.build`, `*.v0.dev`)
// rotates between builds, and the V0_* URL env vars that would name it are
// frequently unset. Hardcoding or reconstructing a single origin therefore
// breaks silently and Better Auth rejects sign-in/sign-up with "Invalid
// origin".
//
// Robust fix: evaluate trusted origins PER REQUEST. In production we stay
// locked to the exact Vercel URLs. In development — which is not a security
// boundary — we trust the browser's actual request origin so the flow works
// on every current and future preview host without maintenance.
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

  // Trust the browser's actual origin in dev. The Origin header is preferred;
  // fall back to the Referer's origin when Origin is absent.
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
  if (origin) dev.push(origin)

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
