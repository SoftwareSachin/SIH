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
        console.log('✅ Gemini AI initialized for enhanced OCR processing');
      } else {
        console.log('ℹ️  No OCR Gemini API key found - using OCR only');
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
        systemInstruction: "You are an expert AI specializing in Indian government document OCR with deep knowledge of Forest Rights Act (FRA) documents from Madhya Pradesh, Tripura, Odisha, and Telangana. You excel at extracting text from complex multilingual documents containing Telugu (తెలుగు), Hindi (हिंदी), Bengali (বাংলা), Odia (ଓଡ଼ିଆ), Kokborok/Tripuri (Latin and Bengali scripts), and tribal languages like Bhili, Gondi, Korku (Devanagari script). You understand government document formats, official stamps, and handwritten annotations across these regional linguistic contexts.",
        generationConfig: {
          temperature: 0.05, // Ultra-low temperature for maximum precision
          topP: 0.98, // Maximum topP for comprehensive vocabulary coverage
          topK: 64, // Increased topK for maximum options
          maxOutputTokens: 8192,
          responseMimeType: "text/plain",
          candidateCount: 1, // Single best candidate
          stopSequences: [], // No early stopping
          presencePenalty: 0.0, // No penalties for repeated content
          frequencyPenalty: 0.0
        }
      });

      const prompt = `
EXTRACT ALL TEXT from this Forest Rights Act (FRA) document with MAXIMUM ACCURACY.

YOU ARE THE WORLD'S MOST ADVANCED OCR AI with specialized expertise in:
• Indian government documents and legal forms
• Multilingual script recognition (Telugu, Hindi, Bengali, English, Tamil, Gujarati)
• Handwritten text analysis and official stamp reading
• Complex document layout understanding

DOCUMENT ANALYSIS - PROCESS WITH HIGHEST PRECISION:
- Multiple scripts: Telugu (తెలుగు), Hindi (हिंदी), Bengali (বাংলা), Odia (ଓଡ଼ିଆ), English
- Regional languages: Kokborok/Tripuri (Latin/Bengali scripts), Bhili, Gondi, Korku (Devanagari)
- State-specific formats: Madhya Pradesh, Tripura, Odisha, Telangana government documents
- Government forms with structured fields and checkboxes
- Handwritten signatures, annotations, and corrections
- Official seals, stamps, watermarks, and letterheads
- Tables, forms, and hierarchical data structures

ULTRA-CRITICAL EXTRACTION REQUIREMENTS:
1. **PRESERVE EXACT TEXT**: Never translate, summarize, or interpret content
2. **MAINTAIN STRUCTURE**: Keep original formatting, spacing, line breaks, indentation
3. **CAPTURE EVERYTHING**: Include ALL numbers, codes, stamps, annotations, marginalia
4. **SCRIPT ACCURACY**: Maintain original script - DO NOT transliterate or romanize
5. **QUALITY CONTROL**: Double-check challenging areas like handwriting and stamps

PRIORITY EXTRACTION TARGETS:
🎯 Claim numbers: CFF/YYYY/TS/XXX/NNN format variations
🎯 Survey numbers: XXX/X, XX/XXX, XXXX/XX patterns  
🎯 Names: Applicants, fathers, spouses, community representatives
🎯 Locations: Villages, mandals, districts, boundaries (N/S/E/W)
🎯 Dates: All formats DD/MM/YYYY, DD-MM-YY, DD.MM.YYYY
🎯 Reference codes: File numbers, application IDs, certificate numbers
🎯 Legal terms: Rights types, land categories, approval statuses
🎯 Measurements: Areas in acres/hectares, GPS coordinates

ADVANCED PROCESSING EXAMPLES BY STATE:
✓ Telangana Telugu: "దరఖాస్తుదారుని పేరు: శ్రీ రామచంద్ర రావు" → EXACT OUTPUT
✓ Odisha Odia: "ଆବେଦନକାରୀଙ୍କ ନାମ: ଶ୍ରୀ ରାମଚନ୍ଦ୍ର ରାଓ" → PRESERVE ODIA SCRIPT
✓ Tripura Kokborok: "Jamatirang ming: Rabi Debbarma" → LATIN KOKBOROK
✓ Tripura Bengali: "আবেদনকারীর নাম: রবি দেববর্মা" → BENGALI SCRIPT
✓ MP Hindi: "आवेदक का नाम: श्री राम चंद्र राव" → DEVANAGARI SCRIPT
✓ MP Tribal: "Bhil समुदाय, Gondi जनजाति" → PRESERVE MIXED SCRIPT
✓ Mixed: "Claim No: CFF/2023/OR/001/123, ଗ୍ରାମ: କୋଦାଙ୍ଗଲ" → PRESERVE BOTH

EXECUTE MAXIMUM PRECISION EXTRACTION NOW:
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

  // Script detection utility for dynamic language selection
  private detectScripts(text: string): string[] {
    const scripts = [];
    
    // Unicode ranges for different scripts
    if (/[\u0c00-\u0c7F]/.test(text)) scripts.push('tel'); // Telugu
    if (/[\u0900-\u097F]/.test(text)) scripts.push('hin'); // Hindi/Devanagari
    if (/[\u0980-\u09FF]/.test(text)) scripts.push('ben'); // Bengali
    if (/[\u0b00-\u0b7F]/.test(text)) scripts.push('ori'); // Odia
    if (/[a-zA-Z]/.test(text)) scripts.push('eng'); // English/Latin
    
    // Return optimized language combinations for Tesseract
    if (scripts.includes('tel')) return ['tel+eng', 'tel', 'eng'];
    if (scripts.includes('hin')) return ['hin+eng', 'hin', 'eng'];
    if (scripts.includes('ben')) return ['ben+eng', 'ben', 'eng'];
    if (scripts.includes('ori')) return ['ori+eng', 'ori', 'eng'];
    
    return ['eng']; // Default fallback
  }

  private async extractEntitiesWithAI(text: string): Promise<any> {
    if (!this.genAI) throw new Error('AI not available');

    // Use Gemini 2.5 Pro with structured output for maximum entity extraction accuracy
    const model = this.genAI.getGenerativeModel({ 
      model: "gemini-2.5-pro",
      systemInstruction: "You are an expert entity extraction AI specializing in Indian Forest Rights Act (FRA) documents from Madhya Pradesh, Tripura, Odisha, and Telangana. You excel at identifying names, places, numbers, and legal entities from multilingual government documents in Telugu (తెలుగు), Hindi (हिंदी), Bengali (বাংলা), Odia (ଓଡ଼ିଆ), Kokborok/Tripuri, and tribal languages (Bhili, Gondi, Korku). You understand regional naming conventions, place names, and administrative terminology specific to these states.",
      generationConfig: {
        temperature: 0.1, // Ultra-low temperature for consistent structured output
        topP: 0.95, // Higher topP for better entity recognition
        topK: 50, // Increased topK for more vocabulary options
        maxOutputTokens: 8192, // Increased token limit
        responseMimeType: "application/json",
        candidateCount: 1, // Single best candidate
        stopSequences: [], // No early stopping
        presencePenalty: 0.0,
        frequencyPenalty: 0.0,
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
              description: "State names (Madhya Pradesh, Tripura, Odisha, Telangana)"
            },
            languagesDetected: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  language: { type: SchemaType.STRING },
                  script: { type: SchemaType.STRING },
                  confidence: { type: SchemaType.NUMBER }
                }
              },
              description: "Languages and scripts detected in the document"
            },
            regionalContext: {
              type: SchemaType.OBJECT,
              properties: {
                state: { type: SchemaType.STRING },
                primaryLanguage: { type: SchemaType.STRING },
                tribalCommunity: { type: SchemaType.STRING },
                administrativeLevel: { type: SchemaType.STRING }
              },
              description: "Regional administrative context"
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
ULTRA-ADVANCED ENTITY EXTRACTION from Forest Rights Act (FRA) document.

YOU ARE THE MOST SOPHISTICATED ENTITY EXTRACTION AI with specialized capabilities:
🧠 Deep understanding of Indian legal terminology and FRA processes
🌐 Native-level comprehension of Telugu, Hindi, Bengali, Odia, Kokborok, and tribal language scripts
🎯 Pattern recognition for government document structures and formats
📊 Confidence scoring based on extraction certainty

MAXIMUM PRECISION EXTRACTION TARGETS:
👥 NAMES: Applicant names, father/spouse names, witness names, community representatives
🏛️ CLAIM DATA: Claim numbers (CFF/YYYY/TS/XXX/NNN), application IDs, reference numbers
📍 LOCATIONS: Villages, mandals, districts, states, survey numbers, GPS coordinates
📋 DOCUMENTS: Patta types, revenue records, survey settlements, certificates
🗓️ DATES: Application dates, approval dates, verification dates (all formats)
🏞️ LAND DATA: Survey numbers, boundaries (N/S/E/W), areas, land classifications
⚖️ LEGAL: Rights types (individual/community/family), approval statuses, conditions

ADVANCED PROCESSING INSTRUCTIONS BY STATE:
• Telangana: Telugu (తెలుగు) names like రాముడు, లక్ష్మి, villages like హైదరాబాద్, వరంగల్
• Odisha: Odia (ଓଡ଼ିଆ) names like ରାମଚନ୍ଦ୍ର, ସୀତା, villages like ଭୁବନେଶ୍ୱର, କଟକ
• Tripura: Bengali script + Kokborok names like Debbarma, Reang, places like Agartala
• Madhya Pradesh: Hindi + tribal languages, names like राम, सीता, Bhil/Gond communities
• Extract names preserving original scripts without transliteration
• Recognize state-specific administrative terminology and place naming conventions
• Handle mixed-script documents with appropriate confidence scoring

CONFIDENCE SCORING CRITERIA:
90-100%: Clear, unambiguous text with perfect recognition
70-89%: Good recognition with minor uncertainties
50-69%: Moderate recognition with some unclear elements
<50%: Significant recognition challenges

TEXT TO ANALYZE:
${text.substring(0, 3000)}

RETURN: Comprehensive JSON with all entities and precise confidence assessment.
`;

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const extractedData = JSON.parse(response.text());
      
      // Fix confidence display issue - ensure it's displayed as percentage
      const confidenceScore = extractedData.confidence >= 1 ? extractedData.confidence : (extractedData.confidence * 100);
      console.log(`🤖 AI Entity Extraction completed with ${confidenceScore}% confidence`);
      console.log(`   Found: ${extractedData.claimantNames?.length || 0} names, ${extractedData.surveyNumbers?.length || 0} survey numbers, ${extractedData.villages?.length || 0} villages`);
      console.log(`   🚀 MAXIMUM POWER: Gemini 2.5 Pro + Multi-state languages (MP/Tripura/Odisha/Telangana) + Structured JSON`);
      
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

    console.log('🔍 Extracting entities from multilingual FRA text (MP/Tripura/Odisha/Telangana):', text.substring(0, 300) + '...');

    // Enhanced patterns for multilingual FRA documents
    // Handle Telugu, Hindi, Bengali, Odia, Kokborok and English field labels and mixed content
    
    // Extract applicant names - multiple patterns for multilingual FRA documents
    const namePatterns = [
      // Telugu patterns
      /(?:దరఖాస్తుదారుని\s*పేరు|applicant\s*name)(?:\s*\([^)]*\))?\s*:?\s*([A-Za-z\u0c00-\u0c7F\s]+?)(?:\s*\([^)]*\))?(?:\s+(?:father|తండ్రి|village|గ్రామం))/i,
      // Hindi patterns  
      /(?:आवेदक\s*का\s*नाम|applicant\s*name)(?:\s*\([^)]*\))?\s*:?\s*([A-Za-z\u0900-\u097F\s]+?)(?:\s*\([^)]*\))?(?:\s+(?:father|पिता|village|गाँव))/i,
      // Bengali patterns
      /(?:applicant\s*name|নাম)(?:\s*\([^)]*\))?\s*:?\s*([A-Za-z\u0980-\u09FF\s]+?)(?:\s*\([^)]*\))?(?:\s+(?:father|পিতার|village|গ্রাম))/i,
      // Odia patterns
      /(?:ଆବେଦନକାରୀଙ୍କ\s*ନାମ|applicant\s*name)(?:\s*\([^)]*\))?\s*:?\s*([A-Za-z\u0b00-\u0b7F\s]+?)(?:\s*\([^)]*\))?(?:\s+(?:father|ପିତା|village|ଗାଁ))/i,
      // Generic English patterns
      /applicant\s*name[^:]*:\s*([A-Za-z\u0900-\u097F\u0980-\u09FF\u0b00-\u0b7F\u0c00-\u0c7F\s]+)/i,
      /name[^:]*:\s*([A-Za-z\u0900-\u097F\u0980-\u09FF\u0b00-\u0b7F\u0c00-\u0c7F\s]+?)(?:\s+(?:father|village))/i
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