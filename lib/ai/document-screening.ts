import 'server-only'
import { generateObject } from 'ai'
import { z } from 'zod'

// Vision-capable model served through the Vercel AI Gateway (zero-config auth in v0/Vercel).
const VISION_MODEL = 'google/gemini-3.5-flash'

export type DocType = 'passport' | 'visa' | 'national_id' | 'driving_license' | 'permit'

// ---- Schema the vision model must return -------------------------------------------------
const analysisSchema = z.object({
  documentTypeDetected: z
    .string()
    .describe('The kind of ID document actually visible in the image, in lowercase.'),
  legible: z.boolean().describe('Whether the document text is clearly legible.'),
  fields: z.object({
    fullName: z.string().nullable(),
    documentNumber: z.string().nullable(),
    nationality: z.string().nullable(),
    dateOfBirth: z.string().nullable().describe('ISO YYYY-MM-DD if determinable, else null'),
    dateOfExpiry: z.string().nullable().describe('ISO YYYY-MM-DD if determinable, else null'),
    dateOfIssue: z.string().nullable().describe('ISO YYYY-MM-DD if determinable, else null'),
    gender: z.string().nullable(),
    // visa-specific
    visaType: z.string().nullable(),
    stayDurationDays: z.number().nullable(),
    entryValidation: z.string().nullable(),
    // MRZ (machine readable zone) for passports/visas
    mrzLine1: z.string().nullable(),
    mrzLine2: z.string().nullable(),
  }),
  tampering: z.object({
    photoReplacementSuspected: z.boolean(),
    textManipulationSuspected: z.boolean(),
    stampForgerySuspected: z.boolean(),
    fontInconsistencies: z.boolean(),
    edgeOrSplicingArtifacts: z.boolean(),
    confidence: z.number().min(0).max(100).describe('Confidence in the tampering assessment.'),
    notes: z.string().describe('Short human-readable explanation of any tampering signals.'),
  }),
  face: z.object({
    facePresent: z.boolean(),
    faceCount: z.number(),
    faceQuality: z.enum(['good', 'poor', 'none']),
  }),
})

export type DocAnalysis = z.infer<typeof analysisSchema>

// ---- Validation rules (deterministic, runs in code) --------------------------------------
export type ValidationResult = {
  checks: { label: string; passed: boolean; detail: string }[]
  failures: number
}

function parseDate(s: string | null): Date | null {
  if (!s) return null
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d
}

export function validateDocument(docType: DocType, a: DocAnalysis): ValidationResult {
  const checks: ValidationResult['checks'] = []
  const f = a.fields
  const now = new Date()

  const dob = parseDate(f.dateOfBirth)
  const exp = parseDate(f.dateOfExpiry)
  const iss = parseDate(f.dateOfIssue)

  checks.push({
    label: 'Document type matches declared',
    passed: a.documentTypeDetected.includes(docType.split('_')[0]) || docType === 'permit',
    detail: `Declared ${docType}, detected ${a.documentTypeDetected}`,
  })
  checks.push({
    label: 'Required identity fields present',
    passed: Boolean(f.fullName && f.documentNumber),
    detail: f.fullName && f.documentNumber ? 'Name and document number found' : 'Missing name or number',
  })
  checks.push({
    label: 'Document not expired',
    passed: exp ? exp.getTime() > now.getTime() : false,
    detail: exp ? `Expires ${exp.toISOString().slice(0, 10)}` : 'Expiry date unreadable',
  })
  checks.push({
    label: 'Date of birth is plausible',
    passed: dob ? dob.getTime() < now.getTime() && now.getFullYear() - dob.getFullYear() < 120 : false,
    detail: dob ? `DOB ${dob.toISOString().slice(0, 10)}` : 'DOB unreadable',
  })
  if (iss && exp) {
    checks.push({
      label: 'Issue date precedes expiry',
      passed: iss.getTime() < exp.getTime(),
      detail: `Issued ${iss.toISOString().slice(0, 10)}, expires ${exp.toISOString().slice(0, 10)}`,
    })
  }
  if (docType === 'passport' || docType === 'visa') {
    checks.push({
      label: 'Machine Readable Zone (MRZ) present',
      passed: Boolean(f.mrzLine1 && f.mrzLine2),
      detail: f.mrzLine1 && f.mrzLine2 ? 'Two MRZ lines detected' : 'MRZ incomplete or absent',
    })
  }
  if (docType === 'visa') {
    checks.push({
      label: 'Visa stay duration specified',
      passed: typeof f.stayDurationDays === 'number' && f.stayDurationDays! > 0,
      detail: f.stayDurationDays ? `${f.stayDurationDays} days` : 'Stay duration missing',
    })
  }
  checks.push({
    label: 'Portrait photo detected',
    passed: a.face.facePresent && a.face.faceCount >= 1,
    detail: a.face.facePresent ? `${a.face.faceCount} face(s), ${a.face.faceQuality} quality` : 'No face found',
  })

  return { checks, failures: checks.filter((c) => !c.passed).length }
}

// ---- Risk scoring: combine tampering + validation + face --------------------------------
export type RiskBreakdown = {
  score: number
  level: 'low' | 'medium' | 'high' | 'critical'
  reasons: string[]
}

export function computeRisk(a: DocAnalysis, v: ValidationResult): RiskBreakdown {
  let score = 0
  const reasons: string[] = []
  const t = a.tampering

  if (t.photoReplacementSuspected) {
    score += 35
    reasons.push('Possible photo replacement detected')
  }
  if (t.textManipulationSuspected) {
    score += 30
    reasons.push('Signs of text manipulation')
  }
  if (t.stampForgerySuspected) {
    score += 25
    reasons.push('Stamp/seal irregularities')
  }
  if (t.fontInconsistencies) {
    score += 15
    reasons.push('Inconsistent fonts across fields')
  }
  if (t.edgeOrSplicingArtifacts) {
    score += 15
    reasons.push('Edge / splicing artifacts near data')
  }

  // Each failed validation rule adds risk.
  score += v.failures * 8
  if (v.failures > 0) reasons.push(`${v.failures} validation rule(s) failed`)

  if (!a.face.facePresent) {
    score += 12
    reasons.push('No portrait photo detected')
  }
  if (!a.legible) {
    score += 10
    reasons.push('Document poorly legible — manual review advised')
  }

  score = Math.min(100, Math.round(score))
  const level = score >= 75 ? 'critical' : score >= 50 ? 'high' : score >= 25 ? 'medium' : 'low'
  if (reasons.length === 0) reasons.push('No significant anomalies detected')
  return { score, level, reasons }
}

// ---- Face verification (Module 4) --------------------------------------------------------
const faceSchema = z.object({
  sameProbability: z
    .number()
    .min(0)
    .max(100)
    .describe('Probability (0-100) that the portrait and the selfie are the same person.'),
  reasoning: z.string().describe('Short explanation of the facial comparison.'),
})

export type FaceMatchResult =
  | { performed: false }
  | { performed: true; matchConfidence: number; verdict: 'match' | 'possible' | 'mismatch'; reasoning: string }

async function verifyFace(docImageUrl: string, selfieUrl: string): Promise<FaceMatchResult> {
  const { object } = await generateObject({
    model: VISION_MODEL,
    schema: faceSchema,
    system:
      'You are a facial recognition verification module. Compare the portrait photo on the identity document ' +
      '(first image) against the live selfie (second image). Judge whether they are the same individual based on ' +
      'facial structure, not lighting or background. Be conservative.',
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'First image: the document portrait. Second image: the live selfie.' },
          { type: 'file', mediaType: 'image/*', data: docImageUrl },
          { type: 'file', mediaType: 'image/*', data: selfieUrl },
        ],
      },
    ],
  })
  const c = Math.round(object.sameProbability)
  return {
    performed: true,
    matchConfidence: c,
    verdict: c >= 75 ? 'match' : c >= 45 ? 'possible' : 'mismatch',
    reasoning: object.reasoning,
  }
}

// ---- Normalized result the UI + persistence layer consume --------------------------------
export type ScreeningResult = {
  extracted: {
    name: string | null
    documentNumber: string | null
    nationality: string | null
    dateOfBirth: string | null
    dateOfExpiry: string | null
    gender: string | null
    visaType?: string | null
    stayDuration?: string | null
    entryValidation?: string | null
  }
  validation: ValidationResult
  tampering: {
    signals: { type: string; detail: string }[]
    severity: 'low' | 'medium' | 'high' | 'critical'
    confidence: number
  }
  faceMatch: FaceMatchResult
  riskScore: number
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  reasons?: string[]
}

function toTampering(a: DocAnalysis): ScreeningResult['tampering'] {
  const t = a.tampering
  const signals: { type: string; detail: string }[] = []
  if (t.photoReplacementSuspected) signals.push({ type: 'Photo replacement', detail: t.notes || 'Portrait region shows signs of substitution' })
  if (t.textManipulationSuspected) signals.push({ type: 'Text manipulation', detail: t.notes || 'Data fields appear altered' })
  if (t.stampForgerySuspected) signals.push({ type: 'Stamp forgery', detail: t.notes || 'Stamp/seal irregularities detected' })
  if (t.fontInconsistencies) signals.push({ type: 'Font inconsistency', detail: 'Fonts differ across fields' })
  if (t.edgeOrSplicingArtifacts) signals.push({ type: 'Splicing artifacts', detail: 'Edge/cloning artifacts near data zones' })
  const weight = signals.length
  const severity: ScreeningResult['tampering']['severity'] =
    weight >= 3 ? 'critical' : weight === 2 ? 'high' : weight === 1 ? 'medium' : 'low'
  return { signals, severity, confidence: t.confidence }
}

export async function screenDocument(params: {
  docType: DocType
  imageDataUrl: string
  selfieDataUrl?: string
}): Promise<ScreeningResult> {
  const { docType, imageDataUrl, selfieDataUrl } = params

  const { object: analysis } = await generateObject({
    model: VISION_MODEL,
    schema: analysisSchema,
    system:
      'You are a forensic document examiner for a national border-control screening system. ' +
      'You analyze identity and travel documents for authenticity. Extract every field precisely from the ' +
      'image. Assess tampering signals conservatively but do not miss obvious forgeries: look for mismatched ' +
      'fonts, misaligned text, cloned/spliced regions around the photo, inconsistent background security ' +
      'patterns, and irregular stamps. Only report a signal as suspected when the visual evidence supports it. ' +
      'Return null for any field you cannot read. Never invent data.',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Analyze this document. The operator declared it as a "${docType}". Extract all fields, assess tampering, and report face/portrait presence.`,
          },
          { type: 'file', mediaType: 'image/*', data: imageDataUrl },
        ],
      },
    ],
  })

  const validation = validateDocument(docType, analysis)
  const risk = computeRisk(analysis, validation)
  const faceMatch: FaceMatchResult = selfieDataUrl
    ? await verifyFace(imageDataUrl, selfieDataUrl)
    : { performed: false }

  // Face mismatch escalates the risk score.
  let score = risk.score
  const reasons = [...risk.reasons]
  if (faceMatch.performed && faceMatch.verdict === 'mismatch') {
    score = Math.min(100, score + 30)
    reasons.push('Face verification: portrait does not match presented individual')
  } else if (faceMatch.performed && faceMatch.verdict === 'possible') {
    score = Math.min(100, score + 12)
    reasons.push('Face verification inconclusive')
  }
  const riskLevel = score >= 75 ? 'critical' : score >= 50 ? 'high' : score >= 25 ? 'medium' : 'low'

  const f = analysis.fields
  return {
    extracted: {
      name: f.fullName,
      documentNumber: f.documentNumber,
      nationality: f.nationality,
      dateOfBirth: f.dateOfBirth,
      dateOfExpiry: f.dateOfExpiry,
      gender: f.gender,
      visaType: f.visaType,
      stayDuration: f.stayDurationDays != null ? `${f.stayDurationDays} days` : null,
      entryValidation: f.entryValidation,
    },
    validation,
    tampering: toTampering(analysis),
    faceMatch,
    riskScore: score,
    riskLevel,
    reasons,
  }
}
