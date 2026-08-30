'use server'

import { db } from '@/lib/db'
import { documents, events, cameras, anprReads, auditLedger } from '@/lib/db/schema'
import { and, desc, eq, gte } from 'drizzle-orm'
import { requireUser } from '@/lib/session'

export async function getDashboardData() {
  const user = await requireUser()
  const uid = user.id

  const [docs, evs, cams, plates, ledger] = await Promise.all([
    db.select().from(documents).where(eq(documents.userId, uid)).orderBy(desc(documents.createdAt)),
    db.select().from(events).where(eq(events.userId, uid)).orderBy(desc(events.createdAt)).limit(200),
    db.select().from(cameras).where(eq(cameras.userId, uid)),
    db.select().from(anprReads).where(eq(anprReads.userId, uid)),
    db.select().from(auditLedger).where(eq(auditLedger.userId, uid)),
  ])

  const highRiskDocs = docs.filter((d) => d.riskLevel === 'high' || d.riskLevel === 'critical').length
  const openAlerts = evs.filter((e) => !e.acknowledged)
  const criticalAlerts = openAlerts.filter((e) => e.severity === 'critical').length
  const camerasOnline = cams.filter((c) => c.status === 'online').length
  const watchlistHits = plates.filter((p) => p.watchlisted).length

  // Severity distribution for the events breakdown bar.
  const severityCounts = { low: 0, medium: 0, high: 0, critical: 0 }
  for (const e of evs) {
    if (e.severity in severityCounts) severityCounts[e.severity as keyof typeof severityCounts]++
  }

  return {
    stats: {
      docsScreened: docs.length,
      highRiskDocs,
      totalEvents: evs.length,
      openAlerts: openAlerts.length,
      criticalAlerts,
      camerasTotal: cams.length,
      camerasOnline,
      plateReads: plates.length,
      watchlistHits,
      ledgerRecords: ledger.length,
    },
    severityCounts,
    recentEvents: evs.slice(0, 6),
    recentDocs: docs.slice(0, 5),
  }
}
