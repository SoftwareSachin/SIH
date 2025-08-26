import { sql, relations } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  decimal,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

// API Keys table for simple authentication
export const apiKeys = pgTable("api_keys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(), // e.g. "GEMINI_API_KEY"
  value: text("value").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User roles enum
export const userRoleEnum = pgEnum('user_role', ['admin', 'state', 'district', 'field', 'ngo', 'public']);

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique().notNull(),
  password: varchar("password"), // For simple login
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: userRoleEnum("role").default('public'),
  state: varchar("state"),
  district: varchar("district"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// States
export const states = pgTable("states", {
  id: varchar("id").primaryKey(),
  name: varchar("name").notNull(),
  code: varchar("code").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Districts
export const districts = pgTable("districts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  code: varchar("code").notNull(),
  stateId: varchar("state_id").references(() => states.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Villages
export const villages = pgTable("villages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  code: varchar("code"),
  districtId: varchar("district_id").references(() => districts.id),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  boundary: jsonb("boundary"), // GeoJSON polygon
  population: integer("population"),
  tribalPopulation: integer("tribal_population"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Claim types enum
export const claimTypeEnum = pgEnum('claim_type', ['IFR', 'CFR', 'CR']);
export const claimStatusEnum = pgEnum('claim_status', ['pending', 'verified', 'rejected', 'under_review']);

// FRA Claims
export const claims = pgTable("claims", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  claimId: varchar("claim_id").unique().notNull(), // FRA-MP-001247
  claimantName: varchar("claimant_name").notNull(),
  claimantFatherName: varchar("claimant_father_name"),
  claimantAddress: text("claimant_address"),
  villageId: varchar("village_id").references(() => villages.id),
  claimType: claimTypeEnum("claim_type").notNull(),
  area: decimal("area", { precision: 8, scale: 2 }), // in acres
  coordinates: jsonb("coordinates"), // GeoJSON
  status: claimStatusEnum("status").default('pending'),
  aiConfidence: decimal("ai_confidence", { precision: 5, scale: 2 }), // percentage
  submittedDate: timestamp("submitted_date").defaultNow(),
  verifiedDate: timestamp("verified_date"),
  verifiedBy: varchar("verified_by").references(() => users.id),
  rejectionReason: text("rejection_reason"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Document processing status enum
export const documentStatusEnum = pgEnum('document_status', ['pending', 'processing', 'processed', 'failed', 'requires_review']);
export const documentLanguageEnum = pgEnum('document_language', ['eng', 'hin', 'ben', 'guj', 'kan', 'mal', 'mar', 'ori', 'pan', 'tam', 'tel', 'urd', 'mixed']);

// Documents
export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  claimId: varchar("claim_id").references(() => claims.id),
  fileName: varchar("file_name").notNull(),
  fileType: varchar("file_type").notNull(),
  fileSize: integer("file_size"),
  filePath: varchar("file_path").notNull(),
  // OCR Processing fields
  ocrText: text("ocr_text"),
  ocrConfidence: decimal("ocr_confidence", { precision: 5, scale: 2 }),
  ocrLanguage: documentLanguageEnum("ocr_language"),
  languagesUsed: jsonb("languages_used"), // Array of actual languages used
  ocrData: jsonb("ocr_data"), // Stores HOCR, TSV, and other OCR metadata
  // Processing metadata
  processingStatus: documentStatusEnum("processing_status").default('pending'),
  processingTime: integer("processing_time"), // in milliseconds
  imageQuality: varchar("image_quality"), // 'low', 'medium', 'high'
  preprocessingApplied: jsonb("preprocessing_applied"), // Array of preprocessing steps
  processingAttempts: integer("processing_attempts").default(0),
  lastError: text("last_error"),
  // Entity extraction
  extractedEntities: jsonb("extracted_entities"),
  entityExtractionConfidence: decimal("entity_extraction_confidence", { precision: 5, scale: 2 }),
  // Timestamps
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Asset types enum
export const assetTypeEnum = pgEnum('asset_type', ['pond', 'farm', 'homestead', 'forest', 'water_body', 'infrastructure']);

// Assets detected by AI
export const assets = pgTable("assets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  villageId: varchar("village_id").references(() => villages.id),
  assetType: assetTypeEnum("asset_type").notNull(),
  coordinates: jsonb("coordinates").notNull(), // GeoJSON
  area: decimal("area", { precision: 8, scale: 2 }),
  confidence: decimal("confidence", { precision: 5, scale: 2 }),
  detectedAt: timestamp("detected_at").defaultNow(),
  verifiedAt: timestamp("verified_at"),
  verifiedBy: varchar("verified_by").references(() => users.id),
});

// CSS Schemes
export const schemes = pgTable("schemes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  code: varchar("code").notNull(),
  description: text("description"),
  eligibilityCriteria: jsonb("eligibility_criteria"),
  benefits: jsonb("benefits"),
  implementingDepartment: varchar("implementing_department"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// DSS Recommendations
export const recommendations = pgTable("recommendations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  claimId: varchar("claim_id").references(() => claims.id),
  schemeId: varchar("scheme_id").references(() => schemes.id),
  priority: varchar("priority").notNull(), // high, medium, low
  eligibilityScore: decimal("eligibility_score", { precision: 5, scale: 2 }),
  estimatedBenefit: decimal("estimated_benefit", { precision: 12, scale: 2 }),
  rationale: text("rationale"),
  generatedAt: timestamp("generated_at").defaultNow(),
  implementedAt: timestamp("implemented_at"),
  implementedBy: varchar("implemented_by").references(() => users.id),
});

// Audit Trail
export const auditTrail = pgTable("audit_trail", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  entityType: varchar("entity_type").notNull(), // claims, documents, etc.
  entityId: varchar("entity_id").notNull(),
  action: varchar("action").notNull(), // create, update, delete, verify, etc.
  userId: varchar("user_id").references(() => users.id),
  oldValues: jsonb("old_values"),
  newValues: jsonb("new_values"),
  timestamp: timestamp("timestamp").defaultNow(),
  notes: text("notes"),
});

// Relations
export const statesRelations = relations(states, ({ many }) => ({
  districts: many(districts),
}));

export const districtsRelations = relations(districts, ({ one, many }) => ({
  state: one(states, {
    fields: [districts.stateId],
    references: [states.id],
  }),
  villages: many(villages),
}));

export const villagesRelations = relations(villages, ({ one, many }) => ({
  district: one(districts, {
    fields: [villages.districtId],
    references: [districts.id],
  }),
  claims: many(claims),
  assets: many(assets),
}));

export const claimsRelations = relations(claims, ({ one, many }) => ({
  village: one(villages, {
    fields: [claims.villageId],
    references: [villages.id],
  }),
  verifiedByUser: one(users, {
    fields: [claims.verifiedBy],
    references: [users.id],
  }),
  documents: many(documents),
  recommendations: many(recommendations),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  claim: one(claims, {
    fields: [documents.claimId],
    references: [claims.id],
  }),
}));

export const assetsRelations = relations(assets, ({ one }) => ({
  village: one(villages, {
    fields: [assets.villageId],
    references: [villages.id],
  }),
  verifiedByUser: one(users, {
    fields: [assets.verifiedBy],
    references: [users.id],
  }),
}));

export const recommendationsRelations = relations(recommendations, ({ one }) => ({
  claim: one(claims, {
    fields: [recommendations.claimId],
    references: [claims.id],
  }),
  scheme: one(schemes, {
    fields: [recommendations.schemeId],
    references: [schemes.id],
  }),
  implementedByUser: one(users, {
    fields: [recommendations.implementedBy],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export const insertStateSchema = createInsertSchema(states).omit({ createdAt: true });
export const insertDistrictSchema = createInsertSchema(districts).omit({ id: true, createdAt: true });
export const insertVillageSchema = createInsertSchema(villages).omit({ id: true, createdAt: true });
export const insertClaimSchema = createInsertSchema(claims).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDocumentSchema = createInsertSchema(documents).omit({ id: true, createdAt: true });
export const insertAssetSchema = createInsertSchema(assets).omit({ id: true });
export const insertSchemeSchema = createInsertSchema(schemes).omit({ id: true, createdAt: true });
export const insertRecommendationSchema = createInsertSchema(recommendations).omit({ id: true });
export const insertAuditTrailSchema = createInsertSchema(auditTrail).omit({ id: true, timestamp: true });

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type State = typeof states.$inferSelect;
export type District = typeof districts.$inferSelect;
export type Village = typeof villages.$inferSelect;
export type Claim = typeof claims.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type Asset = typeof assets.$inferSelect;
export type Scheme = typeof schemes.$inferSelect;
export type Recommendation = typeof recommendations.$inferSelect;
export type AuditTrail = typeof auditTrail.$inferSelect;

export type InsertState = typeof states.$inferInsert;
export type InsertDistrict = typeof districts.$inferInsert;
export type InsertVillage = typeof villages.$inferInsert;
export type InsertClaim = typeof claims.$inferInsert;
export type InsertDocument = typeof documents.$inferInsert;
export type InsertAsset = typeof assets.$inferInsert;
export type InsertScheme = typeof schemes.$inferInsert;
export type InsertRecommendation = typeof recommendations.$inferInsert;
export type InsertAuditTrail = typeof auditTrail.$inferInsert;
