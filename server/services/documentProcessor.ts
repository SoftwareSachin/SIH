import { GoogleGenerativeAI } from '@google/generative-ai';
import { PythonOCRClient } from './pythonOCRClient';
import path from 'path';
import fs from 'fs';
import { createWorker, PSM, OEM } from 'tesseract.js';
import sharp from 'sharp';

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
    let processedImagePath: string | null = null;
    
    try {
      console.log(`🔄 Processing with fallback OCR (Tesseract.js): ${path.basename(filePath)}`);
      
      // Handle PDF conversion first
      let imagePaths: string[] = [];
      if (fileType.includes('pdf')) {
        console.log('🔄 Checking PDF support...');
        try {
          imagePaths = await this.convertPDFToImages(filePath);
        } catch (error) {
          // PDF processing not supported in fallback OCR - return informative error
          console.error('❌ PDF processing failed in fallback OCR:', error);
          return {
            text: '',
            confidence: 0,
            language: 'eng',
            entities: {},
            claimRecords: [],
            metadata: {
              processingTime: Date.now() - startTime,
              imageQuality: 'error',
              ocrMethod: 'Enhanced-Tesseract.js-PDF-Not-Supported',
              preprocessingApplied: [],
              error: 'PDF processing requires Python OCR service. Please start the Python OCR service for PDF document processing.',
              recommendation: 'Start Python OCR service with: python server/ocr_service.py'
            }
          };
        }
      } else {
        // Preprocess image for better OCR
        processedImagePath = await this.preprocessImage(filePath);
        imagePaths = [processedImagePath];
      }

      // Try multiple OCR approaches for best results
      console.log('🔄 Multi-approach OCR processing for structured documents...');
      
      const ocrConfigs = [
        {
          name: 'Form Processing',
          psm: PSM.SINGLE_BLOCK,
          params: {
            tessedit_write_images: '0',
            user_defined_dpi: '300',
            preserve_interword_spaces: '1'
          }
        },
        {
          name: 'Auto Segmentation',
          psm: PSM.AUTO,
          params: {
            tessedit_write_images: '0',
            user_defined_dpi: '300'
          }
        },
        {
          name: 'Uniform Block',
          psm: PSM.SINGLE_UNIFORM_BLOCK,
          params: {
            tessedit_write_images: '0',
            user_defined_dpi: '300'
          }
        }
      ];

      let bestResult = { text: '', confidence: 0, config: '' };
      
      for (const config of ocrConfigs) {
        let worker: any = null;
        try {
          console.log(`🔄 Trying ${config.name} configuration...`);
          
          // Create worker with specific configuration
          worker = await createWorker('eng', OEM.LSTM_ONLY, {
            // Don't set logger here to avoid conflicts
          });
          
          // Set page segmentation mode and other parameters
          await worker.setParameters({
            tessedit_pageseg_mode: config.psm,
            ...config.params
          });
          
          const { data } = await worker.recognize(imagePaths[0]);
          const cleanText = data.text?.trim() || '';
          const confidence = data.confidence || 0;
          
          console.log(`   ${config.name}: ${confidence}% confidence, ${cleanText.length} chars`);
          
          if (confidence > bestResult.confidence && cleanText.length > 20) {
            bestResult = { 
              text: cleanText, 
              confidence: confidence,
              config: config.name 
            };
          }
          
          await worker.terminate();
          
        } catch (error) {
          console.warn(`   ${config.name} failed:`, error.message);
          if (worker) {
            try { await worker.terminate(); } catch (e) {}
          }
        }
      }
      
      console.log(`✅ Best OCR result: ${bestResult.config} (${bestResult.confidence}%)`);
      
      const allText = bestResult.text;
      const averageConfidence = bestResult.confidence;
        
        // Create processed document structure
        const processedDoc: ProcessedDocument = {
          text: allText.trim(),
          confidence: Math.round(averageConfidence),
          language: 'eng',
          entities: {},
          claimRecords: [],
          metadata: {
            processingTime: Date.now() - startTime,
            imageQuality: averageConfidence > 60 ? 'good' : averageConfidence > 30 ? 'fair' : 'poor',
            ocrMethod: `Multi-Config-Tesseract-${bestResult.config}`,
            preprocessingApplied: ['enhanced_preprocessing', 'multi_approach_ocr'],
            pageCount: 1,
            bestConfig: bestResult.config
          }
        };
        
        // Clean up temporary files
        await this.cleanupTempFiles(imagePaths, processedImagePath);
        
        console.log(`✅ Multi-approach OCR completed: ${averageConfidence}% confidence with ${bestResult.config}`);
        return processedDoc;
      
    } catch (error: any) {
      console.error('❌ Enhanced fallback OCR failed:', error);
      
      // Clean up on error
      if (processedImagePath) {
        await this.cleanupTempFiles([], processedImagePath);
      }
      
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
          ocrMethod: 'Enhanced-Tesseract.js-Failed',
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

  private async convertPDFToImages(pdfPath: string): Promise<string[]> {
    // Note: PDF-to-image conversion is not available in fallback OCR due to library limitations
    // This would normally require pdf-poppler or similar, but it's not supported in this environment
    console.warn('⚠️ PDF-to-image conversion not available in fallback OCR - skipping PDF processing');
    console.log('💡 For PDF processing, please ensure the Python OCR service is running');
    
    // Return empty array to indicate no pages were processed
    throw new Error('PDF processing not supported in fallback OCR. Please use Python OCR service for PDF documents.');
  }

  private async preprocessImage(imagePath: string): Promise<string> {
    try {
      console.log('🔄 Advanced preprocessing for structured documents...');
      
      // Create unique processed path 
      const timestamp = Date.now();
      const processedPath = imagePath.replace(/\.(jpg|jpeg|png)$/i, `_enhanced_${timestamp}.png`);
      
      // Get image metadata
      const metadata = await sharp(imagePath).metadata();
      const originalWidth = metadata.width || 1000;
      const originalHeight = metadata.height || 1000;
      
      console.log(`   Original: ${originalWidth}x${originalHeight}`);
      
      // Calculate optimal size for OCR (aim for 300+ DPI)
      const targetHeight = Math.max(originalHeight, 2400);
      const targetWidth = Math.max(originalWidth, 1800);
      
      // Multi-stage preprocessing for better text recognition
      await sharp(imagePath)
        .greyscale() // Convert to grayscale
        .resize(targetWidth, targetHeight, { 
          fit: 'inside',
          withoutEnlargement: false,
          kernel: sharp.kernel.lanczos3 
        })
        .gamma(1.1) // Slightly brighten dark text
        .normalize() // Auto-adjust contrast
        .sharpen({ sigma: 1, m1: 1, m2: 2 }) // Sharpen text edges
        .median(1) // Reduce noise
        .png({ quality: 100, compressionLevel: 0 })
        .toFile(processedPath);
      
      console.log(`✅ Enhanced preprocessing: ${originalWidth}x${originalHeight} → ${targetWidth}x${targetHeight}`);
      return processedPath;
      
    } catch (error: any) {
      console.error('❌ Image preprocessing failed:', error);
      // Return original path if preprocessing fails
      return imagePath;
    }
  }

  private async cleanupTempFiles(imagePaths: string[], processedImagePath?: string | null): Promise<void> {
    try {
      // Clean up PDF conversion images
      for (const imagePath of imagePaths) {
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
        
        // Also remove the directory if it's a temp directory
        const dir = path.dirname(imagePath);
        if (dir.includes('temp_pdf_pages')) {
          try {
            fs.rmSync(dir, { recursive: true, force: true });
          } catch (e) {
            // Directory might not be empty or already cleaned
          }
        }
      }
      
      // Clean up processed image (support new naming pattern)
      if (processedImagePath && (processedImagePath.includes('_processed.png') || processedImagePath.includes('_enhanced_')) && fs.existsSync(processedImagePath)) {
        fs.unlinkSync(processedImagePath);
      }
      
    } catch (error) {
      console.warn('⚠️ Cleanup of temporary files partially failed:', error);
    }
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