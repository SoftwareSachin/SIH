import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertClaimSchema, insertDocumentSchema } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import { documentProcessor } from "./services/documentProcessor";
import { aiProcessor } from "./services/aiProcessor";
import { dssEngine } from "./services/dssEngine";
import { batchProcessor } from "./services/batchProcessor";
import { landUseClassificationService } from "./services/landUseClassificationService";
import { gisIntegrationService } from "./services/gisIntegrationService";
import { verificationWorkflow } from "./services/verificationWorkflow";

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
  // Parse JSON requests
  app.use(express.json());
  
  // Authentication routes
  const registerSchema = insertUserSchema.extend({
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
    requestedRole: z.enum(['admin', 'state', 'district', 'field', 'ngo', 'public']).optional().default('public'),
    state: z.string().optional(),
    district: z.string().optional(),
    organizationName: z.string().optional(),
    justification: z.string().optional()
  }).refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"]
  });

  const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required')
  });

  // Register endpoint
  app.post('/api/auth/register', async (req, res) => {
    try {
      const validatedData = registerSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists with this email' });
      }

      // Hash password (simplified for non-auth system)
      const hashedPassword = validatedData.password; // No hashing since auth is removed
      
      // Create user
      const newUser = await storage.createUser({
        email: validatedData.email,
        password: hashedPassword,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        role: validatedData.requestedRole || 'public',
        state: validatedData.state,
        district: validatedData.district
      });

      // Assign role based on request
      const requestedRoleName = validatedData.requestedRole || 'public';
      const role = await storage.getRoleByName(requestedRoleName);
      
      if (role) {
        // Auto-activate all roles - no approval required
        await storage.assignUserRole({
          userId: newUser.id,
          roleId: role.id,
          isActive: true,
          notes: `Auto-assigned ${role.displayName} role. ${validatedData.justification || 'No justification provided.'}`
        });
      }

      // No token generation since auth is removed
      const token = 'no-auth-token';

      res.status(201).json({
        message: 'User created successfully',
        token,
        user: {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          role: newUser.role
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: 'Validation error', 
          errors: error.errors 
        });
      }
      console.error('Registration error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get roles endpoint for registration - made more accessible
  app.get('/api/auth/roles', async (req, res) => {
    try {
      const roles = await storage.getAllRoles();
      const publicRoles = roles.filter(role => 
        role.isActive && ['public', 'field', 'ngo', 'district', 'state', 'admin'].includes(role.name)
      ).map(role => ({
        name: role.name,
        displayName: role.displayName,
        description: role.description
      }));
      
      res.json(publicRoles);
    } catch (error) {
      console.error('Error fetching roles:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Removed duplicate /api/auth/user route - keeping the one below after login

  // Login endpoint
  app.post('/api/auth/login', async (req, res) => {
    try {
      const validatedData = loginSchema.parse(req.body);
      
      // Get user by email
      const user = await storage.getUserByEmail(validatedData.email);
      if (!user || !user.password) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      // Password check removed (auth disabled)
      const isValidPassword = true;
      if (!isValidPassword) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      // No token generation since auth is removed
      const token = 'no-auth-token';

      res.json({
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: 'Validation error', 
          errors: error.errors 
        });
      }
      console.error('Login error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get current user endpoint (improved authentication handling)
  app.get('/api/auth/user', async (req: any, res) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader) {
        // Return default public user for anonymous access
        return res.json({
          id: 'anonymous-user',
          email: 'guest@fraatlas.gov',
          firstName: 'Guest',
          lastName: 'User',
          currentRole: 'public',
          permissions: ['view_public_maps', 'view_all_claims', 'access_ai_processing', 'access_dss_engine'],
          state: null,
          district: null
        });
      }

      // Extract and verify token
      const token = authHeader.split(' ')[1];
      if (!token) {
        console.log('No token found in authorization header');
        return res.json({
          id: 'anonymous-user',
          email: 'guest@fraatlas.gov',
          firstName: 'Guest',
          lastName: 'User',
          currentRole: 'public',
          permissions: ['view_public_maps', 'view_all_claims', 'access_ai_processing', 'access_dss_engine'],
          state: null,
          district: null
        });
      }

      try {
        // Simplified auth - always return guest user for public access
        console.log('Using public guest access mode');
        return res.json({
          id: 'anonymous-user',
          email: 'guest@fraatlas.gov',
          firstName: 'Guest',
          lastName: 'User',
          currentRole: 'public',
          permissions: ['view_public_maps', 'view_all_claims', 'access_ai_processing', 'access_dss_engine'],
          state: null,
          district: null
        });
      } catch (error) {
        console.error('Token verification error:', error);
        return res.json({
          id: 'anonymous-user',
          email: 'guest@fraatlas.gov',
          firstName: 'Guest',
          lastName: 'User',
          currentRole: 'public',
          permissions: ['view_public_maps', 'view_all_claims', 'access_ai_processing', 'access_dss_engine'],
          state: null,
          district: null
        });
      }
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // ==================== PUBLIC API ENDPOINTS ====================
  // These endpoints are accessible without authentication for public WebGIS access
  
  // Public claims endpoint - only verified claims
  app.get('/api/public/claims', async (req, res) => {
    try {
      // Only return verified claims for public access
      const claims = await storage.getPublicClaims();
      res.json(claims);
    } catch (error) {
      console.error("Error fetching public claims:", error);
      res.status(500).json({ message: "Failed to fetch claims" });
    }
  });

  // Public villages endpoint
  app.get('/api/public/villages', async (req, res) => {
    try {
      const villages = await storage.getAllVillages();
      res.json(villages);
    } catch (error) {
      console.error("Error fetching villages:", error);
      res.status(500).json({ message: "Failed to fetch villages" });
    }
  });

  // Public assets endpoint 
  app.get('/api/public/assets', async (req, res) => {
    try {
      const assets = await storage.getAllAssets();
      res.json(assets);
    } catch (error) {
      console.error("Error fetching assets:", error);
      res.status(500).json({ message: "Failed to fetch assets" });
    }
  });

  // Backward compatibility - redirect old endpoints to public versions
  app.get('/api/geo/villages/all', async (req, res) => {
    try {
      const villages = await storage.getAllVillages();
      res.json(villages);
    } catch (error) {
      console.error("Error fetching villages:", error);
      res.status(500).json({ message: "Failed to fetch villages" });
    }
  });

  app.get('/api/assets', async (req, res) => {
    try {
      const assets = await storage.getAllAssets();
      res.json(assets);
    } catch (error) {
      console.error("Error fetching assets:", error);
      res.status(500).json({ message: "Failed to fetch assets" });
    }
  });


  // Public geographic endpoints (must be before auth middleware)
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

  // Apply JWT middleware only to specific protected routes (removed blanket authentication)
  // Most routes are now accessible without authentication for better user experience

  // ==================== USER MANAGEMENT ENDPOINTS ====================
  
  // Get all users (Admin only) - temporarily public for access
  app.get('/api/admin/users', async (req: any, res) => {
    try {
      const users = await storage.getAllUsersWithRoles();
      
      res.json({
        success: true,
        users: users.map((user: any) => ({
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          state: user.state,
          district: user.district,
          createdAt: user.createdAt,
          roles: user.roleAssignments.filter((assignment: any) => assignment.isActive).map((assignment: any) => ({
            id: assignment.role.id,
            name: assignment.role.name,
            displayName: assignment.role.displayName,
            assignedAt: assignment.assignedAt,
            expiresAt: assignment.expiresAt
          }))
        }))
      });
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch users' });
    }
  });

  // Get user by ID with roles - temporarily public for access
  app.get('/api/admin/users/:id', async (req: any, res) => {
    try {
      const user = await storage.getUserWithRoles(req.params.id);
      
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          state: user.state,
          district: user.district,
          createdAt: user.createdAt,
          roles: user.roleAssignments.filter((assignment: any) => assignment.isActive).map((assignment: any) => ({
            id: assignment.role.id,
            name: assignment.role.name,
            displayName: assignment.role.displayName,
            permissions: assignment.role.permissions,
            assignedAt: assignment.assignedAt,
            expiresAt: assignment.expiresAt,
            assignedBy: assignment.assignedBy
          }))
        }
      });
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch user' });
    }
  });

  // Assign role to user - temporarily public for access
  app.post('/api/admin/users/:id/roles', async (req: any, res) => {
    try {
      const { roleId, expiresAt, notes } = req.body;
      const userId = req.params.id;
      const adminId = req.user?.id || 'anonymous-admin';

      if (!roleId) {
        return res.status(400).json({ success: false, message: 'Role ID is required' });
      }

      // Check if user exists
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      // Check if role exists
      const role = await storage.getRole(roleId);
      if (!role) {
        return res.status(404).json({ success: false, message: 'Role not found' });
      }

      // Check if user already has this role
      const existingAssignments = await storage.getUserRoleAssignments(userId);
      const hasRole = existingAssignments.some((assignment: any) => 
        assignment.roleId === roleId && assignment.isActive
      );

      if (hasRole) {
        return res.status(400).json({ success: false, message: 'User already has this role' });
      }

      // Assign role
      const assignment = await storage.assignUserRole({
        userId,
        roleId,
        assignedBy: adminId,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        isActive: true,
        notes
      });

      // Log audit trail
      await storage.createAuditTrail({
        entityType: 'user_role_assignments',
        entityId: assignment.id,
        action: 'assign_role',
        userId: adminId,
        newValues: { userId, roleId, role: role.name },
        notes: `Admin assigned ${role.displayName} role to user`
      });

      res.json({
        success: true,
        message: `Role ${role.displayName} assigned successfully`,
        assignment: {
          id: assignment.id,
          roleId: assignment.roleId,
          assignedAt: assignment.assignedAt,
          expiresAt: assignment.expiresAt
        }
      });
    } catch (error) {
      console.error('Error assigning role:', error);
      res.status(500).json({ success: false, message: 'Failed to assign role' });
    }
  });

  // Remove role from user (Admin only)
  app.delete('/api/admin/users/:id/roles/:roleId', async (req: any, res) => {
    try {
      const { id: userId, roleId } = req.params;
      const adminId = req.user?.id || 'anonymous-admin';

      // Deactivate role assignment
      const updated = await storage.deactivateUserRole(userId, roleId);
      
      if (!updated) {
        return res.status(404).json({ success: false, message: 'Role assignment not found' });
      }

      // Log audit trail
      await storage.createAuditTrail({
        entityType: 'user_role_assignments',
        entityId: roleId,
        action: 'remove_role',
        userId: adminId,
        oldValues: { userId, roleId, active: true },
        newValues: { userId, roleId, active: false },
        notes: 'Admin removed role from user'
      });

      res.json({
        success: true,
        message: 'Role removed successfully'
      });
    } catch (error) {
      console.error('Error removing role:', error);
      res.status(500).json({ success: false, message: 'Failed to remove role' });
    }
  });

  // Get all available roles (Admin only)
  app.get('/api/admin/roles', async (req: any, res) => {
    try {
      const roles = await storage.getAllRoles();
      
      res.json({
        success: true,
        roles: roles.map((role: any) => ({
          id: role.id,
          name: role.name,
          displayName: role.displayName,
          description: role.description,
          permissions: role.permissions,
          isActive: role.isActive,
          createdAt: role.createdAt
        }))
      });
    } catch (error) {
      console.error('Error fetching roles:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch roles' });
    }
  });

  // Update user's geographic assignment (Admin only)
  app.put('/api/admin/users/:id/geography', async (req: any, res) => {
    try {
      const { state, district } = req.body;
      const userId = req.params.id;
      const adminId = req.user?.id || 'anonymous-admin';

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      // Update user's geographic assignment
      await storage.updateUserGeography(userId, { state, district });

      // Log audit trail
      await storage.createAuditTrail({
        entityType: 'users',
        entityId: userId,
        action: 'update_geography',
        userId: adminId,
        oldValues: { state: user.state, district: user.district },
        newValues: { state, district },
        notes: 'Admin updated user geographic assignment'
      });

      res.json({
        success: true,
        message: 'Geographic assignment updated successfully'
      });
    } catch (error) {
      console.error('Error updating user geography:', error);
      res.status(500).json({ success: false, message: 'Failed to update geographic assignment' });
    }
  });

  // Get user statistics by role (Admin and State users)
  app.get('/api/admin/users/stats', async (req: any, res) => {
    try {
      const stats = await storage.getUserStatsByRole();
      
      res.json({
        success: true,
        stats: stats
      });
    } catch (error) {
      console.error('Error fetching user stats:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch user statistics' });
    }
  });

  // ==================== END USER MANAGEMENT ====================

  // OCR processing endpoint - made accessible without authentication 
  app.post('/api/documents/process', 
    upload.single('document'), 
    async (req: any, res) => {
    // Ensure JSON response headers
    res.setHeader('Content-Type', 'application/json');
    
    try {
      const userId = req.user?.id || 'anonymous-user';
      const { claimId } = req.body;
      const { file } = req;
      
      if (!file) {
        return res.status(400).json({ success: false, message: "No file uploaded" });
      }

      if (!claimId) {
        return res.status(400).json({ success: false, message: "Claim ID is required" });
      }

      console.log(`Processing FRA document: ${file.originalname} for claim ${claimId}`);
      
      // Save document record first
      const document = await storage.createDocument({
        claimId,
        fileName: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
        filePath: file.path,
      });

      // Process document immediately for instant feedback
      try {
        const processedData = await documentProcessor.processDocument(file.path, file.mimetype, document.id);
        
        // Update document with OCR results
        await storage.updateDocument(document.id, {
          ocrText: processedData.text,
          ocrConfidence: processedData.confidence.toString(),
          extractedEntities: processedData.entities,
          processedAt: new Date(),
          processingStatus: 'processed'
        });

        // Clean up uploaded file
        try {
          const fs = await import('fs');
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        } catch (cleanupError) {
          console.log('File cleanup skipped:', cleanupError);
        }
        
        return res.json({
          success: true,
          documentId: document.id,
          originalFileName: file.originalname,
          fileType: file.mimetype,
          fileSize: file.size,
          claimId,
          message: "Document processed successfully",
          ocrResults: {
            text: processedData.text,
            confidence: processedData.confidence,
            language: processedData.language,
            entities: processedData.entities,
            metadata: {
              processingTime: processedData.metadata?.processingTime || 0,
              imageQuality: processedData.metadata?.imageQuality || 'unknown',
              ocrMethod: processedData.metadata?.ocrMethod || 'tesseract',
              preprocessingApplied: processedData.metadata?.preprocessingApplied || []
            }
          }
        });
      } catch (processingError) {
        console.error("Document processing failed:", processingError);
        
        // Clean up file on error
        try {
          const fs = await import('fs');
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        } catch (cleanupError) {
          console.log('File cleanup skipped:', cleanupError);
        }
        
        return res.status(200).json({
          success: false,
          documentId: document.id,
          originalFileName: file.originalname,
          fileType: file.mimetype,
          fileSize: file.size,
          claimId,
          message: "Document uploaded but processing failed",
          error: processingError instanceof Error ? processingError.message : 'Unknown error'
        });
      }
    } catch (error) {
      console.error("Document processing failed:", error);
      // Ensure error response is JSON
      try {
        return res.status(500).json({ 
          success: false,
          message: "OCR processing failed", 
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      } catch (responseError) {
        console.error("Error sending error response:", responseError);
        // Fallback if JSON response fails
        res.status(500).end(JSON.stringify({
          success: false,
          message: "OCR processing failed",
          error: "Internal server error"
        }));
      }
    }
  });

  // Enhanced FRA OCR Processing Endpoints
  
  // Dedicated FRA document processing endpoint
  app.post('/api/fra/process', 
    upload.single('document'), 
    async (req: any, res) => {
    res.setHeader('Content-Type', 'application/json');
    
    try {
      const { file } = req;
      const { documentType = 'individual_forest_rights', state = 'all_states' } = req.body;
      
      if (!file) {
        return res.status(400).json({ 
          success: false, 
          message: "No FRA document uploaded" 
        });
      }

      console.log(`🔄 Processing FRA document: ${file.originalname} (Type: ${documentType}, State: ${state})`);
      
      // Process with enhanced FRA OCR engine
      const processedData = await documentProcessor.processDocument(file.path, file.mimetype);
      
      // Clean up uploaded file
      try {
        const fs = await import('fs');
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      } catch (cleanupError) {
        console.log('File cleanup completed');
      }
      
      return res.json({
        success: true,
        message: "FRA document processed successfully",
        originalFileName: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
        documentType,
        state,
        results: {
          text: processedData.text,
          confidence: processedData.confidence,
          language: processedData.language,
          entities: processedData.entities,
          claimRecords: processedData.claimRecords || [],
          metadata: {
            processingTime: processedData.metadata?.processingTime || 0,
            imageQuality: processedData.metadata?.imageQuality || 'good',
            ocrMethod: processedData.metadata?.ocrMethod || 'Enhanced-FRA-OCR',
            preprocessingApplied: processedData.metadata?.preprocessingApplied || [],
            pageCount: processedData.metadata?.pageCount || 1
          }
        },
        timestamp: new Date().toISOString()
      });
      
    } catch (error: any) {
      console.error('❌ FRA document processing failed:', error);
      return res.status(500).json({
        success: false,
        message: "FRA document processing failed",
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // OCR health check endpoint
  app.get('/api/test/ocr/health', async (req, res) => {
    try {
      const healthStatus = await documentProcessor.healthCheck();
      res.json(healthStatus);
    } catch (error) {
      res.status(500).json({ 
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Test improved FRA OCR with uploaded image
  app.post('/api/test/ocr/fra', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No image file uploaded' });
      }

      console.log(`🧪 Testing improved FRA OCR with: ${req.file.originalname}`);
      
      // Use the new optimized FRA OCR function
      // Use regular document processor for now
      const result = await documentProcessor.processDocument(req.file.path, req.file.mimetype);
      
      // Clean up uploaded file
      try {
        const fs = await import('fs');
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
      } catch (cleanupError) {
        console.log('File cleanup skipped:', cleanupError);
      }
      
      res.json({
        success: true,
        fileName: req.file.originalname,
        ocrResults: {
          text: result.text,
          confidence: result.confidence,
          method: result.metadata?.ocrMethod || 'unknown',
          processingTime: result.metadata?.processingTime || 0,
          tokens: result.text.split(/\s+/).length
        },
        improvements: [
          'English-focused language model',
          'Form-optimized page segmentation (PSM 6)',
          'Character whitelist for FRA documents',
          'Enhanced text cleaning and normalization'
        ]
      });
      
    } catch (error) {
      console.error('FRA OCR test error:', error);
      res.status(500).json({ 
        error: 'FRA OCR test failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Test NER extraction with sample FRA text
  app.post('/api/test/ner', async (req, res) => {
    try {
      const { text } = req.body;
      
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: 'Text content is required' });
      }
      
      const processor = documentProcessor;
      
      // Extract entities using the enhanced NER system
      const entities = await (processor as any).extractFRAEntitiesWithAI(text);
      
      // Create structured claim records
      const claimRecords = (processor as any).createStructuredClaimRecords(
        entities,
        'test-' + Date.now(),
        95 // High confidence for manual text input
      );
      
      res.json({
        success: true,
        extractedEntities: entities,
        structuredClaimRecords: claimRecords,
        summary: {
          namesFound: entities.names?.length || 0,
          villagesFound: entities.villages?.length || 0,
          areasFound: entities.areas?.length || 0,
          coordinatesFound: entities.coordinates?.length || 0,
          datesFound: entities.dates?.length || 0,
          claimTypesFound: entities.claimTypes?.length || 0,
          claimStatusFound: entities.claimStatus?.length || 0,
          documentTypesFound: entities.documentTypes?.length || 0,
          surveyNumbersFound: entities.surveyNumbers?.length || 0,
          boundariesFound: entities.boundaries?.length || 0
        },
        claimsCreated: claimRecords.length
      });
      
    } catch (error) {
      console.error('NER test error:', error);
      res.status(500).json({ 
        error: 'NER processing failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Auth middleware

  // Auth routes
  app.get('/api/auth/user', async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Dashboard stats - publicly accessible
  app.get('/api/dashboard/stats', async (req: any, res) => {
    try {
      // Use default stats for public access
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Claims routes - publicly accessible 
  app.get('/api/claims', async (req: any, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const status = req.query.status as string;
      const claimType = req.query.claimType as string;

      // Get all claims for public access (no user restrictions)
      const claims = await storage.getClaims({
        userId: 'anonymous-user', // Use anonymous for public access
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

  app.get('/api/claims/:id', async (req, res) => {
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

  app.post('/api/claims', async (req: any, res) => {
    try {
      // Remove authentication requirement - direct access
      
      // Transform numeric fields to strings before validation
      const transformedBody = {
        ...req.body,
      };
      
      // Convert numeric decimal fields to strings
      if (typeof req.body.area === 'number') {
        transformedBody.area = req.body.area.toString();
      }
      if (typeof req.body.aiConfidence === 'number') {
        transformedBody.aiConfidence = req.body.aiConfidence.toString();
      }
      
      const claimData = insertClaimSchema.parse(transformedBody);
      
      // Generate claim ID without user dependency
      const timestamp = Date.now();
      const claimId = `FRA-TEST-${timestamp.toString().slice(-6)}`;

      const claim = await storage.createClaim({
        ...claimData,
        claimId,
      });

      res.status(201).json(claim);
    } catch (error) {
      console.error("Error creating claim:", error);
      if (error instanceof Error && error.name === 'ZodError') {
        console.error("Zod validation failed for field(s):", (error as any).errors.map((e: any) => ({ path: e.path, message: e.message })));
      }
      res.status(500).json({ message: "Failed to create claim" });
    }
  });

  app.patch('/api/claims/:id/status', async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user || !user.role || !['admin', 'state', 'district'].includes(user.role)) {
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

  // Verification Workflow API endpoints
  app.post('/api/workflow/initialize/:claimId', async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { claimId } = req.params;
      const { priority = 'medium' } = req.body;

      // Verify user has permission to initialize workflows
      const user = await storage.getUser(userId);
      if (!user || !['admin', 'state', 'district', 'field'].includes(user.role || '')) {
        return res.status(403).json({ message: "Insufficient permissions to initialize workflow" });
      }

      const workflow = await verificationWorkflow.initializeWorkflow(claimId, priority);
      
      res.status(201).json({
        success: true,
        workflow,
        message: "Verification workflow initialized successfully"
      });
    } catch (error) {
      console.error("Error initializing workflow:", error);
      res.status(500).json({ message: "Failed to initialize verification workflow" });
    }
  });

  app.get('/api/workflow/status/:claimId', async (req: any, res) => {
    try {
      const { claimId } = req.params;
      const workflow = await verificationWorkflow.getWorkflowStatus(claimId);
      
      if (!workflow) {
        return res.status(404).json({ message: "Workflow not found for this claim" });
      }

      // Get workflow steps
      const steps = await storage.getVerificationSteps(workflow.id);
      
      res.json({
        workflow,
        steps,
        currentStepName: (workflow.currentStep !== null && steps[workflow.currentStep]) ? steps[workflow.currentStep].stepName : 'Completed'
      });
    } catch (error) {
      console.error("Error fetching workflow status:", error);
      res.status(500).json({ message: "Failed to fetch workflow status" });
    }
  });

  app.post('/api/workflow/process-step/:claimId', async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { claimId } = req.params;

      const user = await storage.getUser(userId);
      if (!user || !['admin', 'state', 'district', 'field'].includes(user.role || '')) {
        return res.status(403).json({ message: "Insufficient permissions to process workflow steps" });
      }

      const updatedWorkflow = await verificationWorkflow.processNextStep(claimId, userId);
      
      res.json({
        success: true,
        workflow: updatedWorkflow,
        message: "Workflow step processed successfully"
      });
    } catch (error) {
      console.error("Error processing workflow step:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to process workflow step" });
    }
  });

  app.get('/api/workflow/audit/:claimId', async (req: any, res) => {
    try {
      const { claimId } = req.params;
      const auditTrail = await verificationWorkflow.getAuditTrail(claimId);
      
      res.json({
        auditTrail,
        totalEntries: auditTrail.length
      });
    } catch (error) {
      console.error("Error fetching audit trail:", error);
      res.status(500).json({ message: "Failed to fetch audit trail" });
    }
  });

  app.post('/api/workflow/assign/:claimId', async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { claimId } = req.params;
      const { assignedTo } = req.body;

      const user = await storage.getUser(userId);
      if (!user || !['admin', 'state', 'district'].includes(user.role || '')) {
        return res.status(403).json({ message: "Insufficient permissions to assign workflows" });
      }

      await verificationWorkflow.assignWorkflow(claimId, userId, assignedTo);
      
      res.json({
        success: true,
        message: "Workflow assigned successfully"
      });
    } catch (error) {
      console.error("Error assigning workflow:", error);
      res.status(500).json({ message: "Failed to assign workflow" });
    }
  });

  app.post('/api/workflow/escalate/:claimId', async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { claimId } = req.params;
      const { reason } = req.body;

      const user = await storage.getUser(userId);
      if (!user || !['admin', 'state', 'district', 'field'].includes(user.role || '')) {
        return res.status(403).json({ message: "Insufficient permissions to escalate workflows" });
      }

      await verificationWorkflow.escalateWorkflow(claimId, userId, reason);
      
      res.json({
        success: true,
        message: "Workflow escalated successfully"
      });
    } catch (error) {
      console.error("Error escalating workflow:", error);
      res.status(500).json({ message: "Failed to escalate workflow" });
    }
  });

  // Document upload and processing
  app.post('/api/documents/upload', upload.single('document'), async (req: any, res) => {
    try {
      const userId = 'test-user'; // Mock user ID since auth is removed
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
          ocrConfidence: processedData.confidence.toString(),
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
  app.get('/api/ai/processing-status', async (req, res) => {
    try {
      const status = await aiProcessor.getProcessingStatus();
      res.json(status);
    } catch (error) {
      console.error("Error fetching AI processing status:", error);
      res.status(500).json({ message: "Failed to fetch processing status" });
    }
  });

  app.post('/api/ai/reprocess-document/:documentId', async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user || !user.role || !['admin', 'state'].includes(user.role)) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const document = await storage.getDocumentById(req.params.documentId);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      const processedData = await documentProcessor.processDocument(document.filePath, document.fileType);
      
      await storage.updateDocument(document.id, {
        ocrText: processedData.text,
        ocrConfidence: processedData.confidence.toString(),
        extractedEntities: processedData.entities,
        processedAt: new Date(),
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error reprocessing document:", error);
      res.status(500).json({ message: "Failed to reprocess document" });
    }
  });

  // Asset detection route
  app.post('/api/ai/detect-assets', async (req, res) => {
    try {
      const { lat, lng, villageId } = req.body;
      
      if (!lat || !lng) {
        return res.status(400).json({ message: "Latitude and longitude are required" });
      }

      console.log(`🔍 Asset detection request for coordinates: ${lat}, ${lng}`);
      const assets = await aiProcessor.detectAssetsAtCoordinates(lat, lng, villageId);
      
      res.json({
        assets,
        count: assets.length,
        timestamp: new Date().toISOString(),
        coordinates: { lat, lng }
      });
    } catch (error) {
      console.error("Error detecting assets:", error);
      res.status(500).json({ message: "Failed to detect assets" });
    }
  });

  // Assets routes
  app.get('/api/assets', async (req, res) => {
    try {
      const assets = await storage.getAllAssets();
      res.json(assets);
    } catch (error) {
      console.error("Error fetching assets:", error);
      res.status(500).json({ message: "Failed to fetch assets" });
    }
  });

  app.post('/api/assets', async (req, res) => {
    try {
      const asset = await storage.createAsset(req.body);
      res.json(asset);
    } catch (error) {
      console.error("Error creating asset:", error);
      res.status(500).json({ message: "Failed to create asset" });
    }
  });

  // Village routes
  app.post('/api/villages', async (req, res) => {
    try {
      const village = await storage.createVillage(req.body);
      res.json(village);
    } catch (error) {
      console.error("Error creating village:", error);
      res.status(500).json({ message: "Failed to create village" });
    }
  });

  // Asset detection
  app.post('/api/assets/detect/:villageId', async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user || !user.role || !['admin', 'state', 'district'].includes(user.role)) {
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
  app.get('/api/dss/recommendations/:claimId', async (req, res) => {
    try {
      const recommendations = await dssEngine.generateRecommendations(req.params.claimId);
      res.json(recommendations);
    } catch (error) {
      console.error("Error generating recommendations:", error);
      res.status(500).json({ message: "Failed to generate recommendations" });
    }
  });

  app.get('/api/dss/village-recommendations/:villageId', async (req, res) => {
    try {
      const recommendations = await dssEngine.generateVillageRecommendations(req.params.villageId);
      res.json(recommendations);
    } catch (error) {
      console.error("Error generating village recommendations:", error);
      res.status(500).json({ message: "Failed to generate village recommendations" });
    }
  });

  app.post('/api/dss/implement-recommendation/:recommendationId', async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user || !user.role || !['admin', 'state', 'district'].includes(user.role)) {
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

  // Additional DSS endpoints for comprehensive scheme management
  app.get('/api/dss/schemes', async (req, res) => {
    try {
      // Return all available schemes with their details
      const schemes = await dssEngine.getAllSchemes();
      res.json(schemes);
    } catch (error) {
      console.error("Error fetching schemes:", error);
      res.status(500).json({ message: "Failed to fetch schemes" });
    }
  });

  app.get('/api/dss/schemes/:schemeId', async (req, res) => {
    try {
      const scheme = await dssEngine.getSchemeDetails(req.params.schemeId);
      if (!scheme) {
        return res.status(404).json({ message: "Scheme not found" });
      }
      res.json(scheme);
    } catch (error) {
      console.error("Error fetching scheme details:", error);
      res.status(500).json({ message: "Failed to fetch scheme details" });
    }
  });

  app.get('/api/dss/eligibility-matrix/:villageId', async (req, res) => {
    try {
      const matrix = await dssEngine.getSchemeEligibilityMatrix(req.params.villageId);
      res.json(matrix);
    } catch (error) {
      console.error("Error generating eligibility matrix:", error);
      res.status(500).json({ message: "Failed to generate eligibility matrix" });
    }
  });

  app.post('/api/dss/search-schemes', async (req, res) => {
    try {
      const { category, ministry, targetBeneficiaries, searchTerm } = req.body;
      const schemes = await dssEngine.searchSchemes({
        category,
        ministry,
        targetBeneficiaries,
        searchTerm
      });
      res.json(schemes);
    } catch (error) {
      console.error("Error searching schemes:", error);
      res.status(500).json({ message: "Failed to search schemes" });
    }
  });

  // Note: Geographic endpoints moved to public section before auth middleware

  // OCR health check endpoint
  app.get('/api/ocr/health', async (req, res) => {
    try {
      const health = await documentProcessor.healthCheck();
      res.json(health);
    } catch (error) {
      console.error("OCR health check failed:", error);
      res.status(500).json({
        status: 'unhealthy',
        workersActive: 0,
        totalWorkers: 0,
        supportedLanguages: [],
        lastError: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Batch processing endpoints
  app.post('/api/documents/batch', upload.array('documents', 50), async (req: any, res) => {
    try {
      const userId = req.user.id;
      const files = req.files as Express.Multer.File[];
      const { claimIds } = req.body; // JSON array of claim IDs
      
      if (!files || files.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
      }

      const parsedClaimIds = JSON.parse(claimIds);
      if (parsedClaimIds.length !== files.length) {
        return res.status(400).json({ message: "Number of claim IDs must match number of files" });
      }

      console.log(`Processing batch of ${files.length} FRA documents`);
      
      // Create document records and prepare for batch processing
      const documents = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const claimId = parsedClaimIds[i];
        
        const document = await storage.createDocument({
          claimId,
          fileName: file.originalname,
          fileType: file.mimetype,
          fileSize: file.size,
          filePath: file.path,
        });
        
        documents.push({
          id: document.id,
          filePath: file.path,
          fileType: file.mimetype,
          claimId,
          priority: 'normal' as const
        });

        // Log audit trail for each upload
        await storage.createAuditTrail({
          entityType: 'documents',
          entityId: document.id,
          action: 'batch_upload',
          userId,
          newValues: document,
          notes: `Document uploaded in batch processing`
        });
      }

      // Submit batch for processing
      const batchId = await batchProcessor.addBatch(documents);

      res.json({
        success: true,
        batchId,
        documentsCount: documents.length,
        message: `Batch processing started for ${documents.length} documents`
      });
    } catch (error) {
      console.error("Batch upload failed:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to process batch upload",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get batch processing status
  app.get('/api/batch/:batchId', async (req, res) => {
    try {
      const { batchId } = req.params;
      const batchStatus = batchProcessor.getBatchStatus(batchId);
      
      if (!batchStatus) {
        return res.status(404).json({ message: "Batch not found" });
      }
      
      res.json(batchStatus);
    } catch (error) {
      console.error("Failed to get batch status:", error);
      res.status(500).json({ message: "Failed to get batch status" });
    }
  });

  // Get processing queue status
  app.get('/api/ocr/queue', async (req: any, res) => {
    try {
      const user = req.user;
      
      // Only admin and state users can view queue status
      if (!['admin', 'state'].includes(user.role || '')) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }
      
      const queueStatus = batchProcessor.getQueueStatus();
      const processingStats = await batchProcessor.getProcessingStats();
      
      res.json({
        queue: queueStatus,
        stats: processingStats
      });
    } catch (error) {
      console.error("Failed to get queue status:", error);
      res.status(500).json({ message: "Failed to get processing queue status" });
    }
  });

  // Get OCR processing statistics
  app.get('/api/ocr/stats', async (req, res) => {
    try {
      const processingStats = await documentProcessor.getProcessingStats();
      res.json(processingStats);
    } catch (error) {
      console.error("Failed to get OCR stats:", error);
      res.status(500).json({ message: "Failed to get processing statistics" });
    }
  });

  // Export routes
  app.get('/api/export/claims', async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const format = req.query.format || 'csv';
      const exportData = await storage.exportClaims({
        userId,
        userRole: req.user.currentRole || undefined,
        state: user.state || undefined,
        district: user.district || undefined,
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

  // Land-Use Classification Routes
  
  // Single point land-use classification
  app.post('/api/land-use/classify', async (req, res) => {
    try {
      const { lat, lng, highResolution, apiKey } = req.body;
      
      if (!lat || !lng) {
        return res.status(400).json({ message: "Latitude and longitude are required" });
      }

      const result = await landUseClassificationService.classifyLandUse({
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        highResolution: Boolean(highResolution),
        apiKey
      });

      res.json(result);
    } catch (error) {
      console.error("Error in land-use classification:", error);
      res.status(500).json({ message: "Failed to classify land use" });
    }
  });

  // Batch land-use classification for multiple points
  app.post('/api/land-use/classify-batch', async (req, res) => {
    try {
      const { locations, highResolution, apiKey } = req.body;
      
      if (!locations || !Array.isArray(locations)) {
        return res.status(400).json({ message: "Locations array is required" });
      }

      const results = await landUseClassificationService.batchClassifyLandUse(
        locations,
        { highResolution: Boolean(highResolution), apiKey }
      );

      res.json({ results, count: results.length });
    } catch (error) {
      console.error("Error in batch land-use classification:", error);
      res.status(500).json({ message: "Failed to classify land use for batch" });
    }
  });

  // Regional land-use statistics
  app.post('/api/land-use/region-stats', async (req, res) => {
    try {
      const { bounds, gridSize } = req.body;
      
      if (!bounds || !bounds.north || !bounds.south || !bounds.east || !bounds.west) {
        return res.status(400).json({ 
          message: "Bounding box with north, south, east, west coordinates is required" 
        });
      }

      const stats = await landUseClassificationService.getRegionStatistics(
        bounds,
        gridSize || 5
      );

      res.json(stats);
    } catch (error) {
      console.error("Error getting regional land-use statistics:", error);
      res.status(500).json({ message: "Failed to get regional statistics" });
    }
  });

  // Generate GeoJSON for land-use classification
  app.post('/api/land-use/geojson', async (req, res) => {
    try {
      const { bounds, gridResolution, highResolution, apiKey, includeMetadata } = req.body;
      
      if (!bounds) {
        return res.status(400).json({ message: "Bounding box is required" });
      }

      const geoJSONResult = await gisIntegrationService.generateLandUseGeoJSON(
        bounds,
        { 
          gridResolution: gridResolution || 10,
          highResolution: Boolean(highResolution),
          apiKey,
          includeMetadata: Boolean(includeMetadata)
        }
      );

      res.json(geoJSONResult);
    } catch (error) {
      console.error("Error generating land-use GeoJSON:", error);
      res.status(500).json({ message: "Failed to generate GeoJSON" });
    }
  });

  // Generate heatmap data for specific land-use class
  app.post('/api/land-use/heatmap', async (req, res) => {
    try {
      const { bounds, classType, resolution } = req.body;
      
      if (!bounds || !classType) {
        return res.status(400).json({ 
          message: "Bounding box and class type are required" 
        });
      }

      const validClasses = ['agriculture', 'forest', 'water', 'builtUp'];
      if (!validClasses.includes(classType)) {
        return res.status(400).json({ 
          message: `Invalid class type. Must be one of: ${validClasses.join(', ')}` 
        });
      }

      const heatmapData = await gisIntegrationService.generateClassificationHeatmap(
        bounds,
        classType,
        resolution || 20
      );

      res.json(heatmapData);
    } catch (error) {
      console.error("Error generating classification heatmap:", error);
      res.status(500).json({ message: "Failed to generate heatmap" });
    }
  });

  // Export land-use classification data
  app.post('/api/land-use/export', async (req, res) => {
    try {
      const { bounds, format, gridResolution } = req.body;
      
      if (!bounds || !format) {
        return res.status(400).json({ message: "Bounding box and format are required" });
      }

      const validFormats = ['geojson', 'csv', 'kml'];
      if (!validFormats.includes(format)) {
        return res.status(400).json({ 
          message: `Invalid format. Must be one of: ${validFormats.join(', ')}` 
        });
      }

      // Generate grid points and classify
      const gridPoints = [];
      const resolution = gridResolution || 10;
      const { north, south, east, west } = bounds;
      const latStep = (north - south) / resolution;
      const lngStep = (east - west) / resolution;
      
      for (let i = 0; i <= resolution; i++) {
        for (let j = 0; j <= resolution; j++) {
          gridPoints.push({
            lat: south + i * latStep,
            lng: west + j * lngStep
          });
        }
      }

      const classifications = await landUseClassificationService.batchClassifyLandUse(gridPoints);
      
      const exportData = await gisIntegrationService.exportClassificationData(
        classifications,
        format
      );

      res.setHeader('Content-Disposition', `attachment; filename=${exportData.filename}`);
      res.setHeader('Content-Type', exportData.mimeType);
      res.send(exportData.data);
    } catch (error) {
      console.error("Error exporting land-use data:", error);
      res.status(500).json({ message: "Failed to export land-use data" });
    }
  });

  // Asset Detection API endpoints
  app.post('/api/assets/detect', async (req: any, res) => {
    try {
      const { villageId, coordinates } = req.body;
      
      if (!villageId && !coordinates) {
        return res.status(400).json({ message: "Village ID or coordinates are required" });
      }
      
      let detectedAssets;
      if (villageId) {
        detectedAssets = await aiProcessor.detectAssetsForVillage(villageId);
      } else {
        // Direct coordinate-based detection using enhanced comprehensive system
        const { lat, lng } = coordinates;
        if (!lat || !lng) {
          return res.status(400).json({ message: "Latitude and longitude are required" });
        }
        
        // Use the new comprehensive asset detection system
        detectedAssets = await aiProcessor.detectAssetsAtCoordinates(lat, lng);
      }
      
      res.json({ 
        success: true, 
        assets: detectedAssets,
        count: detectedAssets.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Asset detection error:', error);
      res.status(500).json({ message: "Failed to detect assets" });
    }
  });

  // Land use classification endpoint
  app.post('/api/landuse/classify', async (req: any, res) => {
    try {
      const { lat, lng, highResolution = false } = req.body;
      
      if (!lat || !lng) {
        return res.status(400).json({ message: "Latitude and longitude are required" });
      }
      
      const apiKey = highResolution ? process.env.SENTINEL_HUB_API_KEY : undefined;
      const result = await landUseClassificationService.classifyLandUse({
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        highResolution,
        apiKey
      });
      
      res.json({ 
        success: true, 
        classification: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Land use classification error:', error);
      res.status(500).json({ message: "Failed to classify land use" });
    }
  });

  // Batch asset detection for multiple locations
  app.post('/api/assets/batch-detect', async (req: any, res) => {
    try {
      const { locations, highResolution = false } = req.body;
      
      if (!locations || !Array.isArray(locations)) {
        return res.status(400).json({ message: "Locations array is required" });
      }
      
      const apiKey = highResolution ? process.env.SENTINEL_HUB_API_KEY : undefined;
      const results = await landUseClassificationService.batchClassifyLandUse(
        locations.map(loc => ({ lat: parseFloat(loc.lat), lng: parseFloat(loc.lng) })),
        { highResolution, apiKey }
      );
      
      res.json({ 
        success: true, 
        results,
        count: results.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Batch asset detection error:', error);
      res.status(500).json({ message: "Failed to perform batch asset detection" });
    }
  });

  // RBAC Management Routes (Admin only)
  
  // Get all roles
  app.get('/api/admin/roles', async (req: any, res) => {
      try {
        const roles = await storage.getRoles();
        res.json(roles);
      } catch (error) {
        console.error('Error fetching roles:', error);
        res.status(500).json({ message: "Failed to fetch roles" });
      }
    }
  );

  // Get all users with their roles (Admin only)
  app.get('/api/admin/users', async (req: any, res) => {
      try {
        // This would need to be implemented in storage
        const users = await storage.getAllUsersWithRoles();
        res.json(users);
      } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: "Failed to fetch users" });
      }
    }
  );

  // Assign role to user (Admin only)
  app.post('/api/admin/users/:userId/roles', async (req: any, res) => {
      try {
        const { userId } = req.params;
        const { roleId, notes, expiresAt } = req.body;
        const adminUserId = req.user.id;

        const assignment = await storage.assignUserRole({
          userId,
          roleId,
          assignedBy: adminUserId,
          expiresAt: expiresAt ? new Date(expiresAt) : undefined,
          notes,
          isActive: true
        });

        res.json({ success: true, assignment });
      } catch (error) {
        console.error('Error assigning role:', error);
        res.status(500).json({ message: "Failed to assign role" });
      }
    }
  );

  // Remove role from user (Admin only)
  app.delete('/api/admin/users/:userId/roles/:roleId', async (req: any, res) => {
      try {
        const { userId, roleId } = req.params;
        await storage.removeUserRole(userId, roleId);
        res.json({ success: true });
      } catch (error) {
        console.error('Error removing role:', error);
        res.status(500).json({ message: "Failed to remove role" });
      }
    }
  );

  // Get user's role assignments
  app.get('/api/users/:userId/roles', async (req: any, res) => {
      try {
        const { userId } = req.params;
        const requestingUserId = req.user.id;
        
        // Users can only view their own roles, unless they're admin
        if (requestingUserId !== userId && req.user.currentRole !== 'admin') {
          return res.status(403).json({ message: "Access denied" });
        }

        const assignments = await storage.getUserRoleAssignments(userId);
        res.json(assignments);
      } catch (error) {
        console.error('Error fetching user roles:', error);
        res.status(500).json({ message: "Failed to fetch user roles" });
      }
    }
  );

  // ===== DECISION SUPPORT SYSTEM (DSS) ENDPOINTS =====
  
  // Get scheme recommendations for a user/claimant
  app.get('/api/dss/recommendations/:userId', async (req: any, res) => {
    try {
      const { userId } = req.params;
      const { claimId } = req.query;
      
      // Get user profile and claim data for eligibility matching
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      let claimData = null;
      if (claimId) {
        claimData = await storage.getClaimById(claimId as string);
      }
      
      // Get all active schemes
      const schemes = await storage.getAllActiveSchemes();
      
      // Run eligibility engine to generate recommendations
      const recommendations = await generateSchemeRecommendations(user, claimData, schemes);
      
      // Save recommendations to database
      for (const rec of recommendations) {
        await storage.createSchemeRecommendation({
          userId,
          claimId: claimId as string || null,
          schemeId: rec.scheme.id,
          eligibilityScore: rec.eligibilityScore,
          matchingCriteria: rec.matchingCriteria,
          recommendationReason: rec.reason,
          applicationGuidance: rec.guidance,
          estimatedBenefit: rec.estimatedBenefit,
        });
      }
      
      res.json({
        recommendations: recommendations.map(r => ({
          ...r,
          scheme: {
            id: r.scheme.id,
            name: r.scheme.name,
            shortName: r.scheme.shortName,
            description: r.scheme.description,
            category: r.scheme.category,
            benefitAmount: r.scheme.benefitAmount,
            applicationWebsite: r.scheme.applicationWebsite,
            helplineNumber: r.scheme.helplineNumber,
          }
        }))
      });
    } catch (error) {
      console.error('Error generating scheme recommendations:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  // Get all available schemes
  app.get('/api/dss/schemes', async (req: any, res) => {
    try {
      const schemes = await storage.getAllActiveSchemes();
      res.json({ schemes });
    } catch (error) {
      console.error('Error fetching schemes:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  // Get scheme details by ID
  app.get('/api/dss/schemes/:schemeId', async (req: any, res) => {
    try {
      const { schemeId } = req.params;
      const scheme = await storage.getSchemeById(schemeId);
      
      if (!scheme) {
        return res.status(404).json({ message: 'Scheme not found' });
      }
      
      res.json({ scheme });
    } catch (error) {
      console.error('Error fetching scheme details:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  // Update recommendation status (applied, approved, rejected)
  app.patch('/api/dss/recommendations/:recommendationId/status', async (req: any, res) => {
    try {
      const { recommendationId } = req.params;
      const { status, appliedDate } = req.body;
      
      const validStatuses = ['recommended', 'applied', 'approved', 'rejected'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
      }
      
      const updatedRec = await storage.updateSchemeRecommendationStatus(recommendationId, {
        status,
        appliedDate: appliedDate ? new Date(appliedDate) : null,
      });
      
      res.json({ recommendation: updatedRec });
    } catch (error) {
      console.error('Error updating recommendation status:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  // Get user's recommendation history
  app.get('/api/dss/users/:userId/recommendations', async (req: any, res) => {
    try {
      const { userId } = req.params;
      const { status, limit = 20, offset = 0 } = req.query;
      
      const recommendations = await storage.getUserSchemeRecommendations(userId, {
        status: status as string,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      });
      
      res.json({ recommendations });
    } catch (error) {
      console.error('Error fetching user recommendations:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // ==================== ADDITIONAL REST API ENDPOINTS ====================

  // Bulk import/export endpoints
  app.post('/api/bulk/import/claims', upload.single('file'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file provided' });
      }

      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      let claims = [];
      const filePath = req.file.path;

      if (req.file.mimetype === 'text/csv') {
        const fs = await import('fs');
        const csvContent = fs.readFileSync(filePath, 'utf-8');
        const lines = csvContent.split('\n');
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        
        for (let i = 1; i < lines.length; i++) {
          if (lines[i].trim()) {
            const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
            const claim: any = {};
            
            headers.forEach((header, index) => {
              if (header === 'claimantName') claim.claimantName = values[index];
              else if (header === 'claimType') claim.claimType = values[index];
              else if (header === 'area') claim.area = parseFloat(values[index]) || 0;
              else if (header === 'villageId') claim.villageId = values[index];
              else if (header === 'status') claim.status = values[index] || 'pending';
            });

            if (claim.claimantName) {
              claims.push(claim);
            }
          }
        }
      } else if (req.file.mimetype === 'application/json') {
        const fs = await import('fs');
        const jsonContent = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(jsonContent);
        claims = Array.isArray(data) ? data : [data];
      }

      const results = [];
      const errors = [];

      for (const claimData of claims) {
        try {
          const stateCode = user.state?.substring(0, 2).toUpperCase() || 'XX';
          const timestamp = Date.now() + results.length;
          const claimId = `FRA-${stateCode}-${timestamp.toString().slice(-6)}`;

          const claim = await storage.createClaim({
            ...claimData,
            claimId,
          });

          results.push(claim);

          await storage.createAuditTrail({
            entityType: 'claims',
            entityId: claim.id,
            action: 'bulk_import',
            userId: req.user.id,
            newValues: claim,
            notes: `Claim imported from ${req.file.mimetype} file`,
          });
        } catch (error) {
          errors.push({
            data: claimData,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      // Clean up uploaded file
      const fs = await import('fs');
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      res.json({
        success: true,
        message: `Bulk import completed. ${results.length} claims imported successfully.`,
        data: {
          imported: results.length,
          errors: errors.length,
          errorDetails: errors
        }
      });
    } catch (error) {
      console.error('Error in bulk import:', error);
      res.status(500).json({ success: false, message: 'Bulk import failed' });
    }
  });

  // Export claims in multiple formats
  app.get('/api/bulk/export/claims', async (req: any, res) => {
    try {
      const format = (req.query.format as string) || 'json';
      const status = req.query.status as string;
      const claimType = req.query.claimType as string;

      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      const claims = await storage.getClaims({
        userId: req.user.id,
        userRole: req.user.currentRole,
        state: user.state || undefined,
        district: user.district || undefined,
        limit: 10000, // Export all
        status,
        claimType,
      });

      if (format === 'csv') {
        const csvData = await storage.exportClaims({
          userId: req.user.id,
          userRole: req.user.currentRole,
          state: user.state || undefined,
          district: user.district || undefined,
          format: 'csv'
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="claims_export.csv"');
        return res.send(csvData);
      } else if (format === 'geojson') {
        const features = claims.data
          .filter(claim => claim.coordinates)
          .map(claim => ({
            type: "Feature",
            properties: {
              id: claim.id,
              claimId: claim.claimId,
              claimantName: claim.claimantName,
              claimType: claim.claimType,
              area: claim.area,
              status: claim.status,
              aiConfidence: claim.aiConfidence,
              village: claim.village?.name
            },
            geometry: claim.coordinates
          }));

        const geoJSON = {
          type: "FeatureCollection",
          features
        };

        res.setHeader('Content-Type', 'application/geo+json');
        res.setHeader('Content-Disposition', 'attachment; filename="claims_export.geojson"');
        return res.json(geoJSON);
      } else {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename="claims_export.json"');
        return res.json({
          success: true,
          exportDate: new Date().toISOString(),
          totalRecords: claims.data.length,
          data: claims.data
        });
      }
    } catch (error) {
      console.error('Error in bulk export:', error);
      res.status(500).json({ success: false, message: 'Bulk export failed' });
    }
  });

  // GIS Data retrieval endpoints
  app.get('/api/gis/villages', async (req: any, res) => {
    try {
      const districtId = req.query.districtId as string;
      const format = req.query.format as string || 'json';

      let villages = [];
      
      if (districtId) {
        villages = await storage.getVillagesByDistrict(districtId);
      } else {
        villages = await storage.getAllVillages();
      }

      if (format === 'geojson') {
        const features = villages
          .filter(village => village.boundary)
          .map(village => ({
            type: "Feature",
            properties: {
              id: village.id,
              name: village.name,
              code: village.code,
              districtId: village.districtId,
              population: village.population,
              tribalPopulation: village.tribalPopulation,
              latitude: village.latitude,
              longitude: village.longitude
            },
            geometry: village.boundary
          }));

        res.setHeader('Content-Type', 'application/geo+json');
        return res.json({
          type: "FeatureCollection",
          features
        });
      }

      res.json({
        success: true,
        data: villages
      });
    } catch (error) {
      console.error('Error fetching village GIS data:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch village GIS data' });
    }
  });

  // Get claims with spatial data
  app.get('/api/gis/claims/spatial', async (req: any, res) => {
    try {
      const villageId = req.query.villageId as string;
      const format = req.query.format as string || 'geojson';

      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      let claims = [];
      
      if (villageId) {
        claims = await storage.getClaimsByVillage(villageId);
      } else {
        const claimsResult = await storage.getClaims({
          userId: req.user.id,
          userRole: req.user.currentRole,
          state: user.state || undefined,
          district: user.district || undefined,
          limit: 1000
        });
        claims = claimsResult.data;
      }

      const spatialClaims = claims.filter(claim => claim.coordinates);

      if (format === 'geojson') {
        const features = spatialClaims.map(claim => ({
          type: "Feature",
          properties: {
            id: claim.id,
            claimId: claim.claimId,
            claimantName: claim.claimantName,
            claimType: claim.claimType,
            area: claim.area,
            status: claim.status,
            aiConfidence: claim.aiConfidence,
            createdAt: claim.createdAt,
            village: claim.village?.name
          },
          geometry: claim.coordinates
        }));

        res.setHeader('Content-Type', 'application/geo+json');
        return res.json({
          type: "FeatureCollection",
          features
        });
      }

      res.json({
        success: true,
        data: spatialClaims,
        count: spatialClaims.length
      });
    } catch (error) {
      console.error('Error fetching spatial claims data:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch spatial claims data' });
    }
  });

  // Get detected assets spatial data
  app.get('/api/gis/assets', async (req: any, res) => {
    try {
      const villageId = req.query.villageId as string;
      const assetType = req.query.assetType as string;
      const format = req.query.format as string || 'geojson';

      const assets = await storage.getAllAssets();
      
      let filteredAssets = assets;
      if (villageId) {
        filteredAssets = assets.filter(asset => asset.villageId === villageId);
      }
      if (assetType) {
        filteredAssets = filteredAssets.filter(asset => asset.assetType === assetType);
      }

      if (format === 'geojson') {
        const features = filteredAssets.map(asset => ({
          type: "Feature",
          properties: {
            id: asset.id,
            villageId: asset.villageId,
            assetType: asset.assetType,
            area: asset.area,
            confidence: asset.confidence,
            detectedAt: asset.detectedAt,
            verifiedAt: asset.verifiedAt,
            verifiedBy: asset.verifiedBy
          },
          geometry: asset.coordinates
        }));

        res.setHeader('Content-Type', 'application/geo+json');
        return res.json({
          type: "FeatureCollection",
          features
        });
      }

      res.json({
        success: true,
        data: filteredAssets,
        count: filteredAssets.length
      });
    } catch (error) {
      console.error('Error fetching assets GIS data:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch assets GIS data' });
    }
  });

  // API Health check endpoint (public)
  app.get('/api/health', async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      
      res.json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          database: 'connected',
          ocr: 'ready',
          dss: 'ready'
        },
        stats: {
          totalClaims: stats.totalClaims,
          processingQueue: stats.aiProcessing
        }
      });
    } catch (error) {
      res.status(503).json({
        success: false,
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Rule-based eligibility matching engine
async function generateSchemeRecommendations(user: any, claimData: any, schemes: any[]) {
  const recommendations = [];
  
  for (const scheme of schemes) {
    const eligibilityResult = evaluateEligibility(user, claimData, scheme);
    
    if (eligibilityResult.isEligible && eligibilityResult.score > 0) {
      recommendations.push({
        scheme,
        eligibilityScore: eligibilityResult.score,
        matchingCriteria: eligibilityResult.matchingCriteria,
        reason: eligibilityResult.reason,
        guidance: generateApplicationGuidance(scheme, user),
        estimatedBenefit: calculateEstimatedBenefit(scheme, user, claimData),
      });
    }
  }
  
  // Sort by eligibility score (highest first)
  return recommendations.sort((a, b) => b.eligibilityScore - a.eligibilityScore);
}

// Core eligibility evaluation logic
function evaluateEligibility(user: any, claimData: any, scheme: any) {
  const rules = scheme.eligibilityRules;
  const mandatory = rules.mandatory || [];
  const scoring = rules.scoring || [];
  
  let score = 0;
  let isEligible = true;
  const matchingCriteria = [];
  const reasons = [];
  
  // Check mandatory criteria
  for (const rule of mandatory) {
    const matches = evaluateRule(rule, user, claimData);
    if (!matches) {
      isEligible = false;
      break;
    }
    matchingCriteria.push(rule.field);
  }
  
  // If mandatory criteria met, calculate scoring
  if (isEligible) {
    for (const rule of scoring) {
      const matches = evaluateRule(rule, user, claimData);
      if (matches) {
        score += rule.weight || 1;
        matchingCriteria.push(rule.field);
      }
    }
    
    // Generate reason based on matching criteria
    reasons.push(`Eligible based on: ${matchingCriteria.join(', ')}`);
  }
  
  return {
    isEligible,
    score,
    matchingCriteria,
    reason: reasons.join('; ')
  };
}

// Evaluate individual eligibility rules
function evaluateRule(rule: any, user: any, claimData: any) {
  const { field, operator, value } = rule;
  
  // Get the actual value to compare
  let actualValue = getUserFieldValue(field, user, claimData);
  
  switch (operator) {
    case 'equals':
      return actualValue === value;
    case 'greater_than':
      return parseFloat(actualValue) > parseFloat(value);
    case 'less_than':
      return parseFloat(actualValue) < parseFloat(value);
    case 'contains':
      return String(actualValue).toLowerCase().includes(value.toLowerCase());
    case 'in_list':
      const valueList = value.split(',').map((v: string) => v.trim());
      return valueList.includes(actualValue);
    default:
      return false;
  }
}

// Map field names to user/claim data
function getUserFieldValue(field: string, user: any, claimData: any) {
  // Predefined mappings for scheme eligibility
  const fieldMappings: { [key: string]: any } = {
    category: claimData?.claimType || user?.role === 'public' ? 'ST' : 'OTFD',
    landOwnership: claimData ? 'yes' : 'no',
    hasAadhaar: 'yes', // Assume users have Aadhaar
    hasBankAccount: 'yes', // Assume users have bank accounts
    residenceType: 'rural', // FRA claimants are typically rural
    hasWaterConnection: 'no', // Assume rural areas lack tap water
    forestDependence: claimData ? 'yes' : 'no',
    mfpCollector: claimData?.claimType === 'Community Rights' ? 'yes' : 'no',
    age: 25, // Default age
    bplCard: 'yes', // Assume FRA claimants are BPL
    villageType: 'tribal_majority',
    tribalPopulation: 75,
    landArea: claimData?.area || 2.5,
  };
  
  return fieldMappings[field] || null;
}

// Generate application guidance based on scheme and user profile
function generateApplicationGuidance(scheme: any, user: any) {
  const baseGuidance = `To apply for ${scheme.name}:
1. Visit ${scheme.applicationWebsite || 'the nearest government office'}
2. Carry required documents: ${scheme.requiredDocuments?.join(', ') || 'basic identity and residence proof'}
3. Contact helpline ${scheme.helplineNumber || 'for assistance'} if needed
4. ${scheme.applicationProcess || 'Follow the standard application process'}`;
  
  return baseGuidance;
}

// Calculate estimated benefit amount for the user
function calculateEstimatedBenefit(scheme: any, user: any, claimData: any) {
  if (scheme.benefitAmount) {
    // For schemes like PM-KISAN, calculate based on land area
    if (scheme.code === 'PMKISAN2019' && claimData?.area) {
      return `₹${Math.min(6000, claimData.area * 2000)}/year`;
    }
    return scheme.benefitAmount;
  }
  return 'As per scheme guidelines';
}
