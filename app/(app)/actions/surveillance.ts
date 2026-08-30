'use server'

import { db } from '@/lib/db'
import { events, anprReads } from '@/lib/db/schema'
import { and, desc, eq } from 'drizzle-orm'
import { requireUser } from '@/lib/session'
import { can } from '@/lib/rbac'
import { appendAudit } from '@/lib/audit'
import { scoreEvent, isNightNow, type EventType, type RiskContext } from '@/lib/surveillance/rules'
import { revalidatePath } from 'next/cache'

export async function getEvents(limit = 100) {
  const user = await requireUser()
  return db
    .select()
    .from(events)
    .where(eq(events.userId, user.id))
    .orderBy(desc(events.createdAt))
    .limit(limit)
}

export async function getAnprReads(limit = 100) {
  const user = await requireUser()
  return db
    .select()
    .from(anprReads)
    .where(eq(anprReads.userId, user.id))
    .orderBy(desc(anprReads.createdAt))
    .limit(limit)
}

export type IngestEventInput = {
  cameraId?: number
  cameraName?: string
  location?: string
  eventType: EventType
  confidence?: number
  snapshot?: string
  context?: RiskContext
  metadata?: Record<string, unknown>
}

// Ingestion endpoint used by both the in-app simulation feed and (in production)
// the external Python CV service. Computes severity server-side and records
// high/critical events to the tamper-evident ledger.
export async function ingestEvent(input: IngestEventInput) {
  const user = await requireUser()
  const { score, severity } = scoreEvent(input.eventType, input.context ?? {})

  const [row] = await db
    .insert(events)
    .values({
      userId: user.id,
      cameraId: input.cameraId ?? null,
      cameraName: input.cameraName ?? null,
      location: input.location ?? null,
      eventType: input.eventType,
      severity,
      riskScore: score,
      confidence: input.confidence ?? null,
      snapshot: input.snapshot ?? null,
      metadata: input.metadata ?? {},
    })
    .returning()

  if (severity === 'high' || severity === 'critical') {
    await appendAudit({
      userId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: 'SURVEILLANCE_ALERT',
      entityType: 'event',
      entityId: String(row.id),
      payload: {
        eventType: input.eventType,
        severity,
        riskScore: score,
        cameraName: input.cameraName ?? null,
        location: input.location ?? null,
      },
    })
  }

  revalidatePath('/surveillance')
  revalidatePath('/alerts')
  return { id: row.id, severity, score }
}

// Fired by the Live Monitoring radar map when a tracked UAV crosses the
// 30 km monitoring-zone boundary. Records a real high-risk event so it flows
// into the same /alerts feed and dashboard as every other detection.
export async function reportAerialIncursion(input: {
  droneId: string
  bearing: number
  rangeKm: number
}) {
  return ingestEvent({
    cameraName: `RADAR-STN-01 · ${input.droneId}`,
    location: `Monitoring zone boundary · bearing ${Math.round(input.bearing)}° · ${input.rangeKm.toFixed(0)} km`,
    eventType: 'VEHICLE_IN_RESTRICTED_ZONE',
    confidence: 90,
    context: { unknownSubject: true, isNight: isNightNow() },
    metadata: {
      subject: 'UAV',
      pattern: 'unusual_flight_pattern',
      droneId: input.droneId,
      bearingDeg: input.bearing,
      rangeKm: input.rangeKm,
    },
  })
}

export async function acknowledgeEvent(id: number) {
  const user = await requireUser()
  if (!can(user.role, 'events.acknowledge')) {
    throw new Error('Forbidden: your role cannot acknowledge alerts')
  }
  await db
    .update(events)
    .set({ acknowledged: true, acknowledgedBy: user.email })
    .where(and(eq(events.id, id), eq(events.userId, user.id)))

  await appendAudit({
    userId: user.id,
    actorEmail: user.email,
    actorRole: user.role,
    action: 'ALERT_ACKNOWLEDGED',
    entityType: 'event',
    entityId: String(id),
  })
  revalidatePath('/alerts')
}

export async function ingestAnpr(input: {
  cameraId?: number
  cameraName?: string
  plate: string
  known: boolean
  watchlisted: boolean
  confidence?: number
}) {
  const user = await requireUser()
  const [row] = await db
    .insert(anprReads)
    .values({
      userId: user.id,
      cameraId: input.cameraId ?? null,
      cameraName: input.cameraName ?? null,
      plate: input.plate,
      known: input.known,
      watchlisted: input.watchlisted,
      confidence: input.confidence ?? null,
    })
    .returning()

  // A watchlisted plate is itself a high-risk surveillance event.
  if (input.watchlisted) {
    await ingestEvent({
      cameraId: input.cameraId,
      cameraName: input.cameraName,
      eventType: 'UNKNOWN_PLATE',
      confidence: input.confidence,
      context: { unknownSubject: true },
      metadata: { plate: input.plate, watchlisted: true },
    })
  }

  revalidatePath('/anpr')
  return { id: row.id }
}
