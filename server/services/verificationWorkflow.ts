import { storage } from '../storage';
import { documentProcessor } from './documentProcessor';
import { aiProcessor } from './aiProcessor';
import { spatialProcessor } from './spatialProcessor';
import { dssEngine } from './dssEngine';

interface VerificationStep {
  id: string;
  name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  startedAt?: Date;
  completedAt?: Date;
  result?: any;
  errors?: string[];
  verifiedBy?: string;
}

interface AuditTrail {
  id: string;
  claimId: string;
  action: string;
  performedBy: string;
  performedAt: Date;
  oldValue?: any;
  newValue?: any;
  notes?: string;
  ipAddress?: string;
  userAgent?: string;
}

interface VerificationWorkflow {
  claimId: string;
  currentStep: number;
  status: 'pending' | 'in_progress' | 'completed' | 'rejected' | 'on_hold';
  steps: VerificationStep[];
  startedAt: Date;
  completedAt?: Date;
  assignedTo?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimatedCompletion?: Date;
}

class VerificationWorkflowEngine {
  private readonly WORKFLOW_STEPS = [
    { id: 'document_upload', name: 'Document Upload', required: true },
    { id: 'ocr_processing', name: 'OCR Text Extraction', required: true },
    { id: 'ner_extraction', name: 'Entity Extraction', required: true },
    { id: 'spatial_validation', name: 'Spatial Validation', required: true },
    { id: 'field_verification', name: 'Field Verification', required: true },
    { id: 'technical_review', name: 'Technical Review', required: true },
    { id: 'dss_analysis', name: 'Decision Support Analysis', required: false },
    { id: 'final_approval', name: 'Final Approval', required: true },
  ];

  async initializeWorkflow(claimId: string, priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium'): Promise<VerificationWorkflow> {
    try {
      const steps: VerificationStep[] = this.WORKFLOW_STEPS.map(step => ({
        id: step.id,
        name: step.name,
        status: 'pending'
      }));

      const workflow: VerificationWorkflow = {
        claimId,
        currentStep: 0,
        status: 'pending',
        steps,
        startedAt: new Date(),
        priority,
        estimatedCompletion: this.calculateEstimatedCompletion(priority)
      };

      // Save workflow to database
      await storage.createVerificationWorkflow(workflow);

      // Create initial audit trail
      await this.createAuditEntry(claimId, 'workflow_initialized', 'system', {
        priority,
        estimatedCompletion: workflow.estimatedCompletion
      });

      return workflow;
    } catch (error) {
      console.error('Error initializing verification workflow:', error);
      throw error;
    }
  }

  async processNextStep(claimId: string, userId: string): Promise<VerificationWorkflow> {
    try {
      const workflow = await storage.getVerificationWorkflow(claimId);
      if (!workflow) {
        throw new Error('Workflow not found');
      }

      if (workflow.status === 'completed' || workflow.status === 'rejected') {
        throw new Error('Workflow already completed');
      }

      const currentStep = workflow.steps[workflow.currentStep];
      if (!currentStep) {
        throw new Error('No more steps to process');
      }

      // Mark current step as in progress
      currentStep.status = 'in_progress';
      currentStep.startedAt = new Date();
      
      let stepResult: any;
      let stepSuccess = true;

      try {
        // Execute step based on type
        switch (currentStep.id) {
          case 'document_upload':
            stepResult = await this.processDocumentUpload(claimId);
            break;
          case 'ocr_processing':
            stepResult = await this.processOCR(claimId);
            break;
          case 'ner_extraction':
            stepResult = await this.processNER(claimId);
            break;
          case 'spatial_validation':
            stepResult = await this.processSpatialValidation(claimId);
            break;
          case 'field_verification':
            stepResult = await this.processFieldVerification(claimId, userId);
            break;
          case 'technical_review':
            stepResult = await this.processTechnicalReview(claimId, userId);
            break;
          case 'dss_analysis':
            stepResult = await this.processDSSAnalysis(claimId);
            break;
          case 'final_approval':
            stepResult = await this.processFinalApproval(claimId, userId);
            break;
          default:
            throw new Error(`Unknown step: ${currentStep.id}`);
        }

        // Mark step as completed
        currentStep.status = 'completed';
        currentStep.completedAt = new Date();
        currentStep.result = stepResult;

        // Create audit trail
        await this.createAuditEntry(claimId, `step_completed_${currentStep.id}`, userId, stepResult);

      } catch (error) {
        stepSuccess = false;
        currentStep.status = 'failed';
        currentStep.errors = [error instanceof Error ? error.message : 'Unknown error'];
        
        await this.createAuditEntry(claimId, `step_failed_${currentStep.id}`, userId, { error: error instanceof Error ? error.message : 'Unknown error' });
      }

      // Move to next step if current step succeeded
      if (stepSuccess) {
        workflow.currentStep += 1;
        
        // Check if workflow is complete
        if (workflow.currentStep >= workflow.steps.length) {
          workflow.status = 'completed';
          workflow.completedAt = new Date();
          
          // Update claim status
          await storage.updateClaim(claimId, { 
            status: 'approved',
            verificationCompletedAt: new Date(),
            verifiedBy: userId
          });

          await this.createAuditEntry(claimId, 'workflow_completed', userId);
        }
      } else {
        // Handle step failure
        workflow.status = 'on_hold';
        await this.createAuditEntry(claimId, 'workflow_on_hold', userId, { 
          failedStep: currentStep.id,
          error: currentStep.errors?.[0]
        });
      }

      // Update workflow in database
      await storage.updateVerificationWorkflow(workflow);

      return workflow;
    } catch (error) {
      console.error('Error processing workflow step:', error);
      throw error;
    }
  }

  async getWorkflowStatus(claimId: string): Promise<VerificationWorkflow | null> {
    return await storage.getVerificationWorkflow(claimId);
  }

  async getAuditTrail(claimId: string): Promise<AuditTrail[]> {
    return await storage.getAuditTrail(claimId);
  }

  async assignWorkflow(claimId: string, userId: string, assignedTo: string): Promise<void> {
    const workflow = await storage.getVerificationWorkflow(claimId);
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    workflow.assignedTo = assignedTo;
    await storage.updateVerificationWorkflow(workflow);
    
    await this.createAuditEntry(claimId, 'workflow_assigned', userId, { assignedTo });
  }

  async escalateWorkflow(claimId: string, userId: string, reason: string): Promise<void> {
    const workflow = await storage.getVerificationWorkflow(claimId);
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    // Increase priority
    const priorityLevels = ['low', 'medium', 'high', 'urgent'];
    const currentIndex = priorityLevels.indexOf(workflow.priority);
    if (currentIndex < priorityLevels.length - 1) {
      workflow.priority = priorityLevels[currentIndex + 1] as any;
    }

    await storage.updateVerificationWorkflow(workflow);
    await this.createAuditEntry(claimId, 'workflow_escalated', userId, { reason, newPriority: workflow.priority });
  }

  private async processDocumentUpload(claimId: string): Promise<any> {
    const documents = await storage.getDocumentsByClaimId(claimId);
    if (documents.length === 0) {
      throw new Error('No documents uploaded for claim');
    }

    return {
      documentsCount: documents.length,
      documentTypes: documents.map(d => d.documentType),
      allDocumentsValid: documents.every(d => d.fileSize > 0)
    };
  }

  private async processOCR(claimId: string): Promise<any> {
    const documents = await storage.getDocumentsByClaimId(claimId);
    const ocrResults: any[] = [];

    for (const doc of documents) {
      try {
        const result = await documentProcessor.processDocument(doc.filePath, doc.mimeType);
        ocrResults.push({
          documentId: doc.id,
          extractedText: result.text,
          confidence: result.confidence
        });

        // Update document with OCR results
        await storage.updateDocument(doc.id, {
          ocrText: result.text,
          ocrConfidence: result.confidence,
          processingStatus: 'completed'
        });
      } catch (error) {
        ocrResults.push({
          documentId: doc.id,
          error: error instanceof Error ? error.message : 'OCR failed'
        });
      }
    }

    return {
      processedDocuments: ocrResults.length,
      averageConfidence: ocrResults.reduce((sum, r) => sum + (r.confidence || 0), 0) / ocrResults.length,
      results: ocrResults
    };
  }

  private async processNER(claimId: string): Promise<any> {
    const documents = await storage.getDocumentsByClaimId(claimId);
    const claim = await storage.getClaimById(claimId);
    
    if (!claim) {
      throw new Error('Claim not found');
    }

    // Extract entities from all OCR text
    const allText = documents.map(d => d.ocrText || '').join(' ');
    const entities = await this.extractEntitiesFromText(allText);

    // Update claim with extracted information
    const updateData: any = {};
    if (entities.names && entities.names.length > 0) {
      updateData.claimantName = entities.names[0];
    }
    if (entities.areas && entities.areas.length > 0) {
      const areaMatch = entities.areas[0].match(/(\d+(?:\.\d+)?)/);
      if (areaMatch) {
        updateData.area = parseFloat(areaMatch[1]);
      }
    }
    if (entities.coordinates && entities.coordinates.length > 0) {
      // Parse coordinates and update
      const coordMatch = entities.coordinates[0].match(/(\d+(?:\.\d+)?)[,\s]+(\d+(?:\.\d+)?)/);
      if (coordMatch) {
        updateData.latitude = coordMatch[1];
        updateData.longitude = coordMatch[2];
      }
    }

    if (Object.keys(updateData).length > 0) {
      await storage.updateClaim(claimId, updateData);
    }

    return {
      extractedEntities: entities,
      claimUpdated: Object.keys(updateData).length > 0,
      updateFields: Object.keys(updateData)
    };
  }

  private async processSpatialValidation(claimId: string): Promise<any> {
    const linkage = await spatialProcessor.linkClaimToAdminBoundaries(claimId);
    return {
      spatialLinkage: linkage,
      validationPassed: linkage.confidence > 0.7
    };
  }

  private async processFieldVerification(claimId: string, userId: string): Promise<any> {
    // Field verification typically requires manual input
    // For now, mark as requiring field officer verification
    return {
      requiresFieldVisit: true,
      assignedFieldOfficer: userId,
      scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
    };
  }

  private async processTechnicalReview(claimId: string, userId: string): Promise<any> {
    const claim = await storage.getClaimById(claimId);
    const workflow = await storage.getVerificationWorkflow(claimId);
    
    if (!claim || !workflow) {
      throw new Error('Claim or workflow not found');
    }

    // Technical review checks
    const checks = {
      documentationComplete: workflow.steps.filter(s => s.status === 'completed').length >= 4,
      spatialValidation: claim.spatialConfidence && claim.spatialConfidence > 0.7,
      dataConsistency: claim.claimantName && claim.area && claim.latitude && claim.longitude,
      complianceCheck: claim.claimType && ['IFR', 'CFR', 'CR'].includes(claim.claimType)
    };

    const allChecksPassed = Object.values(checks).every(check => check);

    return {
      technicalChecks: checks,
      reviewPassed: allChecksPassed,
      reviewedBy: userId,
      reviewDate: new Date()
    };
  }

  private async processDSSAnalysis(claimId: string): Promise<any> {
    const recommendations = await dssEngine.generateRecommendations(claimId);
    return {
      schemeRecommendations: recommendations,
      eligibleSchemes: recommendations.filter(r => r.priority === 'high').length,
      totalBenefit: recommendations.reduce((sum, r) => sum + r.estimatedBenefit, 0)
    };
  }

  private async processFinalApproval(claimId: string, userId: string): Promise<any> {
    const claim = await storage.getClaimById(claimId);
    const workflow = await storage.getVerificationWorkflow(claimId);
    
    if (!claim || !workflow) {
      throw new Error('Claim or workflow not found');
    }

    // Final approval criteria
    const completedSteps = workflow.steps.filter(s => s.status === 'completed').length;
    const totalRequiredSteps = workflow.steps.filter(s => this.WORKFLOW_STEPS.find(ws => ws.id === s.id)?.required).length;
    
    const approvalCriteria = {
      allRequiredStepsCompleted: completedSteps >= totalRequiredSteps - 1, // Excluding final approval itself
      spatiallyValidated: claim.spatiallyLinked,
      technicallyReviewed: workflow.steps.find(s => s.id === 'technical_review')?.status === 'completed'
    };

    const approved = Object.values(approvalCriteria).every(criteria => criteria);

    return {
      approved,
      approvalCriteria,
      approvedBy: userId,
      approvalDate: new Date(),
      finalStatus: approved ? 'approved' : 'rejected'
    };
  }

  private async extractEntitiesFromText(text: string): Promise<any> {
    // Use existing document processor NER capabilities
    const tempProcessor = new (require('./documentProcessor').DocumentProcessor)();
    return tempProcessor.extractEntities(text);
  }

  private async createAuditEntry(claimId: string, action: string, userId: string, data?: any): Promise<void> {
    const auditEntry: AuditTrail = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      claimId,
      action,
      performedBy: userId,
      performedAt: new Date(),
      oldValue: data?.oldValue,
      newValue: data?.newValue || data,
      notes: data?.notes
    };

    await storage.createAuditTrail(auditEntry);
  }

  private calculateEstimatedCompletion(priority: 'low' | 'medium' | 'high' | 'urgent'): Date {
    const daysToAdd = {
      urgent: 3,
      high: 7,
      medium: 14,
      low: 21
    };

    return new Date(Date.now() + daysToAdd[priority] * 24 * 60 * 60 * 1000);
  }
}

export const verificationWorkflow = new VerificationWorkflowEngine();