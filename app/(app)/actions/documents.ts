'use server'

import { db } from '@/lib/db'
import { documents } from '@/lib/db/schema'
import { and, desc, eq } from 'drizzle-orm'
import { requireUser } from '@/lib/session'
import { can } from '@/lib/rbac'
import { sha256 } from '@/lib/crypto'
import { appendAudit } from '@/lib/audit'
import { screenDocument, type DocType } from '@/lib/ai/document-screening'
import { revalidatePath } from 'next/cache'

export async function getDocuments() {
  const user = await requireUser()
  return db
    .select()
    .from(documents)
    .where(eq(documents.userId, user.id))
    .orderBy(desc(documents.createdAt))
}

export async function getDocument(id: number) {
  const user = await requireUser()
  const rows = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, id), eq(documents.userId, user.id)))
    .limit(1)
  return rows[0] ?? null
}

export type ScreenInput = {
  docType: DocType
  imageName: string
  imageDataUrl: string
  selfieDataUrl?: string
}

export async function screenAndSaveDocument(input: ScreenInput) {
  const user = await requireUser()
  if (!can(user.role, 'documents.screen')) {
    throw new Error('Forbidden: your role cannot run document screening')
  }

  const result = await screenDocument({
    docType: input.docType,
    imageDataUrl: input.imageDataUrl,
    selfieDataUrl: input.selfieDataUrl,
  })

  const imageHash = sha256(input.imageDataUrl)

  const [row] = await db
    .insert(documents)
    .values({
      userId: user.id,
      docType: input.docType,
      imageName: input.imageName,
      imageHash,
      extracted: result.extracted,
      validation: result.validation,
      tampering: result.tampering,
      faceMatch: result.faceMatch,
      riskScore: result.riskScore,
      riskLevel: result.riskLevel,
      status: result.riskLevel === 'critical' || result.riskLevel === 'high' ? 'flagged' : 'cleared',
    })
    .returning()

  await appendAudit({
    userId: user.id,
    actorEmail: user.email,
    actorRole: user.role,
    action: 'DOCUMENT_SCREENED',
    entityType: 'document',
    entityId: String(row.id),
    payload: {
      docType: input.docType,
      imageHash,
      riskScore: result.riskScore,
      riskLevel: result.riskLevel,
    },
  })

  revalidatePath('/documents')
  return row
}
