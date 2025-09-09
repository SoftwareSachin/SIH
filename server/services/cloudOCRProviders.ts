import * as fs from 'fs';
import axios from 'axios';

export interface CloudOCRResult {
  text: string;
  confidence: number;
  layout?: any;
  entities?: any[];
  method: string;
}

export interface CloudOCRProvider {
  name: string;
  processDocument: (imagePath: string, language?: string) => Promise<CloudOCRResult>;
  isAvailable: () => boolean;
}

/**
 * Google Document AI Provider
 */
export class GoogleDocumentAIProvider implements CloudOCRProvider {
  name = 'Google Document AI';
  
  isAvailable(): boolean {
    return !!(
      process.env.GOOGLE_CLOUD_PROJECT_ID && 
      (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GOOGLE_SERVICE_ACCOUNT_KEY)
    );
  }
  
  async processDocument(imagePath: string, language?: string): Promise<CloudOCRResult> {
    try {
      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = imageBuffer.toString('base64');
      
      // Initialize Google Cloud client
      const { DocumentProcessorServiceClient } = await import('@google-cloud/documentai');
      const client = new DocumentProcessorServiceClient();
      
      const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID!;
      const location = process.env.GOOGLE_DOCUMENT_AI_LOCATION || 'us';
      const processorId = process.env.GOOGLE_DOCUMENT_AI_PROCESSOR_ID || 'default';
      
      const name = `projects/${projectId}/locations/${location}/processors/${processorId}`;
      
      const request = {
        name,
        rawDocument: {
          content: base64Image,
          mimeType: 'image/png'
        }
      };
      
      const [result] = await client.processDocument(request);
      
      if (!result.document) {
        throw new Error('No document returned from Google Document AI');
      }
      
      const text = result.document.text || '';
      const confidence = this.calculateConfidenceFromGoogleAI(result.document);
      const entities = this.extractEntitiesFromGoogleAI(result.document);
      
      console.log(`✓ Google Document AI processed: ${confidence}% confidence`);
      
      return {
        text,
        confidence,
        method: 'google-document-ai',
        layout: result.document.pages || [],
        entities
      };
      
    } catch (error) {
      console.error('Google Document AI processing failed:', error);
      throw error;
    }
  }
  
  private calculateConfidenceFromGoogleAI(document: any): number {
    // Calculate average confidence from all text elements
    let totalConfidence = 0;
    let count = 0;
    
    if (document.pages) {
      for (const page of document.pages) {
        if (page.tokens) {
          for (const token of page.tokens) {
            if (token.textAnchor?.textSegments?.[0]?.startIndex !== undefined) {
              totalConfidence += (token.confidence || 0.8) * 100;
              count++;
            }
          }
        }
      }
    }
    
    return count > 0 ? Math.round(totalConfidence / count) : 85;
  }
  
  private extractEntitiesFromGoogleAI(document: any): any[] {
    const entities: any[] = [];
    
    if (document.entities) {
      for (const entity of document.entities) {
        entities.push({
          type: entity.type,
          text: entity.textAnchor?.content || '',
          confidence: (entity.confidence || 0.8) * 100
        });
      }
    }
    
    return entities;
  }
}

/**
 * Azure Document Intelligence Provider (formerly Form Recognizer)
 */
export class AzureDocumentIntelligenceProvider implements CloudOCRProvider {
  name = 'Azure Document Intelligence';
  
  isAvailable(): boolean {
    return !!(
      process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT && 
      process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY
    );
  }
  
  async processDocument(imagePath: string, language?: string): Promise<CloudOCRResult> {
    try {
      const imageBuffer = fs.readFileSync(imagePath);
      
      const endpoint = process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT!;
      const apiKey = process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY!;
      
      // Use prebuilt-read model for general OCR
      const analyzeUrl = `${endpoint}/formrecognizer/documentModels/prebuilt-read:analyze?api-version=2023-07-31`;
      
      // Start analysis
      const analyzeResponse = await axios.post(analyzeUrl, imageBuffer, {
        headers: {
          'Content-Type': 'image/png',
          'Ocp-Apim-Subscription-Key': apiKey
        }
      });
      
      const operationLocation = analyzeResponse.headers['operation-location'];
      if (!operationLocation) {
        throw new Error('No operation location returned from Azure');
      }
      
      // Poll for results
      let result;
      let attempts = 0;
      const maxAttempts = 30;
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const resultResponse = await axios.get(operationLocation, {
          headers: {
            'Ocp-Apim-Subscription-Key': apiKey
          }
        });
        
        if (resultResponse.data.status === 'succeeded') {
          result = resultResponse.data.analyzeResult;
          break;
        } else if (resultResponse.data.status === 'failed') {
          throw new Error('Azure Document Intelligence analysis failed');
        }
        
        attempts++;
      }
      
      if (!result) {
        throw new Error('Azure Document Intelligence analysis timed out');
      }
      
      const text = this.extractTextFromAzureResult(result);
      const confidence = this.calculateConfidenceFromAzure(result);
      
      console.log(`✓ Azure Document Intelligence processed: ${confidence}% confidence`);
      
      return {
        text,
        confidence,
        method: 'azure-document-intelligence',
        layout: result.pages || [],
        entities: result.entities || []
      };
      
    } catch (error) {
      console.error('Azure Document Intelligence processing failed:', error);
      throw error;
    }
  }
  
  private extractTextFromAzureResult(result: any): string {
    if (!result.pages) return '';
    
    return result.pages
      .map((page: any) => 
        page.lines?.map((line: any) => line.content).join('\n') || ''
      )
      .join('\n\n');
  }
  
  private calculateConfidenceFromAzure(result: any): number {
    let totalConfidence = 0;
    let count = 0;
    
    if (result.pages) {
      for (const page of result.pages) {
        if (page.words) {
          for (const word of page.words) {
            totalConfidence += (word.confidence || 0.85) * 100;
            count++;
          }
        }
      }
    }
    
    return count > 0 ? Math.round(totalConfidence / count) : 85;
  }
}

/**
 * ABBYY Cloud OCR Provider
 */
export class ABBYYCloudProvider implements CloudOCRProvider {
  name = 'ABBYY Cloud OCR';
  
  isAvailable(): boolean {
    return !!(
      process.env.ABBYY_APPLICATION_ID && 
      process.env.ABBYY_PASSWORD
    );
  }
  
  async processDocument(imagePath: string, language?: string): Promise<CloudOCRResult> {
    try {
      const imageBuffer = fs.readFileSync(imagePath);
      const applicationId = process.env.ABBYY_APPLICATION_ID!;
      const password = process.env.ABBYY_PASSWORD!;
      
      const auth = Buffer.from(`${applicationId}:${password}`).toString('base64');
      
      // Submit image for processing
      const submitUrl = 'https://cloud-eu.abbyy.com/v2/processImage';
      const submitResponse = await axios.post(submitUrl, imageBuffer, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'image/png'
        },
        params: {
          language: this.mapLanguageForABBYY(language),
          exportFormat: 'txt',
          processingSettings: 'correctOrientation,correctSkew'
        }
      });
      
      const taskId = submitResponse.data.taskId;
      if (!taskId) {
        throw new Error('No task ID returned from ABBYY');
      }
      
      // Poll for results
      let result;
      let attempts = 0;
      const maxAttempts = 60;
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const statusUrl = `https://cloud-eu.abbyy.com/v2/getTaskStatus?taskId=${taskId}`;
        const statusResponse = await axios.get(statusUrl, {
          headers: {
            'Authorization': `Basic ${auth}`
          }
        });
        
        const status = statusResponse.data;
        
        if (status.taskStatus === 'Completed') {
          // Download result
          const downloadUrl = status.resultUrls[0];
          const resultResponse = await axios.get(downloadUrl);
          result = resultResponse.data;
          break;
        } else if (status.taskStatus === 'ProcessingFailed') {
          throw new Error('ABBYY processing failed');
        }
        
        attempts++;
      }
      
      if (!result) {
        throw new Error('ABBYY processing timed out');
      }
      
      // ABBYY returns plain text, so we estimate confidence based on content quality
      const confidence = this.estimateABBYYConfidence(result);
      
      console.log(`✓ ABBYY Cloud OCR processed: ${confidence}% confidence`);
      
      return {
        text: result,
        confidence,
        method: 'abbyy-cloud-ocr',
        entities: []
      };
      
    } catch (error) {
      console.error('ABBYY Cloud OCR processing failed:', error);
      throw error;
    }
  }
  
  private mapLanguageForABBYY(language?: string): string {
    const languageMap: Record<string, string> = {
      'devanagari': 'Hindi',
      'bengali': 'Bengali',
      'gujarati': 'Gujarati',
      'telugu': 'Telugu',
      'tamil': 'Tamil',
      'kannada': 'Kannada',
      'malayalam': 'Malayalam',
      'odia': 'Odia',
      'marathi': 'Marathi',
      'urdu': 'Urdu',
      'latin': 'English',
      'mixed': 'English,Hindi'
    };
    
    return languageMap[language || 'mixed'] || 'English,Hindi';
  }
  
  private estimateABBYYConfidence(text: string): number {
    let confidence = 75; // Base confidence for ABBYY
    
    // Quality indicators
    if (text.length > 100) confidence += 10;
    if (text.includes('\n')) confidence += 5; // Multi-line structure
    if (/[A-Z][a-z]+:/.test(text)) confidence += 5; // Labels
    if (/\d+/.test(text)) confidence += 5; // Numbers
    
    // Penalty for garbled text
    if (text.split(' ').filter(word => word.length < 2).length > text.split(' ').length * 0.3) {
      confidence -= 15;
    }
    
    return Math.min(95, Math.max(60, confidence));
  }
}

/**
 * PaddleOCR Provider (Open Source Alternative)
 */
export class PaddleOCRProvider implements CloudOCRProvider {
  name = 'PaddleOCR';
  
  isAvailable(): boolean {
    // Check if PaddleOCR Python service is running
    return process.env.PADDLE_OCR_ENABLED === 'true';
  }
  
  async processDocument(imagePath: string, language?: string): Promise<CloudOCRResult> {
    try {
      // Call PaddleOCR Python service (assumes it's running as a microservice)
      const paddleOCRUrl = process.env.PADDLE_OCR_URL || 'http://localhost:8001/ocr';
      
      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = imageBuffer.toString('base64');
      
      const response = await axios.post(paddleOCRUrl, {
        image: base64Image,
        language: this.mapLanguageForPaddle(language)
      });
      
      const result = response.data;
      const text = result.results.map((r: any) => r.text).join('\n');
      const confidence = this.calculatePaddleConfidence(result.results);
      
      console.log(`✓ PaddleOCR processed: ${confidence}% confidence`);
      
      return {
        text,
        confidence,
        method: 'paddle-ocr',
        layout: result.results.map((r: any) => ({
          bbox: r.bbox,
          text: r.text,
          confidence: r.confidence
        }))
      };
      
    } catch (error) {
      console.error('PaddleOCR processing failed:', error);
      throw error;
    }
  }
  
  private mapLanguageForPaddle(language?: string): string {
    const languageMap: Record<string, string> = {
      'devanagari': 'hi',
      'bengali': 'bn',
      'gujarati': 'gu',
      'telugu': 'te',
      'tamil': 'ta',
      'kannada': 'kn',
      'malayalam': 'ml',
      'odia': 'or',
      'marathi': 'mr',
      'urdu': 'ur',
      'latin': 'en',
      'mixed': 'en'
    };
    
    return languageMap[language || 'mixed'] || 'en';
  }
  
  private calculatePaddleConfidence(results: any[]): number {
    if (results.length === 0) return 0;
    
    const totalConfidence = results.reduce((sum, r) => sum + (r.confidence || 0.8), 0);
    return Math.round((totalConfidence / results.length) * 100);
  }
}

// Factory function to create providers
export function createCloudOCRProviders(): Map<string, CloudOCRProvider> {
  const providers = new Map<string, CloudOCRProvider>();
  
  // Add all available providers
  const googleProvider = new GoogleDocumentAIProvider();
  if (googleProvider.isAvailable()) {
    providers.set('google-document-ai', googleProvider);
  }
  
  const azureProvider = new AzureDocumentIntelligenceProvider();
  if (azureProvider.isAvailable()) {
    providers.set('azure-document-intelligence', azureProvider);
  }
  
  const abbyyProvider = new ABBYYCloudProvider();
  if (abbyyProvider.isAvailable()) {
    providers.set('abbyy-cloud-ocr', abbyyProvider);
  }
  
  const paddleProvider = new PaddleOCRProvider();
  if (paddleProvider.isAvailable()) {
    providers.set('paddle-ocr', paddleProvider);
  }
  
  return providers;
}