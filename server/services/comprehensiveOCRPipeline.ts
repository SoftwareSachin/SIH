import { advancedOCRPreprocessor, PreprocessingResult } from './advancedOCRPreprocessor';
import { optimizedTesseractEngine } from './optimizedTesseractEngine';
import { comprehensivePostProcessor, ProcessingResult } from './comprehensivePostProcessor';
import { evaluationMetrics } from './evaluationMetrics';
import { trainingDataManager } from './trainingDataManager';
import { nanoid } from 'nanoid';
import * as fs from 'fs';

export interface ComprehensiveOCRResult {
  id: string;
  text: string;
  extractedFields: any;
  confidence: number;
  qualityScore: number;
  needsHumanReview: boolean;
  reviewReason: string;
  processingTime: number;
  method: string;
  preprocessing: {
    applied: string[];
    quality: string;
    scriptType: string;
    documentType: string;
    handwritingDetected: boolean;
  };
  ocrResults: {
    mainResult: any;
    fieldResults?: any[];
    ensembleResults?: any[];
  };
  postProcessing: {
    corrections: string[];
    enhancedText: string;
    processingMethod: string[];
  };
  evaluation?: {
    cer?: number;
    wer?: number;
    fieldAccuracy?: number;
    evaluationId?: string;
  };
  metadata: {
    imagePath: string;
    originalSize: { width: number; height: number };
    processedPaths: string[];
    timestamp: Date;
  };
}

export interface PipelineOptions {
  // Preprocessing options
  extractBlueChannel?: boolean;
  cropFields?: boolean;
  documentType?: string;
  
  // OCR options
  useEnsemble?: boolean;
  useFieldSpecificOCR?: boolean;
  ocrMethod?: 'tesseract' | 'hybrid' | 'field-specific';
  
  // Post-processing options
  useGazetteerValidation?: boolean;
  useLanguageModelCorrection?: boolean;
  
  // Evaluation options
  evaluateWithGroundTruth?: boolean;
  groundTruth?: {
    text: string;
    extractedFields: any;
  };
  
  // Training options
  saveForTraining?: boolean;
  collectCorrections?: boolean;
  
  // Quality thresholds
  confidenceThreshold?: number;
  qualityThreshold?: number;
}

/**
 * Comprehensive OCR Pipeline integrating all guide recommendations
 * 
 * This is the main orchestrator that combines:
 * - Advanced preprocessing with deskewing, denoising, and field cropping
 * - Optimized Tesseract configuration with LSTM and PSM routing
 * - Field-specific OCR processing with template detection
 * - Comprehensive post-processing with gazetteer and corrections
 * - Evaluation metrics and quality assessment
 * - Training data collection and model improvement
 * - Human-in-the-loop workflows
 */
export class ComprehensiveOCRPipeline {
  
  constructor() {
    console.log('🚀 Comprehensive OCR Pipeline initialized with all guide improvements');
  }

  /**
   * Process document with comprehensive pipeline
   */
  async processDocument(
    imagePath: string,
    options: PipelineOptions = {}
  ): Promise<ComprehensiveOCRResult> {
    const processingId = nanoid();
    const startTime = Date.now();
    
    console.log(`📄 Starting comprehensive OCR processing: ${processingId}`);
    console.log(`🔧 Options: ${JSON.stringify(options)}`);

    const {
      extractBlueChannel = true,
      cropFields = true,
      documentType = 'fra-document',
      useEnsemble = false,
      useFieldSpecificOCR = true,
      ocrMethod = 'hybrid',
      useGazetteerValidation = true,
      useLanguageModelCorrection = true,
      evaluateWithGroundTruth = false,
      groundTruth,
      saveForTraining = false,
      collectCorrections = false,
      confidenceThreshold = 80,
      qualityThreshold = 70
    } = options;

    try {
      // Step 1: Advanced Preprocessing
      console.log('🔧 Step 1: Advanced preprocessing...');
      const preprocessingResult = await advancedOCRPreprocessor.process(imagePath, {
        extractBlueChannel,
        cropFields,
        documentType
      });

      // Step 2: OCR Processing
      console.log('👁️ Step 2: OCR processing...');
      const ocrResults = await this.performOCRProcessing(
        preprocessingResult,
        ocrMethod,
        useEnsemble,
        useFieldSpecificOCR
      );

      // Step 3: Post-processing
      console.log('🔄 Step 3: Post-processing...');
      const postProcessingResult = await comprehensivePostProcessor.process(
        ocrResults.mainResult.text,
        ocrResults.mainResult.confidence,
        ocrResults.mainResult.tokens || [],
        ocrResults.mainResult.hocr || '',
        ocrResults.mainResult.tsv || ''
      );

      // Step 4: Quality Assessment
      console.log('📊 Step 4: Quality assessment...');
      const finalConfidence = postProcessingResult.confidence;
      const qualityScore = postProcessingResult.qualityScore;
      const needsHumanReview = postProcessingResult.needsHumanReview;

      // Step 5: Evaluation (if ground truth provided)
      let evaluation: any = {};
      if (evaluateWithGroundTruth && groundTruth) {
        console.log('🎯 Step 5: Evaluation with ground truth...');
        const evalResult = evaluationMetrics.evaluateOCRResult(
          postProcessingResult.enhancedText,
          postProcessingResult.extractedFields,
          {
            text: groundTruth.text,
            extractedFields: groundTruth.extractedFields,
            confidence: 100,
            humanVerified: true
          },
          ocrResults.mainResult.method,
          documentType,
          Date.now() - startTime,
          finalConfidence,
          needsHumanReview
        );
        
        evaluation = {
          cer: evalResult.metrics.characterErrorRate,
          wer: evalResult.metrics.wordErrorRate,
          fieldAccuracy: evalResult.fieldMetrics.extractionAccuracy,
          evaluationId: evalResult.id
        };
      }

      // Step 6: Training Data Collection (if enabled)
      if (saveForTraining || (needsHumanReview && collectCorrections)) {
        console.log('📚 Step 6: Saving for training data...');
        await this.handleTrainingDataCollection(
          imagePath,
          ocrResults.mainResult.text,
          postProcessingResult.enhancedText,
          documentType,
          needsHumanReview
        );
      }

      // Step 7: Cleanup temporary files
      await this.cleanup(preprocessingResult.processedPath, preprocessingResult.croppedFields);

      const processingTime = Date.now() - startTime;

      const result: ComprehensiveOCRResult = {
        id: processingId,
        text: postProcessingResult.enhancedText,
        extractedFields: postProcessingResult.extractedFields,
        confidence: finalConfidence,
        qualityScore,
        needsHumanReview,
        reviewReason: postProcessingResult.reviewReason,
        processingTime,
        method: 'comprehensive-pipeline',
        preprocessing: {
          applied: preprocessingResult.applied,
          quality: preprocessingResult.quality,
          scriptType: preprocessingResult.scriptType,
          documentType: preprocessingResult.documentType,
          handwritingDetected: preprocessingResult.handwritingDetected
        },
        ocrResults: {
          mainResult: ocrResults.mainResult,
          fieldResults: ocrResults.fieldResults,
          ensembleResults: ocrResults.ensembleResults
        },
        postProcessing: {
          corrections: postProcessingResult.corrections,
          enhancedText: postProcessingResult.enhancedText,
          processingMethod: postProcessingResult.processingMethod
        },
        evaluation,
        metadata: {
          imagePath,
          originalSize: preprocessingResult.imageStats,
          processedPaths: [
            preprocessingResult.processedPath,
            ...(preprocessingResult.croppedFields?.map(f => f.path) || [])
          ].filter(Boolean),
          timestamp: new Date()
        }
      };

      console.log(`✅ Comprehensive OCR completed: ${processingId}`);
      console.log(`📊 Results: ${finalConfidence}% confidence, ${qualityScore}% quality`);
      console.log(`⏱️ Processing time: ${processingTime}ms`);
      console.log(`🔍 Human review: ${needsHumanReview ? 'REQUIRED' : 'NOT NEEDED'}`);

      return result;

    } catch (error) {
      console.error(`❌ Comprehensive OCR failed: ${processingId}`, error);
      throw new Error(`OCR processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Perform OCR processing with multiple methods
   */
  private async performOCRProcessing(
    preprocessingResult: PreprocessingResult,
    ocrMethod: string,
    useEnsemble: boolean,
    useFieldSpecificOCR: boolean
  ): Promise<{
    mainResult: any;
    fieldResults?: any[];
    ensembleResults?: any[];
  }> {
    const results: any = {};

    if (useFieldSpecificOCR && preprocessingResult.croppedFields && preprocessingResult.croppedFields.length > 0) {
      // Field-specific OCR processing
      console.log(`🗂️ Processing ${preprocessingResult.croppedFields.length} field crops...`);
      results.fieldResults = await optimizedTesseractEngine.processFieldCrops(preprocessingResult.croppedFields);
      results.mainResult = results.fieldResults;
    } else if (useEnsemble) {
      // Ensemble processing with multiple passes
      console.log('🔄 Running ensemble OCR processing...');
      const preprocessedPaths = [
        preprocessingResult.processedPath,
        preprocessingResult.blueChannelPath
      ].filter(Boolean) as string[];
      
      results.mainResult = await optimizedTesseractEngine.processEnsemble(
        preprocessingResult.processedPath,
        preprocessedPaths
      );
    } else {
      // Standard optimized processing
      console.log('👁️ Running optimized Tesseract processing...');
      
      // Determine optimal content type based on document analysis
      const contentType = this.determineContentType(
        preprocessingResult.documentType,
        preprocessingResult.handwritingDetected
      );
      
      // For FRA documents, always use English to prevent script mixing
      const language = 'eng'; // Force English-only for clear text recognition
      
      // Check if this is an FRA document and use optimized processing
      if (preprocessingResult.documentType === 'fra-document') {
        console.log('🏛️ Using specialized FRA document processing...');
        results.mainResult = await optimizedTesseractEngine.processFRADocument(preprocessingResult.processedPath);
      } else {
        results.mainResult = await optimizedTesseractEngine.processWithOptimalPSM(
          preprocessingResult.processedPath,
          {
            language,
            contentType,
            confidence: 80
          }
        );
      }
    }

    return results;
  }

  /**
   * Determine optimal content type for PSM selection
   */
  private determineContentType(
    documentType: string,
    handwritingDetected: boolean
  ): 'document' | 'form' | 'table' | 'single-line' | 'word' | 'handwriting' {
    if (handwritingDetected) return 'handwriting';
    
    switch (documentType) {
      case 'fra-patta':
      case 'fra-claim':
      case 'certificate':
        return 'form';
      case 'survey-document':
        return 'table';
      case 'map':
        return 'document';
      default:
        return 'form';
    }
  }

  /**
   * Map script type to language codes - optimized for FRA documents
   */
  private mapScriptToLanguage(scriptType: string): string {
    // For FRA documents, prioritize English-only processing to prevent script mixing
    const languageMap: Record<string, string> = {
      'devanagari': 'eng', // Use English instead of 'hin+mar' to prevent mixing
      'bengali': 'eng',    // Use English instead of 'ben' to prevent mixing
      'gujarati': 'eng',   // Use English instead of 'guj' to prevent mixing
      'telugu': 'eng',     // Use English instead of 'tel' to prevent mixing
      'tamil': 'eng',      // Use English instead of 'tam' to prevent mixing
      'kannada': 'eng',    // Use English instead of 'kan' to prevent mixing
      'malayalam': 'eng',  // Use English instead of 'mal' to prevent mixing
      'odia': 'eng',       // Use English instead of 'ori' to prevent mixing
      'urdu': 'eng',       // Use English instead of 'urd' to prevent mixing
      'latin': 'eng',
      'mixed': 'eng',      // Use English instead of 'eng+hin' to prevent mixing
      'unknown': 'eng'     // Use English instead of 'eng+hin' to prevent mixing
    };
    
    return languageMap[scriptType] || 'eng';
  }

  /**
   * Handle training data collection from processing results
   */
  private async handleTrainingDataCollection(
    imagePath: string,
    originalText: string,
    enhancedText: string,
    documentType: string,
    needsHumanReview: boolean
  ): Promise<void> {
    try {
      if (originalText !== enhancedText) {
        // Save corrected example for training
        await trainingDataManager.addCorrectedExample(
          imagePath,
          originalText,
          enhancedText,
          documentType,
          'eng+hin'
        );
      }
      
      if (needsHumanReview) {
        console.log('🔍 Document flagged for human review - will collect corrections');
        // In a real system, this would route to human annotation interface
      }
    } catch (error) {
      console.warn('Failed to save training data:', error);
    }
  }

  /**
   * Process human corrections and update training data
   */
  async processHumanCorrections(
    processingId: string,
    originalResult: ComprehensiveOCRResult,
    humanCorrectedText: string,
    humanCorrectedFields: any
  ): Promise<{
    trainingExampleId: string;
    improvementSuggestions: string[];
  }> {
    console.log(`🧑‍💼 Processing human corrections for: ${processingId}`);

    try {
      // Add corrected example to training data
      const trainingExampleId = await trainingDataManager.addCorrectedExample(
        originalResult.metadata.imagePath,
        originalResult.text,
        humanCorrectedText,
        originalResult.preprocessing.documentType,
        'eng+hin'
      );

      // Analyze corrections to generate improvement suggestions
      const improvementSuggestions = this.analyzeCorrections(
        originalResult.text,
        humanCorrectedText,
        originalResult.extractedFields,
        humanCorrectedFields
      );

      // Update evaluation metrics if ground truth is now available
      if (originalResult.evaluation) {
        evaluationMetrics.evaluateOCRResult(
          originalResult.text,
          originalResult.extractedFields,
          {
            text: humanCorrectedText,
            extractedFields: humanCorrectedFields,
            confidence: 100,
            humanVerified: true
          },
          originalResult.method,
          originalResult.preprocessing.documentType,
          originalResult.processingTime,
          originalResult.confidence,
          false // No longer needs human review
        );
      }

      console.log(`✅ Human corrections processed. Training example: ${trainingExampleId}`);
      return { trainingExampleId, improvementSuggestions };

    } catch (error) {
      console.error('Failed to process human corrections:', error);
      throw error;
    }
  }

  /**
   * Analyze corrections to generate improvement suggestions
   */
  private analyzeCorrections(
    originalText: string,
    correctedText: string,
    originalFields: any,
    correctedFields: any
  ): string[] {
    const suggestions: string[] = [];

    // Text-level analysis
    const textSimilarity = this.calculateSimilarity(originalText, correctedText);
    if (textSimilarity < 0.8) {
      suggestions.push('Consider improving preprocessing pipeline for better text recognition');
    }

    // Field-level analysis
    const fieldCorrections = this.getFieldCorrections(originalFields, correctedFields);
    if (fieldCorrections.length > 2) {
      suggestions.push('Multiple field extraction errors - enhance field detection patterns');
    }

    // Pattern analysis
    const commonErrors = this.identifyCommonErrors(originalText, correctedText);
    if (commonErrors.length > 0) {
      suggestions.push(`Common OCR errors detected: ${commonErrors.join(', ')}`);
      suggestions.push('Consider adding specific character corrections to post-processor');
    }

    return suggestions;
  }

  /**
   * Calculate text similarity
   */
  private calculateSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set(Array.from(words1).filter(word => words2.has(word)));
    const union = new Set([...Array.from(words1), ...Array.from(words2)]);
    
    return union.size === 0 ? 1 : intersection.size / union.size;
  }

  /**
   * Get field-level corrections
   */
  private getFieldCorrections(originalFields: any, correctedFields: any): string[] {
    const corrections: string[] = [];
    
    const allFields = new Set([
      ...Object.keys(originalFields || {}),
      ...Object.keys(correctedFields || {})
    ]);

    allFields.forEach(field => {
      const original = originalFields?.[field];
      const corrected = correctedFields?.[field];
      
      if (original !== corrected) {
        corrections.push(`${field}: '${original}' → '${corrected}'`);
      }
    });

    return corrections;
  }

  /**
   * Identify common OCR errors
   */
  private identifyCommonErrors(originalText: string, correctedText: string): string[] {
    const commonPatterns = [
      { pattern: /0/g, replacement: 'O' },
      { pattern: /1/g, replacement: 'I' },
      { pattern: /5/g, replacement: 'S' },
      { pattern: /8/g, replacement: 'B' }
    ];

    const errors: string[] = [];
    
    commonPatterns.forEach(({ pattern, replacement }) => {
      const originalMatches = (originalText.match(pattern) || []).length;
      const correctedMatches = (correctedText.match(pattern) || []).length;
      
      if (originalMatches > correctedMatches + 2) {
        errors.push(`${pattern.source} → ${replacement}`);
      }
    });

    return errors;
  }

  /**
   * Get processing statistics
   */
  getProcessingStatistics(): {
    totalProcessed: number;
    averageProcessingTime: number;
    averageConfidence: number;
    averageQualityScore: number;
    humanReviewRate: number;
    topIssues: string[];
    systemRecommendations: string[];
  } {
    const systemStats = evaluationMetrics.getSystemStatistics();
    
    return {
      totalProcessed: systemStats.totalEvaluations,
      averageProcessingTime: 0, // Would track this separately
      averageConfidence: 100 - systemStats.avgCER, // Approximate
      averageQualityScore: systemStats.avgFieldAccuracy,
      humanReviewRate: 100 - systemStats.automationRate,
      topIssues: [
        systemStats.avgCER > 10 ? 'High character error rate' : '',
        systemStats.avgFieldAccuracy < 80 ? 'Low field extraction accuracy' : '',
        systemStats.automationRate < 70 ? 'Low automation rate' : ''
      ].filter(Boolean),
      systemRecommendations: [
        systemStats.recentTrend === 'declining' ? 'System performance is declining - review recent changes' : '',
        systemStats.topPerformingMethod !== 'comprehensive-pipeline' ? `Consider switching to ${systemStats.topPerformingMethod}` : '',
        'Regular training data collection is recommended for continuous improvement'
      ].filter(Boolean)
    };
  }

  /**
   * Cleanup temporary files
   */
  private async cleanup(processedPath: string, croppedFields?: any[]): Promise<void> {
    try {
      // Clean up preprocessed files
      if (processedPath && fs.existsSync(processedPath)) {
        await fs.promises.unlink(processedPath);
      }

      // Clean up cropped field files
      if (croppedFields) {
        for (const field of croppedFields) {
          if (field.path && fs.existsSync(field.path)) {
            await fs.promises.unlink(field.path);
          }
        }
      }
      
      // Trigger general cleanup
      await advancedOCRPreprocessor.cleanup();
      
    } catch (error) {
      console.warn('Cleanup warning (non-critical):', error);
    }
  }
}

export const comprehensiveOCRPipeline = new ComprehensiveOCRPipeline();