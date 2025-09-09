import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

export interface LocalOCRResult {
  text: string;
  confidence: number;
  method: string;
  processingTime: number;
  layout?: any[];
  bboxes?: any[];
}

/**
 * PaddleOCR Engine - Best for multi-script Indian documents
 */
export class PaddleOCREngine {
  
  static async process(imagePath: string, language: string = 'en'): Promise<LocalOCRResult> {
    const startTime = Date.now();
    
    try {
      const pythonScript = `
import sys
import json
from paddleocr import PaddleOCR

# Initialize PaddleOCR with multi-language support
ocr = PaddleOCR(
    use_angle_cls=True, 
    lang='${language}',
    show_log=False,
    use_gpu=True if hasattr(ocr, 'use_gpu') else False
)

# Process image
result = ocr.ocr('${imagePath}', cls=True)

# Extract text and confidence
texts = []
confidences = []
layout_info = []

for idx, res in enumerate(result):
    if res:
        for line in res:
            bbox, (text, conf) = line
            texts.append(text)
            confidences.append(conf)
            layout_info.append({
                'bbox': bbox,
                'text': text,
                'confidence': conf
            })

# Calculate overall confidence
avg_confidence = sum(confidences) / len(confidences) if confidences else 0

output = {
    'text': '\\n'.join(texts),
    'confidence': avg_confidence * 100,
    'layout': layout_info
}

print(json.dumps(output))
`;

      const { stdout } = await execAsync(`python3 -c "${pythonScript.replace(/"/g, '\\"')}"`);
      const result = JSON.parse(stdout.trim());
      
      return {
        text: result.text,
        confidence: Math.round(result.confidence),
        method: 'paddle-ocr',
        processingTime: Date.now() - startTime,
        layout: result.layout || [],
        bboxes: result.layout?.map((item: any) => item.bbox) || []
      };
      
    } catch (error) {
      console.error('PaddleOCR processing failed:', error);
      throw error;
    }
  }
}

/**
 * EasyOCR Engine - Good alternative for multi-script recognition
 */
export class EasyOCREngine {
  
  static async process(imagePath: string, languages: string[] = ['en', 'hi']): Promise<LocalOCRResult> {
    const startTime = Date.now();
    
    try {
      const pythonScript = `
import sys
import json
import easyocr

# Initialize EasyOCR with specified languages
reader = easyocr.Reader(${JSON.stringify(languages)}, gpu=True)

# Process image
result = reader.readtext('${imagePath}')

# Extract text and confidence
texts = []
confidences = []
layout_info = []

for (bbox, text, conf) in result:
    texts.append(text)
    confidences.append(conf)
    layout_info.append({
        'bbox': bbox,
        'text': text,
        'confidence': conf
    })

# Calculate overall confidence
avg_confidence = sum(confidences) / len(confidences) if confidences else 0

output = {
    'text': '\\n'.join(texts),
    'confidence': avg_confidence * 100,
    'layout': layout_info
}

print(json.dumps(output))
`;

      const { stdout } = await execAsync(`python3 -c "${pythonScript.replace(/"/g, '\\"')}"`);
      const result = JSON.parse(stdout.trim());
      
      return {
        text: result.text,
        confidence: Math.round(result.confidence),
        method: 'easy-ocr',
        processingTime: Date.now() - startTime,
        layout: result.layout || [],
        bboxes: result.layout?.map((item: any) => item.bbox) || []
      };
      
    } catch (error) {
      console.error('EasyOCR processing failed:', error);
      throw error;
    }
  }
}

/**
 * TrOCR Engine - Specialized for handwritten text recognition
 */
export class TrOCREngine {
  
  static async processHandwriting(imagePath: string): Promise<LocalOCRResult> {
    const startTime = Date.now();
    
    try {
      const pythonScript = `
import sys
import json
from transformers import TrOCRProcessor, VisionEncoderDecoderModel
from PIL import Image

# Load pre-trained TrOCR model for handwritten text
processor = TrOCRProcessor.from_pretrained("microsoft/trocr-base-handwritten")
model = VisionEncoderDecoderModel.from_pretrained("microsoft/trocr-base-handwritten")

# Process image
image = Image.open('${imagePath}').convert('RGB')
pixel_values = processor(image, return_tensors="pt").pixel_values

# Generate text
generated_ids = model.generate(pixel_values, max_length=200)
transcription = processor.batch_decode(generated_ids, skip_special_tokens=True)[0]

# Estimate confidence based on text characteristics
confidence = 75  # Base confidence for TrOCR
if len(transcription) > 20:
    confidence += 10
if any(char.isalpha() for char in transcription):
    confidence += 10
if any(char.isdigit() for char in transcription):
    confidence += 5

output = {
    'text': transcription,
    'confidence': min(95, confidence)
}

print(json.dumps(output))
`;

      const { stdout } = await execAsync(`python3 -c "${pythonScript.replace(/"/g, '\\"')}"`);
      const result = JSON.parse(stdout.trim());
      
      return {
        text: result.text,
        confidence: result.confidence,
        method: 'trocr-handwriting',
        processingTime: Date.now() - startTime
      };
      
    } catch (error) {
      console.error('TrOCR processing failed:', error);
      throw error;
    }
  }
  
  /**
   * Process printed text with TrOCR printed model
   */
  static async processPrinted(imagePath: string): Promise<LocalOCRResult> {
    const startTime = Date.now();
    
    try {
      const pythonScript = `
import sys
import json
from transformers import TrOCRProcessor, VisionEncoderDecoderModel
from PIL import Image

# Load pre-trained TrOCR model for printed text
processor = TrOCRProcessor.from_pretrained("microsoft/trocr-base-printed")
model = VisionEncoderDecoderModel.from_pretrained("microsoft/trocr-base-printed")

# Process image
image = Image.open('${imagePath}').convert('RGB')
pixel_values = processor(image, return_tensors="pt").pixel_values

# Generate text
generated_ids = model.generate(pixel_values, max_length=300)
transcription = processor.batch_decode(generated_ids, skip_special_tokens=True)[0]

# Estimate confidence
confidence = 80  # Base confidence for printed TrOCR
if len(transcription) > 50:
    confidence += 10
if '\\n' in transcription or ':' in transcription:
    confidence += 5

output = {
    'text': transcription,
    'confidence': min(95, confidence)
}

print(json.dumps(output))
`;

      const { stdout } = await execAsync(`python3 -c "${pythonScript.replace(/"/g, '\\"')}"`);
      const result = JSON.parse(stdout.trim());
      
      return {
        text: result.text,
        confidence: result.confidence,
        method: 'trocr-printed',
        processingTime: Date.now() - startTime
      };
      
    } catch (error) {
      console.error('TrOCR printed processing failed:', error);
      throw error;
    }
  }
}

/**
 * Language mapping utilities
 */
export class LanguageMapper {
  
  static mapScriptToLanguages(scriptType: string): string[] {
    const languageMap: Record<string, string[]> = {
      'devanagari': ['hi', 'mr', 'ne'],
      'bengali': ['bn'],
      'gujarati': ['gu'],
      'telugu': ['te'],
      'tamil': ['ta'],
      'kannada': ['kn'],
      'malayalam': ['ml'],
      'odia': ['or'],
      'marathi': ['mr'],
      'urdu': ['ur'],
      'latin': ['en'],
      'mixed': ['en', 'hi']
    };
    
    return languageMap[scriptType] || ['en', 'hi'];
  }
  
  static mapToPaddleLanguage(scriptType: string): string {
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
    
    return languageMap[scriptType] || 'en';
  }
}