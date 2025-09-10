import * as fs from 'fs';
import * as path from 'path';
import { ExtractedFields } from './comprehensivePostProcessor';

export interface EvaluationResult {
  id: string;
  timestamp: Date;
  ocrMethod: string;
  documentType: string;
  metrics: OCRMetrics;
  fieldMetrics: FieldMetrics;
  processingTime: number;
  confidence: number;
  needsHumanReview: boolean;
  humanReviewed: boolean;
  finalAccuracy?: number;
}

export interface OCRMetrics {
  characterErrorRate: number;
  wordErrorRate: number;
  bleuScore: number;
  confidence: number;
  textLength: number;
  extractedFieldCount: number;
}

export interface FieldMetrics {
  extractionAccuracy: number;
  fieldCompleteness: number;
  criticalFieldsFound: number;
  totalCriticalFields: number;
  fieldAccuracies: Record<string, number>;
}

export interface TestDataset {
  id: string;
  name: string;
  documents: TestDocument[];
  created: Date;
  description: string;
}

export interface TestDocument {
  id: string;
  imagePath: string;
  groundTruth: GroundTruth;
  documentType: string;
  language: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface GroundTruth {
  text: string;
  extractedFields: ExtractedFields;
  confidence: number;
  humanVerified: boolean;
}

/**
 * Evaluation Metrics System implementing comprehensive testing framework
 * 
 * Features:
 * - Character Error Rate (CER) and Word Error Rate (WER) calculation
 * - BLEU score for translation-quality assessment
 * - Field-specific accuracy measurement
 * - Automation rate tracking
 * - Performance benchmarking
 * - A/B testing for different OCR configurations
 * - Continuous evaluation with human feedback
 */
export class EvaluationMetrics {
  private testDatasets: Map<string, TestDataset> = new Map();
  private evaluationResults: EvaluationResult[] = [];
  private readonly resultsDir: string;

  constructor() {
    this.resultsDir = path.join(process.cwd(), 'evaluation_results');
    this.initializeResultsDir();
    this.loadExistingResults();
  }

  /**
   * Initialize results directory
   */
  private initializeResultsDir(): void {
    if (!fs.existsSync(this.resultsDir)) {
      fs.mkdirSync(this.resultsDir, { recursive: true });
    }
  }

  /**
   * Load existing evaluation results
   */
  private loadExistingResults(): void {
    try {
      const resultsFile = path.join(this.resultsDir, 'evaluation_results.json');
      if (fs.existsSync(resultsFile)) {
        const data = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
        
        this.evaluationResults = data.results?.map((result: any) => ({
          ...result,
          timestamp: new Date(result.timestamp)
        })) || [];

        this.testDatasets = new Map(data.datasets?.map((dataset: any) => [
          dataset.id,
          {
            ...dataset,
            created: new Date(dataset.created)
          }
        ]) || []);

        console.log(`📊 Loaded ${this.evaluationResults.length} evaluation results`);
      }
    } catch (error) {
      console.warn('Could not load existing evaluation results:', error);
    }
  }

  /**
   * Save evaluation results
   */
  private saveResults(): void {
    try {
      const data = {
        results: this.evaluationResults,
        datasets: Array.from(this.testDatasets.values())
      };

      const resultsFile = path.join(this.resultsDir, 'evaluation_results.json');
      fs.writeFileSync(resultsFile, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Failed to save evaluation results:', error);
    }
  }

  /**
   * Evaluate OCR result against ground truth
   */
  evaluateOCRResult(
    ocrText: string,
    extractedFields: ExtractedFields,
    groundTruth: GroundTruth,
    ocrMethod: string,
    documentType: string,
    processingTime: number,
    confidence: number,
    needsHumanReview: boolean
  ): EvaluationResult {
    console.log('📊 Evaluating OCR result against ground truth...');

    // Calculate OCR metrics
    const ocrMetrics = this.calculateOCRMetrics(ocrText, groundTruth.text);
    
    // Calculate field metrics
    const fieldMetrics = this.calculateFieldMetrics(extractedFields, groundTruth.extractedFields);

    const result: EvaluationResult = {
      id: `eval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      ocrMethod,
      documentType,
      metrics: ocrMetrics,
      fieldMetrics,
      processingTime,
      confidence,
      needsHumanReview,
      humanReviewed: false
    };

    this.evaluationResults.push(result);
    this.saveResults();

    console.log(`✅ Evaluation complete. CER: ${ocrMetrics.characterErrorRate.toFixed(2)}%, Field Accuracy: ${fieldMetrics.extractionAccuracy.toFixed(2)}%`);
    
    return result;
  }

  /**
   * Calculate OCR metrics (CER, WER, BLEU)
   */
  private calculateOCRMetrics(ocrText: string, groundTruthText: string): OCRMetrics {
    // Normalize texts for comparison
    const normalizedOCR = this.normalizeForComparison(ocrText);
    const normalizedGT = this.normalizeForComparison(groundTruthText);

    // Character Error Rate (CER)
    const cer = this.calculateCER(normalizedOCR, normalizedGT);

    // Word Error Rate (WER)
    const wer = this.calculateWER(normalizedOCR, normalizedGT);

    // BLEU Score (simplified n-gram based)
    const bleuScore = this.calculateBLEU(normalizedOCR, normalizedGT);

    // Count extracted fields (simplified)
    const extractedFieldCount = (ocrText.match(/[A-Z][a-z]+:/g) || []).length;

    return {
      characterErrorRate: cer,
      wordErrorRate: wer,
      bleuScore,
      confidence: this.calculateTextConfidence(normalizedOCR, normalizedGT),
      textLength: ocrText.length,
      extractedFieldCount
    };
  }

  /**
   * Calculate Character Error Rate using Levenshtein distance
   */
  private calculateCER(text1: string, text2: string): number {
    const distance = this.levenshteinDistance(text1, text2);
    const maxLength = Math.max(text1.length, text2.length);
    return maxLength === 0 ? 0 : (distance / maxLength) * 100;
  }

  /**
   * Calculate Word Error Rate
   */
  private calculateWER(text1: string, text2: string): number {
    const words1 = text1.split(/\s+/).filter(w => w.length > 0);
    const words2 = text2.split(/\s+/).filter(w => w.length > 0);
    
    const distance = this.levenshteinDistance(words1.join(' '), words2.join(' '));
    const maxLength = Math.max(words1.length, words2.length);
    
    return maxLength === 0 ? 0 : (distance / maxLength) * 100;
  }

  /**
   * Calculate simplified BLEU score
   */
  private calculateBLEU(text1: string, text2: string): number {
    const words1 = text1.split(/\s+/).filter(w => w.length > 0);
    const words2 = text2.split(/\s+/).filter(w => w.length > 0);
    
    if (words1.length === 0 || words2.length === 0) return 0;
    
    // 1-gram precision
    const matches = words1.filter(word => words2.includes(word)).length;
    const precision = matches / words1.length;
    
    // Brevity penalty
    const brevityPenalty = words1.length <= words2.length ? 1 : Math.exp(1 - words2.length / words1.length);
    
    return precision * brevityPenalty * 100;
  }

  /**
   * Calculate field extraction metrics
   */
  private calculateFieldMetrics(extractedFields: ExtractedFields, groundTruthFields: ExtractedFields): FieldMetrics {
    const criticalFields = ['claimantName', 'village', 'referenceNumber'];
    const allFields = ['claimantName', 'fatherName', 'village', 'district', 'state', 'referenceNumber', 'surveyNumber', 'area', 'dateIssued'];
    
    let correctFields = 0;
    let criticalFieldsFound = 0;
    const fieldAccuracies: Record<string, number> = {};

    // Check each field
    for (const field of allFields) {
      const extracted = (extractedFields as any)[field];
      const groundTruth = (groundTruthFields as any)[field];
      
      if (groundTruth) {
        if (extracted) {
          const accuracy = this.calculateFieldAccuracy(extracted, groundTruth);
          fieldAccuracies[field] = accuracy;
          
          if (accuracy > 0.8) { // Consider it correct if 80% similar
            correctFields++;
            if (criticalFields.includes(field)) {
              criticalFieldsFound++;
            }
          }
        } else {
          fieldAccuracies[field] = 0; // Field not extracted
        }
      } else if (extracted) {
        // Field extracted but not in ground truth (might be over-extraction)
        fieldAccuracies[field] = 0.5; // Partial credit
      }
    }

    const totalGroundTruthFields = allFields.filter(field => (groundTruthFields as any)[field]).length;
    const totalCriticalFields = criticalFields.filter(field => (groundTruthFields as any)[field]).length;

    return {
      extractionAccuracy: totalGroundTruthFields > 0 ? (correctFields / totalGroundTruthFields) * 100 : 0,
      fieldCompleteness: allFields.length > 0 ? (Object.keys(extractedFields).length / allFields.length) * 100 : 0,
      criticalFieldsFound,
      totalCriticalFields,
      fieldAccuracies
    };
  }

  /**
   * Calculate accuracy for a specific field
   */
  private calculateFieldAccuracy(extracted: string, groundTruth: string): number {
    const normalizedExtracted = this.normalizeForComparison(extracted);
    const normalizedGT = this.normalizeForComparison(groundTruth);
    
    if (normalizedExtracted === normalizedGT) return 1.0;
    
    // Use fuzzy matching for partial accuracy
    const similarity = this.calculateSimilarity(normalizedExtracted, normalizedGT);
    return similarity;
  }

  /**
   * Calculate text similarity (Jaccard similarity)
   */
  private calculateSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.split(/\s+/));
    const words2 = new Set(text2.split(/\s+/));
    
    const intersection = new Set(Array.from(words1).filter(word => words2.has(word)));
    const union = new Set([...Array.from(words1), ...Array.from(words2)]);
    
    return union.size === 0 ? 0 : intersection.size / union.size;
  }

  /**
   * Calculate text confidence based on comparison
   */
  private calculateTextConfidence(ocrText: string, groundTruth: string): number {
    const similarity = this.calculateSimilarity(ocrText, groundTruth);
    return similarity * 100;
  }

  /**
   * Normalize text for comparison
   */
  private normalizeForComparison(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\s+/g, ' ')    // Normalize whitespace
      .trim();
  }

  /**
   * Calculate Levenshtein distance
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // deletion
          matrix[j - 1][i] + 1,     // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Generate performance report
   */
  generatePerformanceReport(timeRange?: { start: Date; end: Date }): {
    summary: {
      totalEvaluations: number;
      averageCER: number;
      averageWER: number;
      averageFieldAccuracy: number;
      automationRate: number;
      averageProcessingTime: number;
    };
    methodComparison: Record<string, {
      count: number;
      averageCER: number;
      averageFieldAccuracy: number;
      automationRate: number;
    }>;
    trends: {
      cerTrend: number[];
      fieldAccuracyTrend: number[];
      automationRateTrend: number[];
    };
    recommendations: string[];
  } {
    let results = this.evaluationResults;

    // Filter by time range if provided
    if (timeRange) {
      results = results.filter(r => 
        r.timestamp >= timeRange.start && r.timestamp <= timeRange.end
      );
    }

    if (results.length === 0) {
      return {
        summary: {
          totalEvaluations: 0,
          averageCER: 0,
          averageWER: 0,
          averageFieldAccuracy: 0,
          automationRate: 0,
          averageProcessingTime: 0
        },
        methodComparison: {},
        trends: { cerTrend: [], fieldAccuracyTrend: [], automationRateTrend: [] },
        recommendations: []
      };
    }

    // Calculate summary statistics
    const summary = {
      totalEvaluations: results.length,
      averageCER: results.reduce((sum, r) => sum + r.metrics.characterErrorRate, 0) / results.length,
      averageWER: results.reduce((sum, r) => sum + r.metrics.wordErrorRate, 0) / results.length,
      averageFieldAccuracy: results.reduce((sum, r) => sum + r.fieldMetrics.extractionAccuracy, 0) / results.length,
      automationRate: (results.filter(r => !r.needsHumanReview).length / results.length) * 100,
      averageProcessingTime: results.reduce((sum, r) => sum + r.processingTime, 0) / results.length
    };

    // Method comparison
    const methodStats: Record<string, any> = {};
    results.forEach(result => {
      if (!methodStats[result.ocrMethod]) {
        methodStats[result.ocrMethod] = {
          results: [],
          count: 0
        };
      }
      methodStats[result.ocrMethod].results.push(result);
      methodStats[result.ocrMethod].count++;
    });

    const methodComparison: Record<string, any> = {};
    Object.keys(methodStats).forEach(method => {
      const methodResults = methodStats[method].results;
      methodComparison[method] = {
        count: methodResults.length,
        averageCER: methodResults.reduce((sum: number, r: EvaluationResult) => sum + r.metrics.characterErrorRate, 0) / methodResults.length,
        averageFieldAccuracy: methodResults.reduce((sum: number, r: EvaluationResult) => sum + r.fieldMetrics.extractionAccuracy, 0) / methodResults.length,
        automationRate: (methodResults.filter((r: EvaluationResult) => !r.needsHumanReview).length / methodResults.length) * 100
      };
    });

    // Trends (last 10 results)
    const recentResults = results.slice(-10);
    const trends = {
      cerTrend: recentResults.map(r => r.metrics.characterErrorRate),
      fieldAccuracyTrend: recentResults.map(r => r.fieldMetrics.extractionAccuracy),
      automationRateTrend: recentResults.map((_, i) => {
        const subset = recentResults.slice(0, i + 1);
        return (subset.filter(r => !r.needsHumanReview).length / subset.length) * 100;
      })
    };

    // Generate recommendations
    const recommendations = this.generateRecommendations(summary, methodComparison);

    return {
      summary,
      methodComparison,
      trends,
      recommendations
    };
  }

  /**
   * Generate improvement recommendations
   */
  private generateRecommendations(summary: any, methodComparison: Record<string, any>): string[] {
    const recommendations: string[] = [];

    // CER recommendations
    if (summary.averageCER > 10) {
      recommendations.push('Consider improving preprocessing pipeline - CER is above 10%');
    }
    if (summary.averageCER > 5) {
      recommendations.push('Implement tesstrain fine-tuning for your specific document types');
    }

    // Field accuracy recommendations
    if (summary.averageFieldAccuracy < 80) {
      recommendations.push('Enhance field extraction patterns and gazetteer validation');
    }

    // Automation rate recommendations
    if (summary.automationRate < 70) {
      recommendations.push('Review human review thresholds - automation rate is below 70%');
    }

    // Method-specific recommendations
    const bestMethod = Object.keys(methodComparison).reduce((best, method) => {
      return methodComparison[method].averageFieldAccuracy > (methodComparison[best]?.averageFieldAccuracy || 0) ? method : best;
    }, '');

    if (bestMethod) {
      recommendations.push(`Consider using '${bestMethod}' as primary method - shows best field accuracy`);
    }

    // Processing time recommendations
    if (summary.averageProcessingTime > 30000) {
      recommendations.push('Consider optimizing processing pipeline - average time is above 30 seconds');
    }

    return recommendations;
  }

  /**
   * Export evaluation results for analysis
   */
  exportResults(format: 'json' | 'csv' = 'json'): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `evaluation_results_${timestamp}.${format}`;
    const filepath = path.join(this.resultsDir, filename);

    if (format === 'json') {
      const data = {
        exportDate: new Date(),
        totalResults: this.evaluationResults.length,
        results: this.evaluationResults,
        datasets: Array.from(this.testDatasets.values())
      };
      fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
    } else if (format === 'csv') {
      const headers = [
        'id', 'timestamp', 'ocrMethod', 'documentType', 'cer', 'wer', 'bleuScore',
        'fieldAccuracy', 'processingTime', 'confidence', 'needsHumanReview',
        'criticalFieldsFound', 'totalCriticalFields'
      ];
      
      const rows = this.evaluationResults.map(result => [
        result.id,
        result.timestamp.toISOString(),
        result.ocrMethod,
        result.documentType,
        result.metrics.characterErrorRate,
        result.metrics.wordErrorRate,
        result.metrics.bleuScore,
        result.fieldMetrics.extractionAccuracy,
        result.processingTime,
        result.confidence,
        result.needsHumanReview,
        result.fieldMetrics.criticalFieldsFound,
        result.fieldMetrics.totalCriticalFields
      ]);

      const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
      fs.writeFileSync(filepath, csv);
    }

    console.log(`📊 Evaluation results exported to: ${filepath}`);
    return filepath;
  }

  /**
   * Get current system statistics
   */
  getSystemStatistics(): {
    totalEvaluations: number;
    avgCER: number;
    avgFieldAccuracy: number;
    automationRate: number;
    topPerformingMethod: string;
    recentTrend: 'improving' | 'declining' | 'stable';
  } {
    if (this.evaluationResults.length === 0) {
      return {
        totalEvaluations: 0,
        avgCER: 0,
        avgFieldAccuracy: 0,
        automationRate: 0,
        topPerformingMethod: 'none',
        recentTrend: 'stable'
      };
    }

    const recent = this.evaluationResults.slice(-10);
    const older = this.evaluationResults.slice(-20, -10);

    const recentAvgCER = recent.reduce((sum, r) => sum + r.metrics.characterErrorRate, 0) / recent.length;
    const olderAvgCER = older.length > 0 ? older.reduce((sum, r) => sum + r.metrics.characterErrorRate, 0) / older.length : recentAvgCER;

    let trend: 'improving' | 'declining' | 'stable' = 'stable';
    if (recentAvgCER < olderAvgCER - 1) trend = 'improving';
    else if (recentAvgCER > olderAvgCER + 1) trend = 'declining';

    const report = this.generatePerformanceReport();

    return {
      totalEvaluations: this.evaluationResults.length,
      avgCER: report.summary.averageCER,
      avgFieldAccuracy: report.summary.averageFieldAccuracy,
      automationRate: report.summary.automationRate,
      topPerformingMethod: Object.keys(report.methodComparison).reduce((best, method) => {
        return report.methodComparison[method].averageFieldAccuracy > (report.methodComparison[best]?.averageFieldAccuracy || 0) ? method : best;
      }, 'unknown'),
      recentTrend: trend
    };
  }
}

export const evaluationMetrics = new EvaluationMetrics();