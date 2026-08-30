'use server'

import { db } from '@/lib/db'
import { cameras } from '@/lib/db/schema'
import { and, desc, eq } from 'drizzle-orm'
import { requireUser } from '@/lib/session'
import { can } from '@/lib/rbac'
import { encryptSecret, decryptSecret, maskRtsp } from '@/lib/crypto'
import { appendAudit } from '@/lib/audit'
import { revalidatePath } from 'next/cache'

export async function getCameras() {
  const user = await requireUser()
  const rows = await db
    .select()
    .from(cameras)
    .where(eq(cameras.userId, user.id))
    .orderBy(desc(cameras.createdAt))
  // Never return the encrypted RTSP blob to the client; decrypt server-side and
  // expose only a credential-masked hint.
  return rows.map(({ rtspEncrypted, ...c }) => {
    let rtspHint: string | null = null
    if (rtspEncrypted) {
      try {
        rtspHint = maskRtsp(decryptSecret(rtspEncrypted))
      } catch {
        rtspHint = 'rtsp://••••'
      }
    }
    return { ...c, rtspHint }
  })
}

export async function addCamera(input: {
  name: string
  location: string
  lat?: string
  lng?: string
  rtspUrl?: string
}) {
  const user = await requireUser()
  if (!can(user.role, 'cameras.manage')) {
    throw new Error('Forbidden: only commanders and admins can manage cameras')
  }
  const [row] = await db
    .insert(cameras)
    .values({
      userId: user.id,
      name: input.name,
      location: input.location,
      lat: input.lat || null,
      lng: input.lng || null,
      // RTSP credentials are encrypted at rest with AES-256-GCM.
      rtspEncrypted: input.rtspUrl ? encryptSecret(input.rtspUrl) : null,
      status: 'online',
    })
    .returning()

  await appendAudit({
    userId: user.id,
    actorEmail: user.email,
    actorRole: user.role,
    action: 'CAMERA_REGISTERED',
    entityType: 'camera',
    entityId: String(row.id),
    payload: { name: input.name, location: input.location, credentialsEncrypted: Boolean(input.rtspUrl) },
  })

  revalidatePath('/cameras')
  revalidatePath('/surveillance')
  return { id: row.id }
}

export async function setCameraStatus(id: number, status: 'online' | 'offline' | 'tamper') {
  const user = await requireUser()
  if (!can(user.role, 'cameras.manage')) throw new Error('Forbidden')
  await db
    .update(cameras)
    .set({ status, lastHeartbeat: new Date() })
    .where(and(eq(cameras.id, id), eq(cameras.userId, user.id)))
  revalidatePath('/cameras')
  revalidatePath('/surveillance')
}

export async function deleteCamera(id: number) {
  const user = await requireUser()
  if (!can(user.role, 'cameras.manage')) throw new Error('Forbidden')
  await db.delete(cameras).where(and(eq(cameras.id, id), eq(cameras.userId, user.id)))
  await appendAudit({
    userId: user.id,
    actorEmail: user.email,
    actorRole: user.role,
    action: 'CAMERA_REMOVED',
    entityType: 'camera',
    entityId: String(id),
  })
  revalidatePath('/cameras')
}
