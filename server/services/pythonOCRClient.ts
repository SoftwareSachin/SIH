import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

interface OCRResult {
  text: string;
  confidence: number;
  language: string;
  processing_time: number;
  method: string;
  page_count: number;
  metadata: {
    [key: string]: any;
  };
}

interface BatchOCRResult {
  results: OCRResult[];
  total_pages: number;
  total_processing_time: number;
  average_confidence: number;
}

export class PythonOCRClient {
  private pythonPath: string;
  private scriptPath: string;
  private timeout: number;

  constructor() {
    this.pythonPath = 'python3';
    this.scriptPath = path.join(process.cwd(), 'server', 'python_ocr.py');
    this.timeout = 60000; // 60 seconds timeout
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Check if Python script exists
      if (!fs.existsSync(this.scriptPath)) {
        console.error('❌ Python OCR script not found:', this.scriptPath);
        return false;
      }

      // Test basic Python functionality
      const result = await this.runPythonScript(['-c', 'import pytesseract; import cv2; import PIL; print("OK")']);
      
      if (result.success && result.stdout.includes('OK')) {
        console.log('✅ Python OCR libraries are working');
        return true;
      }
      
      console.error('❌ Python OCR libraries test failed:', result.stderr);
      return false;
    } catch (error) {
      console.error('❌ Python OCR health check failed:', error);
      return false;
    }
  }

  async processDocument(
    filePath: string, 
    options: {
      autoLanguage?: boolean;
      contentType?: string;
    } = {}
  ): Promise<OCRResult | BatchOCRResult> {
    try {
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      console.log(`🔄 Processing document with Python OCR: ${path.basename(filePath)}`);

      // Run Python OCR script
      const result = await this.runPythonScript([this.scriptPath, filePath]);

      if (!result.success) {
        throw new Error(`Python OCR failed: ${result.stderr}`);
      }

      // Parse JSON result
      const ocrResult = JSON.parse(result.stdout);

      if (ocrResult.type === 'error') {
        throw new Error(`OCR error: ${ocrResult.error}`);
      }

      // Log result summary
      if (ocrResult.type === 'batch') {
        console.log(`✅ OCR completed: ${ocrResult.total_pages} pages, avg confidence: ${ocrResult.average_confidence}%`);
        return {
          results: ocrResult.results,
          total_pages: ocrResult.total_pages,
          total_processing_time: ocrResult.total_processing_time,
          average_confidence: ocrResult.average_confidence
        };
      } else {
        console.log(`✅ OCR completed: ${ocrResult.confidence}% confidence, ${ocrResult.method}`);
        return {
          text: ocrResult.text,
          confidence: ocrResult.confidence,
          language: ocrResult.language,
          processing_time: ocrResult.processing_time,
          method: ocrResult.method,
          page_count: ocrResult.page_count,
          metadata: ocrResult.metadata || {}
        };
      }

    } catch (error: any) {
      console.error('❌ Python OCR processing failed:', error);
      throw new Error(`OCR processing failed: ${error?.message || 'Unknown error'}`);
    }
  }

  private async runPythonScript(args: string[]): Promise<{success: boolean, stdout: string, stderr: string}> {
    return new Promise((resolve) => {
      const process = spawn(this.pythonPath, args);
      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        resolve({
          success: code === 0,
          stdout: stdout.trim(),
          stderr: stderr.trim()
        });
      });

      // Timeout handling
      setTimeout(() => {
        process.kill();
        resolve({
          success: false,
          stdout: '',
          stderr: 'Process timeout'
        });
      }, this.timeout);
    });
  }

  async getSupportedLanguages(): Promise<{ [key: string]: string }> {
    return {
      'eng': 'English',
      'hin': 'Hindi', 
      'ben': 'Bengali',
      'ori': 'Odia',
      'tel': 'Telugu',
      'tam': 'Tamil',
      'guj': 'Gujarati',
      'mar': 'Marathi',
      'kan': 'Kannada',
      'mal': 'Malayalam',
      'pan': 'Punjabi',
      'urd': 'Urdu'
    };
  }

  async getSupportedFormats(): Promise<string[]> {
    return ['.pdf', '.png', '.jpg', '.jpeg', '.tiff', '.bmp', '.webp'];
  }

  // Convert OCR result to application format
  convertToProcessedDocument(ocrResult: OCRResult | BatchOCRResult, metadata: any = {}): any {
    if ('results' in ocrResult) {
      // Batch result (PDF)
      const combinedText = ocrResult.results.map(r => r.text).join('\n\n');
      return {
        text: combinedText,
        confidence: ocrResult.average_confidence,
        language: ocrResult.results[0]?.language || 'eng',
        entities: [], // Will be processed by NER separately
        claimRecords: [],
        metadata: {
          processingTime: ocrResult.total_processing_time,
          imageQuality: this._determineQuality(ocrResult.average_confidence),
          ocrMethod: 'Python-Tesseract-Multi-Engine',
          preprocessingApplied: ['advanced-preprocessing', 'multi-psm', 'language-detection'],
          pageCount: ocrResult.total_pages,
          pages: ocrResult.results.map(r => ({
            text: r.text,
            confidence: r.confidence,
            metadata: r.metadata
          })),
          ...metadata
        }
      };
    } else {
      // Single result
      return {
        text: ocrResult.text,
        confidence: ocrResult.confidence,
        language: ocrResult.language,
        entities: [], // Will be processed by NER separately
        claimRecords: [],
        metadata: {
          processingTime: ocrResult.processing_time,
          imageQuality: this._determineQuality(ocrResult.confidence),
          ocrMethod: ocrResult.method,
          preprocessingApplied: ['advanced-preprocessing', 'multi-psm', 'language-detection'],
          pageCount: ocrResult.page_count,
          imageSize: ocrResult.metadata.image_size,
          wordCount: ocrResult.metadata.word_count,
          characterCount: ocrResult.metadata.character_count,
          ...metadata
        }
      };
    }
  }

  private _determineQuality(confidence: number): string {
    if (confidence >= 80) return 'high';
    if (confidence >= 60) return 'medium';
    if (confidence >= 40) return 'low';
    return 'very-low';
  }
}