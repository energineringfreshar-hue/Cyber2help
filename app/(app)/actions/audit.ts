'use server'

import { db } from '@/lib/db'
import { auditLedger } from '@/lib/db/schema'
import { desc, eq } from 'drizzle-orm'
import { requireUser } from '@/lib/session'
import { can } from '@/lib/rbac'
import { verifyLedger } from '@/lib/audit'

export async function getLedger(limit = 200) {
  const user = await requireUser()
  if (!can(user.role, 'audit.view')) throw new Error('Forbidden')
  return db
    .select()
    .from(auditLedger)
    .where(eq(auditLedger.userId, user.id))
    .orderBy(desc(auditLedger.id))
    .limit(limit)
}

export async function runIntegrityCheck() {
  const user = await requireUser()
  if (!can(user.role, 'audit.view')) throw new Error('Forbidden')
  return verifyLedger(user.id)
}
