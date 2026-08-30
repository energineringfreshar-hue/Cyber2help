import {
  pgTable,
  text,
  timestamp,
  boolean,
  serial,
  integer,
  jsonb,
} from "drizzle-orm/pg-core"

// --- Better Auth required tables -------------------------------------------
// Column names are camelCase to match Better Auth's defaults. Do not rename.

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),
  // Custom field: RBAC role. Mirrored via Better Auth additionalFields.
  role: text("role").notNull().default("viewer"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expiresAt").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
})

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  issuer: text("issuer").notNull().default(""),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
})

// --- Module 1-4: Document Screening (SIH 26188) ----------------------------

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  docType: text("docType").notNull(), // passport | visa | national_id | driving_license | permit
  imageName: text("imageName"),
  imageHash: text("imageHash"), // SHA-256 of the uploaded image
  // Module 1: OCR extracted fields
  extracted: jsonb("extracted").$type<Record<string, unknown>>(),
  // Module 2: validation results
  validation: jsonb("validation").$type<Record<string, unknown>>(),
  // Module 3: tampering signals
  tampering: jsonb("tampering").$type<Record<string, unknown>>(),
  // Module 4: face verification
  faceMatch: jsonb("faceMatch").$type<Record<string, unknown>>(),
  riskScore: integer("riskScore").notNull().default(0),
  riskLevel: text("riskLevel").notNull().default("low"), // low | medium | high | critical
  status: text("status").notNull().default("pending"), // pending | cleared | flagged
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

// --- Module: Border Video Analytics (SIH 26187) ----------------------------

export const cameras = pgTable("cameras", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  name: text("name").notNull(),
  location: text("location").notNull(),
  lat: text("lat"),
  lng: text("lng"),
  // AES-256-GCM encrypted RTSP credential blob. Never stored plaintext.
  rtspEncrypted: text("rtspEncrypted"),
  status: text("status").notNull().default("online"), // online | offline | tampered
  lastHeartbeat: timestamp("lastHeartbeat").defaultNow(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  cameraId: integer("cameraId"),
  cameraName: text("cameraName"),
  location: text("location"),
  eventType: text("eventType").notNull(), // PERSON_IN_RESTRICTED_ZONE, CAMERA_OFFLINE, etc.
  severity: text("severity").notNull().default("low"), // low | medium | high | critical
  riskScore: integer("riskScore").notNull().default(0),
  confidence: integer("confidence"), // 0-100
  snapshot: text("snapshot"), // data URL / path to evidence frame
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  acknowledged: boolean("acknowledged").notNull().default(false),
  acknowledgedBy: text("acknowledgedBy"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

export const anprReads = pgTable("anpr_reads", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  cameraId: integer("cameraId"),
  cameraName: text("cameraName"),
  plate: text("plate").notNull(),
  known: boolean("known").notNull().default(false),
  watchlisted: boolean("watchlisted").notNull().default(false),
  confidence: integer("confidence"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

// --- Cybersecurity: tamper-evident audit ledger (hash-chained) -------------

export const auditLedger = pgTable("audit_ledger", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  actorEmail: text("actorEmail"),
  actorRole: text("actorRole"),
  action: text("action").notNull(), // DOC_SCREENED, EVENT_ACK, CAMERA_ADDED, LOGIN, etc.
  entityType: text("entityType"),
  entityId: text("entityId"),
  payload: jsonb("payload").$type<Record<string, unknown>>(),
  dataHash: text("dataHash").notNull(), // SHA-256 of this record's canonical payload
  prevHash: text("prevHash").notNull(), // links to previous record => tamper-evident chain
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})
