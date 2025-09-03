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

// Permission enum for RBAC
export const permissionEnum = pgEnum('permission', [
  'view_all_claims',
  'view_state_claims', 
  'view_district_claims',
  'approve_claims',
  'reject_claims',
  'upload_documents',
  'verify_documents',
  'manage_users',
  'manage_system_settings',
  'view_public_maps',
  'export_data',
  'generate_reports',
  'access_admin_panel',
  'access_ai_processing',
  'access_dss_engine'
]);

// Roles table with detailed permissions
export const roles = pgTable("roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: userRoleEnum("name").notNull().unique(),
  displayName: varchar("display_name").notNull(),
  description: text("description"),
  permissions: jsonb("permissions").notNull(), // Array of permission strings
  canAccessStates: jsonb("can_access_states"), // Array of state IDs
  canAccessDistricts: jsonb("can_access_districts"), // Array of district IDs
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User Role Assignments table
export const userRoleAssignments = pgTable("user_role_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  roleId: varchar("role_id").references(() => roles.id).notNull(),
  assignedBy: varchar("assigned_by").references(() => users.id),
  assignedAt: timestamp("assigned_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").default(true),
  notes: text("notes"),
});

// Sessions table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

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

// Comprehensive Central Sector Schemes table for DSS
export const schemes = pgTable("schemes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  shortName: varchar("short_name"),
  code: varchar("code").notNull(),
  description: text("description"),
  category: varchar("category").notNull(), // "agriculture", "livelihood", "infrastructure", "education", "healthcare"
  implementingMinistry: varchar("implementing_ministry").notNull(),
  implementingDepartment: varchar("implementing_department"),
  benefitAmount: varchar("benefit_amount"), // e.g., "₹6,000/year", "Employment guarantee"
  benefitDetails: text("benefit_details"),
  applicationProcess: text("application_process"),
  requiredDocuments: text("required_documents").array(),
  eligibilityRules: jsonb("eligibility_rules").notNull(), // JSON rules for matching
  applicationWebsite: varchar("application_website"),
  helplineNumber: varchar("helpline_number"),
  priority: integer("priority").default(1), // 1-10, higher = more priority
  targetBeneficiaries: text("target_beneficiaries"),
  geographicScope: varchar("geographic_scope"), // "national", "state", "district"
  isActive: boolean("is_active").default(true),
  launchDate: timestamp("launch_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Scheme recommendations generated by DSS
export const schemeRecommendations = pgTable("scheme_recommendations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  claimId: varchar("claim_id").references(() => claims.id),
  schemeId: varchar("scheme_id").notNull().references(() => schemes.id),
  eligibilityScore: integer("eligibility_score").notNull(), // 0-100
  matchingCriteria: jsonb("matching_criteria"), // Which criteria matched
  recommendationReason: text("recommendation_reason"),
  applicationGuidance: text("application_guidance"),
  estimatedBenefit: varchar("estimated_benefit"),
  applicationDeadline: timestamp("application_deadline"),
  status: varchar("status").default("recommended"), // "recommended", "applied", "approved", "rejected"
  appliedDate: timestamp("applied_date"),
  generatedAt: timestamp("generated_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Eligibility rules engine configuration
export const eligibilityRules = pgTable("eligibility_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  schemeId: varchar("scheme_id").notNull().references(() => schemes.id),
  ruleType: varchar("rule_type").notNull(), // "mandatory", "optional", "scoring"
  fieldName: varchar("field_name").notNull(), // Field to check (e.g., "landArea", "category", "income")
  operator: varchar("operator").notNull(), // "equals", "greater_than", "less_than", "contains", "in_list"
  value: text("value").notNull(), // Value to compare against
  weight: integer("weight").default(1), // For scoring rules
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Legacy DSS Recommendations (keeping for backward compatibility)
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

// Verification workflow status enum
export const workflowStatusEnum = pgEnum('workflow_status', ['pending', 'in_progress', 'completed', 'rejected', 'on_hold']);
export const stepStatusEnum = pgEnum('step_status', ['pending', 'in_progress', 'completed', 'failed', 'skipped']);

// Verification Workflows table
export const verificationWorkflows = pgTable("verification_workflows", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  claimId: varchar("claim_id").references(() => claims.id).notNull(),
  currentStep: integer("current_step").default(0),
  status: workflowStatusEnum("status").default('pending'),
  priority: varchar("priority").notNull().default('medium'), // low, medium, high, urgent
  assignedTo: varchar("assigned_to").references(() => users.id),
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  estimatedCompletion: timestamp("estimated_completion"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Verification workflow steps table
export const verificationSteps = pgTable("verification_steps", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workflowId: varchar("workflow_id").references(() => verificationWorkflows.id).notNull(),
  stepOrder: integer("step_order").notNull(),
  stepId: varchar("step_id").notNull(), // document_upload, ocr_processing, etc.
  stepName: varchar("step_name").notNull(),
  status: stepStatusEnum("status").default('pending'),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  verifiedBy: varchar("verified_by").references(() => users.id),
  result: jsonb("result"),
  errors: text("errors").array(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Audit Trail
export const auditTrail = pgTable("audit_trail", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  entityType: varchar("entity_type").notNull(), // claims, documents, workflows, etc.
  entityId: varchar("entity_id").notNull(),
  action: varchar("action").notNull(), // create, update, delete, verify, approve, reject, etc.
  userId: varchar("user_id").references(() => users.id),
  userRole: varchar("user_role"),
  oldValues: jsonb("old_values"),
  newValues: jsonb("new_values"),
  timestamp: timestamp("timestamp").defaultNow(),
  notes: text("notes"),
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
});

// Relations
export const verificationWorkflowsRelations = relations(verificationWorkflows, ({ one, many }) => ({
  claim: one(claims, {
    fields: [verificationWorkflows.claimId],
    references: [claims.id],
  }),
  assignedUser: one(users, {
    fields: [verificationWorkflows.assignedTo],
    references: [users.id],
  }),
  steps: many(verificationSteps),
}));

export const verificationStepsRelations = relations(verificationSteps, ({ one }) => ({
  workflow: one(verificationWorkflows, {
    fields: [verificationSteps.workflowId],
    references: [verificationWorkflows.id],
  }),
  verifiedByUser: one(users, {
    fields: [verificationSteps.verifiedBy],
    references: [users.id],
  }),
}));

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  roleAssignments: many(userRoleAssignments),
  verifiedClaims: many(claims, {
    relationName: "verifiedClaims",
  }),
  verifiedAssets: many(assets, {
    relationName: "verifiedAssets",
  }),
  implementedRecommendations: many(recommendations, {
    relationName: "implementedRecommendations",
  }),
  auditTrails: many(auditTrail),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  userAssignments: many(userRoleAssignments),
}));

export const userRoleAssignmentsRelations = relations(userRoleAssignments, ({ one }) => ({
  user: one(users, {
    fields: [userRoleAssignments.userId],
    references: [users.id],
  }),
  role: one(roles, {
    fields: [userRoleAssignments.roleId],
    references: [roles.id],
  }),
  assignedByUser: one(users, {
    fields: [userRoleAssignments.assignedBy],
    references: [users.id],
    relationName: "assignedByUser",
  }),
}));

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
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true, password: true });
export const insertUserWithPasswordSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export const insertRoleSchema = createInsertSchema(roles).omit({ id: true, createdAt: true, updatedAt: true });
export const insertUserRoleAssignmentSchema = createInsertSchema(userRoleAssignments).omit({ id: true, assignedAt: true });
export const insertStateSchema = createInsertSchema(states).omit({ createdAt: true });
export const insertDistrictSchema = createInsertSchema(districts).omit({ id: true, createdAt: true });
export const insertVillageSchema = createInsertSchema(villages).omit({ id: true, createdAt: true });
export const insertClaimSchema = createInsertSchema(claims).omit({ id: true, claimId: true, createdAt: true, updatedAt: true });
export const insertDocumentSchema = createInsertSchema(documents).omit({ id: true, createdAt: true });
export const insertAssetSchema = createInsertSchema(assets).omit({ id: true });
export const insertSchemeSchema = createInsertSchema(schemes).omit({ id: true, createdAt: true });
export const insertRecommendationSchema = createInsertSchema(recommendations).omit({ id: true });
export const insertVerificationWorkflowSchema = createInsertSchema(verificationWorkflows).omit({ id: true, createdAt: true, updatedAt: true });
export const insertVerificationStepSchema = createInsertSchema(verificationSteps).omit({ id: true, createdAt: true });
export const insertAuditTrailSchema = createInsertSchema(auditTrail).omit({ id: true, timestamp: true });

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Role = typeof roles.$inferSelect;
export type UserRoleAssignment = typeof userRoleAssignments.$inferSelect;
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
export type InsertRole = typeof roles.$inferInsert;
export type InsertUserRoleAssignment = typeof userRoleAssignments.$inferInsert;
export type VerificationWorkflow = typeof verificationWorkflows.$inferSelect;
export type VerificationStep = typeof verificationSteps.$inferSelect;
export type InsertVerificationWorkflow = typeof verificationWorkflows.$inferInsert;
export type InsertVerificationStep = typeof verificationSteps.$inferInsert;
