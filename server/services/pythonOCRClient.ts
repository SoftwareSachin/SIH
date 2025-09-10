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
    this.scriptPath = path.join(process.cwd(), 'server', 'fra_ocr_enhanced.py');
    this.timeout = 120000; // 2 minutes timeout for complex FRA documents
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Check if Python script exists
      if (!fs.existsSync(this.scriptPath)) {
        console.error('❌ Python OCR script not found:', this.scriptPath);
        return false;
      }

      // Test Enhanced FRA OCR functionality (works with or without OpenCV)
      const result = await this.runPythonScript(['-c', 'import pytesseract; import PIL; print("Enhanced-FRA-OCR-Ready")']);
      
      if (result.success && result.stdout.includes('Enhanced-FRA-OCR-Ready')) {
        console.log('✅ Enhanced FRA OCR engine is ready (with graceful OpenCV fallback)');
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

      console.log(`🔄 Processing FRA document with specialized engine: ${path.basename(filePath)}`);

      // Run FRA OCR engine
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
      if (ocrResult.type === 'fra_batch') {
        console.log(`✅ FRA OCR completed: ${ocrResult.total_pages} pages, quality score: ${ocrResult.average_quality_score}%`);
        return {
          results: ocrResult.results,
          total_pages: ocrResult.total_pages,
          total_processing_time: ocrResult.total_processing_time,
          average_confidence: ocrResult.average_quality_score
        };
      } else if (ocrResult.type === 'fra_single') {
        // FIX: Ensure quality_score is properly used as confidence
        const qualityScore = ocrResult.quality_score || ocrResult.confidence || 0;
        console.log(`✅ FRA OCR completed: ${qualityScore}% quality, ${ocrResult.method}`);
        return {
          text: ocrResult.text,
          confidence: Math.round(qualityScore), // Ensure it's a proper number
          language: ocrResult.language,
          processing_time: ocrResult.processing_time,
          method: ocrResult.method,
          page_count: 1,
          metadata: ocrResult.metadata || {}
        };
      } else {
        // Fallback for legacy format
        console.log(`✅ OCR completed: ${ocrResult.confidence}% confidence, ${ocrResult.method}`);
        return {
          text: ocrResult.text,
          confidence: ocrResult.confidence,
          language: ocrResult.language,
          processing_time: ocrResult.processing_time,
          method: ocrResult.method,
          page_count: ocrResult.page_count || 1,
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

  // Convert FRA OCR result to application format
  convertToProcessedDocument(ocrResult: any, metadata: any = {}): any {
    if (ocrResult.type === 'fra_batch') {
      // Multi-page FRA document
      const combinedText = ocrResult.results.map((r: any) => r.text).join('\n\n');
      
      // Extract all FRA entities from aggregated results
      const fraEntities = this._convertFRAEntities(ocrResult.aggregated_entities || {});
      
      return {
        text: combinedText,
        confidence: ocrResult.average_quality_score,
        language: ocrResult.results[0]?.language || 'multi',
        entities: fraEntities,
        claimRecords: this._extractClaimRecords(ocrResult.results),
        metadata: {
          processingTime: ocrResult.total_processing_time,
          imageQuality: this._determineFRAQuality(ocrResult.average_quality_score),
          ocrMethod: 'FRA-Specialized-Multi-Strategy',
          preprocessingApplied: ['fra-government-form', 'multi-language', 'table-extraction'],
          pageCount: ocrResult.total_pages,
          documentClassification: ocrResult.document_classification,
          fraEntitiesFound: Object.keys(fraEntities).length,
          pages: ocrResult.results.map((r: any) => ({
            text: r.text,
            confidence: r.quality_score,
            entities: r.entities,
            tables: r.tables,
            strategy: r.strategy_used
          })),
          ...metadata
        }
      };
    } else if (ocrResult.type === 'fra_single') {
      // Single FRA document
      const fraEntities = this._convertFRAEntities(ocrResult.entities || {});
      
      return {
        text: ocrResult.text,
        confidence: ocrResult.quality_score,
        language: ocrResult.language,
        entities: fraEntities,
        claimRecords: this._extractClaimRecords([ocrResult]),
        metadata: {
          processingTime: ocrResult.processing_time,
          imageQuality: this._determineFRAQuality(ocrResult.quality_score),
          ocrMethod: ocrResult.method,
          preprocessingApplied: ['fra-government-form', 'multi-language', 'entity-extraction'],
          pageCount: 1,
          documentClassification: ocrResult.document_classification,
          fraEntitiesFound: Object.keys(fraEntities).length,
          imageSize: ocrResult.metadata?.image_size,
          strategyUsed: ocrResult.metadata?.strategy_used,
          tablesFound: ocrResult.tables?.length || 0,
          ...metadata
        }
      };
    } else {
      // Legacy fallback
      return {
        text: ocrResult.text || '',
        confidence: ocrResult.confidence || 0,
        language: ocrResult.language || 'eng',
        entities: {},
        claimRecords: [],
        metadata: {
          processingTime: ocrResult.processing_time || 0,
          imageQuality: 'unknown',
          ocrMethod: 'Legacy-Fallback',
          preprocessingApplied: ['basic'],
          pageCount: 1,
          error: ocrResult.error,
          ...metadata
        }
      };
    }
  }

  private _convertFRAEntities(fraEntities: any): any {
    return {
      claimantNames: fraEntities.patta_holders || [],
      villageNames: fraEntities.village_names || [],
      surveyNumbers: fraEntities.survey_numbers || [],
      coordinates: fraEntities.coordinates || [],
      forestAreas: fraEntities.forest_areas || [],
      claimNumbers: fraEntities.claim_numbers || [],
      verificationDates: fraEntities.verification_dates || [],
      boundaries: fraEntities.boundaries || []
    };
  }

  private _extractClaimRecords(results: any[]): any[] {
    const claimRecords: any[] = [];
    
    results.forEach((result, index) => {
      // Extract from tables if available
      if (result.tables && result.tables.length > 0) {
        result.tables.forEach((table: any, tableIndex: number) => {
          if (table.text && table.text.trim()) {
            claimRecords.push({
              type: 'table_data',
              content: table.text.trim(),
              confidence: table.confidence || 80,
              source: `page_${index + 1}_table_${tableIndex + 1}`,
              position: table.position
            });
          }
        });
      }
      
      // Extract from entities
      if (result.entities) {
        Object.entries(result.entities).forEach(([entityType, values]: [string, any]) => {
          if (Array.isArray(values) && values.length > 0) {
            values.forEach((value: any) => {
              claimRecords.push({
                type: 'fra_entity',
                entityType: entityType,
                content: value,
                confidence: 85,
                source: `page_${index + 1}_entity_extraction`
              });
            });
          }
        });
      }
    });
    
    return claimRecords.slice(0, 50); // Limit to 50 records
  }

  private _determineFRAQuality(qualityScore: number): string {
    if (qualityScore >= 85) return 'excellent';
    if (qualityScore >= 70) return 'high';
    if (qualityScore >= 55) return 'medium';
    if (qualityScore >= 40) return 'low';
    return 'very-low';
  }

  private _determineQuality(confidence: number): string {
    if (confidence >= 80) return 'high';
    if (confidence >= 60) return 'medium';
    if (confidence >= 40) return 'low';
    return 'very-low';
  }
}