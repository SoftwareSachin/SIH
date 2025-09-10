import FormData from 'form-data';
import fetch from 'node-fetch';
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
  private baseUrl: string;
  private timeout: number;

  constructor() {
    this.baseUrl = `http://localhost:${process.env.OCR_PORT || 8001}`;
    this.timeout = 60000; // 60 seconds timeout
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        timeout: 5000
      });
      
      if (response.ok) {
        const health = await response.json();
        console.log('✅ Python OCR Service is healthy:', health.status);
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Python OCR Service health check failed:', error);
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

      // Create form data
      const formData = new FormData();
      formData.append('file', fs.createReadStream(filePath));
      formData.append('auto_language', String(options.autoLanguage ?? true));
      formData.append('content_type', options.contentType ?? 'document');

      // Make request to Python OCR service
      const response = await fetch(`${this.baseUrl}/ocr/process`, {
        method: 'POST',
        body: formData,
        timeout: this.timeout,
        headers: formData.getHeaders()
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OCR service error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      
      // Log result summary
      if ('results' in result) {
        // Batch result (PDF)
        console.log(`✅ OCR completed: ${result.total_pages} pages, avg confidence: ${result.average_confidence}%`);
      } else {
        // Single result
        console.log(`✅ OCR completed: ${result.confidence}% confidence, ${result.method}`);
      }

      return result;

    } catch (error: any) {
      console.error('❌ Python OCR processing failed:', error);
      throw new Error(`OCR processing failed: ${error?.message || 'Unknown error'}`);
    }
  }

  async getSupportedLanguages(): Promise<{ [key: string]: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/ocr/languages`);
      if (response.ok) {
        const data = await response.json();
        return data.languages;
      }
      return {};
    } catch (error) {
      console.error('Failed to get supported languages:', error);
      return {};
    }
  }

  async getSupportedFormats(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/ocr/formats`);
      if (response.ok) {
        const data = await response.json();
        return data.formats;
      }
      return [];
    } catch (error) {
      console.error('Failed to get supported formats:', error);
      return [];
    }
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