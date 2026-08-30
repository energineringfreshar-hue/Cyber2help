// Shared event taxonomy + risk/behaviour engine for the border video analytics module.
// This is deterministic and runs on the server so both the Python CV service and the
// in-app simulation feed produce consistent severities.

export type EventType =
  | 'PERSON_IN_RESTRICTED_ZONE'
  | 'VEHICLE_IN_RESTRICTED_ZONE'
  | 'VIRTUAL_FENCE_CROSSED'
  | 'LOITERING'
  | 'WRONG_DIRECTION'
  | 'NIGHT_MOVEMENT'
  | 'ABANDONED_OBJECT'
  | 'MULTIPLE_PERSON_INTRUSION'
  | 'UNKNOWN_PLATE'
  | 'CAMERA_OFFLINE'
  | 'CAMERA_TAMPER'

export type Severity = 'low' | 'medium' | 'high' | 'critical'

export const EVENT_LABELS: Record<EventType, string> = {
  PERSON_IN_RESTRICTED_ZONE: 'Person in restricted zone',
  VEHICLE_IN_RESTRICTED_ZONE: 'Vehicle in restricted zone',
  VIRTUAL_FENCE_CROSSED: 'Virtual fence crossed',
  LOITERING: 'Loitering detected',
  WRONG_DIRECTION: 'Wrong-direction movement',
  NIGHT_MOVEMENT: 'Night-time movement',
  ABANDONED_OBJECT: 'Abandoned object',
  MULTIPLE_PERSON_INTRUSION: 'Multiple-person intrusion',
  UNKNOWN_PLATE: 'Unknown / watchlisted plate',
  CAMERA_OFFLINE: 'Camera offline',
  CAMERA_TAMPER: 'Camera tampering',
}

const BASE_RISK: Record<EventType, number> = {
  PERSON_IN_RESTRICTED_ZONE: 55,
  VEHICLE_IN_RESTRICTED_ZONE: 60,
  VIRTUAL_FENCE_CROSSED: 65,
  LOITERING: 35,
  WRONG_DIRECTION: 45,
  NIGHT_MOVEMENT: 30,
  ABANDONED_OBJECT: 50,
  MULTIPLE_PERSON_INTRUSION: 80,
  UNKNOWN_PLATE: 55,
  CAMERA_OFFLINE: 40,
  CAMERA_TAMPER: 75,
}

export type RiskContext = {
  isNight?: boolean
  unknownSubject?: boolean
  personCount?: number
}

// Combine detections into a single risk score. Compound conditions escalate risk,
// e.g. night + restricted zone + unknown person is far more serious than any alone.
export function scoreEvent(type: EventType, ctx: RiskContext = {}): { score: number; severity: Severity } {
  let score = BASE_RISK[type]
  if (ctx.isNight && type !== 'NIGHT_MOVEMENT') score += 15
  if (ctx.unknownSubject) score += 15
  if (ctx.personCount && ctx.personCount > 1) score += Math.min(20, ctx.personCount * 5)
  score = Math.max(0, Math.min(100, score))
  const severity: Severity = score >= 78 ? 'critical' : score >= 55 ? 'high' : score >= 35 ? 'medium' : 'low'
  return { score, severity }
}

export function isNightNow(d = new Date()): boolean {
  const h = d.getHours()
  return h >= 19 || h < 6
}
