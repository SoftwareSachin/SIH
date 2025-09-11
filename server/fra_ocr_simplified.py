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
        # Optimized language support for faster processing (can be extended)
        self.languages = 'eng+hin'  # Start with essential languages for better performance
        
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

    def extract_text_dual_pass(self, image: Image.Image) -> Tuple[str, float, str, Dict[str, Any]]:
        """
        Dual-pass OCR strategy for comprehensive FRA field extraction:
        Pass 1: PSM 6 for headers/general text
        Pass 2: PSM 3 for structured tables/forms when entities are missing
        """
        try:
            # Get available languages
            available_langs = pytesseract.get_languages()
            lang_parts = self.languages.split('+')
            filtered_langs = [lang for lang in lang_parts if lang in available_langs]
            
            if not filtered_langs:
                filtered_langs = ['eng']
            
            final_lang = '+'.join(filtered_langs)
            
            print(f"🔍 Dual-pass OCR with language: {final_lang}", file=sys.stderr)
            
            # PASS 1: PSM 6 for general text and headers
            config1 = '--oem 1 --psm 6'  # LSTM engine, uniform block of text
            
            print(f"📋 Pass 1: General text extraction (PSM 6)", file=sys.stderr)
            text1 = pytesseract.image_to_string(image, lang=final_lang, config=config1).strip()
            data1 = pytesseract.image_to_data(image, lang=final_lang, config=config1, output_type=pytesseract.Output.DICT)
            
            confidences1 = [int(conf) for conf in data1['conf'] if int(conf) > 0]
            avg_confidence1 = sum(confidences1) / len(confidences1) if confidences1 else 0
            
            # Quick entity extraction to assess Pass 1 completeness
            entities1 = self.extract_fra_entities_enhanced(text1)
            
            # PASS 2: PSM 3 for structured tables/forms
            config2 = '--oem 1 --psm 3'  # Fully automatic page segmentation, but no OSD
            
            print(f"🗂️ Pass 2: Structured data extraction (PSM 3)", file=sys.stderr)
            text2 = pytesseract.image_to_string(image, lang=final_lang, config=config2).strip()
            data2 = pytesseract.image_to_data(image, lang=final_lang, config=config2, output_type=pytesseract.Output.DICT)
            
            confidences2 = [int(conf) for conf in data2['conf'] if int(conf) > 0]
            avg_confidence2 = sum(confidences2) / len(confidences2) if confidences2 else 0
            
            # Extract entities from Pass 2
            entities2 = self.extract_fra_entities_enhanced(text2)
            
            # Combine and choose the best result
            combined_text, final_confidence, final_entities, pass_info = self._choose_best_pass(
                text1, text2, avg_confidence1, avg_confidence2, entities1, entities2
            )
            
            print(f"✅ Dual-pass OCR completed: {final_confidence:.1f}% confidence", file=sys.stderr)
            print(f"📊 Used: {pass_info['strategy']}, Entities found: {pass_info['entity_count']}", file=sys.stderr)
            
            return combined_text, final_confidence, final_lang, {
                'pass_info': pass_info,
                'entities': final_entities,
                'pass1_confidence': avg_confidence1,
                'pass2_confidence': avg_confidence2
            }
            
        except Exception as e:
            print(f"Dual-pass OCR failed: {e}", file=sys.stderr)
            # Fallback to simple extraction
            try:
                text = pytesseract.image_to_string(image, lang='eng', config='--oem 1 --psm 6')
                return text.strip(), 50.0, 'eng', {'pass_info': {'strategy': 'fallback'}, 'entities': {}}
            except:
                return "", 0.0, 'eng', {'pass_info': {'strategy': 'failed'}, 'entities': {}}

    def extract_fra_entities_enhanced(self, text: str) -> Dict[str, List[str]]:
        """
        Enhanced entity extraction with line-based parsing and field-specific processing
        """
        entities = {}
        
        # First pass: Use enhanced patterns for better field capture
        enhanced_patterns = {
            'patta_holders': [
                # Enhanced name patterns with better field extraction
                r'(?:name|claimant|applicant)\s*:?\s*([A-Za-z\u0900-\u097F\u0980-\u09FF\u0B00-\u0B7F\u0C00-\u0C7F\s\.]{3,50})',
                r'(?:patta\s+holder|applicant)\s*:?\s*([A-Za-z\u0900-\u097F\u0980-\u09FF\u0B00-\u0B7F\u0C00-\u0C7F\s\.]{3,50})',
                # Line-based patterns for better field capture
                r'Name\s*:\s*([^\n\r]+)',
                r'Claimant\s*:\s*([^\n\r]+)',
                r'Applicant\s*:\s*([^\n\r]+)',
                # Common name patterns
                r'\b([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b',
            ],
            'village_names': [
                r'(?:village|gram)\s*:?\s*([A-Za-z\u0900-\u097F\u0980-\u09FF\u0B00-\u0B7F\u0C00-\u0C7F\s]{2,50})',
                r'Village\s*:\s*([^\n\r]+)',
                r'(?:vill|gram)\s*[:-]\s*([A-Za-z\u0900-\u097F\u0980-\u09FF\u0B00-\u0B7F\u0C00-\u0C7F\s]{2,30})',
                r'(?:of|in)\s+village\s+([A-Za-z\u0900-\u097F\u0980-\u09FF\u0B00-\u0B7F\u0C00-\u0C7F\s]{2,30})'
            ],
            'survey_numbers': [
                r'(?:survey|sy|s\.no|plot)\s*(?:no|number)?\s*:?\s*(\d+(?:[/-]\d+)*)',
                r'Survey\s*No\.?\s*:?\s*(\d+(?:[/-]\d+)*)',
                r'S\.?\s*No\.?\s*:?\s*(\d+(?:[/-]\d+)*)',
                r'Plot\s*No\.?\s*:?\s*(\d+(?:[/-]\d+)*)'
            ],
            'patta_numbers': [
                r'(?:patta|title)\s*(?:no|number)?\s*:?\s*([A-Z0-9\/-]{2,20})',
                r'Patta\s*No\.?\s*:?\s*([A-Z0-9\/-]{2,20})',
                r'Title\s*No\.?\s*:?\s*([A-Z0-9\/-]{2,20})',
                r'Patta\s*Number\s*:?\s*([A-Z0-9\/-]{2,20})'
            ],
            'claim_numbers': [
                r'(?:claim|application)\s*(?:no|number)?\s*:?\s*([A-Z0-9\/-]{2,20})',
                r'Claim\s*No\.?\s*:?\s*([A-Z0-9\/-]{2,20})',
                r'Application\s*No\.?\s*:?\s*([A-Z0-9\/-]{2,20})'
            ],
            'dates': [
                r'(?:date)\s*:?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
                r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
                r'Date\s*:?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})'
            ],
            'areas': [
                r'(\d+(?:\.\d+)?)\s*(?:hectare|acre|ha|ac)',
                r'(?:area)\s*:?\s*(\d+(?:\.\d+)?)\s*(?:hectare|acre|ha|ac)',
                r'Area\s*:?\s*(\d+(?:\.\d+)?)\s*(?:hectare|acre|ha|ac)'
            ],
            'states': [
                r'State\s*:?\s*([A-Za-z\u0900-\u097F\u0980-\u09FF\u0B00-\u0B7F\u0C00-\u0C7F\s]{2,30})',
                r'(?:Madhya\s+Pradesh|Odisha|Jharkhand|Chhattisgarh|Assam|West\s+Bengal|Telangana)'
            ],
            'rights_claimed': [
                r'Rights?\s*Claimed?\s*:?\s*([^\n\r]+)',
                r'(?:Individual|Community)\s*(?:forest\s*)?(?:dwelling|rights?)\s*\([^)]+\)',
                r'IFD\s*rights?',
                r'CFR\s*rights?'
            ]
        }
        
        for entity_type, patterns in enhanced_patterns.items():
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
        
        # Additional line-based processing for missed fields
        entities = self._enhance_with_line_parsing(text, entities)
        
        return entities

    def _choose_best_pass(self, text1: str, text2: str, conf1: float, conf2: float, 
                         entities1: Dict, entities2: Dict) -> Tuple[str, float, Dict, Dict]:
        """
        Choose the best OCR pass based on entity completeness and confidence
        """
        # Count meaningful entities from each pass
        entity_count1 = sum(len(entities1.get(key, [])) for key in 
                           ['patta_holders', 'village_names', 'patta_numbers', 'claim_numbers'])
        entity_count2 = sum(len(entities2.get(key, [])) for key in 
                           ['patta_holders', 'village_names', 'patta_numbers', 'claim_numbers'])
        
        # Calculate entity coverage score (0-100)
        key_fields = ['patta_holders', 'village_names', 'patta_numbers']
        coverage1 = sum(1 for field in key_fields if entities1.get(field, []))
        coverage2 = sum(1 for field in key_fields if entities2.get(field, []))
        
        # Decision logic: prioritize entity completeness over confidence
        if entity_count2 > entity_count1 + 1:  # Pass 2 significantly better
            return text2, conf2, entities2, {
                'strategy': 'pass2_structured', 
                'entity_count': entity_count2,
                'coverage': coverage2,
                'reason': f'Pass 2 found {entity_count2} vs {entity_count1} entities'
            }
        elif entity_count1 > entity_count2 + 1:  # Pass 1 significantly better
            return text1, conf1, entities1, {
                'strategy': 'pass1_general',
                'entity_count': entity_count1, 
                'coverage': coverage1,
                'reason': f'Pass 1 found {entity_count1} vs {entity_count2} entities'
            }
        elif coverage2 > coverage1:  # Pass 2 covers more key fields
            return text2, conf2, entities2, {
                'strategy': 'pass2_coverage',
                'entity_count': entity_count2,
                'coverage': coverage2,
                'reason': f'Pass 2 covers {coverage2} vs {coverage1} key fields'
            }
        elif conf1 > conf2 + 10:  # Pass 1 much more confident
            return text1, conf1, entities1, {
                'strategy': 'pass1_confidence',
                'entity_count': entity_count1,
                'coverage': coverage1,
                'reason': f'Pass 1 confidence {conf1:.1f}% vs {conf2:.1f}%'
            }
        else:  # Default to Pass 1
            return text1, conf1, entities1, {
                'strategy': 'pass1_default',
                'entity_count': entity_count1,
                'coverage': coverage1,
                'reason': 'Default to general text extraction'
            }

    def _enhance_with_line_parsing(self, text: str, entities: Dict) -> Dict:
        """
        Enhanced line-based parsing around matched headers to capture missed field values
        """
        lines = text.split('\\n')
        enhanced_entities = entities.copy()
        
        for i, line in enumerate(lines):
            line = line.strip()
            if not line:
                continue
                
            # Look for field labels and extract values from same line or next line
            if re.search(r'(?i)name\\s*:', line):
                # Extract name from same line or next line
                name_match = re.search(r'(?i)name\\s*:?\\s*(.+)', line)
                if name_match and name_match.group(1).strip():
                    name = name_match.group(1).strip()
                    if len(name) > 2 and name not in enhanced_entities.get('patta_holders', []):
                        enhanced_entities.setdefault('patta_holders', []).append(name)
                elif i + 1 < len(lines):  # Check next line
                    next_line = lines[i + 1].strip()
                    if next_line and len(next_line) > 2:
                        enhanced_entities.setdefault('patta_holders', []).append(next_line)
            
            elif re.search(r'(?i)village\\s*:', line):
                village_match = re.search(r'(?i)village\\s*:?\\s*(.+)', line)
                if village_match and village_match.group(1).strip():
                    village = village_match.group(1).strip()
                    if len(village) > 2 and village not in enhanced_entities.get('village_names', []):
                        enhanced_entities.setdefault('village_names', []).append(village)
                elif i + 1 < len(lines):
                    next_line = lines[i + 1].strip()
                    if next_line and len(next_line) > 2:
                        enhanced_entities.setdefault('village_names', []).append(next_line)
            
            elif re.search(r'(?i)patta\\s*(?:no|number)', line):
                patta_match = re.search(r'(?i)patta\\s*(?:no|number)\\s*:?\\s*([A-Z0-9\\/-]+)', line)
                if patta_match and patta_match.group(1).strip():
                    patta = patta_match.group(1).strip()
                    if len(patta) > 1 and patta not in enhanced_entities.get('patta_numbers', []):
                        enhanced_entities.setdefault('patta_numbers', []).append(patta)
                elif i + 1 < len(lines):
                    next_line = lines[i + 1].strip()
                    patta_match_next = re.search(r'^([A-Z0-9\\/-]{2,20})$', next_line)
                    if patta_match_next:
                        enhanced_entities.setdefault('patta_numbers', []).append(patta_match_next.group(1))
            
            elif re.search(r'(?i)claim\\s*(?:no|number)', line):
                claim_match = re.search(r'(?i)claim\\s*(?:no|number)\\s*:?\\s*([A-Z0-9\\/-]+)', line)
                if claim_match and claim_match.group(1).strip():
                    claim = claim_match.group(1).strip()
                    if len(claim) > 1 and claim not in enhanced_entities.get('claim_numbers', []):
                        enhanced_entities.setdefault('claim_numbers', []).append(claim)
            
            elif re.search(r'(?i)state\\s*:', line):
                state_match = re.search(r'(?i)state\\s*:?\\s*(.+)', line)
                if state_match and state_match.group(1).strip():
                    state = state_match.group(1).strip()
                    if len(state) > 2 and state not in enhanced_entities.get('states', []):
                        enhanced_entities.setdefault('states', []).append(state)
        
        return enhanced_entities

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
            
            # Extract text using dual-pass OCR approach
            text, confidence, final_lang, ocr_metadata = self.extract_text_dual_pass(processed_image)
            
            # Basic cleanup
            cleaned_text = self.basic_text_cleanup(text)
            
            # Extract entities (already done in dual-pass but extract again from cleaned text)
            entities = self.extract_fra_entities_enhanced(cleaned_text)
            
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
                'method': 'Dual-Pass-Enhanced-FRA-OCR',
                'document_classification': 'forest_rights_document' if has_fra_content else 'unknown',
                'has_fra_content': has_fra_content,
                'word_count': len(cleaned_text.split()),
                'metadata': {
                    'file_path': file_path,
                    'image_size': f"{image.width}x{image.height}",
                    'processed_size': f"{processed_image.width}x{processed_image.height}",
                    'languages_used': self.languages,
                    'strategy_used': 'dual_pass_enhanced',
                    'ocr_strategy': ocr_metadata.get('pass_info', {}).get('strategy', 'unknown'),
                    'pass1_confidence': ocr_metadata.get('pass1_confidence', 0),
                    'pass2_confidence': ocr_metadata.get('pass2_confidence', 0),
                    'entity_coverage': ocr_metadata.get('pass_info', {}).get('coverage', 0)
                }
            }
            
            print(f"✅ Dual-pass OCR completed in {processing_time:.2f}s", file=sys.stderr)
            print(f"✅ Strategy: {ocr_metadata.get('pass_info', {}).get('strategy', 'unknown')}", file=sys.stderr)
            print(f"✅ Confidence: {confidence:.1f}%, Words: {len(cleaned_text.split())}", file=sys.stderr)
            print(f"✅ Entities found: {sum(len(entities[k]) for k in entities)}", file=sys.stderr)
            print(f"✅ Key fields coverage: {ocr_metadata.get('pass_info', {}).get('coverage', 0)}/3", file=sys.stderr)
            
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