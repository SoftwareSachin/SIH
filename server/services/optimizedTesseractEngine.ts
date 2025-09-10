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
          user_defined_dpi: '300'
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