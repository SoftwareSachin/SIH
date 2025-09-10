#!/usr/bin/env python3
"""
FRA-Specialized OCR Engine
Designed specifically for Forest Rights Act document digitization
Supports: Madhya Pradesh, Tripura, Odisha, Telangana
"""

import sys
import json
import time
import os
import re
from pathlib import Path
import tempfile
from typing import Dict, List, Optional, Any, Tuple

import cv2
import numpy as np
import pytesseract
from PIL import Image, ImageEnhance, ImageFilter, ImageOps, ImageDraw
from pdf2image import convert_from_path

class FRADocumentOCR:
    """
    Specialized OCR engine for Forest Rights Act documents
    Optimized for government forms, multi-language support, and FRA-specific entity extraction
    """
    
    def __init__(self):
        # State-specific language mapping for FRA target states
        self.state_languages = {
            'madhya_pradesh': 'hin+eng',  # Hindi + English
            'tripura': 'ben+eng',         # Bengali + English  
            'odisha': 'ori+eng',          # Odia + English
            'telangana': 'tel+eng'        # Telugu + English
        }
        
        # Default multi-language support for all target states
        self.default_languages = 'hin+ben+ori+tel+eng'
        
        # FRA document types and their processing strategies
        self.document_types = {
            'individual_forest_rights': {
                'psm': 6,  # Uniform block of text
                'preprocessing': 'government_form',
                'entities': ['claimant_name', 'village', 'survey_number', 'area', 'coordinates']
            },
            'community_rights': {
                'psm': 4,  # Single column of text
                'preprocessing': 'government_form',
                'entities': ['community_name', 'village', 'forest_area', 'boundaries']
            },
            'community_forest_resource': {
                'psm': 3,  # Fully automatic
                'preprocessing': 'mixed_content',
                'entities': ['cfr_committee', 'forest_boundary', 'management_plan']
            },
            'patta_document': {
                'psm': 6,  # Uniform block
                'preprocessing': 'official_document',
                'entities': ['patta_number', 'holder_name', 'survey_number', 'area_granted']
            },
            'verification_report': {
                'psm': 3,  # Fully automatic
                'preprocessing': 'mixed_content',
                'entities': ['verification_officer', 'verification_date', 'status', 'remarks']
            }
        }

    def preprocess_fra_document(self, image: Image.Image, doc_type: str = "government_form") -> Image.Image:
        """
        Advanced preprocessing specifically for FRA government documents
        """
        try:
            # Convert to RGB if needed
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Convert PIL to OpenCV format
            cv_image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
            
            if doc_type == "government_form":
                cv_image = self._preprocess_government_form(cv_image)
            elif doc_type == "official_document":
                cv_image = self._preprocess_official_document(cv_image)
            elif doc_type == "mixed_content":
                cv_image = self._preprocess_mixed_content(cv_image)
            elif doc_type == "handwritten_form":
                cv_image = self._preprocess_handwritten_form(cv_image)
            else:
                cv_image = self._preprocess_government_form(cv_image)  # Default
            
            # Convert back to PIL
            processed_image = Image.fromarray(cv2.cvtColor(cv_image, cv2.COLOR_BGR2RGB))
            return processed_image
            
        except Exception as e:
            print(f"Warning: FRA preprocessing failed: {e}. Using original image.", file=sys.stderr)
            return image

    def _preprocess_government_form(self, image: np.ndarray) -> np.ndarray:
        """Optimized for printed government forms with boxes and fields"""
        # Convert to grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Remove form lines and boxes that interfere with OCR
        horizontal_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (40, 1))
        vertical_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, 40))
        
        # Detect and remove horizontal/vertical lines
        horizontal_lines = cv2.morphologyEx(gray, cv2.MORPH_OPEN, horizontal_kernel)
        vertical_lines = cv2.morphologyEx(gray, cv2.MORPH_OPEN, vertical_kernel)
        
        # Create mask for form structure
        form_mask = cv2.add(horizontal_lines, vertical_lines)
        
        # Remove form structure from image
        gray_clean = cv2.subtract(gray, form_mask)
        
        # Enhance text contrast
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8,8))
        enhanced = clahe.apply(gray_clean)
        
        # Noise reduction specifically for government stamps/seals
        denoised = cv2.bilateralFilter(enhanced, 9, 75, 75)
        
        # Adaptive thresholding for mixed print quality
        binary = cv2.adaptiveThreshold(
            denoised, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 15, 4
        )
        
        # Morphological cleaning for better character recognition
        kernel = np.ones((1,1), np.uint8)
        cleaned = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)
        
        return cv2.cvtColor(cleaned, cv2.COLOR_GRAY2BGR)

    def _preprocess_official_document(self, image: np.ndarray) -> np.ndarray:
        """Optimized for official pattas and certificates"""
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Handle official seals and watermarks
        # Use top-hat morphological operation to enhance text
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
        tophat = cv2.morphologyEx(gray, cv2.MORPH_TOPHAT, kernel)
        
        # Enhance contrast for faded official documents
        enhanced = cv2.add(gray, tophat)
        
        # CLAHE for better contrast in aged documents
        clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8,8))
        enhanced = clahe.apply(enhanced)
        
        # Gaussian blur to reduce noise from seals/stamps
        blurred = cv2.GaussianBlur(enhanced, (3, 3), 0)
        
        # Otsu's thresholding for official document quality
        _, binary = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        
        return cv2.cvtColor(binary, cv2.COLOR_GRAY2BGR)

    def _preprocess_mixed_content(self, image: np.ndarray) -> np.ndarray:
        """Optimized for documents with both printed and handwritten content"""
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Edge-preserving filter to maintain handwriting details
        filtered = cv2.edgePreservingFilter(gray, flags=2, sigma_s=50, sigma_r=0.4)
        
        # Gentle denoising to preserve handwriting strokes
        denoised = cv2.fastNlMeansDenoising(filtered, h=10)
        
        # Adaptive contrast enhancement
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
        enhanced = clahe.apply(denoised)
        
        # Adaptive thresholding with larger neighborhood for mixed content
        binary = cv2.adaptiveThreshold(
            enhanced, 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY, 21, 8
        )
        
        return cv2.cvtColor(binary, cv2.COLOR_GRAY2BGR)

    def _preprocess_handwritten_form(self, image: np.ndarray) -> np.ndarray:
        """Specialized for handwritten entries in FRA forms"""
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Preserve fine handwriting details
        denoised = cv2.bilateralFilter(gray, 5, 80, 80)
        
        # Enhance handwriting strokes
        kernel = np.array([[-1,-1,-1], [-1,9,-1], [-1,-1,-1]])
        sharpened = cv2.filter2D(denoised, -1, kernel)
        
        # Histogram equalization for better contrast
        equalized = cv2.equalizeHist(sharpened)
        
        # Adaptive thresholding optimized for handwriting
        binary = cv2.adaptiveThreshold(
            equalized, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 19, 12
        )
        
        # Light morphological operation to connect broken characters
        kernel = np.ones((2,2), np.uint8)
        connected = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)
        
        return cv2.cvtColor(connected, cv2.COLOR_GRAY2BGR)

    def detect_document_language(self, image: Image.Image) -> str:
        """
        Detect language with bias towards FRA target state languages
        """
        try:
            # Use Tesseract's script detection
            osd_result = pytesseract.image_to_osd(image, output_type=pytesseract.Output.DICT)
            script = osd_result.get('script', '').lower()
            
            # Map scripts to FRA target languages
            script_language_map = {
                'devanagari': 'hin+eng',  # Hindi for Madhya Pradesh
                'bengali': 'ben+eng',     # Bengali for Tripura
                'oriya': 'ori+eng',       # Odia for Odisha
                'telugu': 'tel+eng',      # Telugu for Telangana
                'latin': 'eng'            # English fallback
            }
            
            detected_lang = script_language_map.get(script, self.default_languages)
            print(f"Detected script: {script} -> FRA language: {detected_lang}", file=sys.stderr)
            return detected_lang
            
        except Exception as e:
            print(f"Language detection failed: {e}. Using multi-language mode.", file=sys.stderr)
            return self.default_languages

    def extract_fra_tables(self, image: Image.Image) -> List[Dict]:
        """
        Extract tabular data commonly found in FRA documents
        """
        try:
            # Convert to OpenCV format
            cv_image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
            gray = cv2.cvtColor(cv_image, cv2.COLOR_BGR2GRAY)
            
            # Detect horizontal and vertical lines (table structure)
            horizontal_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (40, 1))
            vertical_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, 40))
            
            horizontal_lines = cv2.morphologyEx(gray, cv2.MORPH_OPEN, horizontal_kernel)
            vertical_lines = cv2.morphologyEx(gray, cv2.MORPH_OPEN, vertical_kernel)
            
            # Find table structure
            table_mask = cv2.add(horizontal_lines, vertical_lines)
            
            # Find contours (table cells)
            contours, _ = cv2.findContours(table_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            tables = []
            for contour in contours:
                x, y, w, h = cv2.boundingRect(contour)
                if w > 100 and h > 50:  # Filter small noise
                    cell_image = image.crop((x, y, x+w, y+h))
                    cell_text = pytesseract.image_to_string(cell_image, lang=self.default_languages)
                    
                    tables.append({
                        'position': {'x': x, 'y': y, 'width': w, 'height': h},
                        'text': cell_text.strip(),
                        'confidence': 85  # Table extraction confidence
                    })
            
            return tables[:20]  # Limit to 20 table cells
            
        except Exception as e:
            print(f"Table extraction failed: {e}", file=sys.stderr)
            return []

    def extract_fra_entities(self, text: str) -> Dict[str, List[str]]:
        """
        Extract FRA-specific entities using rule-based patterns
        """
        entities = {
            'patta_holders': [],
            'village_names': [],
            'survey_numbers': [],
            'coordinates': [],
            'forest_areas': [],
            'claim_numbers': [],
            'verification_dates': [],
            'boundaries': []
        }
        
        try:
            # Patta/Survey number patterns (common in FRA documents)
            survey_pattern = r'\b(?:survey|sy|s\.no|सर्वे)\s*(?:no|number|न|संख्या)?\.?\s*:?\s*(\d+(?:/\d+)*)\b'
            survey_matches = re.findall(survey_pattern, text, re.IGNORECASE)
            entities['survey_numbers'] = list(set(survey_matches))
            
            # Village name patterns (preceded by common keywords)
            village_pattern = r'(?:village|gram|गांव|ग्राम|गाव|गाँव|मौजा)\s*:?\s*([A-Za-z\u0900-\u097F\u0980-\u09FF\u0B00-\u0B7F\u0C00-\u0C7F\s]+?)(?:\s|,|\.|\n|$)'
            village_matches = re.findall(village_pattern, text, re.IGNORECASE)
            entities['village_names'] = [v.strip() for v in village_matches if len(v.strip()) > 2]
            
            # Coordinate patterns (latitude/longitude)
            coord_pattern = r'(\d{1,2}[°\s]*\d{1,2}[\'′\s]*\d{1,2}[″"\s]*[NSnsEWew]?)'
            coord_matches = re.findall(coord_pattern, text)
            entities['coordinates'] = coord_matches
            
            # Area measurements (hectares, acres)
            area_pattern = r'(\d+(?:\.\d+)?)\s*(?:hectare|acre|हेक्टेयर|एकड़|एकर|ha|ac)\b'
            area_matches = re.findall(area_pattern, text, re.IGNORECASE)
            entities['forest_areas'] = area_matches
            
            # Claim reference numbers
            claim_pattern = r'(?:claim|application|आवेदन)\s*(?:no|number|न|संख्या)\.?\s*:?\s*([A-Z0-9/-]+)'
            claim_matches = re.findall(claim_pattern, text, re.IGNORECASE)
            entities['claim_numbers'] = claim_matches
            
            # Date patterns (verification dates, etc.)
            date_pattern = r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})'
            date_matches = re.findall(date_pattern, text)
            entities['verification_dates'] = date_matches
            
            # Boundary descriptions
            boundary_pattern = r'(?:boundary|bound|सीमा|हद)\s*:?\s*([^\.]+?)(?:\.|$)'
            boundary_matches = re.findall(boundary_pattern, text, re.IGNORECASE)
            entities['boundaries'] = [b.strip() for b in boundary_matches]
            
            # Extract potential names (capitalized words, common in patta holder names)
            name_pattern = r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b'
            potential_names = re.findall(name_pattern, text)
            # Filter names (exclude common keywords)
            excluded_words = {'Village', 'District', 'State', 'Forest', 'Rights', 'Act', 'Claim', 'Survey', 'Number'}
            entities['patta_holders'] = [name for name in potential_names if name not in excluded_words][:10]
            
        except Exception as e:
            print(f"Entity extraction failed: {e}", file=sys.stderr)
            
        return entities

    def ocr_with_fra_optimization(self, image: Image.Image, language: str = None, doc_type: str = "government_form") -> Dict[str, Any]:
        """
        Perform OCR optimized for FRA documents
        """
        try:
            start_time = time.time()
            
            # Use detected language or default to multi-language
            if not language:
                language = self.detect_document_language(image)
            
            # Get document type configuration
            doc_config = self.document_types.get(doc_type, self.document_types['individual_forest_rights'])
            psm = doc_config['psm']
            
            # Preprocess image based on document type
            processed_image = self.preprocess_fra_document(image, doc_config['preprocessing'])
            
            # Configure Tesseract for FRA documents
            custom_config = f'--oem 1 --psm {psm} -l {language}'
            
            # Enhanced character whitelist for FRA documents (includes common symbols)
            fra_chars = (
                'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
                '0123456789.,;:!?()-/\\@#$%^&*+=[]{}"\' '
                '।॥०१२३४५६७८९'  # Devanagari numbers and punctuation
                '০১২৩৪৫৬৭৮৯'      # Bengali numbers
                '୦୧୨୩୪୫୬୭୮୯'      # Odia numbers  
                '౦౧౨౩౪౫౬౭౮౯'      # Telugu numbers
            )
            
            # Primary OCR extraction
            text = pytesseract.image_to_string(
                processed_image, 
                config=custom_config + f' -c tessedit_char_whitelist={fra_chars}',
                lang=language
            )
            
            # Get confidence data
            data = pytesseract.image_to_data(
                processed_image, 
                config=custom_config,
                lang=language, 
                output_type=pytesseract.Output.DICT
            )
            
            # Calculate confidence
            confidences = [int(conf) for conf in data['conf'] if int(conf) > 0]
            avg_confidence = sum(confidences) / len(confidences) if confidences else 0
            
            # Extract FRA-specific entities
            entities = self.extract_fra_entities(text)
            
            # Extract tables if present
            tables = self.extract_fra_tables(processed_image)
            
            processing_time = time.time() - start_time
            
            # Quality assessment for FRA documents
            quality_score = self._assess_fra_quality(text, avg_confidence, entities)
            
            return {
                'text': text.strip(),
                'confidence': round(avg_confidence, 2),
                'processing_time': round(processing_time, 3),
                'method': f'FRA-Tesseract-{language}-PSM{psm}',
                'language': language,
                'document_type': doc_type,
                'entities': entities,
                'tables': tables,
                'quality_score': quality_score,
                'word_count': len(text.split()),
                'character_count': len(text),
                'preprocessing_applied': doc_config['preprocessing']
            }
            
        except Exception as e:
            print(f"Error: FRA OCR failed: {e}", file=sys.stderr)
            return {
                'text': '',
                'confidence': 0.0,
                'processing_time': 0.0,
                'method': 'FRA-OCR-Error',
                'language': language or 'unknown',
                'error': str(e),
                'entities': {},
                'tables': [],
                'quality_score': 0
            }

    def _assess_fra_quality(self, text: str, confidence: float, entities: Dict) -> float:
        """
        Assess quality specifically for FRA documents
        """
        score = confidence * 0.4  # Base OCR confidence (40%)
        
        # Bonus for FRA-specific entity detection (30%)
        entity_bonus = 0
        if entities.get('survey_numbers'): entity_bonus += 5
        if entities.get('village_names'): entity_bonus += 5
        if entities.get('patta_holders'): entity_bonus += 5
        if entities.get('forest_areas'): entity_bonus += 5
        if entities.get('coordinates'): entity_bonus += 5
        if entities.get('claim_numbers'): entity_bonus += 5
        
        score += entity_bonus
        
        # Text length and structure assessment (30%)
        if len(text) > 100: score += 10  # Sufficient content
        if len(text.split()) > 20: score += 10  # Good word count
        if any(keyword in text.lower() for keyword in ['forest', 'rights', 'patta', 'claim', 'village']): 
            score += 10  # Contains FRA keywords
        
        return min(100, round(score, 1))

    def multi_strategy_fra_ocr(self, image: Image.Image, auto_language: bool = True) -> Dict[str, Any]:
        """
        Run multiple OCR strategies optimized for different FRA document types
        """
        results = []
        
        # Detect language
        if auto_language:
            detected_lang = self.detect_document_language(image)
        else:
            detected_lang = self.default_languages
        
        # Try different FRA document type strategies
        strategies = [
            ('individual_forest_rights', 'Individual Forest Rights'),
            ('patta_document', 'Patta Document'),
            ('community_rights', 'Community Rights'),
            ('verification_report', 'Verification Report')
        ]
        
        for doc_type, description in strategies:
            print(f"Trying FRA strategy: {description}", file=sys.stderr)
            result = self.ocr_with_fra_optimization(image, detected_lang, doc_type)
            result['strategy'] = description
            results.append(result)
        
        # Select best result based on FRA-specific quality score
        best_result = max(results, key=lambda x: (x['quality_score'], x['confidence'], len(x['text'])))
        
        # Add metadata about all attempts
        best_result['all_strategies'] = results
        best_result['total_strategies_tested'] = len(results)
        
        print(f"Best FRA strategy: {best_result['strategy']} (Quality: {best_result['quality_score']}%)", file=sys.stderr)
        
        return best_result

    def process_fra_document_batch(self, file_path: str) -> Dict[str, Any]:
        """
        Process FRA documents (single image or multi-page PDF)
        """
        try:
            file_extension = Path(file_path).suffix.lower()
            
            if file_extension == '.pdf':
                return self._process_fra_pdf(file_path)
            else:
                return self._process_fra_image(file_path)
                
        except Exception as e:
            print(f"Error: FRA document processing failed: {e}", file=sys.stderr)
            return {
                'type': 'error',
                'error': str(e),
                'file_path': file_path
            }

    def _process_fra_pdf(self, pdf_path: str) -> Dict[str, Any]:
        """Process multi-page FRA PDF documents"""
        try:
            start_time = time.time()
            
            # Convert PDF to images with high DPI for government documents
            images = convert_from_path(pdf_path, dpi=300, fmt='PNG')
            print(f"FRA PDF converted to {len(images)} pages", file=sys.stderr)
            
            results = []
            total_quality = 0
            all_entities = {'patta_holders': [], 'village_names': [], 'survey_numbers': [], 
                          'coordinates': [], 'forest_areas': [], 'claim_numbers': []}
            
            for page_num, image in enumerate(images, 1):
                print(f"Processing FRA page {page_num}/{len(images)}", file=sys.stderr)
                
                # Process each page with FRA optimization
                page_result = self.multi_strategy_fra_ocr(image)
                
                # Aggregate entities across all pages
                for entity_type, values in page_result.get('entities', {}).items():
                    if entity_type in all_entities and values:
                        all_entities[entity_type].extend(values)
                
                page_data = {
                    'text': page_result['text'],
                    'confidence': page_result['confidence'],
                    'quality_score': page_result['quality_score'],
                    'language': page_result['language'],
                    'processing_time': page_result['processing_time'],
                    'method': page_result['method'],
                    'entities': page_result['entities'],
                    'tables': page_result.get('tables', []),
                    'page_number': page_num,
                    'strategy_used': page_result.get('strategy', 'Unknown')
                }
                
                results.append(page_data)
                total_quality += page_result['quality_score']
            
            # Remove duplicates from aggregated entities
            for entity_type in all_entities:
                all_entities[entity_type] = list(set(all_entities[entity_type]))
            
            total_processing_time = time.time() - start_time
            average_quality = total_quality / len(results) if results else 0
            
            return {
                'type': 'fra_batch',
                'results': results,
                'total_pages': len(images),
                'total_processing_time': round(total_processing_time, 3),
                'average_quality_score': round(average_quality, 2),
                'aggregated_entities': all_entities,
                'document_classification': 'FRA_Multi_Page_Document'
            }
            
        except Exception as e:
            print(f"Error: FRA PDF processing failed: {e}", file=sys.stderr)
            return {'type': 'error', 'error': str(e)}

    def _process_fra_image(self, image_path: str) -> Dict[str, Any]:
        """Process single FRA image document"""
        try:
            start_time = time.time()
            
            # Load image
            image = Image.open(image_path)
            print(f"Processing FRA image: {image.size} pixels, {image.mode} mode", file=sys.stderr)
            
            # Process with FRA-optimized multi-strategy OCR
            result = self.multi_strategy_fra_ocr(image)
            
            total_processing_time = time.time() - start_time
            
            return {
                'type': 'fra_single',
                'text': result['text'],
                'confidence': result['confidence'],
                'quality_score': result['quality_score'],
                'language': result['language'],
                'processing_time': round(total_processing_time, 3),
                'method': result['method'],
                'entities': result['entities'],
                'tables': result.get('tables', []),
                'metadata': {
                    'image_size': f"{image.size[0]}x{image.size[1]}",
                    'image_mode': image.mode,
                    'strategy_used': result.get('strategy', 'Unknown'),
                    'preprocessing': result.get('preprocessing_applied', 'government_form'),
                    'all_strategies_tested': result.get('total_strategies_tested', 1)
                },
                'document_classification': 'FRA_Document'
            }
            
        except Exception as e:
            print(f"Error: FRA image processing failed: {e}", file=sys.stderr)
            return {'type': 'error', 'error': str(e)}

def main():
    """Main function for FRA OCR processing"""
    if len(sys.argv) != 2:
        print("Usage: python fra_ocr_engine.py <file_path>", file=sys.stderr)
        sys.exit(1)
    
    file_path = sys.argv[1]
    
    # Validate file exists
    if not os.path.exists(file_path):
        result = {'type': 'error', 'error': f'File not found: {file_path}'}
        print(json.dumps(result))
        sys.exit(1)
    
    # Initialize FRA OCR processor
    fra_processor = FRADocumentOCR()
    
    # Process the FRA document
    result = fra_processor.process_fra_document_batch(file_path)
    
    # Output result as JSON
    print(json.dumps(result, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    main()