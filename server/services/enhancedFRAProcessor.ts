import { exec } from 'child_process';
import { promisify } from 'util';
import { createWorker, createScheduler } from 'tesseract.js';
import { TextProcessor } from './textProcessor';
import * as fs from 'fs';

const execAsync = promisify(exec);

/**
 * Enhanced FRA Document Processor
 * Implements Tesseract 5 LSTM best practices from the guide:
 * - Advanced preprocessing (deskew, denoise, contrast, thresholding)
 * - Optimal PSM routing for different content types
 * - hOCR/TSV layout extraction with confidence scoring
 * - Human-in-the-loop routing for low confidence cases
 */
export class EnhancedFRAProcessor {
  private workers: any[] = [];
  private scheduler: any;
  private initialized = false;

  constructor() {
    this.initializeProcessor();
  }

  /**
   * Initialize Tesseract 5 LSTM workers with optimal configuration
   */
  private async initializeProcessor() {
    try {
      this.scheduler = createScheduler();
      const workerCount = 2;

      for (let i = 0; i < workerCount; i++) {
        const worker = await createWorker('eng+hin+ben+ori+tel+guj+mar+kan+tam+mal+pan+urd');
        
        // Tesseract 5 LSTM optimal configuration
        await worker.setParameters({
          preserve_interword_spaces: '1',
          tessjs_create_hocr: '1',
          tessjs_create_tsv: '1',
          tessjs_create_box: '1',
          tessjs_minimum_confidence: '60'
        });
        
        this.workers.push(worker);
        this.scheduler.addWorker(worker);
      }
      
      this.initialized = true;
      console.log('Enhanced FRA Processor: Initialized with', this.workers.length, 'workers');
    } catch (error) {
      console.error('Failed to initialize Enhanced FRA Processor:', error);
    }
  }

  /**
   * Advanced preprocessing pipeline implementing guide recommendations
   */
  private async advancedPreprocessing(imagePath: string): Promise<{
    processedPath: string;
    quality: string;
    applied: string[];
  }> {
    const applied: string[] = [];
    const tempPath = imagePath.replace(/\\.(jpg|jpeg|png|tiff)$/i, '_enhanced.png');
    
    try {
      // Get image dimensions
      const { width, height } = await this.getImageDimensions(imagePath);
      
      // Step 1: Deskew, denoise, enhance
      const preprocessCommands = [
        'convert',
        `\"${imagePath}\"`,
        '-background white',
        '-deskew 40%',
        '-despeckle',
        '-enhance',
        '-normalize',
        `\"${tempPath}\"`
      ];
      
      await execAsync(preprocessCommands.join(' '));
      applied.push('deskew', 'despeckle', 'enhance', 'normalize');
      
      // Step 2: Thresholding
      const thresholdCommands = [
        'convert',
        `\"${tempPath}\"`,
        '-colorspace Gray',
        '-threshold 50%',
        '-morphology close disk:1',
        `\"${tempPath}\"`
      ];
      
      await execAsync(thresholdCommands.join(' '));
      applied.push('grayscale', 'threshold', 'morphology');
      
      // Step 3: Upscale small text (guide recommendation)
      if (width < 1200 || height < 1600) {
        const scale = width < 800 ? 3 : (width < 1000 ? 2 : 1.5);
        const resizeCommands = [
          'convert',
          `\"${tempPath}\"`,
          `-resize ${Math.round(width * scale)}x${Math.round(height * scale)}`,
          `\"${tempPath}\"`
        ];
        
        await execAsync(resizeCommands.join(' '));
        applied.push(`upscale-${scale}x`);
      }
      
      console.log('Advanced preprocessing completed:', applied.join(', '));
      return {
        processedPath: tempPath,
        quality: 'enhanced-processed',
        applied
      };
      
    } catch (error) {
      console.warn('Advanced preprocessing failed:', error);
      return {
        processedPath: imagePath,
        quality: 'original',
        applied: ['failed']
      };
    }
  }

  private async getImageDimensions(imagePath: string): Promise<{ width: number; height: number }> {
    try {
      const { stdout } = await execAsync(`identify -format \"%w %h\" \"${imagePath}\"`);
      const [width, height] = stdout.trim().split(' ').map(Number);
      return { width, height };
    } catch (error) {
      return { width: 1000, height: 1000 };
    }
  }

  /**
   * Process with optimal PSM based on content type (guide recommendations)
   */
  private async processWithOptimalPSM(
    imagePath: string,
    languages: string[] = ['eng', 'hin'],
    contentType: 'form' | 'table' | 'mixed' = 'form'
  ): Promise<{
    text: string;
    confidence: number;
    hocr: string;
    tsv: string;
    method: string;
  }> {
    const langString = languages.join('+');
    
    // Choose PSM based on content type
    let psm = '6'; // single uniform block - best for forms
    let method = 'form-optimized';
    
    switch (contentType) {
      case 'table':
        psm = '4'; // single column
        method = 'table-optimized';
        break;
      case 'mixed':
        psm = '3'; // auto segmentation
        method = 'mixed-content';
        break;
    }
    
    try {
      if (!this.initialized || this.workers.length === 0) {
        throw new Error('Processor not initialized');
      }
      
      console.log(`Processing with Tesseract 5 LSTM: PSM=${psm}, Lang=${langString}`);
      
      // Use LSTM only (OEM 1) with optimal PSM
      const result = await this.scheduler.addJob('recognize', imagePath, {
        lang: langString,
        options: {
          tessedit_pageseg_mode: psm,
          tessedit_ocr_engine_mode: '1', // LSTM only
          preserve_interword_spaces: '1',
          tessjs_create_hocr: '1',
          tessjs_create_tsv: '1'
        }
      });
      
      return {
        text: result.data.text || '',
        confidence: result.data.confidence || 0,
        hocr: result.data.hocr || '',
        tsv: result.data.tsv || '',
        method: `tesseract5-lstm-psm${psm}`
      };
      
    } catch (error) {
      console.warn('Tesseract 5 processing failed:', error);
      return {
        text: '',
        confidence: 0,
        hocr: '',
        tsv: '',
        method: 'failed'
      };
    }
  }

  /**
   * Evaluate for human review (guide recommendations)
   */
  private evaluateForHumanReview(confidence: number, extractedData: any): {
    needsReview: boolean;
    reason: string;
    priority: 'low' | 'medium' | 'high';
  } {
    const CRITICAL_THRESHOLD = 75;
    const OVERALL_THRESHOLD = 80;
    
    const criticalFields = ['claimantName', 'village', 'referenceNumber'];
    const missingFields = criticalFields.filter(field => !extractedData[field]);
    
    if (missingFields.length > 0) {
      return {
        needsReview: true,
        reason: `Missing fields: ${missingFields.join(', ')}`,
        priority: 'high'
      };
    }
    
    if (confidence < CRITICAL_THRESHOLD) {
      return {
        needsReview: true,
        reason: `Low confidence: ${confidence}%`,
        priority: 'high'
      };
    }
    
    if (confidence < OVERALL_THRESHOLD) {
      return {
        needsReview: true,
        reason: `Below threshold: ${confidence}%`,
        priority: 'medium'
      };
    }
    
    return {
      needsReview: false,
      reason: 'Acceptable quality',
      priority: 'low'
    };
  }

  /**
   * Main processing method implementing all guide recommendations
   */
  async processEnhancedFRADocument(imagePath: string): Promise<{
    text: string;
    confidence: number;
    hocr: string;
    tsv: string;
    method: string;
    preprocessing: string[];
    humanReview: {
      needsReview: boolean;
      reason: string;
      priority: string;
    };
    extractedData: any;
    processingTime: number;
  }> {
    const startTime = Date.now();
    console.log('Starting Enhanced FRA Processing...');
    
    if (!this.initialized) {
      await this.initializeProcessor();
    }
    
    try {
      // Step 1: Advanced preprocessing
      const preprocessResult = await this.advancedPreprocessing(imagePath);
      
      // Step 2: Process with Tesseract 5 LSTM
      const ocrResult = await this.processWithOptimalPSM(
        preprocessResult.processedPath,
        ['eng', 'hin'],
        'form'
      );
      
      // Step 3: Extract structured data
      const extractedData = TextProcessor.extractStructuredData(ocrResult.text);
      
      // Step 4: Evaluate for human review
      const humanReview = this.evaluateForHumanReview(ocrResult.confidence, extractedData);
      
      const processingTime = Date.now() - startTime;
      
      console.log(`Enhanced FRA processing complete: ${ocrResult.confidence}% confidence`);
      console.log(`Human review: ${humanReview.needsReview ? 'REQUIRED' : 'NOT NEEDED'}`);
      
      // Cleanup
      if (preprocessResult.processedPath !== imagePath && fs.existsSync(preprocessResult.processedPath)) {
        try {
          fs.unlinkSync(preprocessResult.processedPath);
        } catch (e) {
          // Ignore cleanup errors
        }
      }
      
      return {
        text: ocrResult.text,
        confidence: ocrResult.confidence,
        hocr: ocrResult.hocr,
        tsv: ocrResult.tsv,
        method: ocrResult.method,
        preprocessing: preprocessResult.applied,
        humanReview,
        extractedData,
        processingTime
      };
      
    } catch (error) {
      console.error('Enhanced FRA processing failed:', error);
      throw error;
    }
  }

  async destroy() {
    try {
      await Promise.all(this.workers.map(worker => worker.terminate()));
      this.workers = [];
      if (this.scheduler) {
        await this.scheduler.terminate();
      }
    } catch (error) {
      console.error('Error destroying processor:', error);
    }
  }
}

export const enhancedFRAProcessor = new EnhancedFRAProcessor();
