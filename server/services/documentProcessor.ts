import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
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
    villages?: string[];
    states?: string[];
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

      // Try Gemini AI Vision first, then fallback to Python OCR, then Tesseract.js
      if (this.genAI && fileType.includes('image')) {
        try {
          console.log('🤖 Processing with Gemini AI Vision for enhanced multilingual OCR...');
          processedDoc = await this.processWithGeminiVision(filePath, fileType, documentId);
        } catch (error) {
          console.warn('⚠️  Gemini AI Vision failed, trying Python OCR:', error);
          // Fall back to Python OCR
          if (!this.isOCRServiceRunning) {
            await this.checkOCRService();
          }

          if (this.isOCRServiceRunning) {
            try {
              const ocrResult = await this.ocrClient.processDocument(filePath, {
                autoLanguage: true,
                contentType
              });
              processedDoc = this.ocrClient.convertToProcessedDocument(ocrResult, {
                documentId,
                fileType,
                originalPath: filePath
              });
            } catch (ocrError) {
              console.warn('⚠️  Python OCR also failed, using fallback:', ocrError);
              processedDoc = await this.processWithFallbackOCR(filePath, fileType, documentId);
            }
          } else {
            processedDoc = await this.processWithFallbackOCR(filePath, fileType, documentId);
          }
        }
      } else {
        // Original flow for non-image files or when Gemini AI is not available
        if (!this.isOCRServiceRunning) {
          await this.checkOCRService();
        }

        if (this.isOCRServiceRunning) {
          try {
            const ocrResult = await this.ocrClient.processDocument(filePath, {
              autoLanguage: true,
              contentType
            });
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
          psm: PSM.SINGLE_BLOCK_VERT_TEXT,
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
          
          // Create worker with bilingual configuration
          // Default to Bengali+English for FRA documents, with English fallback
          let languages = 'ben+eng';
          let actualLanguage = languages; // Track actual language used
          
          try {
            worker = await createWorker(languages, OEM.LSTM_ONLY, {
              // Don't set logger here to avoid conflicts
            });
          } catch (error) {
            console.warn(`⚠️ Failed to load ${languages}, falling back to English-only`);
            languages = 'eng';
            actualLanguage = 'eng';
            worker = await createWorker(languages, OEM.LSTM_ONLY, {
              // Don't set logger here to avoid conflicts
            });
          }
          
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
          
        } catch (error: any) {
          console.warn(`   ${config.name} failed:`, error.message);
          if (worker) {
            try { await worker.terminate(); } catch (e) {}
          }
        }
      }
      
      console.log(`✅ Best OCR result: ${bestResult.config} (${bestResult.confidence}%)`);
      
      // Post-process and clean the OCR text
      const cleanedText = this.postProcessOCRText(bestResult.text);
      const allText = cleanedText;
      const averageConfidence = bestResult.confidence;
        
        // Create processed document structure
        const processedDoc: ProcessedDocument = {
          text: allText.trim(),
          confidence: Math.round(averageConfidence),
          language: 'ben+eng',
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

  private async processWithGeminiVision(filePath: string, fileType: string, documentId?: string): Promise<ProcessedDocument> {
    if (!this.genAI) throw new Error('Gemini AI not available');

    const startTime = Date.now();
    
    try {
      // Read and encode the image file
      const imageData = fs.readFileSync(filePath);
      const base64Data = imageData.toString('base64');
      const mimeType = fileType.includes('png') ? 'image/png' : 
                     fileType.includes('jpg') || fileType.includes('jpeg') ? 'image/jpeg' : 
                     'image/png';

      // Use Gemini 2.5 Pro for enhanced OCR capabilities with advanced configuration
      const model = this.genAI.getGenerativeModel({ 
        model: "gemini-2.5-pro",
        systemInstruction: "You are an expert AI specializing in Indian government document OCR with deep knowledge of Forest Rights Act (FRA) documents. You excel at extracting text from complex multilingual documents containing Telugu, Hindi, Bengali, English, and other Indian languages. You understand government document formats, official stamps, and handwritten annotations.",
        generationConfig: {
          temperature: 0.1, // Lower temperature for more accurate OCR
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 8192,
          responseMimeType: "text/plain"
        }
      });

      const prompt = `
EXTRACT ALL TEXT from this Forest Rights Act (FRA) document with MAXIMUM ACCURACY.

DOCUMENT ANALYSIS:
- Multiple scripts: Telugu, Hindi, Bengali, English
- Government forms with structured fields
- Handwritten and printed text
- Official seals, stamps, signatures
- Tables, checkboxes, form fields

CRITICAL EXTRACTION REQUIREMENTS:
1. **PRESERVE EXACT TEXT**: Do not translate, summarize, or interpret
2. **MAINTAIN STRUCTURE**: Keep original formatting, spacing, line breaks
3. **CAPTURE EVERYTHING**: Include all numbers, codes, stamps, annotations
4. **SCRIPT ACCURACY**: Maintain original script (తెలుగు, हिंदी, বাংলা, English)

SPECIAL ATTENTION TO:
• Claim numbers: CFF/YYYY/TS/XXX/NNN format
• Survey numbers: XXX/X patterns  
• Names: Applicants, fathers, communities
• Locations: Villages, districts, boundaries
• Dates: All date formats (DD/MM/YYYY, DD-MM-YY)
• Reference codes: File numbers, application IDs
• Checkbox selections and form field values

FEW-SHOT EXAMPLES:
Input: [Telugu text] "దరఖాస్తుదారుని పేరు: రాము"
Output: "దరఖాస్తుదారుని పేరు: రాము"

Input: "Claim No: CFF/2023/TS/001/123"
Output: "Claim No: CFF/2023/TS/001/123"

PROCESS THE DOCUMENT NOW - RETURN ONLY THE EXTRACTED TEXT:
`;

      const result = await model.generateContent([
        {
          inlineData: {
            data: base64Data,
            mimeType: mimeType
          }
        },
        prompt
      ]);

      const response = await result.response;
      const extractedText = response.text();

      if (!extractedText || extractedText.trim().length < 10) {
        throw new Error('Gemini AI returned insufficient text content');
      }

      // Calculate a confidence score based on text quality indicators
      const confidence = this.calculateGeminiConfidence(extractedText);
      
      console.log(`✅ Gemini AI Vision completed: ${confidence}% confidence, ${extractedText.length} characters extracted`);

      return {
        text: extractedText.trim(),
        confidence: confidence,
        language: 'tel+eng', // Multilingual Telugu + English
        entities: {}, // Will be populated later by entity extraction
        claimRecords: [],
        metadata: {
          processingTime: Date.now() - startTime,
          imageQuality: confidence > 80 ? 'excellent' : confidence > 60 ? 'good' : 'fair',
          ocrMethod: 'Gemini-2.5-Pro-Vision-Enhanced',
          preprocessingApplied: ['ai_vision_processing'],
          documentId,
          characterCount: extractedText.length,
          enhancedProcessing: true
        }
      };

    } catch (error: any) {
      console.error('❌ Gemini AI Vision processing failed:', error);
      throw error; // Re-throw to trigger fallback
    }
  }

  private calculateGeminiConfidence(text: string): number {
    // Calculate confidence based on text quality indicators
    let confidence = 70; // Base confidence for Gemini AI
    
    // Check for structured content indicators
    if (text.includes('Claim Number') || text.includes('CFF/')) confidence += 10;
    if (text.includes('Community') || text.includes('Village')) confidence += 5;
    if (text.includes('Forest') || text.includes('Rights')) confidence += 5;
    if (text.includes('Telangana') || text.includes('Department')) confidence += 5;
    if (/\d{4}\//.test(text)) confidence += 5; // Year patterns
    
    // Penalize for obvious OCR errors
    if (text.includes('|||') || text.includes('###')) confidence -= 10;
    if (text.length < 50) confidence -= 20; // Too short
    
    return Math.min(95, Math.max(50, confidence)); // Clamp between 50-95%
  }

  private async extractEntitiesWithAI(text: string): Promise<any> {
    if (!this.genAI) throw new Error('AI not available');

    // Use Gemini 2.5 Pro with structured output for maximum entity extraction accuracy
    const model = this.genAI.getGenerativeModel({ 
      model: "gemini-2.5-pro",
      systemInstruction: "You are an expert entity extraction AI specializing in Indian Forest Rights Act (FRA) documents. You excel at identifying names, places, numbers, and legal entities from multilingual government documents.",
      generationConfig: {
        temperature: 0.2, // Low temperature for consistent structured output
        topP: 0.9,
        topK: 40,
        maxOutputTokens: 4096,
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            claimantNames: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
              description: "Full names of forest rights claimants/applicants"
            },
            fatherNames: {
              type: SchemaType.ARRAY, 
              items: { type: SchemaType.STRING },
              description: "Father's names of applicants"
            },
            claimTypes: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
              description: "Type of forest rights claim"
            },
            documentTypes: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
              description: "Types of documents (patta, survey settlement, revenue record)"
            },
            surveyNumbers: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
              description: "Land survey numbers in XXX/X format"
            },
            claimNumbers: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
              description: "FRA claim numbers in CFF/YYYY/TS/XXX/NNN format"
            },
            villages: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
              description: "Village names"
            },
            districts: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
              description: "District names"
            },
            boundaries: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
              description: "Land boundary descriptions"
            },
            dates: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
              description: "Important dates in the document"
            },
            states: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
              description: "State names"
            },
            confidence: {
              type: SchemaType.NUMBER,
              description: "Overall confidence score for extraction accuracy"
            }
          },
          required: ["claimantNames", "claimTypes", "documentTypes", "confidence"]
        }
      }
    });
    
    const prompt = `
Extract ALL entities from this Forest Rights Act (FRA) document text with MAXIMUM PRECISION.

ENTITY EXTRACTION FOCUS:
- Names: Full applicant names, father's names, community names
- Claim Information: Claim numbers, claim types, application details  
- Location Data: Villages, districts, states, survey numbers
- Legal References: Document types, reference numbers, dates
- Land Details: Survey numbers, boundaries, area measurements

MULTILINGUAL PROCESSING:
- Recognize names in Telugu, Hindi, Bengali, English scripts
- Extract transliterated names accurately
- Preserve original spelling and formatting

TEXT TO PROCESS:
${text.substring(0, 3000)}

Return a comprehensive JSON object with all extracted entities and confidence score.
`;

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const extractedData = JSON.parse(response.text());
      
      console.log(`🤖 AI Entity Extraction completed with ${extractedData.confidence || 85}% confidence`);
      console.log(`   Found: ${extractedData.claimantNames?.length || 0} names, ${extractedData.surveyNumbers?.length || 0} survey numbers, ${extractedData.villages?.length || 0} villages`);
      
      return extractedData;
    } catch (error) {
      console.warn('⚠️ Advanced AI entity extraction failed, using fallback:', error);
      return this.extractEntitiesBasic(text);
    }
  }

  private extractEntitiesBasic(text: string): any {
    const entities: any = {
      claimantNames: [],
      claimTypes: [],
      documentTypes: [],
      surveyNumbers: [],
      boundaries: [],
      villages: [],
      states: []
    };

    console.log('🔍 Extracting entities from bilingual FRA text:', text.substring(0, 300) + '...');

    // Enhanced patterns for bilingual Bengali+English FRA documents
    // Handle both English and Bengali field labels and mixed content
    
    // Extract applicant names - multiple patterns for FRA documents
    const namePatterns = [
      /(?:applicant\s*name|নাম)(?:\s*\([^)]*\))?\s*:?\s*([A-Za-z\u0980-\u09FF\s]+?)(?:\s*\([^)]*\))?(?:\s+(?:father|পিতার|village|গ্রাম))/i,
      /applicant\s*name[^:]*:\s*([A-Za-z\u0980-\u09FF\s]+)/i,
      /name[^:]*:\s*([A-Za-z\u0980-\u09FF\s]+?)(?:\s+(?:father|village))/i
    ];
    
    for (const pattern of namePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const name = match[1].trim().replace(/[()]/g, '');
        if (name.length > 2 && !entities.claimantNames.includes(name)) {
          entities.claimantNames.push(name);
          console.log('   Found applicant name:', name);
          break;
        }
      }
    }
    
    // Extract father's name - Bengali+English patterns
    const fatherPatterns = [
      /(?:father'?s?\s*name|পিতার\s*নাম)(?:\s*\([^)]*\))?\s*:?\s*([A-Za-z\u0980-\u09FF\s]+?)(?:\s*\([^)]*\))?(?:\s+(?:village|গ্রাম|district))/i,
      /father'?s?\s*name[^:]*:\s*([A-Za-z\u0980-\u09FF\s]+)/i
    ];
    
    for (const pattern of fatherPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const name = match[1].trim().replace(/[()]/g, '');
        if (name.length > 2 && !entities.claimantNames.includes(name)) {
          entities.claimantNames.push(name);
          console.log('   Found father name:', name);
          break;
        }
      }
    }
    
    // Extract village names - bilingual patterns
    const villagePatterns = [
      /(?:village|গ্রাম)(?:\s*\([^)]*\))?\s*:?\s*([A-Za-z\u0980-\u09FF\s]+?)(?:\s*\([^)]*\))?(?:\s+(?:district|জেলা|tehsil))/i,
      /village[^:]*:\s*([A-Za-z\u0980-\u09FF\s]+)/i
    ];
    
    for (const pattern of villagePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const village = match[1].trim().replace(/[()]/g, '');
        if (village.length > 2) {
          entities.villages.push(village);
          entities.boundaries.push(village);
          console.log('   Found village:', village);
          break;
        }
      }
    }
    
    // Extract district names - bilingual patterns  
    const districtPatterns = [
      /(?:district|জেলা)(?:\s*\([^)]*\))?\s*:?\s*([A-Za-z\u0980-\u09FF\s]+?)(?:\s*\([^)]*\))?(?:\s+(?:survey|state|coordination))/i,
      /district[^:]*:\s*([A-Za-z\u0980-\u09FF\s]+)/i
    ];
    
    for (const pattern of districtPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const district = match[1].trim().replace(/[()]/g, '');
        if (district.length > 2) {
          entities.boundaries.push(district);
          console.log('   Found district:', district);
          break;
        }
      }
    }
    
    // Extract survey numbers - enhanced FRA patterns
    const surveyPatterns = [
      /(?:survey\s*number|সার্ভে\s*নম্বর|claim\s*number|khowai)(?:\s*\([^)]*\))?\s*:?\s*([\d\/\-A-Z]+)/i,
      /IFR\/[\d\/A-Z]+/i,
      /khowai\s+(\d+\/\d+)/i,
      /\b\d+\/\d+\b/g
    ];
    
    for (const pattern of surveyPatterns) {
      if (pattern.global) {
        const matches = text.match(pattern);
        if (matches) {
          matches.forEach(match => {
            // Exclude dates (dd/mm, dd/mm/yyyy patterns) and years 
            if (!match.match(/\d{4}/) && 
                !match.match(/^\d{1,2}\/\d{1,2}$/) && 
                !match.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/) && 
                !entities.surveyNumbers.includes(match)) {
              entities.surveyNumbers.push(match);
              console.log('   Found survey number:', match);
            }
          });
        }
      } else {
        const match = text.match(pattern);
        if (match && match[1]) {
          if (!entities.surveyNumbers.includes(match[1])) {
            entities.surveyNumbers.push(match[1]);
            console.log('   Found survey number:', match[1]);
          }
        }
      }
    }
    
    // Extract area/coordinates - FRA specific
    const areaMatch = text.match(/(?:area|এলাকা|claimed\s*area).*?(\d+\.?\d*)\s*(?:hectare|হেক্টর|acre)/i);
    if (areaMatch && areaMatch[1]) {
      entities.boundaries.push(`${areaMatch[1]} hectare`);
      console.log('   Found area:', `${areaMatch[1]} hectare`);
    }
    
    const coordinateMatch = text.match(/(\d+\.\d+)\s*[NnSs],?\s*(\d+\.\d+)\s*[EeWw]/);
    if (coordinateMatch) {
      const coords = `${coordinateMatch[1]}N, ${coordinateMatch[2]}E`;
      entities.boundaries.push(coords);
      console.log('   Found coordinates:', coords);
    }

    // Enhanced document type detection for FRA
    const docTypes = ['forest', 'verification', 'individual', 'community', 'patta'];
    docTypes.forEach(type => {
      if (text.toLowerCase().includes(type)) {
        if (!entities.documentTypes.includes(type)) {
          entities.documentTypes.push(type);
        }
      }
    });

    // Enhanced claim type detection
    if (text.toLowerCase().includes('individual') || text.toLowerCase().includes('ifr')) {
      entities.claimTypes.push('individual');
    }
    if (text.toLowerCase().includes('community') || text.toLowerCase().includes('cfr')) {
      entities.claimTypes.push('community');
    }

    // Clean up and deduplicate
    Object.keys(entities).forEach(key => {
      entities[key] = Array.from(new Set(entities[key])); // Remove duplicates
    });

    console.log('✅ Extracted bilingual FRA entities:', entities);
    return entities;
  }

  private postProcessOCRText(text: string): string {
    let cleanedText = text;
    
    // Clean up common OCR artifacts and noise
    cleanedText = cleanedText
      // Remove garbled Hindi text patterns (common OCR artifacts for Devanagari)
      .replace(/[a-zA-Z0-9]{1,3}\s+[a-zA-Z0-9]+[Rr]+\s+[a-zA-Z0-9]+[Rr]*[a-zA-Z0-9]*[a-m]+/g, '')
      // Clean up date patterns - remove trailing noise after dates
      .replace(/(\d{4}-\d{2}-\d{2})\s+[A-Za-z]+/g, '$1')
      // Remove standalone letter artifacts
      .replace(/\b[a-zA-Z]\d+\b/g, '')
      // Remove repeated characters that are likely artifacts
      .replace(/([a-zA-Z])\1{3,}/g, '$1')
      // Clean up multiple spaces
      .replace(/\s+/g, ' ')
      // Remove lines that are mostly garbled (more than 60% non-space, non-alphanumeric)
      .split('\n')
      .filter(line => {
        const cleanLine = line.trim();
        if (cleanLine.length < 3) return true; // Keep short lines
        const validChars = cleanLine.match(/[a-zA-Z0-9\s:.-]/g) || [];
        const validRatio = validChars.length / cleanLine.length;
        return validRatio > 0.6; // Keep lines that are mostly valid characters
      })
      .join('\n')
      // Final cleanup
      .trim();
    
    console.log('🧹 Text cleaning applied');
    return cleanedText;
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
      
      // Create unique processed path - ensure it's different from input
      const timestamp = Date.now();
      const dir = path.dirname(imagePath);
      const filename = path.basename(imagePath, path.extname(imagePath));
      const processedPath = path.join(dir, `${filename}_enhanced_${timestamp}.png`);
      
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