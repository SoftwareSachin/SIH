import { createWorker, createScheduler } from 'tesseract.js';
import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { cacheService } from './cacheService';
import { TextProcessor } from './textProcessor';
import { PaddleOCREngine, EasyOCREngine, TrOCREngine, LanguageMapper } from './localOCREngines';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface OCRResult {
  text: string;
  confidence: number;
  method: string;
  processingTime: number;
  language?: string;
  layout?: any;
  entities?: any[];
  hocr?: string;
  tsv?: string;
  handwritingDetected?: boolean;
  scriptType?: string;
}

interface PreprocessingResult {
  processedPath: string;
  quality: string;
  applied: string[];
  scriptType: string;
  documentType: string;
  handwritingDetected: boolean;
}

export class HybridOCRService {
  private ocrScheduler: any;
  private workers: any[] = [];
  private genAI: GoogleGenerativeAI | null = null;
  private paddleOCRAvailable: boolean = false;
  private easyOCRAvailable: boolean = false;
  private trocr_Available: boolean = false;
  
  private readonly supportedLanguages = [
    'eng', 'hin', 'ben', 'guj', 'kan', 'mal', 'mar', 'ori', 'pan', 'tam', 'tel', 'urd'
  ];

  constructor() {
    this.initializeTesseract();
    this.initializeAI();
    this.checkLocalOCREngines();
  }

  private async initializeTesseract() {
    try {
      this.ocrScheduler = createScheduler();
      const workerCount = parseInt(process.env.OCR_WORKERS || '4');
      
      for (let i = 0; i < workerCount; i++) {
        const worker = await createWorker('eng+hin+ben+ori+tel+guj+mar+kan+tam+mal+pan+urd');
        await worker.setParameters({
          preserve_interword_spaces: '1',
          tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,;:!?()-/\\@#$%^&*+=[]{}"\' ।।०१२३४५६७८९ाैेीोूंँ',
          tessjs_create_hocr: '1',
          tessjs_create_tsv: '1',
          tessjs_create_box: '1'
        });
        
        this.workers.push(worker);
        this.ocrScheduler.addWorker(worker);
      }
      
      console.log('✓ Hybrid OCR: Tesseract scheduler initialized with', this.workers.length, 'workers');
    } catch (error) {
      console.error('Failed to initialize Tesseract workers:', error);
    }
  }

  private initializeAI() {
    try {
      if (process.env.GEMINI_API_KEY) {
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        console.log('✓ Hybrid OCR: Gemini AI initialized');
      }
    } catch (error) {
      console.error('Failed to initialize Gemini AI:', error);
    }
  }

  private async checkLocalOCREngines() {
    try {
      // Check for PaddleOCR
      await execAsync('python3 -c "import paddleocr; print(\'PaddleOCR available\')"');
      this.paddleOCRAvailable = true;
      console.log('✓ PaddleOCR detected and available');
    } catch {
      console.log('⚠ PaddleOCR not available - install with: pip install paddleocr');
    }

    try {
      // Check for EasyOCR
      await execAsync('python3 -c "import easyocr; print(\'EasyOCR available\')"');
      this.easyOCRAvailable = true;
      console.log('✓ EasyOCR detected and available');
    } catch {
      console.log('⚠ EasyOCR not available - install with: pip install easyocr');
    }

    try {
      // Check for TrOCR (transformers)
      await execAsync('python3 -c "from transformers import TrOCRProcessor; print(\'TrOCR available\')"');
      this.trocr_Available = true;
      console.log('✓ TrOCR detected and available');
    } catch {
      console.log('⚠ TrOCR not available - install with: pip install transformers torch pillow');
    }

    const availableEngines = [
      this.paddleOCRAvailable && 'PaddleOCR',
      this.easyOCRAvailable && 'EasyOCR', 
      this.trocr_Available && 'TrOCR'
    ].filter(Boolean);

    console.log(`✓ Hybrid OCR: ${availableEngines.length} local engines available: ${availableEngines.join(', ')}`);
  }

  /**
   * Main OCR processing method implementing the hybrid pipeline
   */
  async processDocument(imagePath: string, options: {
    documentId?: string;
    priority?: 'high' | 'normal' | 'low';
    useCloudOCR?: boolean;
    useHandwritingRecognition?: boolean;
    extractLayout?: boolean;
    confidenceThreshold?: number;
  } = {}): Promise<OCRResult> {
    const startTime = Date.now();
    const {
      documentId,
      useCloudOCR = true,
      useHandwritingRecognition = true,
      extractLayout = true,
      confidenceThreshold = 85
    } = options;

    try {
      console.log('🚀 Starting Hybrid OCR Pipeline...');
      
      // Step 1: Advanced preprocessing and document analysis
      const preprocessingResult = await this.advancedPreprocessing(imagePath);
      console.log(`📊 Document Analysis: ${preprocessingResult.documentType}, Script: ${preprocessingResult.scriptType}, Handwriting: ${preprocessingResult.handwritingDetected}`);
      
      // Step 2: Route to appropriate OCR pipeline based on analysis
      let ocrResult: OCRResult;
      
      if (preprocessingResult.handwritingDetected && useHandwritingRecognition) {
        // Handwriting pipeline with TrOCR
        ocrResult = await this.handwritingRecognitionPipeline(preprocessingResult);
      } else if (this.paddleOCRAvailable || this.easyOCRAvailable) {
        // Local OCR engines for high accuracy on printed text
        ocrResult = await this.localOCRPipeline(preprocessingResult);
      } else {
        // Enhanced Tesseract pipeline
        ocrResult = await this.tesseractPipeline(preprocessingResult);
      }
      
      // Step 3: Layout understanding if requested
      if (extractLayout && ocrResult.confidence >= confidenceThreshold) {
        ocrResult = await this.addLayoutUnderstanding(ocrResult, preprocessingResult.processedPath);
      }
      
      // Step 4: Post-processing and validation
      ocrResult = await this.postProcessing(ocrResult, preprocessingResult);
      
      // Step 5: Quality assessment and human-in-the-loop decision
      const qualityAssessment = await this.assessQuality(ocrResult);
      
      if (qualityAssessment.needsHumanReview) {
        console.log(`⚠️  Low confidence (${ocrResult.confidence}%) - flagged for human review`);
        await this.flagForHumanReview(ocrResult, documentId, qualityAssessment.reasons);
      }
      
      // Cleanup
      await this.cleanup(preprocessingResult.processedPath, imagePath);
      
      ocrResult.processingTime = Date.now() - startTime;
      
      console.log(`✅ Hybrid OCR completed: ${ocrResult.method}, ${ocrResult.confidence}% confidence, ${ocrResult.processingTime}ms`);
      
      return ocrResult;
      
    } catch (error) {
      console.error('Hybrid OCR processing failed:', error);
      throw new Error(`OCR processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Advanced preprocessing with script detection and document analysis
   */
  private async advancedPreprocessing(imagePath: string): Promise<PreprocessingResult> {
    const applied: string[] = [];
    const outputPath = imagePath.replace(/\.[^.]+$/, '_processed.png');
    
    try {
      let image = sharp(imagePath);
      
      // Step 1: Initial quality assessment
      const metadata = await image.metadata();
      applied.push('metadata-analysis');
      
      // Step 2: Super-resolution for low DPI images
      if (metadata.density && metadata.density < 150) {
        image = image.resize({
          width: metadata.width! * 2,
          height: metadata.height! * 2,
          kernel: sharp.kernel.lanczos3
        });
        applied.push('super-resolution');
      }
      
      // Step 3: Advanced denoising and enhancement
      image = image
        .blur(0.3) // Slight blur to reduce noise
        .sharpen({ sigma: 1.0, m1: 0.8, m2: 3, x1: 2, y2: 10, y3: 20 })
        .normalize()
        .linear(1.2, -(128 * 1.2) + 128); // Contrast enhancement
      
      applied.push('denoise-sharpen-contrast');
      
      // Step 4: Binarization for better OCR
      image = image.threshold(130);
      applied.push('adaptive-thresholding');
      
      await image.png({ quality: 100, compressionLevel: 0 }).toFile(outputPath);
      
      // Step 5: Script detection
      const scriptType = await this.detectScript(outputPath);
      applied.push('script-detection');
      
      // Step 6: Document type classification
      const documentType = await this.classifyDocumentType(outputPath);
      applied.push('document-classification');
      
      // Step 7: Handwriting detection
      const handwritingDetected = await this.detectHandwriting(outputPath);
      applied.push('handwriting-detection');
      
      return {
        processedPath: outputPath,
        quality: 'enhanced',
        applied,
        scriptType,
        documentType,
        handwritingDetected
      };
      
    } catch (error) {
      console.error('Preprocessing failed:', error);
      return {
        processedPath: imagePath,
        quality: 'original',
        applied: ['fallback-to-original'],
        scriptType: 'mixed',
        documentType: 'unknown',
        handwritingDetected: false
      };
    }
  }

  /**
   * Script detection for language routing
   */
  private async detectScript(imagePath: string): Promise<string> {
    // Simple script detection based on character patterns
    // In production, use a proper script detection model
    try {
      const quickOCR = await this.quickTesseractScan(imagePath, 'eng+hin+ben');
      const text = quickOCR.text;
      
      if (/[देवनागरी\u0900-\u097F]/.test(text)) return 'devanagari';
      if (/[বাংলা\u0980-\u09FF]/.test(text)) return 'bengali';
      if (/[గుజరాતી\u0A80-\u0AFF]/.test(text)) return 'gujarati';
      if (/[తెలుగు\u0C00-\u0C7F]/.test(text)) return 'telugu';
      if (/[தமিழ்\u0B80-\u0BFF]/.test(text)) return 'tamil';
      if (/[കാനഡാ\u0C80-\u0CFF]/.test(text)) return 'kannada';
      if (/[മലയാളം\u0D00-\u0D7F]/.test(text)) return 'malayalam';
      if (/[ઓરિયા\u0B00-\u0B7F]/.test(text)) return 'odia';
      if (/[मराठी\u0900-\u097F]/.test(text)) return 'marathi';
      if (/[اردو\u0600-\u06FF]/.test(text)) return 'urdu';
      
      return /[A-Za-z]/.test(text) ? 'latin' : 'mixed';
    } catch {
      return 'mixed';
    }
  }

  /**
   * Document type classification for FRA documents
   */
  private async classifyDocumentType(imagePath: string): Promise<string> {
    try {
      const quickOCR = await this.quickTesseractScan(imagePath, 'eng+hin');
      const text = quickOCR.text.toLowerCase();
      
      if (text.includes('forest rights act') || text.includes('वन अधिकार')) return 'fra-patta';
      if (text.includes('claim') || text.includes('दावा')) return 'fra-claim';
      if (text.includes('survey') || text.includes('सर्वेक्षण')) return 'survey-document';
      if (text.includes('map') || text.includes('नक्शा')) return 'map';
      if (text.includes('certificate') || text.includes('प्रमाणपत्र')) return 'certificate';
      
      return 'government-document';
    } catch {
      return 'unknown';
    }
  }

  /**
   * Handwriting detection
   */
  private async detectHandwriting(imagePath: string): Promise<boolean> {
    // Simple handwriting detection based on image characteristics
    // In production, use a proper handwriting detection model
    try {
      const stats = await sharp(imagePath).stats();
      
      // Handwritten documents typically have:
      // - Higher variation in stroke width
      // - More irregular spacing
      // - Different texture characteristics
      
      // This is a simplified heuristic - replace with actual ML model
      const variance = stats.channels.reduce((sum, channel) => sum + channel.stdev, 0) / stats.channels.length;
      
      return variance > 30; // Threshold needs calibration
    } catch {
      return false;
    }
  }

  /**
   * Quick Tesseract scan for analysis purposes
   */
  private async quickTesseractScan(imagePath: string, language: string): Promise<{ text: string; confidence: number }> {
    try {
      if (!this.ocrScheduler) await this.initializeTesseract();
      
      const { data } = await this.ocrScheduler.addJob('recognize', imagePath, {
        lang: language,
        options: {
          tessedit_pageseg_mode: '1',
          tessedit_ocr_engine_mode: '1',
          tessjs_create_hocr: '0',
          tessjs_create_tsv: '0'
        }
      });
      
      return { text: data.text, confidence: data.confidence };
    } catch {
      return { text: '', confidence: 0 };
    }
  }

  /**
   * Local OCR pipeline using PaddleOCR, EasyOCR, and Tesseract
   */
  private async localOCRPipeline(preprocessingResult: PreprocessingResult): Promise<OCRResult> {
    const results: OCRResult[] = [];
    
    // Try PaddleOCR first (generally best for multi-script documents)
    if (this.paddleOCRAvailable) {
      try {
        const paddleResult = await this.runPaddleOCR(preprocessingResult);
        results.push(paddleResult);
      } catch (error) {
        console.warn('PaddleOCR failed:', error);
      }
    }
    
    // Try EasyOCR as secondary option
    if (this.easyOCRAvailable) {
      try {
        const easyResult = await this.runEasyOCR(preprocessingResult);
        results.push(easyResult);
      } catch (error) {
        console.warn('EasyOCR failed:', error);
      }
    }
    
    // Fallback to Tesseract if no other engines worked
    if (results.length === 0) {
      return await this.tesseractPipeline(preprocessingResult);
    }
    
    // Return best result based on confidence and text quality
    results.sort((a, b) => this.scoreOCRResult(b) - this.scoreOCRResult(a));
    return results[0];
  }

  /**
   * Score OCR result based on confidence and text quality
   */
  private scoreOCRResult(result: OCRResult): number {
    let score = result.confidence;
    
    // Bonus for longer, structured text
    if (result.text.length > 100) score += 5;
    if (result.text.includes('\n')) score += 3;
    if (/[A-Z][a-z]+:/.test(result.text)) score += 5; // Field labels
    if (/\d+/.test(result.text)) score += 3; // Numbers
    
    // Penalty for too short or garbled text
    if (result.text.length < 20) score -= 15;
    if (result.text.split(' ').length < 3) score -= 10;
    
    return score;
  }

  /**
   * Handwriting recognition pipeline with TrOCR
   */
  private async handwritingRecognitionPipeline(preprocessingResult: PreprocessingResult): Promise<OCRResult> {
    console.log('📝 Processing handwritten content with TrOCR...');
    
    try {
      // Use TrOCR for handwriting recognition if available
      if (this.trocr_Available) {
        const result = await this.runTrOCRHandwriting(preprocessingResult.processedPath);
        return {
          ...result,
          method: 'trocr-handwriting',
          handwritingDetected: true
        };
      } else {
        // Fallback to Tesseract with handwriting settings
        const result = await this.tesseractHandwritingOCR(preprocessingResult.processedPath);
        return {
          ...result,
          method: 'tesseract-handwriting',
          handwritingDetected: true
        };
      }
    } catch (error) {
      console.warn('Handwriting OCR failed, falling back to standard OCR:', error);
      return await this.tesseractPipeline(preprocessingResult);
    }
  }

  /**
   * Enhanced Tesseract pipeline
   */
  private async tesseractPipeline(preprocessingResult: PreprocessingResult): Promise<OCRResult> {
    const languageMap: Record<string, string> = {
      'devanagari': 'hin+mar+nep',
      'bengali': 'ben',
      'gujarati': 'guj',
      'telugu': 'tel',
      'tamil': 'tam',
      'kannada': 'kan',
      'malayalam': 'mal',
      'odia': 'ori',
      'urdu': 'urd',
      'latin': 'eng',
      'mixed': 'eng+hin+ben+ori+tel'
    };
    
    const language = languageMap[preprocessingResult.scriptType] || 'eng+hin';
    
    const { data } = await this.ocrScheduler.addJob('recognize', preprocessingResult.processedPath, {
      lang: language,
      options: {
        tessedit_pageseg_mode: preprocessingResult.documentType === 'fra-patta' ? '1' : '6',
        tessedit_ocr_engine_mode: '1',
        tessjs_create_hocr: '1',
        tessjs_create_tsv: '1',
        preserve_interword_spaces: '1',
        user_defined_dpi: '300'
      }
    });
    
    return {
      text: data.text,
      confidence: data.confidence,
      method: 'tesseract-enhanced',
      processingTime: 0,
      language: preprocessingResult.scriptType,
      hocr: data.hocr,
      tsv: data.tsv
    };
  }

  /**
   * Tesseract optimized for handwriting
   */
  private async tesseractHandwritingOCR(imagePath: string): Promise<OCRResult> {
    const { data } = await this.ocrScheduler.addJob('recognize', imagePath, {
      lang: 'eng+hin',
      options: {
        tessedit_pageseg_mode: '8', // Treat as single word
        tessedit_ocr_engine_mode: '1',
        tessjs_create_hocr: '1',
        tessjs_create_tsv: '1',
        tessedit_char_blacklist: '',
        tessedit_enable_doc_dict: '0',
        tessjs_user_defined_dpi: '150'
      }
    });
    
    return {
      text: data.text,
      confidence: data.confidence,
      method: 'tesseract-handwriting',
      processingTime: 0,
      hocr: data.hocr,
      tsv: data.tsv
    };
  }

  /**
   * Add layout understanding using LayoutLMv3/Donut concepts
   */
  private async addLayoutUnderstanding(ocrResult: OCRResult, imagePath: string): Promise<OCRResult> {
    try {
      // Simplified layout analysis - in production, use actual LayoutLMv3 or Donut
      const structuredData = this.extractLayoutInformation(ocrResult.text, ocrResult.hocr || '');
      
      return {
        ...ocrResult,
        layout: structuredData,
        method: `${ocrResult.method}+layout-understanding`
      };
    } catch (error) {
      console.warn('Layout understanding failed:', error);
      return ocrResult;
    }
  }

  /**
   * Extract layout information from HOCR
   */
  private extractLayoutInformation(text: string, hocr: string): any {
    // Parse HOCR to extract bounding boxes, text blocks, etc.
    // This is a simplified version - use proper HOCR parsing
    return {
      blocks: this.parseTextBlocks(text),
      entities: TextProcessor.extractStructuredData(text),
      confidence: this.calculateLayoutConfidence(text)
    };
  }

  private parseTextBlocks(text: string): any[] {
    // Simple text block parsing
    return text.split('\n\n').map((block, index) => ({
      id: index,
      text: block.trim(),
      type: this.classifyTextBlock(block)
    })).filter(block => block.text.length > 0);
  }

  private classifyTextBlock(text: string): string {
    if (text.match(/^[A-Z\s]+:/)) return 'label';
    if (text.match(/\d{2}\/\d{2}\/\d{4}/)) return 'date';
    if (text.match(/\d+\.\d+\s*(acre|hectare)/i)) return 'area';
    return 'content';
  }

  private calculateLayoutConfidence(text: string): number {
    let confidence = 50;
    if (text.includes('\n')) confidence += 10; // Multi-line structure
    if (text.match(/[A-Z][a-z]+:/)) confidence += 15; // Labels present
    if (text.match(/\d+/)) confidence += 10; // Numbers present
    return Math.min(95, confidence);
  }

  /**
   * Post-processing and text enhancement
   */
  private async postProcessing(ocrResult: OCRResult, preprocessingResult: PreprocessingResult): Promise<OCRResult> {
    // Apply text corrections
    const enhanced = TextProcessor.enhanceOCRText(ocrResult.text, ocrResult.confidence);
    
    // AI enhancement if available
    let finalText = enhanced.cleanedText;
    let finalConfidence = enhanced.enhancedConfidence;
    
    if (this.genAI && ocrResult.confidence > 60) {
      try {
        const aiEnhanced = await this.aiEnhanceText(finalText, preprocessingResult.documentType);
        if (aiEnhanced.length > finalText.length * 0.8) {
          finalText = aiEnhanced;
          finalConfidence = Math.min(95, finalConfidence + 5);
        }
      } catch (error) {
        console.warn('AI enhancement failed:', error);
      }
    }
    
    return {
      ...ocrResult,
      text: finalText,
      confidence: finalConfidence
    };
  }

  /**
   * AI text enhancement
   */
  private async aiEnhanceText(text: string, documentType: string): Promise<string> {
    if (!this.genAI) return text;
    
    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
      const prompt = `You are an expert at cleaning up OCR text from Indian government documents, specifically ${documentType} documents. Fix obvious OCR errors, correct spelling mistakes, and standardize formatting while preserving the original meaning and structure. Only output the corrected text without explanations:

${text}`;
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text().trim();
    } catch (error) {
      console.error('AI text enhancement failed:', error);
      return text;
    }
  }

  /**
   * Quality assessment
   */
  private async assessQuality(ocrResult: OCRResult): Promise<{
    needsHumanReview: boolean;
    reasons: string[];
    score: number;
  }> {
    const reasons: string[] = [];
    let needsHumanReview = false;
    
    // Confidence threshold check
    if (ocrResult.confidence < 85) {
      needsHumanReview = true;
      reasons.push('Low OCR confidence');
    }
    
    // Text length check
    if (ocrResult.text.length < 50) {
      needsHumanReview = true;
      reasons.push('Text too short');
    }
    
    // Structure check
    const structureScore = this.assessTextStructure(ocrResult.text);
    if (structureScore < 60) {
      needsHumanReview = true;
      reasons.push('Poor text structure');
    }
    
    const score = (ocrResult.confidence + structureScore) / 2;
    
    return {
      needsHumanReview,
      reasons,
      score
    };
  }

  private assessTextStructure(text: string): number {
    let score = 50;
    
    if (text.includes('FOREST RIGHTS') || text.includes('वन अधिकार')) score += 20;
    if (text.match(/[A-Z][a-z]+:/)) score += 15; // Field labels
    if (text.match(/\d+/)) score += 10; // Numbers
    if (text.includes('\n')) score += 5; // Line breaks
    
    return Math.min(100, score);
  }

  /**
   * Flag document for human review
   */
  private async flagForHumanReview(ocrResult: OCRResult, documentId?: string, reasons: string[] = []): Promise<void> {
    // TODO: Implement human review queue
    console.log(`📋 Document ${documentId} flagged for human review:`, reasons.join(', '));
  }

  /**
   * Cleanup temporary files
   */
  private async cleanup(processedPath: string, originalPath: string): Promise<void> {
    if (processedPath !== originalPath && fs.existsSync(processedPath)) {
      try {
        fs.unlinkSync(processedPath);
      } catch (error) {
        console.warn('Failed to cleanup processed image:', error);
      }
    }
  }

  /**
   * Run PaddleOCR on preprocessed image
   */
  private async runPaddleOCR(preprocessingResult: PreprocessingResult): Promise<OCRResult> {
    const language = LanguageMapper.mapToPaddleLanguage(preprocessingResult.scriptType);
    
    try {
      const result = await PaddleOCREngine.process(preprocessingResult.processedPath, language);
      
      return {
        text: result.text,
        confidence: result.confidence,
        method: result.method,
        processingTime: result.processingTime,
        language: preprocessingResult.scriptType,
        layout: result.layout
      };
    } catch (error) {
      console.error('PaddleOCR processing failed:', error);
      throw error;
    }
  }

  /**
   * Run EasyOCR on preprocessed image
   */
  private async runEasyOCR(preprocessingResult: PreprocessingResult): Promise<OCRResult> {
    const languages = LanguageMapper.mapScriptToLanguages(preprocessingResult.scriptType);
    
    try {
      const result = await EasyOCREngine.process(preprocessingResult.processedPath, languages);
      
      return {
        text: result.text,
        confidence: result.confidence,
        method: result.method,
        processingTime: result.processingTime,
        language: preprocessingResult.scriptType,
        layout: result.layout
      };
    } catch (error) {
      console.error('EasyOCR processing failed:', error);
      throw error;
    }
  }

  /**
   * Run TrOCR for handwriting recognition
   */
  private async runTrOCRHandwriting(imagePath: string): Promise<OCRResult> {
    try {
      const result = await TrOCREngine.processHandwriting(imagePath);
      
      return {
        text: result.text,
        confidence: result.confidence,
        method: result.method,
        processingTime: result.processingTime,
        handwritingDetected: true
      };
    } catch (error) {
      console.error('TrOCR handwriting processing failed:', error);
      throw error;
    }
  }
}

export const hybridOCRService = new HybridOCRService();