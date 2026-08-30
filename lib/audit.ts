import "server-only"
import { db } from "@/lib/db"
import { auditLedger } from "@/lib/db/schema"
import { desc, eq } from "drizzle-orm"
import { hashObject } from "@/lib/crypto"

const GENESIS_HASH = "0".repeat(64)

export type AuditInput = {
  userId: string
  actorEmail?: string | null
  actorRole?: string | null
  action: string
  entityType?: string
  entityId?: string | number
  payload?: Record<string, unknown>
}

/**
 * Append a record to the tamper-evident, hash-chained audit ledger.
 * Each record stores a SHA-256 of its canonical payload plus the previous
 * record's hash, so any modification of history breaks the chain.
 */
export async function appendAudit(input: AuditInput) {
  const [prev] = await db
    .select({ dataHash: auditLedger.dataHash })
    .from(auditLedger)
    .where(eq(auditLedger.userId, input.userId))
    .orderBy(desc(auditLedger.id))
    .limit(1)

  const prevHash = prev?.dataHash ?? GENESIS_HASH

  const canonicalRecord = {
    userId: input.userId,
    actorEmail: input.actorEmail ?? null,
    actorRole: input.actorRole ?? null,
    action: input.action,
    entityType: input.entityType ?? null,
    entityId: input.entityId != null ? String(input.entityId) : null,
    payload: input.payload ?? {},
    prevHash,
  }

  const dataHash = hashObject(canonicalRecord)

  const [row] = await db
    .insert(auditLedger)
    .values({
      userId: input.userId,
      actorEmail: input.actorEmail ?? null,
      actorRole: input.actorRole ?? null,
      action: input.action,
      entityType: input.entityType ?? null,
      entityId: input.entityId != null ? String(input.entityId) : null,
      payload: input.payload ?? {},
      dataHash,
      prevHash,
    })
    .returning()

  return row
}

/**
 * Recompute the chain and report the first record (if any) whose stored hash
 * or link is inconsistent. Used by the integrity page to prove tamper-evidence.
 */
export async function verifyLedger(userId: string) {
  const rows = await db
    .select()
    .from(auditLedger)
    .where(eq(auditLedger.userId, userId))
    .orderBy(auditLedger.id)

  let expectedPrev = GENESIS_HASH
  const results = rows.map((r) => {
    const recomputed = hashObject({
      userId: r.userId,
      actorEmail: r.actorEmail ?? null,
      actorRole: r.actorRole ?? null,
      action: r.action,
      entityType: r.entityType ?? null,
      entityId: r.entityId ?? null,
      payload: r.payload ?? {},
      prevHash: r.prevHash,
    })
    const hashOk = recomputed === r.dataHash
    const linkOk = r.prevHash === expectedPrev
    expectedPrev = r.dataHash
    return { id: r.id, hashOk, linkOk, valid: hashOk && linkOk }
  })

  return {
    total: rows.length,
    valid: results.every((r) => r.valid),
    brokenAt: results.find((r) => !r.valid)?.id ?? null,
    results,
  }
}
