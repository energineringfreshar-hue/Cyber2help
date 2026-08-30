import "server-only"
import {
  createHash,
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "crypto"

/**
 * SHA-256 hex digest of a string or Buffer. Used for evidence integrity and
 * the tamper-evident audit ledger.
 */
export function sha256(data: string | Buffer): string {
  return createHash("sha256").update(data).digest("hex")
}

/**
 * Canonical JSON stringify with sorted keys so the same logical object always
 * hashes to the same value regardless of key order.
 */
export function canonicalize(obj: unknown): string {
  if (obj === null || typeof obj !== "object") return JSON.stringify(obj)
  if (Array.isArray(obj)) return `[${obj.map(canonicalize).join(",")}]`
  const keys = Object.keys(obj as Record<string, unknown>).sort()
  return `{${keys
    .map((k) => `${JSON.stringify(k)}:${canonicalize((obj as Record<string, unknown>)[k])}`)
    .join(",")}}`
}

export function hashObject(obj: unknown): string {
  return sha256(canonicalize(obj))
}

// --- AES-256-GCM for camera RTSP credentials -------------------------------
// Key is derived from BETTER_AUTH_SECRET (always present) via scrypt so we
// never persist camera credentials in plaintext.

function getKey(): Buffer {
  const secret = process.env.BETTER_AUTH_SECRET ?? "insecure-dev-fallback-secret"
  return scryptSync(secret, "secureborder-cam-salt", 32)
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv)
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  // iv:tag:ciphertext (all hex)
  return `${iv.toString("hex")}:${tag.toString("hex")}:${enc.toString("hex")}`
}

export function decryptSecret(blob: string): string {
  const [ivHex, tagHex, dataHex] = blob.split(":")
  if (!ivHex || !tagHex || !dataHex) throw new Error("Malformed encrypted blob")
  const decipher = createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivHex, "hex"))
  decipher.setAuthTag(Buffer.from(tagHex, "hex"))
  const dec = Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()])
  return dec.toString("utf8")
}

/** Mask an RTSP URL for display so credentials are never shown in the UI. */
export function maskRtsp(url: string): string {
  try {
    return url.replace(/\/\/([^:]+):([^@]+)@/, "//$1:••••@")
  } catch {
    return "rtsp://••••"
  }
}
