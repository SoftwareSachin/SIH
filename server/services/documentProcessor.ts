import { createWorker } from 'tesseract.js';
import * as fs from 'fs';
import * as path from 'path';
import nlp from 'compromise';
import { SentenceTokenizer, WordTokenizer } from 'natural';
import sharp from 'sharp';

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
        // Preprocess image for better OCR
        const processedPath = await this.preprocessImage(filePath);
        
        // Process image with OCR
        const { data } = await this.ocrWorker.recognize(processedPath);
        text = data.text;
        confidence = data.confidence;
        
        // Clean up processed image
        if (processedPath !== filePath && fs.existsSync(processedPath)) {
          fs.unlinkSync(processedPath);
        }
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

  private async preprocessImage(filePath: string): Promise<string> {
    try {
      const processedPath = filePath.replace(/\.(jpg|jpeg|png|tiff)$/i, '_processed.jpg');
      
      await sharp(filePath)
        .resize(null, 2000, { withoutEnlargement: true })
        .normalize()
        .sharpen()
        .jpeg({ quality: 95 })
        .toFile(processedPath);
      
      return processedPath;
    } catch (error) {
      console.error('Error preprocessing image:', error);
      return filePath;
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

    // Use Compromise NLP for advanced entity extraction
    const doc = nlp(text);
    
    // Extract person names using NLP
    const people = doc.people().out('array');
    const indianNamePattern = /\b(?:[A-Z][a-z]+\s+(?:Singh|Kumar|Devi|Rani|Prasad|Sharma|Gupta|Yadav|Patel|Das|Ray|Bai|Wati))\b/g;
    const indianNames = text.match(indianNamePattern) || [];
    entities.names = [...new Set([...people, ...indianNames])].filter(name => 
      name.length > 2 && !['Village', 'District', 'State', 'Claim', 'Forest', 'Rights'].includes(name)
    );

    // Enhanced village name extraction
    const villagePatterns = [
      /(?:Village|Gram|ग्राम|गाँव|गांव)[\s:]+([A-Za-z\u0900-\u097F\s]+)/gi,
      /(?:Vill|V\.)[\s:]+([A-Za-z\u0900-\u097F\s]+)/gi,
      /गाव[\s:]+([A-Za-z\u0900-\u097F\s]+)/gi
    ];
    
    for (const pattern of villagePatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const villageName = match[1].trim().replace(/[,\.;]/g, '');
        if (villageName.length > 2) {
          entities.villages?.push(villageName);
        }
      }
    }

    // Enhanced area extraction with multiple units
    const areaPatterns = [
      /(\d+(?:\.\d+)?)\s*(?:acre|hectare|bigha|गुंठा|एकड़|बीघा|हेक्टेयर)/gi,
      /(\d+(?:\.\d+)?)\s*(?:sq\s*m|sqm|square\s*meter)/gi,
      /Area[\s:]+([\d\.]+)\s*(?:acre|hectare)/gi
    ];
    
    for (const pattern of areaPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        entities.areas?.push(match[0]);
      }
    }

    // Enhanced coordinate extraction
    const coordPatterns = [
      /(\d{1,2}[°'"\s]*\d{0,2}[°'"\s]*\d{0,2}["\s]*[NS][,\s]*\d{1,3}[°'"\s]*\d{0,2}[°'"\s]*\d{0,2}["\s]*[EW])/gi,
      /(\d+\.\d+)[,\s]+(\d+\.\d+)/gi,
      /Lat[itude]*[\s:]+([\d\.]+)[,\s]*Lon[gitude]*[\s:]+([\d\.]+)/gi
    ];
    
    for (const pattern of coordPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        entities.coordinates?.push(match[0]);
      }
    }

    // Enhanced date extraction with Indian formats
    const datePatterns = [
      /\b\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}\b/gi,
      /\b\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4}\b/gi,
      /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{2,4}\b/gi,
      /\d{4}-\d{2}-\d{2}/gi
    ];
    
    for (const pattern of datePatterns) {
      const dates = text.match(pattern) || [];
      entities.dates = [...(entities.dates || []), ...dates];
    }

    // Remove duplicates
    Object.keys(entities).forEach(key => {
      if (Array.isArray(entities[key])) {
        entities[key] = [...new Set(entities[key])];
      }
    });

    return entities;
  }

  async shutdown() {
    if (this.ocrWorker) {
      await this.ocrWorker.terminate();
    }
  }
}

export const documentProcessor = new DocumentProcessor();
