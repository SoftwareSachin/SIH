import { createWorker } from 'tesseract.js';
import * as fs from 'fs';
import * as path from 'path';

interface ProcessedDocument {
  text: string;
  confidence: number;
  entities: {
    names?: string[];
    villages?: string[];
    areas?: string[];
    coordinates?: string[];
    dates?: string[];
  };
}

class DocumentProcessor {
  private ocrWorker: any;

  constructor() {
    this.initializeOCR();
  }

  private async initializeOCR() {
    try {
      this.ocrWorker = await createWorker('eng+hin');
    } catch (error) {
      console.error('Failed to initialize OCR worker:', error);
    }
  }

  async processDocument(filePath: string, fileType: string): Promise<ProcessedDocument> {
    try {
      let text = '';
      let confidence = 0;

      if (fileType === 'application/pdf') {
        // For PDF files, we would need a PDF-to-image converter
        // For now, we'll use a placeholder
        text = 'PDF processing not yet implemented';
        confidence = 0;
      } else if (fileType.startsWith('image/')) {
        // Process image with OCR
        const { data } = await this.ocrWorker.recognize(filePath);
        text = data.text;
        confidence = data.confidence;
      }

      // Extract entities using NER
      const entities = this.extractEntities(text);

      return {
        text,
        confidence,
        entities,
      };
    } catch (error) {
      console.error('Error processing document:', error);
      throw new Error('Document processing failed');
    }
  }

  private extractEntities(text: string): ProcessedDocument['entities'] {
    const entities: ProcessedDocument['entities'] = {
      names: [],
      villages: [],
      areas: [],
      coordinates: [],
      dates: [],
    };

    // Simple regex-based NER (in production, use more sophisticated NLP libraries)
    
    // Extract names (capitalized words, Indian names)
    const namePattern = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g;
    const names = text.match(namePattern) || [];
    entities.names = [...new Set(names.filter(name => 
      name.length > 2 && !['Village', 'District', 'State', 'Claim', 'Forest'].includes(name)
    ))];

    // Extract village names (looking for "Village:" or "Gram:" patterns)
    const villagePattern = /(?:Village|Gram|ग्राम)[\s:]+([A-Za-z\s]+)/gi;
    let villageMatch;
    while ((villageMatch = villagePattern.exec(text)) !== null) {
      entities.villages?.push(villageMatch[1].trim());
    }

    // Extract areas (numbers followed by acre, hectare, etc.)
    const areaPattern = /(\d+(?:\.\d+)?)\s*(?:acre|hectare|bigha|गुंठा)/gi;
    let areaMatch;
    while ((areaMatch = areaPattern.exec(text)) !== null) {
      entities.areas?.push(areaMatch[0]);
    }

    // Extract coordinates (latitude/longitude patterns)
    const coordPattern = /(\d+(?:\.\d+)?°?\s*[NS]?\s*,?\s*\d+(?:\.\d+)?°?\s*[EW]?)/gi;
    const coords = text.match(coordPattern) || [];
    entities.coordinates = coords;

    // Extract dates
    const datePattern = /\b\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b|\b\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4}\b/gi;
    const dates = text.match(datePattern) || [];
    entities.dates = dates;

    return entities;
  }

  async shutdown() {
    if (this.ocrWorker) {
      await this.ocrWorker.terminate();
    }
  }
}

export const documentProcessor = new DocumentProcessor();
