import { GoogleGenerativeAI } from '@google/generative-ai';
import { PythonOCRClient } from './pythonOCRClient';
import path from 'path';
import fs from 'fs';
import { createWorker, PSM, OEM } from 'tesseract.js';

interface ProcessedDocument {
  text: string;
  confidence: number;
  language: string;
  entities: {
    claimantNames?: string[];
    claimTypes?: string[];
    documentTypes?: string[];
    surveyNumbers?: string[];
    boundaries?: string[];
  };
  claimRecords?: any[];
  metadata: {
    processingTime: number;
    imageQuality: string;
    ocrMethod: string;
    preprocessingApplied: string[];
    pageCount?: number;
    [key: string]: any;
  };
}

export class DocumentProcessor {
  private genAI: GoogleGenerativeAI | null = null;
  private ocrClient: PythonOCRClient;
  private isOCRServiceRunning = false;

  constructor() {
    this.ocrClient = new PythonOCRClient();
    this.initializeAI();
    this.checkOCRService();
  }

  private initializeAI() {
    try {
      if (process.env.GEMINI_API_KEY) {
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        console.log('✅ Gemini AI initialized for enhanced processing');
      } else {
        console.log('ℹ️  No Gemini API key found - using OCR only');
      }
    } catch (error) {
      console.error('❌ Failed to initialize Gemini AI:', error);
    }
  }

  private async checkOCRService() {
    this.isOCRServiceRunning = await this.ocrClient.healthCheck();
    if (!this.isOCRServiceRunning) {
      console.warn('⚠️  Python OCR Service is not running. Start it with: python server/ocr_service.py');
    }
  }

  async processDocument(filePath: string, fileType: string, documentId?: string): Promise<ProcessedDocument> {
    const startTime = Date.now();
    
    try {
      console.log(`🔄 Processing document: ${path.basename(filePath)} (${fileType})`);

      // Validate file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      // Determine content type based on file type
      const contentType = this.determineContentType(fileType);

      let processedDoc: ProcessedDocument;

      // Try Python OCR service first, then fallback to Tesseract.js
      if (!this.isOCRServiceRunning) {
        await this.checkOCRService();
      }

      if (this.isOCRServiceRunning) {
        try {
          // Process with Python OCR service
          const ocrResult = await this.ocrClient.processDocument(filePath, {
            autoLanguage: true,
            contentType
          });

          // Convert OCR result to application format
          processedDoc = this.ocrClient.convertToProcessedDocument(ocrResult, {
            documentId,
            fileType,
            originalPath: filePath
          });
        } catch (error) {
          console.warn('⚠️  Python OCR failed, using fallback:', error);
          processedDoc = await this.processWithFallbackOCR(filePath, fileType, documentId);
        }
      } else {
        console.log('🔄 Using fallback OCR (Tesseract.js) - Python service unavailable');
        processedDoc = await this.processWithFallbackOCR(filePath, fileType, documentId);
      }

      // Extract entities using AI if available
      if (this.genAI && processedDoc.text.trim()) {
        try {
          const entities = await this.extractEntitiesWithAI(processedDoc.text);
          processedDoc.entities = entities;
        } catch (error) {
          console.warn('AI entity extraction failed, using fallback:', error);
          processedDoc.entities = this.extractEntitiesBasic(processedDoc.text);
        }
      } else {
        processedDoc.entities = this.extractEntitiesBasic(processedDoc.text);
      }

      // Extract claim records from text
      processedDoc.claimRecords = this.extractClaimRecords(processedDoc.text);

      const totalProcessingTime = Date.now() - startTime;
      processedDoc.metadata.processingTime = totalProcessingTime;

      console.log(`✅ Document processed successfully: ${processedDoc.confidence}% confidence, ${totalProcessingTime}ms`);
      
      return processedDoc;

    } catch (error: any) {
      console.error('❌ Document processing failed:', error);
      
      // Return error document
      return {
        text: '',
        confidence: 0,
        language: 'eng',
        entities: {},
        claimRecords: [],
        metadata: {
          processingTime: Date.now() - startTime,
          imageQuality: 'error',
          ocrMethod: 'Python-OCR-Failed',
          preprocessingApplied: [],
          error: error.message
        }
      };
    }
  }

  private determineContentType(fileType: string): string {
    if (fileType.includes('pdf')) return 'document';
    if (fileType.includes('image')) return 'document';
    return 'document';
  }

  private async processWithFallbackOCR(filePath: string, fileType: string, documentId?: string): Promise<ProcessedDocument> {
    const startTime = Date.now();
    
    try {
      console.log(`🔄 Processing with fallback OCR (Tesseract.js): ${path.basename(filePath)}`);
      
      const worker = await createWorker('eng');
      
      try {
        // Set page segmentation mode for better text detection
        await worker.setParameters({
          tessedit_pageseg_mode: PSM.UNIFORM_BLOCK, // Uniform block of text
          tessedit_ocr_engine_mode: OEM.LSTM_ONLY, // Neural nets LSTM engine
        });

        // Perform OCR
        const { data } = await worker.recognize(filePath);
        
        // Calculate confidence (Tesseract provides confidence per word)
        const confidence = data.confidence || 0;
        
        // Create processed document structure
        const processedDoc: ProcessedDocument = {
          text: data.text || '',
          confidence: Math.round(confidence),
          language: 'eng',
          entities: {},
          claimRecords: [],
          metadata: {
            processingTime: Date.now() - startTime,
            imageQuality: confidence > 60 ? 'good' : confidence > 30 ? 'fair' : 'poor',
            ocrMethod: 'Tesseract.js-Fallback',
            preprocessingApplied: ['tesseract_native'],
            pageCount: 1
          }
        };

        await worker.terminate();
        
        console.log(`✅ Fallback OCR completed: ${confidence}% confidence`);
        return processedDoc;
        
      } catch (error) {
        await worker.terminate();
        throw error;
      }
      
    } catch (error: any) {
      console.error('❌ Fallback OCR failed:', error);
      
      // Return minimal error document
      return {
        text: '',
        confidence: 0,
        language: 'eng',
        entities: {},
        claimRecords: [],
        metadata: {
          processingTime: Date.now() - startTime,
          imageQuality: 'error',
          ocrMethod: 'Tesseract.js-Failed',
          preprocessingApplied: [],
          error: error.message
        }
      };
    }
  }

  private async extractEntitiesWithAI(text: string): Promise<any> {
    if (!this.genAI) throw new Error('AI not available');

    const model = this.genAI.getGenerativeModel({ model: "gemini-pro" });
    
    const prompt = `
Extract forest rights and land claim entities from this text. Return as JSON:
{
  "claimantNames": ["name1", "name2"],
  "claimTypes": ["individual", "community"],
  "documentTypes": ["patta", "survey"],
  "surveyNumbers": ["123/4", "567/8"],
  "boundaries": ["north: road", "south: river"]
}

Text: ${text.substring(0, 2000)}
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const aiText = response.text();

    try {
      // Extract JSON from AI response
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.warn('Failed to parse AI entities response');
    }

    return this.extractEntitiesBasic(text);
  }

  private extractEntitiesBasic(text: string): any {
    const entities: any = {
      claimantNames: [],
      claimTypes: [],
      documentTypes: [],
      surveyNumbers: [],
      boundaries: []
    };

    // Basic pattern matching for common entities
    const surveyPattern = /\b\d+\/\d+\b/g;
    const surveyMatches = text.match(surveyPattern);
    if (surveyMatches) {
      entities.surveyNumbers = Array.from(new Set(surveyMatches));
    }

    // Common forest rights document types
    const docTypes = ['patta', 'survey', 'settlement', 'revenue', 'forest'];
    docTypes.forEach(type => {
      if (text.toLowerCase().includes(type)) {
        entities.documentTypes.push(type);
      }
    });

    // Common claim types
    const claimTypes = ['individual', 'community', 'collective'];
    claimTypes.forEach(type => {
      if (text.toLowerCase().includes(type)) {
        entities.claimTypes.push(type);
      }
    });

    return entities;
  }

  private extractClaimRecords(text: string): any[] {
    // Basic claim record extraction
    const records: any[] = [];
    
    // Look for structured data patterns
    const lines = text.split('\n');
    for (const line of lines) {
      if (line.includes('claim') || line.includes('survey') || line.includes('acres')) {
        records.push({
          type: 'extracted_claim',
          content: line.trim(),
          confidence: 0.6
        });
      }
    }

    return records.slice(0, 10); // Limit to 10 records
  }

  async healthCheck(): Promise<any> {
    const ocrHealthy = await this.ocrClient.healthCheck();
    const aiAvailable = this.genAI !== null;

    return {
      status: ocrHealthy ? 'healthy' : 'degraded',
      ocr: {
        service: 'Simplified FRA OCR',
        healthy: ocrHealthy,
        engine: 'Simplified-FRA-OCR-Engine',
        features: [
          'Multi-language support (Hindi, Bengali, Odia, Telugu, English)',
          'FRA-specific entity extraction',
          'Basic but effective preprocessing',
          'Clear text extraction focus',
          'Simple Tesseract configuration (PSM 6, OEM 1)'
        ],
        languages: await this.ocrClient.getSupportedLanguages()
      },
      ai: {
        service: 'Gemini',
        available: aiAvailable
      },
      timestamp: new Date().toISOString()
    };
  }

  async getProcessingStats(): Promise<any> {
    return {
      ocrQueue: 0, // Python service handles its own queue
      nerQueue: 0,
      assetDetectionQueue: 0,
      totalProcessed: 0,
      averageProcessingTime: 0,
      successRate: 100,
      service: 'Simplified-FRA-OCR-v1'
    };
  }

  // Compatibility methods for existing code
  async initializeOCR() {
    await this.checkOCRService();
  }

  get ocrScheduler() {
    // Return a mock object for compatibility
    return {
      getQueueSize: () => 0,
      getWorkerCount: () => 1
    };
  }

  get workers() {
    return []; // Compatibility
  }
}

// Export singleton instance
export const documentProcessor = new DocumentProcessor();