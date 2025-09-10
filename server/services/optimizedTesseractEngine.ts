import { createWorker, createScheduler } from 'tesseract.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { FieldCrop } from './advancedOCRPreprocessor';

const execAsync = promisify(exec);

export interface TesseractResult {
  text: string;
  confidence: number;
  method: string;
  hocr: string;
  tsv: string;
  processingTime: number;
  tokens: Token[];
  fieldResults?: FieldResult[];
  structuredData?: any;
}

export interface Token {
  text: string;
  confidence: number;
  bbox: { x: number; y: number; width: number; height: number };
  lineNumber: number;
  wordNumber: number;
}

export interface FieldResult {
  fieldType: string;
  text: string;
  confidence: number;
  method: string;
  bbox: { x: number; y: number; width: number; height: number };
}

/**
 * Optimized Tesseract Engine implementing all guide recommendations
 * 
 * Features:
 * - LSTM-only mode (OEM 1) for best accuracy
 * - Smart PSM routing based on content type
 * - Field-specific processing with whitelists
 * - TSV/hOCR parsing for layout information
 * - Multi-pass processing with ensemble results
 * - Character whitelisting for specific field types
 */
export class OptimizedTesseractEngine {
  private scheduler: any;
  private workers: any[] = [];
  private initialized = false;

  constructor() {
    this.initializeEngine();
  }

  /**
   * Initialize Tesseract 5 LSTM workers with optimal configuration
   */
  private async initializeEngine() {
    try {
      this.scheduler = createScheduler();
      const workerCount = parseInt(process.env.OCR_WORKERS || '4');

      for (let i = 0; i < workerCount; i++) {
        const worker = await createWorker('eng+hin+ben+ori+tel+guj+mar+kan+tam+mal+pan+urd');

        // Optimal Tesseract 5 LSTM configuration
        await worker.setParameters({
          // Core OCR settings
          tessedit_ocr_engine_mode: '1', // LSTM only (guide recommendation)
          preserve_interword_spaces: '1',
          user_defined_dpi: '300',
          
          // Quality settings
          tessjs_create_hocr: '1',
          tessjs_create_tsv: '1',
          tessjs_create_box: '1',
          tessjs_create_unlv: '1',
          tessjs_create_osd: '1',
          
          // Confidence thresholds
          tessjs_minimum_confidence: '60',
          
          // Language model settings
          tessedit_enable_doc_dict: '1',
          tessedit_enable_bigram_correction: '1',
          tessedit_enable_dict_correction: '1',
          
          // Layout analysis
          textord_really_old_xheight: '1',
          textord_heavy_nr: '1'
        });

        this.workers.push(worker);
        this.scheduler.addWorker(worker);
      }

      this.initialized = true;
      console.log(`✅ Optimized Tesseract Engine: Initialized with ${this.workers.length} LSTM workers`);

    } catch (error) {
      console.error('❌ Failed to initialize Tesseract engine:', error);
    }
  }

  /**
   * Process image with optimal PSM based on content analysis
   */
  async processWithOptimalPSM(
    imagePath: string,
    options: {
      language?: string;
      contentType?: 'document' | 'form' | 'table' | 'single-line' | 'word' | 'handwriting';
      whitelist?: string;
      confidence?: number;
    } = {}
  ): Promise<TesseractResult> {
    const startTime = Date.now();
    
    if (!this.initialized) {
      await this.initializeEngine();
    }

    const {
      language = 'eng+hin',
      contentType = 'document',
      whitelist,
      confidence = 80
    } = options;

    // Choose optimal PSM based on content type (guide recommendations)
    const psmMap = {
      'document': '3', // Fully automatic page segmentation
      'form': '6',     // Uniform block of text
      'table': '4',    // Single column of text
      'single-line': '7', // Single text line
      'word': '8',     // Single word
      'handwriting': '11' // Sparse text
    };

    const psm = psmMap[contentType];
    console.log(`🎯 Processing with PSM ${psm} (${contentType}) and language ${language}`);

    try {
      const recognizeOptions: any = {
        lang: language,
        options: {
          tessedit_pageseg_mode: psm,
          tessedit_ocr_engine_mode: '1',
          preserve_interword_spaces: '1',
          tessjs_create_hocr: '1',
          tessjs_create_tsv: '1',
          user_defined_dpi: '300',
          // Enhanced settings for better accuracy
          tessedit_enable_bigram_correction: '1',
          tessedit_enable_dict_correction: '1',
          tessjs_minimum_confidence: '60'
        }
      };

      // Add character whitelist if specified
      if (whitelist) {
        recognizeOptions.options.tessedit_char_whitelist = whitelist;
        console.log(`📝 Using character whitelist: ${whitelist}`);
      }

      const result = await this.scheduler.addJob('recognize', imagePath, recognizeOptions);

      // Parse TSV for detailed token information
      const tokens = this.parseTSV(result.data.tsv || '');

      const processingTime = Date.now() - startTime;

      return {
        text: result.data.text || '',
        confidence: result.data.confidence || 0,
        method: `tesseract5-lstm-psm${psm}`,
        hocr: result.data.hocr || '',
        tsv: result.data.tsv || '',
        processingTime,
        tokens
      };

    } catch (error) {
      console.error('❌ Tesseract processing failed:', error);
      return {
        text: '',
        confidence: 0,
        method: 'failed',
        hocr: '',
        tsv: '',
        processingTime: Date.now() - startTime,
        tokens: []
      };
    }
  }

  /**
   * Process field crops with specific optimizations
   */
  async processFieldCrops(croppedFields: FieldCrop[]): Promise<TesseractResult> {
    console.log(`🗂️ Processing ${croppedFields.length} field crops with specific optimizations`);
    
    const fieldResults: FieldResult[] = [];
    let combinedText = '';
    let totalConfidence = 0;
    let totalTime = 0;

    for (const field of croppedFields) {
      const startTime = Date.now();

      try {
        const result = await this.processWithOptimalPSM(field.path, {
          language: field.recommendedLanguage,
          contentType: this.mapPSMToContentType(field.recommendedPSM),
          whitelist: field.whitelist
        });

        fieldResults.push({
          fieldType: field.fieldType,
          text: result.text.trim(),
          confidence: result.confidence,
          method: result.method,
          bbox: field.bbox
        });

        // Combine results
        combinedText += `${field.fieldType}: ${result.text.trim()}\n`;
        totalConfidence += result.confidence;
        totalTime += Date.now() - startTime;

        console.log(`📄 Field ${field.fieldType}: "${result.text.trim()}" (${result.confidence}%)`);

      } catch (error) {
        console.error(`❌ Failed to process field ${field.fieldType}:`, error);
        fieldResults.push({
          fieldType: field.fieldType,
          text: '',
          confidence: 0,
          method: 'failed',
          bbox: field.bbox
        });
      }
    }

    const avgConfidence = fieldResults.length > 0 ? totalConfidence / fieldResults.length : 0;

    return {
      text: combinedText.trim(),
      confidence: avgConfidence,
      method: 'field-specific-processing',
      hocr: '',
      tsv: '',
      processingTime: totalTime,
      tokens: [],
      fieldResults
    };
  }

  /**
   * Multi-pass ensemble processing (guide recommendation)
   */
  async processEnsemble(imagePath: string, preprocessedPaths: string[]): Promise<TesseractResult> {
    console.log('🔄 Running multi-pass ensemble processing...');
    
    const results: TesseractResult[] = [];

    // Pass 1: Standard preprocessing
    const result1 = await this.processWithOptimalPSM(imagePath, {
      contentType: 'document',
      language: 'eng+hin'
    });
    results.push(result1);

    // Pass 2: Enhanced preprocessing
    for (const processedPath of preprocessedPaths) {
      if (fs.existsSync(processedPath)) {
        const result = await this.processWithOptimalPSM(processedPath, {
          contentType: 'form',
          language: 'eng+hin'
        });
        results.push(result);
      }
    }

    // Pass 3: Blue channel (if available)
    const blueChannelPath = preprocessedPaths.find(p => p.includes('blue_channel'));
    if (blueChannelPath && fs.existsSync(blueChannelPath)) {
      const blueResult = await this.processWithOptimalPSM(blueChannelPath, {
        contentType: 'handwriting',
        language: 'eng+hin'
      });
      results.push(blueResult);
    }

    // Ensemble merging: choose best result based on confidence and text quality
    const bestResult = this.selectBestResult(results);

    console.log(`🏆 Ensemble complete. Best result: ${bestResult.method} (${bestResult.confidence}%)`);
    return bestResult;
  }

  /**
   * Select best result from ensemble based on multiple factors
   */
  private selectBestResult(results: TesseractResult[]): TesseractResult {
    if (results.length === 0) {
      return {
        text: '',
        confidence: 0,
        method: 'no-results',
        hocr: '',
        tsv: '',
        processingTime: 0,
        tokens: []
      };
    }

    // Score each result
    const scoredResults = results.map(result => ({
      result,
      score: this.scoreResult(result)
    }));

    // Sort by score (highest first)
    scoredResults.sort((a, b) => b.score - a.score);

    return scoredResults[0].result;
  }

  /**
   * Score OCR result based on confidence and text quality
   */
  private scoreResult(result: TesseractResult): number {
    let score = result.confidence;

    // Bonus for longer, structured text
    if (result.text.length > 100) score += 5;
    if (result.text.includes('\n')) score += 3;
    if (/[A-Z][a-z]+:/.test(result.text)) score += 5; // Field labels
    if (/\d+/.test(result.text)) score += 3; // Numbers
    if (/village|district|claimant/i.test(result.text)) score += 10; // FRA-specific terms

    // Penalty for short or suspicious text
    if (result.text.length < 20) score -= 15;
    if (result.text.split(' ').length < 3) score -= 10;
    if (result.text.includes('|||')) score -= 5; // OCR artifacts

    return score;
  }

  /**
   * Parse TSV output for detailed token information
   */
  private parseTSV(tsv: string): Token[] {
    const tokens: Token[] = [];
    const lines = tsv.split('\n');

    for (let i = 1; i < lines.length; i++) { // Skip header
      const parts = lines[i].split('\t');
      if (parts.length >= 12 && parts[11].trim()) {
        tokens.push({
          text: parts[11],
          confidence: parseFloat(parts[10]) || 0,
          bbox: {
            x: parseInt(parts[6]) || 0,
            y: parseInt(parts[7]) || 0,
            width: parseInt(parts[8]) || 0,
            height: parseInt(parts[9]) || 0
          },
          lineNumber: parseInt(parts[2]) || 0,
          wordNumber: parseInt(parts[4]) || 0
        });
      }
    }

    return tokens;
  }

  /**
   * Map PSM number to content type
   */
  private mapPSMToContentType(psm: string): 'document' | 'form' | 'table' | 'single-line' | 'word' | 'handwriting' {
    const psmMap: Record<string, any> = {
      '3': 'document',
      '6': 'form',
      '4': 'table',
      '7': 'single-line',
      '8': 'word',
      '11': 'handwriting'
    };
    return psmMap[psm] || 'document';
  }

  /**
   * Process FRA documents with optimized settings
   */
  async processFRADocument(imagePath: string): Promise<TesseractResult> {
    console.log('🏛️ Processing FRA document with optimized settings...');
    
    const startTime = Date.now();
    
    if (!this.initialized) {
      await this.initializeEngine();
    }

    try {
      // Enhanced multi-pass processing for FRA documents
      const results: TesseractResult[] = [];
      
      // Pass 1: High-quality standard OCR with expanded character set
      const standardOptions = {
        lang: 'eng+hin+ben+tel+guj+ori', // Multiple languages for mixed text
        options: {
          tessedit_pageseg_mode: '3', // Fully automatic - better for mixed layouts
          tessedit_ocr_engine_mode: '1', // LSTM only
          preserve_interword_spaces: '1',
          tessjs_create_hocr: '1',
          tessjs_create_tsv: '1',
          user_defined_dpi: '300',
          // Enhanced accuracy settings
          tessedit_enable_bigram_correction: '1',
          tessedit_enable_dict_correction: '1',
          tessjs_minimum_confidence: '60', // Lower threshold for more text
          // Expanded character whitelist for multilingual FRA documents
          tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,:-/()[]{}\u0900-\u097F\u0980-\u09FF\u0A80-\u0AFF\u0C00-\u0C7F',
          // Quality optimization
          textord_really_old_xheight: '1',
          textord_heavy_nr: '1',
          load_system_dawg: '1',
          load_freq_dawg: '1',
          load_unambig_dawg: '1'
        }
      };
      
      const result1 = await this.scheduler.addJob('recognize', imagePath, standardOptions);
      results.push({
        text: result1.data.text || '',
        confidence: result1.data.confidence || 0,
        method: 'fra-standard-multilang',
        hocr: result1.data.hocr || '',
        tsv: result1.data.tsv || '',
        processingTime: 0,
        tokens: this.parseTSV(result1.data.tsv || '')
      });
      
      // Pass 2: Form-specific processing with tighter constraints
      const formOptions = {
        lang: 'eng', // English-focused for printed forms
        options: {
          tessedit_pageseg_mode: '6', // Uniform block of text - better for forms
          tessedit_ocr_engine_mode: '1',
          preserve_interword_spaces: '1',
          tessjs_create_hocr: '1',
          tessjs_create_tsv: '1',
          user_defined_dpi: '300',
          tessedit_enable_bigram_correction: '1',
          tessedit_enable_dict_correction: '1',
          tessjs_minimum_confidence: '70',
          // Focused character set for cleaner results
          tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,:-/()',
          // Form-specific settings
          textord_tabfind_show_vlines: '1',
          textord_use_cjk_fp_model: '0'
        }
      };

      const result2 = await this.scheduler.addJob('recognize', imagePath, formOptions);
      results.push({
        text: result2.data.text || '',
        confidence: result2.data.confidence || 0,
        method: 'fra-form-focused',
        hocr: result2.data.hocr || '',
        tsv: result2.data.tsv || '',
        processingTime: 0,
        tokens: this.parseTSV(result2.data.tsv || '')
      });
      
      // Pass 3: Single-line processing for field extraction
      const lineOptions = {
        lang: 'eng+hin',
        options: {
          tessedit_pageseg_mode: '7', // Single text line
          tessedit_ocr_engine_mode: '1',
          preserve_interword_spaces: '1',
          tessjs_create_hocr: '1',
          tessjs_create_tsv: '1',
          user_defined_dpi: '300',
          tessjs_minimum_confidence: '50', // Lower for individual fields
          tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,:-/()'
        }
      };
      
      const result3 = await this.scheduler.addJob('recognize', imagePath, lineOptions);
      results.push({
        text: result3.data.text || '',
        confidence: result3.data.confidence || 0,
        method: 'fra-line-focused',
        hocr: result3.data.hocr || '',
        tsv: result3.data.tsv || '',
        processingTime: 0,
        tokens: this.parseTSV(result3.data.tsv || '')
      });
      
      // Select the best result using enhanced scoring
      const bestResult = this.selectBestFRAResult(results);
      
      // Enhanced text cleaning and structuring
      const cleanedText = this.enhancedFRATextCleaning(bestResult.text);
      const structuredData = this.extractFRAFields(cleanedText, bestResult.hocr);

      const processingTime = Date.now() - startTime;

      console.log(`📋 FRA document processed in ${processingTime}ms`);
      console.log(`🏆 Best method: ${bestResult.method} (${bestResult.confidence}% confidence)`);
      console.log(`📝 Extracted ${cleanedText.split('\n').length} lines of text`);
      console.log(`🏗️ Structured fields: ${Object.keys(structuredData).length}`);

      return {
        text: cleanedText,
        confidence: bestResult.confidence,
        method: `enhanced-${bestResult.method}`,
        hocr: bestResult.hocr,
        tsv: bestResult.tsv,
        processingTime,
        tokens: bestResult.tokens,
        structuredData
      };

    } catch (error) {
      console.error('❌ FRA document processing failed:', error);
      return {
        text: '',
        confidence: 0,
        method: 'failed',
        hocr: '',
        tsv: '',
        processingTime: Date.now() - startTime,
        tokens: []
      };
    }
  }

  /**
   * Select best result specifically for FRA documents
   */
  private selectBestFRAResult(results: TesseractResult[]): TesseractResult {
    if (results.length === 0) {
      return {
        text: '',
        confidence: 0,
        method: 'no-results',
        hocr: '',
        tsv: '',
        processingTime: 0,
        tokens: []
      };
    }

    // Enhanced scoring for FRA documents
    const scoredResults = results.map(result => ({
      result,
      score: this.scoreFRAResult(result)
    }));

    scoredResults.sort((a, b) => b.score - a.score);
    return scoredResults[0].result;
  }

  /**
   * Score FRA result with domain-specific criteria
   */
  private scoreFRAResult(result: TesseractResult): number {
    let score = result.confidence;

    const text = result.text.toLowerCase();
    
    // High bonus for FRA-specific terms
    if (/forest\s+rights\s+act|वन\s+अधिकार/i.test(text)) score += 20;
    if (/claimant|दावेदार/i.test(text)) score += 15;
    if (/village|गांव|गाँव/i.test(text)) score += 10;
    if (/state|राज्य/i.test(text)) score += 10;
    if (/patta\s+number|पट्टा\s+संख्या/i.test(text)) score += 15;
    if (/name:|नाम:/i.test(text)) score += 8;
    if (/date|दिनांक/i.test(text)) score += 8;
    if (/survey|सर्वेक्षण/i.test(text)) score += 5;
    
    // Structured data bonus
    if (/\d{4}-\d{2}-\d{2}/.test(text)) score += 10; // Date format
    if (/\d+\/\d+/.test(text)) score += 8; // Patta number format
    if (text.includes(':')) score += 5; // Field labels
    
    // Text quality indicators
    const words = text.split(/\s+/).filter(w => w.length > 2);
    if (words.length > 10) score += 5;
    if (words.length > 20) score += 10;
    
    // Penalize poor quality indicators
    if (result.text.length < 30) score -= 15;
    if (/[|\\]{3,}/.test(text)) score -= 10; // OCR artifacts
    if (words.length < 5) score -= 20;
    
    return score;
  }

  /**
   * Enhanced text cleaning for FRA documents
   */
  private enhancedFRATextCleaning(rawText: string): string {
    let cleaned = rawText
      // Normalize whitespace first
      .replace(/\s+/g, ' ')
      .replace(/\n\s+/g, '\n')
      .replace(/\s+\n/g, '\n')
      
      // Fix common OCR errors in FRA documents
      .replace(/FOREST\s+RIGHTS\s+ACT/gi, 'FOREST RIGHTS ACT')
      .replace(/वन\s+अधिकार\s+अधिनियम/gi, 'वन अधिकार अधिनियम')
      .replace(/CLAIMANT\s*:/gi, 'CLAIMANT:')
      .replace(/दावेदार\s*:/gi, 'दावेदार:')
      .replace(/Name\s*:/gi, 'Name:')
      .replace(/नाम\s*:/gi, 'नाम:')
      .replace(/Village\s*:/gi, 'Village:')
      .replace(/गांव\s*:|गाँव\s*:/gi, 'गांव:')
      .replace(/State\s*:/gi, 'State:')
      .replace(/राज्य\s*:/gi, 'राज्य:')
      .replace(/Patta\s+Number\s*:/gi, 'Patta Number:')
      .replace(/पट्टा\s+संख्या\s*:/gi, 'पट्टा संख्या:')
      .replace(/Rights\s+Claimed\s*:/gi, 'Rights Claimed:')
      .replace(/दावा\s+किए\s+गए\s+अधिकार\s*:/gi, 'दावा किए गए अधिकार:')
      .replace(/Date\s*:/gi, 'Date:')
      .replace(/दिनांक\s*:/gi, 'दिनांक:')
      .replace(/Survey\s+Number\s*:/gi, 'Survey Number:')
      .replace(/सर्वेक्षण\s+संख्या\s*:/gi, 'सर्वेक्षण संख्या:')
      
      // Fix date formats
      .replace(/(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/g, '$3-$2-$1')
      .replace(/(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/g, '$1-$2-$3')
      
      // Clean up noise and artifacts
      .replace(/[|\\]{2,}/g, ' ')
      .replace(/[_]{3,}/g, ' ')
      .replace(/[.]{3,}/g, '...')
      .replace(/[-]{3,}/g, '-')
      
      // Remove standalone punctuation lines
      .replace(/^[\s\-_.]+$/gm, '')
      
      // Normalize line breaks and spacing
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .replace(/^\s+|\s+$/gm, '')
      .trim();
    
    return cleaned;
  }

  /**
   * Extract structured fields from FRA documents
   */
  private extractFRAFields(text: string, hocr: string): any {
    const fields: any = {};
    const lines = text.split('\n');
    
    for (const line of lines) {
      const normalizedLine = line.trim();
      
      // Extract common FRA fields
      if (/name\s*:|नाम\s*:/i.test(normalizedLine)) {
        const match = normalizedLine.match(/(?:name|नाम)\s*:\s*(.+)/i);
        if (match) fields.claimantName = match[1].trim();
      }
      
      if (/village\s*:|गांव\s*:|गाँव\s*:/i.test(normalizedLine)) {
        const match = normalizedLine.match(/(?:village|गांव|गाँव)\s*:\s*(.+)/i);
        if (match) fields.village = match[1].trim();
      }
      
      if (/state\s*:|राज्य\s*:/i.test(normalizedLine)) {
        const match = normalizedLine.match(/(?:state|राज्य)\s*:\s*(.+)/i);
        if (match) fields.state = match[1].trim();
      }
      
      if (/patta\s+number\s*:|पट्टा\s+संख्या\s*:/i.test(normalizedLine)) {
        const match = normalizedLine.match(/(?:patta\s+number|पट्टा\s+संख्या)\s*:\s*(.+)/i);
        if (match) fields.pattaNumber = match[1].trim();
      }
      
      if (/date\s*:|दिनांक\s*:/i.test(normalizedLine)) {
        const match = normalizedLine.match(/(?:date|दिनांक)\s*:\s*(.+)/i);
        if (match) fields.date = match[1].trim();
      }
      
      if (/rights\s+claimed\s*:|दावा\s+किए\s+गए\s+अधिकार\s*:/i.test(normalizedLine)) {
        const match = normalizedLine.match(/(?:rights\s+claimed|दावा\s+किए\s+गए\s+अधिकार)\s*:\s*(.+)/i);
        if (match) fields.rightsClaimed = match[1].trim();
      }
    }
    
    // Extract any dates found in the text
    const dateMatches = text.match(/\d{4}-\d{2}-\d{2}/g);
    if (dateMatches && !fields.date) {
      fields.date = dateMatches[0];
    }
    
    // Extract any reference numbers
    const refMatches = text.match(/\d+\/\d+[-\/]\d+/g);
    if (refMatches && !fields.pattaNumber) {
      fields.pattaNumber = refMatches[0];
    }
    
    return fields;
  }

  /**
   * Clean and structure FRA document text (legacy method for compatibility)
   */
  private cleanFRAText(rawText: string): string {
    return this.enhancedFRATextCleaning(rawText);
  }

  /**
   * Cleanup resources
   */
  async destroy(): Promise<void> {
    try {
      if (this.scheduler) {
        await this.scheduler.terminate();
      }
      
      for (const worker of this.workers) {
        await worker.terminate();
      }
      
      this.workers = [];
      this.initialized = false;
      console.log('🧹 Tesseract engine cleaned up');
      
    } catch (error) {
      console.error('Error destroying Tesseract engine:', error);
    }
  }
}

export const optimizedTesseractEngine = new OptimizedTesseractEngine();