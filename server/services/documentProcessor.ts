import { createWorker, createScheduler } from 'tesseract.js';
import * as fs from 'fs';
import * as path from 'path';
import nlp from 'compromise';
import { SentenceTokenizer, WordTokenizer } from 'natural';
import sharp from 'sharp';
import { storage } from '../storage';
import { nanoid } from 'nanoid';

interface ProcessedDocument {
  text: string;
  confidence: number;
  language: string;
  entities: {
    names?: string[];
    villages?: string[];
    areas?: string[];
    coordinates?: string[];
    dates?: string[];
    claimTypes?: string[];
    documentTypes?: string[];
    surveyNumbers?: string[];
    boundaries?: string[];
  };
  metadata: {
    processingTime: number;
    imageQuality: string;
    ocrMethod: string;
    preprocessingApplied: string[];
  };
}

class DocumentProcessor {
  private ocrScheduler: any;
  private workers: any[] = [];
  private readonly supportedLanguages = [
    'eng', 'hin', 'ben', 'guj', 'kan', 'mal', 'mar', 'ori', 'pan', 'tam', 'tel', 'urd'
  ];

  constructor() {
    this.initializeOCR();
  }

  private async initializeOCR() {
    try {
      // Create scheduler for better performance
      this.ocrScheduler = createScheduler();
      
      // Start with fewer workers for production efficiency - configurable via ENV
      const workerCount = parseInt(process.env.OCR_WORKERS || '2');
      
      // Initialize workers with core languages only initially
      for (let i = 0; i < workerCount; i++) {
        const worker = await createWorker('eng+hin+ben+guj+kan+mal+mar+ori+pan+tam+tel+urd');
        await worker.setParameters({
          preserve_interword_spaces: '1',
          tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,;:!?()-/\@#$%^&*+=[]{}"\' ।।',
          tessjs_create_hocr: '1',
          tessjs_create_tsv: '1'
        });
        this.workers.push(worker);
        this.ocrScheduler.addWorker(worker);
      }
      
      console.log('OCR scheduler initialized with', this.workers.length, 'workers');
    } catch (error) {
      console.error('Failed to initialize OCR workers:', error);
    }
  }

  async processDocument(filePath: string, fileType: string, documentId?: string): Promise<ProcessedDocument> {
    const startTime = Date.now();
    const preprocessingApplied: string[] = [];
    
    try {
      if (!this.ocrScheduler) {
        await this.initializeOCR();
      }
      
      // Mark processing start in database
      if (documentId) {
        await this.markDocumentProcessingStart(documentId);
      }

      let text = '';
      let confidence = 0;
      let detectedLanguage = 'eng';
      let imageQuality = 'unknown';

      if (fileType === 'application/pdf') {
        // Handle PDF processing by converting to images first
        const result = await this.processPDF(filePath);
        text = result.text;
        confidence = result.confidence;
        detectedLanguage = result.language;
        imageQuality = result.quality;
        preprocessingApplied.push('pdf-to-image-conversion');
      } else if (fileType.startsWith('image/')) {
        // Enhanced image preprocessing pipeline
        const preprocessingResult = await this.enhancedPreprocessImage(filePath);
        const processedPath = preprocessingResult.processedPath;
        imageQuality = preprocessingResult.quality;
        preprocessingApplied.push(...preprocessingResult.applied);
        
        // Auto-detect best language for OCR
        detectedLanguage = await this.detectLanguage(processedPath);
        
        // Process image with OCR using scheduler for better performance
        const { data } = await this.ocrScheduler.addJob('recognize', processedPath, {
          lang: detectedLanguage
        });
        
        text = data.text;
        confidence = data.confidence;
        
        // Calculate processing time here
        const currentProcessingTime = Date.now() - startTime;
        
        // Store OCR results in database if documentId provided
        if (documentId) {
          await this.storeOCRResults(
            documentId, 
            text, 
            confidence, 
            data.hocr || '', 
            data.tsv || '',
            detectedLanguage,
            currentProcessingTime,
            imageQuality,
            preprocessingApplied
          );
        }
        
        // Clean up processed image
        if (processedPath !== filePath && fs.existsSync(processedPath)) {
          fs.unlinkSync(processedPath);
        }
      }

      // Advanced entity extraction with FRA-specific patterns
      const entities = await this.extractFRAEntities(text);
      
      const processingTime = Date.now() - startTime;
      
      // Store extracted entities if documentId provided
      if (documentId && Object.keys(entities).some(key => {
        const entityArray = entities[key as keyof typeof entities];
        return Array.isArray(entityArray) && entityArray.length > 0;
      })) {
        try {
          await storage.updateDocument(documentId, {
            extractedEntities: entities,
            entityExtractionConfidence: confidence.toString() // Convert to string for storage
          });
        } catch (error) {
          console.error('Failed to store extracted entities:', error);
        }
      }
      
      console.log(`Document processed: ${processingTime}ms, confidence: ${confidence}%, language: ${detectedLanguage}`);

      return {
        text,
        confidence,
        language: detectedLanguage,
        entities,
        metadata: {
          processingTime,
          imageQuality,
          ocrMethod: 'tesseract-scheduler',
          preprocessingApplied
        }
      };
    } catch (error) {
      console.error('Error processing document:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Document processing failed: ${errorMessage}`);
    }
  }

  private async enhancedPreprocessImage(filePath: string): Promise<{
    processedPath: string;
    quality: string;
    applied: string[];
  }> {
    try {
      const processedPath = `${filePath}_processed_${nanoid(8)}.jpg`;
      const applied: string[] = [];
      
      // Get image metadata for quality assessment
      const metadata = await sharp(filePath).metadata();
      let quality = 'good';
      
      if (metadata.width && metadata.width < 800) {
        quality = 'low';
      } else if (metadata.width && metadata.width > 3000) {
        quality = 'high';
      }
      
      const sharpInstance = sharp(filePath);
      
      // Advanced preprocessing pipeline
      
      // 1. Resize for optimal OCR (min 300 DPI equivalent)
      if (metadata.width && metadata.width < 1200) {
        sharpInstance.resize(null, 1600, { withoutEnlargement: true });
        applied.push('upscale');
      } else if (metadata.width && metadata.width > 4000) {
        sharpInstance.resize(null, 3000, { withoutEnlargement: true });
        applied.push('downscale');
      }
      
      // 2. Deskew and straighten
      // Note: Sharp doesn't have built-in deskew, but we can detect rotation
      
      // 3. Noise reduction and enhancement
      sharpInstance
        .median(2) // Remove noise
        .normalize() // Auto-contrast
        .sharpen({ sigma: 1.0, m1: 1.0, m2: 2.0 }) // Enhance edges
        .gamma(1.2); // Improve contrast
      
      applied.push('noise-reduction', 'normalize', 'sharpen', 'gamma-correction');
      
      // 4. Convert to optimal format for OCR
      await sharpInstance
        .jpeg({ quality: 95, progressive: false })
        .toFile(processedPath);
      
      applied.push('format-optimization');
      
      return {
        processedPath,
        quality,
        applied
      };
    } catch (error) {
      console.error('Error in enhanced preprocessing:', error);
      return {
        processedPath: filePath,
        quality: 'unknown',
        applied: ['preprocessing-failed']
      };
    }
  }

  private async detectLanguage(imagePath: string): Promise<string> {
    try {
      // Simple language detection based on character patterns
      const quickScan = await this.ocrScheduler.addJob('recognize', imagePath, {
        lang: 'eng+hin',
        psm: 3
      });
      
      const text = quickScan.data.text;
      
      // Check for Devanagari script (Hindi, Marathi, etc.)
      const devanagariPattern = /[\u0900-\u097F]/;
      if (devanagariPattern.test(text)) {
        return 'hin+mar'; // Hindi + Marathi (removed Sanskrit as not in supported list)
      }
      
      // Check for Bengali script
      const bengaliPattern = /[\u0980-\u09FF]/;
      if (bengaliPattern.test(text)) {
        return 'ben';
      }
      
      // Check for Gujarati script
      const gujaratiPattern = /[\u0A80-\u0AFF]/;
      if (gujaratiPattern.test(text)) {
        return 'guj';
      }
      
      // Check for Tamil script
      const tamilPattern = /[\u0B80-\u0BFF]/;
      if (tamilPattern.test(text)) {
        return 'tam';
      }
      
      // Check for Telugu script
      const teluguPattern = /[\u0C00-\u0C7F]/;
      if (teluguPattern.test(text)) {
        return 'tel';
      }
      
      // Default to English + Hindi
      return 'eng+hin';
    } catch (error) {
      console.error('Language detection failed:', error);
      return 'eng+hin';
    }
  }

  private async markDocumentProcessingStart(documentId: string): Promise<void> {
    try {
      await storage.updateDocument(documentId, {
        processingStatus: 'processing',
        processingAttempts: 1 // This should be incremented properly in real implementation
      });
    } catch (error) {
      console.error('Failed to mark document processing start:', error);
    }
  }

  private async markDocumentProcessingFailed(documentId: string, error: string): Promise<void> {
    try {
      await storage.updateDocument(documentId, {
        processingStatus: 'failed',
        lastError: error,
        processingAttempts: 1 // Should be incremented
      });
    } catch (updateError) {
      console.error('Failed to mark document as failed:', updateError);
    }
  }

  private async processPDF(filePath: string): Promise<{
    text: string;
    confidence: number;
    language: string;
    quality: string;
  }> {
    // Note: This would require pdf2pic or similar library
    // For now, return placeholder that indicates PDF processing needs implementation
    console.log('PDF processing not yet implemented for:', filePath);
    return {
      text: 'PDF processing requires additional libraries (pdf2pic, pdf-poppler). Please convert to image format.',
      confidence: 0,
      language: 'eng',
      quality: 'unknown'
    };
  }

  private async storeOCRResults(documentId: string, text: string, confidence: number, hocr: string, tsv: string, language: string, processingTime: number, imageQuality: string, preprocessingApplied: string[]): Promise<void> {
    try {
      // Parse languages used
      const languagesArray = language.split('+').filter(lang => lang.length > 0);
      const primaryLanguage = languagesArray[0] === 'eng' ? 'eng' : (languagesArray.find(l => l !== 'eng') || 'eng');
      
      await storage.updateDocument(documentId, {
        ocrText: text,
        ocrConfidence: confidence.toString(),
        ocrLanguage: languagesArray.length > 1 ? 'mixed' : (primaryLanguage as any),
        languagesUsed: languagesArray,
        processingStatus: 'processed',
        processingTime,
        imageQuality,
        preprocessingApplied,
        processedAt: new Date(),
        // Store OCR metadata as proper object (not stringified)
        ocrData: { 
          hocr, 
          tsv, 
          timestamp: new Date().toISOString(),
          engineVersion: 'tesseract-js-5.x',
          parameters: {
            preserve_interword_spaces: '1',
            tessjs_create_hocr: '1',
            tessjs_create_tsv: '1'
          }
        }
      });
    } catch (error) {
      console.error('Failed to store OCR results:', error);
      // Update status to failed on error
      try {
        await storage.updateDocument(documentId, {
          processingStatus: 'failed',
          lastError: error instanceof Error ? error.message : 'Unknown error during OCR storage',
          processingAttempts: 1 // This should be incremented properly
        });
      } catch (updateError) {
        console.error('Failed to update document with error status:', updateError);
      }
    }
  }

  private async extractFRAEntities(text: string): Promise<ProcessedDocument['entities'] & {
    claimTypes?: string[];
    documentTypes?: string[];
    surveyNumbers?: string[];
    boundaries?: string[];
  }> {
    const entities = {
      names: [] as string[],
      villages: [] as string[],
      areas: [] as string[],
      coordinates: [] as string[],
      dates: [] as string[],
      claimTypes: [] as string[],
      documentTypes: [] as string[],
      surveyNumbers: [] as string[],
      boundaries: [] as string[]
    };

    // Use Compromise NLP for advanced entity extraction
    const doc = nlp(text);
    
    // Extract person names using NLP
    const people = doc.people().out('array');
    const indianNamePattern = /\b(?:[A-Z][a-z]+\s+(?:Singh|Kumar|Devi|Rani|Prasad|Sharma|Gupta|Yadav|Patel|Das|Ray|Bai|Wati))\b/g;
    const indianNames = text.match(indianNamePattern) || [];
    const uniqueNames = new Set([...people, ...indianNames]);
    entities.names = Array.from(uniqueNames).filter(name => 
      name.length > 2 && !['Village', 'District', 'State', 'Claim', 'Forest', 'Rights'].includes(name)
    );

    // Enhanced FRA-specific claim types
    const claimTypePatterns = [
      /(?:Individual|Community|Community Forest Rights|CFR|IFR)\s+(?:Forest Rights|Claim)/gi,
      /(?:NTFP|Non-Timber Forest Produce)\s+Rights/gi,
      /(?:Grazing|Pastoral)\s+Rights/gi,
      /(?:Fish|Fishing)\s+Rights/gi,
      /(?:Water|Water Body)\s+Rights/gi,
      /(?:Cultivation|Agricultural)\s+Rights/gi,
      /(?:Settlement|Habitation)\s+Rights/gi
    ];
    
    for (const pattern of claimTypePatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        entities.claimTypes.push(match[0].trim());
      }
    }

    // Document type detection
    const documentTypePatterns = [
      /(?:Form|फॉर्म)\s*[A-Z]*[0-9]+/gi,
      /(?:Application|आवेदन)\s+(?:for|के\s+लिए)\s+Forest\s+Rights/gi,
      /(?:Survey|सर्वेक्षण)\s+(?:Settlement|बस्ती)\s+Record/gi,
      /(?:Revenue|राजस्व)\s+(?:Record|रिकॉर्ड)/gi,
      /(?:Khasra|खसरा)\s+(?:Number|नंबर)/gi,
      /(?:Patta|पट्टा)\s+(?:Document|दस्तावेज)/gi
    ];
    
    for (const pattern of documentTypePatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        entities.documentTypes.push(match[0].trim());
      }
    }

    // Survey numbers and land identifiers
    const surveyPatterns = [
      /(?:Survey|सर्वेक्षण)\s+(?:No|Number|संख्या)[.:\s]*([0-9\/\-]+)/gi,
      /(?:Khasra|खसरा)\s+(?:No|Number|संख्या)[.:\s]*([0-9\/\-]+)/gi,
      /(?:Plot|प्लॉट)\s+(?:No|Number|संख्या)[.:\s]*([0-9\/\-]+)/gi,
      /(?:Sub-division|उप-विभाग)\s+([0-9\/\-]+)/gi
    ];
    
    for (const pattern of surveyPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        entities.surveyNumbers.push(match[1].trim());
      }
    }

    // Boundary descriptions
    const boundaryPatterns = [
      /(?:North|उत्तर)[\s:]+([A-Za-z\u0900-\u097F\s0-9,.-]+)(?=(?:South|दक्षिण|East|पूर्व|West|पश्चिम|\.|$))/gi,
      /(?:South|दक्षिण)[\s:]+([A-Za-z\u0900-\u097F\s0-9,.-]+)(?=(?:North|उत्तर|East|पूर्व|West|पश्चिम|\.|$))/gi,
      /(?:East|पूर्व)[\s:]+([A-Za-z\u0900-\u097F\s0-9,.-]+)(?=(?:North|उत्तर|South|दक्षिण|West|पश्चिम|\.|$))/gi,
      /(?:West|पश्चिम)[\s:]+([A-Za-z\u0900-\u097F\s0-9,.-]+)(?=(?:North|उत्तर|South|दक्षिण|East|पूर्व|\.|$))/gi
    ];
    
    for (const pattern of boundaryPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const boundary = match[0].trim();
        if (boundary.length > 5) {
          entities.boundaries.push(boundary);
        }
      }
    }

    // Enhanced village name extraction
    const villagePatterns = [
      /(?:Village|Gram|ग्राम|गाँव|गांव)[\s:]+([A-Za-z\u0900-\u097F\s]+)/gi,
      /(?:Vill|V\.)[\s:]+([A-Za-z\u0900-\u097F\s]+)/gi,
      /गाव[\s:]+([A-Za-z\u0900-\u097F\s]+)/gi,
      /(?:Tehsil|तहसील)[\s:]+([A-Za-z\u0900-\u097F\s]+)/gi,
      /(?:Block|ब्लॉक)[\s:]+([A-Za-z\u0900-\u097F\s]+)/gi
    ];
    
    for (const pattern of villagePatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const villageName = match[1].trim().replace(/[,\.;]/g, '');
        if (villageName.length > 2) {
          entities.villages.push(villageName);
        }
      }
    }

    // Enhanced area extraction with multiple units
    const areaPatterns = [
      /(\d+(?:\.\d+)?)\s*(?:acre|hectare|bigha|गुंठा|एकड़|बीघा|हेक्टेयर)/gi,
      /(\d+(?:\.\d+)?)\s*(?:sq\s*m|sqm|square\s*meter)/gi,
      /Area[\s:]+([\d\.]+)\s*(?:acre|hectare)/gi
    ];
    
    for (const pattern of areaPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        entities.areas.push(match[0]);
      }
    }

    // Enhanced coordinate extraction
    const coordPatterns = [
      /(\d{1,2}[°'"\s]*\d{0,2}[°'"\s]*\d{0,2}["\s]*[NS][,\s]*\d{1,3}[°'"\s]*\d{0,2}[°'"\s]*\d{0,2}["\s]*[EW])/gi,
      /(\d+\.\d+)[,\s]+(\d+\.\d+)/gi,
      /Lat[itude]*[\s:]+([\d\.]+)[,\s]*Lon[gitude]*[\s:]+([\d\.]+)/gi
    ];
    
    for (const pattern of coordPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        entities.coordinates.push(match[0]);
      }
    }

    // Enhanced date extraction with Indian formats
    const datePatterns = [
      /\b\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}\b/gi,
      /\b\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4}\b/gi,
      /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{2,4}\b/gi,
      /\d{4}-\d{2}-\d{2}/gi
    ];
    
    for (const pattern of datePatterns) {
      const dates = text.match(pattern) || [];
      entities.dates = [...entities.dates, ...dates];
    }

    // Remove duplicates
    entities.names = Array.from(new Set(entities.names));
    entities.villages = Array.from(new Set(entities.villages));
    entities.areas = Array.from(new Set(entities.areas));
    entities.coordinates = Array.from(new Set(entities.coordinates));
    entities.dates = Array.from(new Set(entities.dates));
    entities.claimTypes = Array.from(new Set(entities.claimTypes));
    entities.documentTypes = Array.from(new Set(entities.documentTypes));
    entities.surveyNumbers = Array.from(new Set(entities.surveyNumbers));
    entities.boundaries = Array.from(new Set(entities.boundaries));

    return entities;
  }

  // Batch processing for multiple documents
  async processDocumentBatch(documents: Array<{filePath: string, fileType: string, documentId: string}>): Promise<ProcessedDocument[]> {
    const results = [];
    
    // Process in parallel but limit concurrency to avoid overwhelming system
    const batchSize = 3;
    
    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);
      const batchPromises = batch.map(doc => 
        this.processDocument(doc.filePath, doc.fileType, doc.documentId)
          .catch(error => {
            console.error(`Failed to process document ${doc.documentId}:`, error);
            return null;
          })
      );
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.filter(result => result !== null));
    }
    
    return results;
  }

  // Health check for OCR system
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    workersActive: number;
    totalWorkers: number;
    supportedLanguages: string[];
    lastError?: string;
  }> {
    try {
      if (!this.ocrScheduler || this.workers.length === 0) {
        return {
          status: 'unhealthy',
          workersActive: 0,
          totalWorkers: 0,
          supportedLanguages: [],
          lastError: 'OCR system not initialized'
        };
      }

      // Quick test with a simple operation
      await this.ocrScheduler.addJob('recognize', Buffer.from('test'), {
        lang: 'eng'
      });

      return {
        status: 'healthy',
        workersActive: this.workers.length,
        totalWorkers: this.workers.length,
        supportedLanguages: this.supportedLanguages
      };
    } catch (error) {
      return {
        status: 'degraded',
        workersActive: this.workers.length,
        totalWorkers: this.workers.length,
        supportedLanguages: this.supportedLanguages,
        lastError: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Get processing statistics
  async getProcessingStats(): Promise<{
    totalDocumentsProcessed: number;
    averageProcessingTime: number;
    averageConfidence: number;
    languageDistribution: Record<string, number>;
  }> {
    try {
      const totalProcessed = await storage.getTotalProcessedDocuments();
      
      // Note: This would require additional tracking in the database
      // For now, return basic stats
      return {
        totalDocumentsProcessed: totalProcessed,
        averageProcessingTime: 0, // Would need to track this
        averageConfidence: 0, // Would need to track this
        languageDistribution: {}
      };
    } catch (error) {
      console.error('Failed to get processing stats:', error);
      return {
        totalDocumentsProcessed: 0,
        averageProcessingTime: 0,
        averageConfidence: 0,
        languageDistribution: {}
      };
    }
  }

  async shutdown() {
    try {
      if (this.ocrScheduler) {
        await this.ocrScheduler.terminate();
      }
      
      for (const worker of this.workers) {
        if (worker) {
          await worker.terminate();
        }
      }
      
      this.workers = [];
      console.log('OCR system shutdown complete');
    } catch (error) {
      console.error('Error during OCR shutdown:', error);
    }
  }
}

// Create singleton instance
export const documentProcessor = new DocumentProcessor();

// Graceful shutdown handler
process.on('SIGINT', async () => {
  console.log('Shutting down document processor...');
  await documentProcessor.shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down document processor...');
  await documentProcessor.shutdown();
  process.exit(0);
});
