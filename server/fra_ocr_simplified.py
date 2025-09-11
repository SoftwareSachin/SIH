#!/usr/bin/env python3
"""
Simplified FRA OCR Engine - Focus on Quality Over Complexity
Designed specifically for Forest Rights Act document digitization
Prioritizes clear, readable text extraction over complex optimizations
"""

import sys
import json
import time
import os
import re
from pathlib import Path
import tempfile
from typing import Dict, List, Optional, Any, Tuple

# Graceful imports
try:
    from pdf2image import convert_from_path
    HAS_PDF_SUPPORT = True
except ImportError:
    convert_from_path = None
    HAS_PDF_SUPPORT = False

import pytesseract
from PIL import Image, ImageEnhance, ImageFilter, ImageOps

class SimplifiedFRAOCR:
    """
    Simplified Forest Rights Act OCR Engine
    Focus on clean, readable text extraction with minimal processing
    
    ✅ Basic but effective preprocessing
    ✅ Simple Tesseract configuration (PSM 6, OEM 1)
    ✅ FRA-specific entity extraction patterns
    ✅ Minimal post-processing to preserve text quality
    ✅ Multi-language support for target states
    """
    
    def __init__(self):
        # Simple language support for FRA target states
        self.languages = 'hin+ben+ori+tel+eng'
        
        # FRA entity patterns - keep the good patterns but simplify extraction
        self.fra_patterns = {
            'patta_holders': [
                r'(?:name|नाम|নাম|ନାମ|పేరు)\s*:?\s*([A-Za-z\u0900-\u097F\u0980-\u09FF\u0B00-\u0B7F\u0C00-\u0C7F\s\.]{3,50})',
                r'(?:patta\s+holder|applicant|आवेदक)\s*:?\s*([A-Za-z\u0900-\u097F\u0980-\u09FF\u0B00-\u0B7F\u0C00-\u0C7F\s\.]{3,50})',
                r'(?:श्री|श्रीमती|मोः|শ্রী|শ্রীমতী|ଶ୍ରୀ|ଶ୍ରୀମତୀ|శ్రీ|శ్రీమతి)\s+([A-Za-z\u0900-\u097F\u0980-\u09FF\u0B00-\u0B7F\u0C00-\u0C7F\s\.]{3,40})'
            ],
            'village_names': [
                r'(?:village|गांव|গ্রাম|ଗାଁ|గ్రామం|gram|ग्राम)\s*:?\s*([A-Za-z\u0900-\u097F\u0980-\u09FF\u0B00-\u0B7F\u0C00-\u0C7F\s]{2,50})'
            ],
            'survey_numbers': [
                r'(?:survey|sy|s\.no|plot|सर्वे|সর্ভে|ସର୍ଭେ|సర్వే|प्लॉट)\s*(?:no|number|संख्या)?\s*:?\s*(\d+(?:[/-]\d+)*)'
            ],
            'patta_numbers': [
                r'(?:patta|title|पट्टा|পাট্টা|ପାଟ୍ଟା|పట్టా)\s*(?:no|number|संख्या)?\s*:?\s*([A-Z0-9\/-]{2,20})'
            ],
            'claim_numbers': [
                r'(?:claim|application|दावा|আবেদন|ଦାବି|దావా)\s*(?:no|number|संख्या)?\s*:?\s*([A-Z0-9\/-]{2,20})'
            ],
            'dates': [
                r'(?:date|दिनांक|তারিখ|ତାରିଖ|తేదీ)\s*:?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
                r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})'
            ],
            'areas': [
                r'(\d+(?:\.\d+)?)\s*(?:hectare|acre|ha|ac|हेक्टेयर|एकड़|হেক্টর|ଏକର|హెక్టర్)',
                r'(?:area|क्षेत्रफल|এলাকা|କ୍ଷେତ୍ର|వైశాల్యం)\s*:?\s*(\d+(?:\.\d+)?)\s*(?:hectare|acre|ha|ac)'
            ],
            'coordinates': [
                r'(\d{1,2}[°\s]*\d{1,2}[\'\s′]*\d{0,2}["\s″]*[NSns]?)\s*[,\s]*(\d{1,3}[°\s]*\d{1,2}[\'\s′]*\d{0,2}["\s″]*[EWew]?)',
                r'(?:lat|latitude)\s*:?\s*([\d°\'"NSEWnsew\s.-]+)',
                r'(?:long|longitude)\s*:?\s*([\d°\'"NSEWnsew\s.-]+)',
                r'(\d{1,2}\.\d{4,6})[,\s]+(\d{1,3}\.\d{4,6})'
            ]
        }
        
        print("✅ Simplified FRA OCR Engine initialized", file=sys.stderr)
        print(f"✅ PDF support: {'Yes' if HAS_PDF_SUPPORT else 'No'}", file=sys.stderr)

    def basic_preprocessing(self, image: Image.Image) -> Image.Image:
        """
        Basic preprocessing - only essential improvements
        """
        try:
            # Convert to RGB if needed
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Basic upscaling if image is very small
            width, height = image.size
            if width < 1000 or height < 1000:
                scale = max(1000/width, 1000/height)
                new_width = int(width * scale)
                new_height = int(height * scale)
                image = image.resize((new_width, new_height), Image.Resampling.LANCZOS)
                print(f"✅ Upscaled image to {new_width}x{new_height}", file=sys.stderr)
            
            # Very light contrast enhancement only if needed
            enhancer = ImageEnhance.Contrast(image)
            image = enhancer.enhance(1.1)  # Very subtle
            
            print("✅ Basic preprocessing completed", file=sys.stderr)
            return image
            
        except Exception as e:
            print(f"Preprocessing failed: {e}. Using original image.", file=sys.stderr)
            return image

    def extract_text_simple(self, image: Image.Image) -> Tuple[str, float, str]:
        """
        Simple, reliable text extraction using basic Tesseract settings
        """
        try:
            # Get available languages
            available_langs = pytesseract.get_languages()
            lang_parts = self.languages.split('+')
            filtered_langs = [lang for lang in lang_parts if lang in available_langs]
            
            if not filtered_langs:
                filtered_langs = ['eng']
            
            final_lang = '+'.join(filtered_langs)
            
            # Simple, proven Tesseract configuration
            config = '--oem 1 --psm 6'  # LSTM engine, uniform block of text
            
            print(f"🔍 OCR with language: {final_lang}, config: {config}", file=sys.stderr)
            
            # Extract text with confidence
            data = pytesseract.image_to_data(image, lang=final_lang, config=config, output_type=pytesseract.Output.DICT)
            
            # Calculate average confidence
            confidences = [int(conf) for conf in data['conf'] if int(conf) > 0]
            avg_confidence = sum(confidences) / len(confidences) if confidences else 0
            
            # Extract text
            text = pytesseract.image_to_string(image, lang=final_lang, config=config)
            
            print(f"✅ OCR completed, confidence: {avg_confidence:.1f}%", file=sys.stderr)
            return text.strip(), avg_confidence, final_lang
            
        except Exception as e:
            print(f"OCR extraction failed: {e}", file=sys.stderr)
            # Fallback to English only
            try:
                text = pytesseract.image_to_string(image, lang='eng', config='--oem 1 --psm 6')
                return text.strip(), 50.0, 'eng'  # Assume moderate confidence for fallback
            except:
                return "", 0.0, 'eng'

    def extract_fra_entities(self, text: str) -> Dict[str, List[str]]:
        """
        Simple entity extraction using FRA patterns
        """
        entities = {}
        
        for entity_type, patterns in self.fra_patterns.items():
            matches = []
            
            for pattern in patterns:
                try:
                    found = re.findall(pattern, text, re.IGNORECASE | re.MULTILINE)
                    
                    for match in found:
                        if isinstance(match, tuple):
                            # Handle coordinate pairs or multi-group matches
                            if entity_type == 'coordinates' and len(match) == 2:
                                coord_pair = f"{match[0].strip()}, {match[1].strip()}"
                                if len(coord_pair) > 3:
                                    matches.append(coord_pair)
                            else:
                                # Take the first non-empty group
                                for group in match:
                                    if group and len(group.strip()) > 1:
                                        matches.append(group.strip())
                                        break
                        elif isinstance(match, str) and len(match.strip()) > 1:
                            matches.append(match.strip())
                            
                except Exception as e:
                    print(f"Pattern matching failed for {entity_type}: {e}", file=sys.stderr)
                    continue
            
            # Clean and deduplicate
            clean_matches = []
            for match in matches:
                cleaned = match.strip()
                if len(cleaned) > 1 and cleaned not in clean_matches:
                    clean_matches.append(cleaned)
            
            entities[entity_type] = clean_matches[:5]  # Limit to top 5 matches
        
        return entities

    def basic_text_cleanup(self, text: str) -> str:
        """
        Basic text cleanup - minimal but effective
        """
        try:
            # Remove excessive whitespace
            cleaned = re.sub(r'\s+', ' ', text)
            cleaned = re.sub(r'\n\s*\n', '\n', cleaned)
            
            # Fix common OCR issues for key FRA terms
            fra_fixes = {
                r'(?i)FORE[ST]+\s*RIGH[TS]?\s*ACT': 'FOREST RIGHTS ACT',
                r'(?i)FORE[ST]+\s*RIGHT[S]?': 'FOREST RIGHTS',
                r'(?i)PATT[A4]': 'PATTA',
                r'(?i)SURVEY\s*N[0O]': 'Survey No',
                r'(?i)NAME\s*[:.]': 'Name:',
                r'(?i)VILLAGE\s*[:.]': 'Village:',
                r'(?i)DATE\s*[:.]': 'Date:'
            }
            
            for pattern, replacement in fra_fixes.items():
                cleaned = re.sub(pattern, replacement, cleaned)
            
            return cleaned.strip()
            
        except Exception as e:
            print(f"Text cleanup failed: {e}", file=sys.stderr)
            return text

    def process_fra_document(self, file_path: str) -> Dict[str, Any]:
        """
        Main processing method - simplified and reliable
        """
        try:
            start_time = time.time()
            print(f"🔄 Processing: {file_path}", file=sys.stderr)
            
            # Load image
            if file_path.lower().endswith('.pdf'):
                if not HAS_PDF_SUPPORT:
                    return {
                        'success': False,
                        'error': 'PDF support not available. Install pdf2image.',
                        'text': '',
                        'entities': {},
                        'confidence': 0
                    }
                
                # Convert PDF to image (first page only for simplicity)
                images = convert_from_path(file_path, first_page=1, last_page=1, dpi=300)
                if not images:
                    raise Exception("Could not convert PDF to image")
                image = images[0]
            else:
                image = Image.open(file_path)
            
            # Basic preprocessing
            processed_image = self.basic_preprocessing(image)
            
            # Extract text
            text, confidence, final_lang = self.extract_text_simple(processed_image)
            
            # Basic cleanup
            cleaned_text = self.basic_text_cleanup(text)
            
            # Extract entities
            entities = self.extract_fra_entities(cleaned_text)
            
            processing_time = time.time() - start_time
            
            # Simple quality assessment
            has_fra_content = any(keyword in cleaned_text.upper() for keyword in 
                                ['FOREST', 'RIGHTS', 'PATTA', 'CLAIM', 'SURVEY'])
            
            # Format output to match expected interface
            result = {
                'type': 'fra_single',
                'success': True,
                'text': cleaned_text,
                'entities': entities,
                'confidence': round(confidence, 2),
                'quality_score': round(confidence, 2),
                'processing_time': round(processing_time, 2),
                'language': final_lang,
                'method': 'Simplified-FRA-OCR-Engine',
                'document_classification': 'forest_rights_document' if has_fra_content else 'unknown',
                'has_fra_content': has_fra_content,
                'word_count': len(cleaned_text.split()),
                'metadata': {
                    'file_path': file_path,
                    'image_size': f"{image.width}x{image.height}",
                    'processed_size': f"{processed_image.width}x{processed_image.height}",
                    'languages_used': self.languages,
                    'strategy_used': 'simplified_processing'
                }
            }
            
            print(f"✅ Processing completed in {processing_time:.2f}s", file=sys.stderr)
            print(f"✅ Confidence: {confidence:.1f}%, Words: {len(cleaned_text.split())}", file=sys.stderr)
            print(f"✅ Entities found: {sum(len(entities[k]) for k in entities)}", file=sys.stderr)
            
            return result
            
        except Exception as e:
            print(f"❌ Processing failed: {e}", file=sys.stderr)
            return {
                'type': 'error',
                'success': False,
                'error': str(e),
                'text': '',
                'entities': {},
                'confidence': 0,
                'processing_time': 0
            }

    def process_fra_batch(self, file_paths: List[str]) -> Dict[str, Any]:
        """
        Simple batch processing
        """
        results = []
        start_time = time.time()
        
        for file_path in file_paths:
            result = self.process_fra_document(file_path)
            results.append(result)
        
        total_time = time.time() - start_time
        successful = [r for r in results if r.get('success', False)]
        
        return {
            'type': 'fra_batch',
            'results': results,
            'total_pages': len(file_paths),
            'total_processing_time': round(total_time, 2),
            'average_quality_score': round(sum(r.get('confidence', 0) for r in successful) / len(successful), 2) if successful else 0,
            'aggregated_entities': self._aggregate_entities(successful),
            'document_classification': 'forest_rights_batch',
            'summary': {
                'total_files': len(file_paths),
                'successful': len(successful),
                'failed': len(file_paths) - len(successful),
                'total_time': round(total_time, 2),
                'avg_confidence': round(sum(r.get('confidence', 0) for r in successful) / len(successful), 2) if successful else 0
            }
        }

    def _aggregate_entities(self, successful_results: List[Dict]) -> Dict[str, List[str]]:
        """
        Aggregate entities from multiple successful results
        """
        aggregated = {}
        
        for result in successful_results:
            entities = result.get('entities', {})
            for entity_type, values in entities.items():
                if entity_type not in aggregated:
                    aggregated[entity_type] = []
                if isinstance(values, list):
                    aggregated[entity_type].extend(values)
                elif values:
                    aggregated[entity_type].append(values)
        
        # Deduplicate and limit
        for entity_type in aggregated:
            aggregated[entity_type] = list(set(aggregated[entity_type]))[:10]
        
        return aggregated

# Main execution
if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({
            'success': False,
            'error': 'Usage: python fra_ocr_simplified.py <file_path> [file_path2] ...'
        }))
        sys.exit(1)
    
    file_paths = sys.argv[1:]
    
    # Check if files exist
    for file_path in file_paths:
        if not os.path.exists(file_path):
            print(json.dumps({
                'success': False,
                'error': f'File not found: {file_path}'
            }))
            sys.exit(1)
    
    # Initialize simplified FRA OCR engine
    ocr_engine = SimplifiedFRAOCR()
    
    if len(file_paths) == 1:
        # Single file processing
        result = ocr_engine.process_fra_document(file_paths[0])
    else:
        # Batch processing
        result = ocr_engine.process_fra_batch(file_paths)
    
    # Output JSON result
    print(json.dumps(result, ensure_ascii=False, indent=2))