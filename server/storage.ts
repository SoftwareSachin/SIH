import {
  users,
  states,
  districts,
  villages,
  claims,
  documents,
  assets,
  schemes,
  recommendations,
  auditTrail,
  type User,
  type UpsertUser,
  type State,
  type District,
  type Village,
  type Claim,
  type Document,
  type Asset,
  type Scheme,
  type Recommendation,
  type AuditTrail,
  type InsertState,
  type InsertDistrict,
  type InsertVillage,
  type InsertClaim,
  type InsertDocument,
  type InsertAsset,
  type InsertScheme,
  type InsertRecommendation,
  type InsertAuditTrail,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, count, sql, ilike } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Dashboard stats
  getDashboardStats(state?: string, district?: string, role?: string): Promise<{
    totalClaims: number;
    verifiedClaims: number;
    aiProcessing: number;
    activeVillages: number;
  }>;

  // Geographic data
  getStates(): Promise<State[]>;
  getDistrictsByState(stateId: string): Promise<District[]>;
  getVillagesByDistrict(districtId: string): Promise<Village[]>;
  getVillageById(villageId: string): Promise<Village | undefined>;

  // Claims operations
  getClaims(params: {
    userId: string;
    userRole?: string;
    state?: string;
    district?: string;
    page?: number;
    limit?: number;
    status?: string;
    claimType?: string;
  }): Promise<{
    data: any[];
    pagination: {
      total: number;
      pages: number;
      current: number;
      limit: number;
    };
  }>;
  getClaimById(id: string): Promise<Claim | undefined>;
  getClaimsByVillage(villageId: string): Promise<Claim[]>;
  createClaim(claim: InsertClaim): Promise<Claim>;
  updateClaim(id: string, updates: Partial<InsertClaim>): Promise<Claim>;
  updateClaimStatus(id: string, status: string, userId: string, notes?: string): Promise<Claim>;
  exportClaims(params: {
    userId: string;
    userRole?: string;
    state?: string;
    district?: string;
    format: string;
  }): Promise<string>;

  // Document operations
  createDocument(document: InsertDocument): Promise<Document>;
  getDocumentById(id: string): Promise<Document | undefined>;
  updateDocument(id: string, updates: Partial<InsertDocument>): Promise<Document>;
  getDocumentsByProcessingStatus(status: string): Promise<Document[]>;
  getTotalProcessedDocuments(): Promise<number>;

  // Asset operations
  createAsset(asset: InsertAsset): Promise<Asset>;
  getAssetDetectionQueue(): Promise<Asset[]>;

  // Recommendation operations
  createRecommendation(recommendation: InsertRecommendation): Promise<Recommendation>;
  implementRecommendation(id: string, userId: string): Promise<Recommendation>;

  // Audit trail
  createAuditTrail(trail: InsertAuditTrail): Promise<AuditTrail>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Dashboard stats
  async getDashboardStats(state?: string, district?: string, role?: string): Promise<{
    totalClaims: number;
    verifiedClaims: number;
    aiProcessing: number;
    activeVillages: number;
  }> {
    try {
      // Build base query conditions based on user role and location
      const conditions = [];
      
      if (role === 'district' && district) {
        // District users see only their district data
        conditions.push(eq(villages.districtId, district));
      } else if (role === 'state' && state) {
        // State users see only their state data
        conditions.push(eq(districts.stateId, state));
      }

      // Get total claims
      const totalClaimsQuery = db
        .select({ count: count() })
        .from(claims);
      
      if (conditions.length > 0) {
        totalClaimsQuery
          .leftJoin(villages, eq(claims.villageId, villages.id))
          .leftJoin(districts, eq(villages.districtId, districts.id))
          .where(and(...conditions));
      }

      const [totalClaimsResult] = await totalClaimsQuery;
      const totalClaims = totalClaimsResult?.count || 0;

      // Get verified claims
      const verifiedClaimsQuery = db
        .select({ count: count() })
        .from(claims)
        .where(eq(claims.status, 'verified'));
        
      if (conditions.length > 0) {
        verifiedClaimsQuery
          .leftJoin(villages, eq(claims.villageId, villages.id))
          .leftJoin(districts, eq(villages.districtId, districts.id))
          .where(and(eq(claims.status, 'verified'), ...conditions));
      }

      const [verifiedClaimsResult] = await verifiedClaimsQuery;
      const verifiedClaims = verifiedClaimsResult?.count || 0;

      // Get AI processing count (documents pending processing)
      const [aiProcessingResult] = await db
        .select({ count: count() })
        .from(documents)
        .where(eq(documents.processedAt, sql`NULL`));
      const aiProcessing = aiProcessingResult?.count || 0;

      // Get active villages count
      const activeVillagesQuery = db
        .selectDistinct({ villageId: claims.villageId })
        .from(claims)
        .where(eq(claims.status, 'verified'));

      if (conditions.length > 0) {
        activeVillagesQuery
          .leftJoin(villages, eq(claims.villageId, villages.id))
          .leftJoin(districts, eq(villages.districtId, districts.id))
          .where(and(eq(claims.status, 'verified'), ...conditions));
      }

      const activeVillagesResults = await activeVillagesQuery;
      const activeVillages = activeVillagesResults.length;

      return {
        totalClaims,
        verifiedClaims,
        aiProcessing,
        activeVillages,
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      return {
        totalClaims: 0,
        verifiedClaims: 0,
        aiProcessing: 0,
        activeVillages: 0,
      };
    }
  }

  // Geographic data operations
  async getStates(): Promise<State[]> {
    return db.select().from(states).orderBy(states.name);
  }

  async getDistrictsByState(stateId: string): Promise<District[]> {
    return db.select().from(districts).where(eq(districts.stateId, stateId)).orderBy(districts.name);
  }

  async getVillagesByDistrict(districtId: string): Promise<Village[]> {
    return db.select().from(villages).where(eq(villages.districtId, districtId)).orderBy(villages.name);
  }

  async getVillageById(villageId: string): Promise<Village | undefined> {
    const [village] = await db.select().from(villages).where(eq(villages.id, villageId));
    return village;
  }

  // Claims operations
  async getClaims(params: {
    userId: string;
    userRole?: string;
    state?: string;
    district?: string;
    page?: number;
    limit?: number;
    status?: string;
    claimType?: string;
  }): Promise<{
    data: any[];
    pagination: {
      total: number;
      pages: number;
      current: number;
      limit: number;
    };
  }> {
    const page = params.page || 1;
    const limit = params.limit || 10;
    const offset = (page - 1) * limit;

    try {
      // Build query conditions
      const conditions = [];
      
      if (params.status) {
        conditions.push(eq(claims.status, params.status as any));
      }
      
      if (params.claimType) {
        conditions.push(eq(claims.claimType, params.claimType as any));
      }

      // Role-based filtering
      if (params.userRole === 'district' && params.district) {
        conditions.push(eq(villages.districtId, params.district));
      } else if (params.userRole === 'state' && params.state) {
        conditions.push(eq(districts.stateId, params.state));
      }

      // Get total count
      const countQuery = db
        .select({ count: count() })
        .from(claims)
        .leftJoin(villages, eq(claims.villageId, villages.id))
        .leftJoin(districts, eq(villages.districtId, districts.id));

      if (conditions.length > 0) {
        countQuery.where(and(...conditions));
      }

      const [totalResult] = await countQuery;
      const total = totalResult?.count || 0;

      // Get paginated data
      const dataQuery = db
        .select({
          id: claims.id,
          claimId: claims.claimId,
          claimantName: claims.claimantName,
          claimType: claims.claimType,
          area: claims.area,
          status: claims.status,
          aiConfidence: claims.aiConfidence,
          createdAt: claims.createdAt,
          village: {
            id: villages.id,
            name: villages.name,
          },
        })
        .from(claims)
        .leftJoin(villages, eq(claims.villageId, villages.id))
        .leftJoin(districts, eq(villages.districtId, districts.id))
        .orderBy(desc(claims.createdAt))
        .limit(limit)
        .offset(offset);

      if (conditions.length > 0) {
        dataQuery.where(and(...conditions));
      }

      const data = await dataQuery;

      return {
        data,
        pagination: {
          total,
          pages: Math.ceil(total / limit),
          current: page,
          limit,
        },
      };
    } catch (error) {
      console.error('Error fetching claims:', error);
      return {
        data: [],
        pagination: {
          total: 0,
          pages: 0,
          current: page,
          limit,
        },
      };
    }
  }

  async getClaimById(id: string): Promise<Claim | undefined> {
    const [claim] = await db.select().from(claims).where(eq(claims.id, id));
    return claim;
  }

  async getClaimsByVillage(villageId: string): Promise<Claim[]> {
    return db.select().from(claims).where(eq(claims.villageId, villageId));
  }

  async createClaim(claim: InsertClaim): Promise<Claim> {
    const [newClaim] = await db.insert(claims).values(claim).returning();
    return newClaim;
  }

  async updateClaim(id: string, updates: Partial<InsertClaim>): Promise<Claim> {
    const [updatedClaim] = await db
      .update(claims)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(claims.id, id))
      .returning();
    return updatedClaim;
  }

  async updateClaimStatus(id: string, status: string, userId: string, notes?: string): Promise<Claim> {
    const updateData: any = {
      status: status as any,
      updatedAt: new Date(),
    };

    if (status === 'verified') {
      updateData.verifiedDate = new Date();
      updateData.verifiedBy = userId;
    }

    if (notes) {
      updateData.notes = notes;
    }

    const [updatedClaim] = await db
      .update(claims)
      .set(updateData)
      .where(eq(claims.id, id))
      .returning();
    return updatedClaim;
  }

  async exportClaims(params: {
    userId: string;
    userRole?: string;
    state?: string;
    district?: string;
    format: string;
  }): Promise<string> {
    const { data } = await this.getClaims({
      ...params,
      limit: 10000, // Export all
    });

    if (params.format === 'csv') {
      const headers = ['Claim ID', 'Claimant Name', 'Village', 'Type', 'Area', 'Status', 'AI Confidence'];
      const rows = data.map((claim: any) => [
        claim.claimId,
        claim.claimantName,
        claim.village?.name,
        claim.claimType,
        claim.area,
        claim.status,
        claim.aiConfidence,
      ]);
      
      const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${cell || ''}"`).join(','))
        .join('\n');
      
      return csvContent;
    }

    return JSON.stringify(data, null, 2);
  }

  // Document operations
  async createDocument(document: InsertDocument): Promise<Document> {
    const [newDocument] = await db.insert(documents).values(document).returning();
    return newDocument;
  }

  async getDocumentById(id: string): Promise<Document | undefined> {
    const [document] = await db.select().from(documents).where(eq(documents.id, id));
    return document;
  }

  async updateDocument(id: string, updates: Partial<InsertDocument>): Promise<Document> {
    const [updatedDocument] = await db
      .update(documents)
      .set(updates)
      .where(eq(documents.id, id))
      .returning();
    return updatedDocument;
  }

  async getDocumentsByProcessingStatus(status: string): Promise<Document[]> {
    if (status === 'pending_ocr') {
      return db.select().from(documents).where(sql`${documents.ocrText} IS NULL`);
    } else if (status === 'pending_ner') {
      return db.select().from(documents)
        .where(and(
          sql`${documents.ocrText} IS NOT NULL`,
          sql`${documents.extractedEntities} IS NULL`
        ));
    }
    return [];
  }

  async getTotalProcessedDocuments(): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(documents)
      .where(sql`${documents.processedAt} IS NOT NULL`);
    return result?.count || 0;
  }

  // Asset operations
  async createAsset(asset: InsertAsset): Promise<Asset> {
    const [newAsset] = await db.insert(assets).values(asset).returning();
    return newAsset;
  }

  async getAssetDetectionQueue(): Promise<Asset[]> {
    return db.select().from(assets).where(sql`${assets.verifiedAt} IS NULL`);
  }

  // Recommendation operations
  async createRecommendation(recommendation: InsertRecommendation): Promise<Recommendation> {
    const [newRec] = await db.insert(recommendations).values(recommendation).returning();
    return newRec;
  }

  async implementRecommendation(id: string, userId: string): Promise<Recommendation> {
    const [updatedRec] = await db
      .update(recommendations)
      .set({
        implementedAt: new Date(),
        implementedBy: userId,
      })
      .where(eq(recommendations.id, id))
      .returning();
    return updatedRec;
  }

  // Audit trail
  async createAuditTrail(trail: InsertAuditTrail): Promise<AuditTrail> {
    const [newTrail] = await db.insert(auditTrail).values(trail).returning();
    return newTrail;
  }
}

export const storage = new DatabaseStorage();
