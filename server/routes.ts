import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { z } from "zod";
import { insertClaimSchema, insertDocumentSchema } from "@shared/schema";
import multer from "multer";
import { documentProcessor } from "./services/documentProcessor";
import { aiProcessor } from "./services/aiProcessor";
import { dssEngine } from "./services/dssEngine";

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/tiff'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF and image files are allowed.'));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Dashboard stats
  app.get('/api/dashboard/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const stats = await storage.getDashboardStats(user.state, user.district, user.role);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Claims routes
  app.get('/api/claims', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const status = req.query.status as string;
      const claimType = req.query.claimType as string;

      const claims = await storage.getClaims({
        userId,
        userRole: user.role,
        state: user.state,
        district: user.district,
        page,
        limit,
        status,
        claimType,
      });

      res.json(claims);
    } catch (error) {
      console.error("Error fetching claims:", error);
      res.status(500).json({ message: "Failed to fetch claims" });
    }
  });

  app.get('/api/claims/:id', isAuthenticated, async (req, res) => {
    try {
      const claim = await storage.getClaimById(req.params.id);
      if (!claim) {
        return res.status(404).json({ message: "Claim not found" });
      }
      res.json(claim);
    } catch (error) {
      console.error("Error fetching claim:", error);
      res.status(500).json({ message: "Failed to fetch claim" });
    }
  });

  app.post('/api/claims', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const claimData = insertClaimSchema.parse(req.body);
      
      // Generate claim ID
      const user = await storage.getUser(userId);
      const stateCode = user?.state?.substring(0, 2).toUpperCase() || 'XX';
      const timestamp = Date.now();
      const claimId = `FRA-${stateCode}-${timestamp.toString().slice(-6)}`;

      const claim = await storage.createClaim({
        ...claimData,
        claimId,
      });

      // Log audit trail
      await storage.createAuditTrail({
        entityType: 'claims',
        entityId: claim.id,
        action: 'create',
        userId,
        newValues: claim,
        notes: 'Claim created',
      });

      res.status(201).json(claim);
    } catch (error) {
      console.error("Error creating claim:", error);
      res.status(500).json({ message: "Failed to create claim" });
    }
  });

  app.patch('/api/claims/:id/status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !['admin', 'state', 'district'].includes(user.role)) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const { status, notes } = req.body;
      const claim = await storage.updateClaimStatus(req.params.id, status, userId, notes);

      // Log audit trail
      await storage.createAuditTrail({
        entityType: 'claims',
        entityId: req.params.id,
        action: 'update_status',
        userId,
        newValues: { status, notes },
        notes: `Status updated to ${status}`,
      });

      res.json(claim);
    } catch (error) {
      console.error("Error updating claim status:", error);
      res.status(500).json({ message: "Failed to update claim status" });
    }
  });

  // Document upload and processing
  app.post('/api/documents/upload', isAuthenticated, upload.single('document'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const file = req.file;
      const { claimId } = req.body;

      if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      if (!claimId) {
        return res.status(400).json({ message: "Claim ID is required" });
      }

      // Save document record
      const document = await storage.createDocument({
        claimId,
        fileName: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
        filePath: file.path,
      });

      // Process document with AI
      try {
        const processedData = await documentProcessor.processDocument(file.path, file.mimetype);
        
        await storage.updateDocument(document.id, {
          ocrText: processedData.text,
          ocrConfidence: processedData.confidence,
          extractedEntities: processedData.entities,
          processedAt: new Date(),
        });

        // Update claim with extracted data if confidence is high
        if (processedData.confidence > 80) {
          await aiProcessor.updateClaimFromExtractedData(claimId, processedData.entities);
        }
      } catch (aiError) {
        console.error("AI processing failed:", aiError);
        // Document saved but AI processing failed
      }

      // Log audit trail
      await storage.createAuditTrail({
        entityType: 'documents',
        entityId: document.id,
        action: 'upload',
        userId,
        newValues: document,
        notes: 'Document uploaded and processed',
      });

      res.status(201).json(document);
    } catch (error) {
      console.error("Error uploading document:", error);
      res.status(500).json({ message: "Failed to upload document" });
    }
  });

  // AI Processing routes
  app.get('/api/ai/processing-status', isAuthenticated, async (req, res) => {
    try {
      const status = await aiProcessor.getProcessingStatus();
      res.json(status);
    } catch (error) {
      console.error("Error fetching AI processing status:", error);
      res.status(500).json({ message: "Failed to fetch processing status" });
    }
  });

  app.post('/api/ai/reprocess-document/:documentId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !['admin', 'state'].includes(user.role)) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const document = await storage.getDocumentById(req.params.documentId);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      const processedData = await documentProcessor.processDocument(document.filePath, document.fileType);
      
      await storage.updateDocument(document.id, {
        ocrText: processedData.text,
        ocrConfidence: processedData.confidence,
        extractedEntities: processedData.entities,
        processedAt: new Date(),
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error reprocessing document:", error);
      res.status(500).json({ message: "Failed to reprocess document" });
    }
  });

  // Asset detection
  app.post('/api/assets/detect/:villageId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !['admin', 'state', 'district'].includes(user.role)) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const assets = await aiProcessor.detectAssetsForVillage(req.params.villageId);
      res.json(assets);
    } catch (error) {
      console.error("Error detecting assets:", error);
      res.status(500).json({ message: "Failed to detect assets" });
    }
  });

  // Decision Support System
  app.get('/api/dss/recommendations/:claimId', isAuthenticated, async (req, res) => {
    try {
      const recommendations = await dssEngine.generateRecommendations(req.params.claimId);
      res.json(recommendations);
    } catch (error) {
      console.error("Error generating recommendations:", error);
      res.status(500).json({ message: "Failed to generate recommendations" });
    }
  });

  app.get('/api/dss/village-recommendations/:villageId', isAuthenticated, async (req, res) => {
    try {
      const recommendations = await dssEngine.generateVillageRecommendations(req.params.villageId);
      res.json(recommendations);
    } catch (error) {
      console.error("Error generating village recommendations:", error);
      res.status(500).json({ message: "Failed to generate village recommendations" });
    }
  });

  app.post('/api/dss/implement-recommendation/:recommendationId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !['admin', 'state', 'district'].includes(user.role)) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const recommendation = await storage.implementRecommendation(req.params.recommendationId, userId);
      
      // Log audit trail
      await storage.createAuditTrail({
        entityType: 'recommendations',
        entityId: req.params.recommendationId,
        action: 'implement',
        userId,
        newValues: { implementedAt: new Date() },
        notes: 'Recommendation implemented',
      });

      res.json(recommendation);
    } catch (error) {
      console.error("Error implementing recommendation:", error);
      res.status(500).json({ message: "Failed to implement recommendation" });
    }
  });

  // Geographic data
  app.get('/api/geo/states', async (req, res) => {
    try {
      const states = await storage.getStates();
      res.json(states);
    } catch (error) {
      console.error("Error fetching states:", error);
      res.status(500).json({ message: "Failed to fetch states" });
    }
  });

  app.get('/api/geo/districts/:stateId', async (req, res) => {
    try {
      const districts = await storage.getDistrictsByState(req.params.stateId);
      res.json(districts);
    } catch (error) {
      console.error("Error fetching districts:", error);
      res.status(500).json({ message: "Failed to fetch districts" });
    }
  });

  app.get('/api/geo/villages/:districtId', async (req, res) => {
    try {
      const villages = await storage.getVillagesByDistrict(req.params.districtId);
      res.json(villages);
    } catch (error) {
      console.error("Error fetching villages:", error);
      res.status(500).json({ message: "Failed to fetch villages" });
    }
  });

  // Export routes
  app.get('/api/export/claims', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const format = req.query.format || 'csv';
      const exportData = await storage.exportClaims({
        userId,
        userRole: user.role,
        state: user.state,
        district: user.district,
        format,
      });

      res.setHeader('Content-Disposition', `attachment; filename=claims_export.${format}`);
      res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/json');
      res.send(exportData);
    } catch (error) {
      console.error("Error exporting claims:", error);
      res.status(500).json({ message: "Failed to export claims" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
