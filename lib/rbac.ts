export const ROLES = ["viewer", "operator", "commander", "admin"] as const
export type Role = (typeof ROLES)[number]

// Higher number = more privilege. Every role inherits the abilities below it.
const RANK: Record<Role, number> = {
  viewer: 0,
  operator: 1,
  commander: 2,
  admin: 3,
}

export type Permission =
  | "documents.screen" // run document screening
  | "documents.view"
  | "events.view"
  | "events.acknowledge" // acknowledge/clear alerts
  | "cameras.view"
  | "cameras.manage" // add/edit/remove cameras + credentials
  | "audit.view" // view tamper-evident ledger
  | "users.manage" // change roles

// Minimum role required for each permission.
const REQUIRED: Record<Permission, Role> = {
  "documents.view": "viewer",
  "events.view": "viewer",
  "cameras.view": "viewer",
  "documents.screen": "operator",
  "events.acknowledge": "operator",
  "cameras.manage": "commander",
  "audit.view": "commander",
  "users.manage": "admin",
}

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value)
}

export function normalizeRole(value: unknown): Role {
  return isRole(value) ? value : "viewer"
}

export function can(role: Role, permission: Permission): boolean {
  return RANK[role] >= RANK[REQUIRED[permission]]
}

export const ROLE_LABELS: Record<Role, string> = {
  viewer: "Viewer",
  operator: "Operator",
  commander: "Commander",
  admin: "Administrator",
}

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  viewer: "Read-only access to dashboards, events, and documents.",
  operator: "Screen documents and acknowledge alerts.",
  commander: "Manage cameras/credentials and review the audit ledger.",
  admin: "Full control including user role management.",
}
