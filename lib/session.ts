import "server-only"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { normalizeRole, type Role, can, type Permission } from "@/lib/rbac"

export type CurrentUser = {
  id: string
  name: string
  email: string
  role: Role
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return null
  const u = session.user as typeof session.user & { role?: string }
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: normalizeRole(u.role),
  }
}

/** Require an authenticated user or redirect to sign-in. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser()
  if (!user) redirect("/sign-in")
  return user
}

/** Require a specific permission; throws for server actions, used after requireUser. */
export function assertCan(role: Role, permission: Permission) {
  if (!can(role, permission)) {
    throw new Error("Forbidden: insufficient role for this action")
  }
}
