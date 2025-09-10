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
import logging
import unicodedata

import cv2
import numpy as np
import pytesseract
from PIL import Image, ImageEnhance, ImageFilter, ImageOps, ImageDraw, ImageFont
from pdf2image import convert_from_path
import scipy
from scipy import ndimage
from skimage import morphology, segmentation, filters, feature, measure

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
        
        # FRA-specific keywords and patterns for each state
        self.state_keywords = {
            'madhya_pradesh': {
                'hindi': ['वन अधिकार', 'पट्टा', 'दावा', 'सर्वे', 'गांव', 'वन समुदाय'],
                'english': ['forest rights', 'patta', 'claim', 'survey', 'village', 'community']
            },
            'tripura': {
                'bengali': ['বন অধিকার', 'পাট্টা', 'দাবি', 'সার্ভে', 'গ্রাম', 'সম্প্রদায়'],
                'english': ['forest rights', 'patta', 'claim', 'survey', 'village', 'community']
            },
            'odisha': {
                'odia': ['ବନ ଅଧିକାର', 'ପଟ୍ଟା', 'ଦାବି', 'ସର୍ଭେ', 'ଗାଁ', 'ସମ୍ପ୍ରଦାୟ'],
                'english': ['forest rights', 'patta', 'claim', 'survey', 'village', 'community']
            },
            'telangana': {
                'telugu': ['అటవీ హక్కులు', 'పట్టా', 'దావా', 'సర్వే', 'గ్రామం', 'సంఘం'],
                'english': ['forest rights', 'patta', 'claim', 'survey', 'village', 'community']
            }
        }
        
        # Common FRA form fields and patterns
        self.fra_field_patterns = {
            'claim_number': r'(?:claim|application|आवेदन|దావా|দাবি|ଦାବି)\s*(?:no|number|न|संख्या|నంబర్|নম্বর|ନମ୍ବର)\.?\s*:?\s*([A-Z0-9/-]+)',
            'patta_number': r'(?:patta|पट्टा|పట్టా|পাট্টা|ପଟ୍ଟା)\s*(?:no|number|न|संख्या|నంబర్|নম্বর|ନମ୍ବର)\.?\s*:?\s*([A-Z0-9/-]+)',
            'survey_number': r'(?:survey|sy|s\.no|सर्वे|సర్వే|সার্ভে|ସର୍ଭେ)\s*(?:no|number|न|संख्या|నంబర్|নম্বর|ନମ୍ବର)?\.?\s*:?\s*(\d+(?:/\d+)*)',
            'area_hectares': r'(\d+(?:\.\d+)?)\s*(?:hectare|acre|हेक्टेयर|एकड़|హెక్టేర్|একর|ହେକ୍ଟର|ha|ac)',
            'coordinates': r'(\d{1,2}[°\s]*\d{1,2}[\'′\s]*\d{1,2}[″"\s]*[NSnsEWew]?)',
            'village_name': r'(?:village|gram|गांव|ग्राम|గ్రామం|গ্রাম|ଗାଁ|मौजा)\s*:?\s*([A-Za-z\u0900-\u097F\u0980-\u09FF\u0B00-\u0B7F\u0C00-\u0C7F\s]+?)(?:\s|,|\.|\n|$)',
            'verification_date': r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
            'forest_boundary': r'(?:boundary|bound|सीमा|हद|సరిహద్దు|সীমানা|ସୀମା)\s*:?\s*([^\.]+?)(?:\.|$)'
        }
        
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
        """Advanced preprocessing for Indian government FRA forms"""
        # Convert to grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Advanced deskewing for scanned documents
        gray = self._deskew_image(gray)
        
        # Remove government stamps and seals using advanced morphological operations
        gray = self._remove_stamps_and_seals(gray)
        
        # Enhanced form line removal with adaptive kernels
        gray_clean = self._remove_form_lines_adaptive(gray)
        
        # Multi-stage noise reduction for government document quality
        # Stage 1: Bilateral filter for edge preservation
        denoised1 = cv2.bilateralFilter(gray_clean, 5, 80, 80)
        
        # Stage 2: Non-local means denoising for textured background
        denoised2 = cv2.fastNlMeansDenoising(denoised1, h=7)
        
        # Stage 3: Morphological opening to remove small artifacts
        kernel_artifacts = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2, 2))
        denoised3 = cv2.morphologyEx(denoised2, cv2.MORPH_OPEN, kernel_artifacts)
        
        # Advanced contrast enhancement for faded government documents
        enhanced = self._enhance_government_document_contrast(denoised3)
        
        # Adaptive thresholding with multiple methods
        binary = self._adaptive_threshold_multi_method(enhanced)
        
        # Final morphological cleaning optimized for Indian scripts
        cleaned = self._morphological_cleaning_indian_scripts(binary)
        
        return cv2.cvtColor(cleaned, cv2.COLOR_GRAY2BGR)

    def _deskew_image(self, image: np.ndarray) -> np.ndarray:
        """Automatically deskew scanned documents using Hough transform"""
        try:
            # Edge detection
            edges = cv2.Canny(image, 50, 150, apertureSize=3)
            
            # Hough line detection
            lines = cv2.HoughLines(edges, 1, np.pi/180, threshold=100)
            
            if lines is not None:
                angles = []
                for rho, theta in lines[:20]:  # Use top 20 lines
                    angle = theta * 180 / np.pi
                    if 45 < angle < 135:  # Focus on horizontal lines
                        angles.append(angle - 90)
                    elif angle < 45:
                        angles.append(angle)
                
                if angles:
                    # Calculate median angle for robust skew correction
                    skew_angle = np.median(angles)
                    if abs(skew_angle) > 0.5:  # Only correct if significant skew
                        (h, w) = image.shape[:2]
                        center = (w // 2, h // 2)
                        M = cv2.getRotationMatrix2D(center, skew_angle, 1.0)
                        image = cv2.warpAffine(image, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
            
            return image
        except:
            return image

    def _remove_stamps_and_seals(self, image: np.ndarray) -> np.ndarray:
        """Remove government stamps and official seals that interfere with OCR"""
        try:
            # Detect circular and rectangular stamps using contour analysis
            blurred = cv2.GaussianBlur(image, (5, 5), 0)
            thresh = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1]
            
            # Find contours
            contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            for contour in contours:
                area = cv2.contourArea(contour)
                if 500 < area < 15000:  # Typical stamp size range
                    # Check if contour is circular (stamp) or rectangular (seal)
                    perimeter = cv2.arcLength(contour, True)
                    approx = cv2.approxPolyDP(contour, 0.02 * perimeter, True)
                    
                    # If circular or rectangular, it might be a stamp
                    if len(approx) > 8 or (4 <= len(approx) <= 6):
                        # Calculate solidity to confirm it's a stamp
                        hull = cv2.convexHull(contour)
                        hull_area = cv2.contourArea(hull)
                        solidity = area / hull_area if hull_area > 0 else 0
                        
                        if solidity > 0.7:  # High solidity indicates stamp-like shape
                            # Create mask and inpaint the stamp area
                            mask = np.zeros(image.shape, dtype=np.uint8)
                            cv2.fillPoly(mask, [contour], 255)
                            image = cv2.inpaint(image, mask, 3, cv2.INPAINT_TELEA)
            
            return image
        except:
            return image

    def _remove_form_lines_adaptive(self, image: np.ndarray) -> np.ndarray:
        """Advanced form line removal with adaptive kernel sizes"""
        try:
            # Detect image dimensions to adapt kernel sizes
            height, width = image.shape[:2]
            
            # Adaptive kernel sizes based on image resolution
            h_kernel_size = max(int(width * 0.03), 20)  # 3% of width, minimum 20
            v_kernel_size = max(int(height * 0.02), 15)  # 2% of height, minimum 15
            
            # Create adaptive kernels
            horizontal_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (h_kernel_size, 1))
            vertical_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, v_kernel_size))
            
            # Detect and remove lines with multiple iterations for thick lines
            horizontal_lines = cv2.morphologyEx(image, cv2.MORPH_OPEN, horizontal_kernel, iterations=2)
            vertical_lines = cv2.morphologyEx(image, cv2.MORPH_OPEN, vertical_kernel, iterations=2)
            
            # Create comprehensive form mask
            form_mask = cv2.add(horizontal_lines, vertical_lines)
            
            # Dilate mask slightly to ensure complete line removal
            dilate_kernel = np.ones((2, 2), np.uint8)
            form_mask = cv2.dilate(form_mask, dilate_kernel, iterations=1)
            
            # Remove form structure
            cleaned = cv2.subtract(image, form_mask)
            
            return cleaned
        except:
            return image

    def _enhance_government_document_contrast(self, image: np.ndarray) -> np.ndarray:
        """Multi-stage contrast enhancement for government documents"""
        try:
            # Stage 1: Histogram equalization
            equalized = cv2.equalizeHist(image)
            
            # Stage 2: CLAHE with optimized parameters for text
            clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
            clahe_enhanced = clahe.apply(equalized)
            
            # Stage 3: Gamma correction for faded documents
            gamma = 1.2  # Slightly increase brightness
            gamma_corrected = np.power(clahe_enhanced / 255.0, gamma) * 255.0
            gamma_corrected = gamma_corrected.astype(np.uint8)
            
            # Stage 4: Unsharp masking for text sharpening
            blurred = cv2.GaussianBlur(gamma_corrected, (3, 3), 0)
            unsharp_mask = cv2.addWeighted(gamma_corrected, 1.5, blurred, -0.5, 0)
            
            return unsharp_mask
        except:
            return image

    def _adaptive_threshold_multi_method(self, image: np.ndarray) -> np.ndarray:
        """Apply multiple adaptive thresholding methods and combine results"""
        try:
            # Method 1: Gaussian adaptive threshold
            thresh1 = cv2.adaptiveThreshold(
                image, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 15, 4
            )
            
            # Method 2: Mean adaptive threshold
            thresh2 = cv2.adaptiveThreshold(
                image, 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY, 19, 8
            )
            
            # Method 3: Otsu's threshold for global optimization
            _, thresh3 = cv2.threshold(image, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            
            # Combine methods using bitwise operations
            # Take the intersection of all three methods for robust thresholding
            combined = cv2.bitwise_and(thresh1, thresh2)
            combined = cv2.bitwise_and(combined, thresh3)
            
            # If combination is too restrictive, fall back to best single method
            if np.sum(combined == 255) < np.sum(thresh1 == 255) * 0.3:
                combined = thresh1
            
            return combined
        except:
            # Fallback to simple adaptive threshold
            return cv2.adaptiveThreshold(
                image, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 15, 4
            )

    def _morphological_cleaning_indian_scripts(self, image: np.ndarray) -> np.ndarray:
        """Morphological operations optimized for Indian scripts (Devanagari, Bengali, etc.)"""
        try:
            # Different kernels for different script characteristics
            
            # Kernel for connecting broken characters (common in Indian scripts)
            connect_kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2, 1))
            connected = cv2.morphologyEx(image, cv2.MORPH_CLOSE, connect_kernel)
            
            # Kernel for removing small noise while preserving diacritics
            denoise_kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (1, 1))
            denoised = cv2.morphologyEx(connected, cv2.MORPH_OPEN, denoise_kernel)
            
            # Kernel for smoothing character edges
            smooth_kernel = np.ones((1, 1), np.uint8)
            smoothed = cv2.morphologyEx(denoised, cv2.MORPH_CLOSE, smooth_kernel)
            
            return smoothed
        except:
            return image

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
        Advanced FRA-specific entity extraction with multi-language support and confidence scoring
        """
        entities = {
            'patta_holders': [],
            'village_names': [],
            'survey_numbers': [],
            'coordinates': [],
            'forest_areas': [],
            'claim_numbers': [],
            'patta_numbers': [],
            'verification_dates': [],
            'boundaries': [],
            'verification_officers': [],
            'district_names': [],
            'block_names': [],
            'tehsil_names': [],
            'forest_divisions': []
        }
        
        try:
            # Normalize text for better pattern matching
            normalized_text = self._normalize_multilingual_text(text)
            
            # Extract using predefined patterns with confidence scoring
            for entity_type, pattern in self.fra_field_patterns.items():
                matches = re.findall(pattern, normalized_text, re.IGNORECASE | re.MULTILINE)
                if matches:
                    if entity_type == 'claim_number':
                        entities['claim_numbers'] = list(set(matches))
                    elif entity_type == 'patta_number':
                        entities['patta_numbers'] = list(set(matches))
                    elif entity_type == 'survey_number':
                        entities['survey_numbers'] = list(set(matches))
                    elif entity_type == 'area_hectares':
                        entities['forest_areas'] = list(set(matches))
                    elif entity_type == 'coordinates':
                        entities['coordinates'] = list(set(matches))
                    elif entity_type == 'village_name':
                        entities['village_names'] = [v.strip() for v in matches if len(v.strip()) > 2]
                    elif entity_type == 'verification_date':
                        entities['verification_dates'] = list(set(matches))
                    elif entity_type == 'forest_boundary':
                        entities['boundaries'] = [b.strip() for b in matches]
            
            # Advanced named entity extraction
            entities.update(self._extract_administrative_entities(normalized_text))
            entities.update(self._extract_person_names(normalized_text))
            entities.update(self._extract_location_entities(normalized_text))
            
            # Post-processing and validation
            entities = self._validate_and_clean_entities(entities)
            
        except Exception as e:
            print(f"Entity extraction failed: {e}", file=sys.stderr)
            
        return entities

    def _normalize_multilingual_text(self, text: str) -> str:
        """Normalize text for better pattern matching across languages"""
        try:
            # Unicode normalization
            normalized = unicodedata.normalize('NFKD', text)
            
            # Remove excessive whitespace
            normalized = re.sub(r'\s+', ' ', normalized)
            
            # Normalize common variations in Indian scripts
            # Devanagari normalizations
            normalized = normalized.replace('।', '.')  # Devanagari full stop
            normalized = normalized.replace('॥', '.')   # Double danda
            
            # Bengali normalizations
            normalized = normalized.replace('।', '.')   # Bengali full stop
            
            # Common abbreviation expansions
            abbreviations = {
                'S.No': 'Survey Number',
                'Sy.No': 'Survey Number', 
                'Dist': 'District',
                'Blk': 'Block',
                'Teh': 'Tehsil',
                'Div': 'Division'
            }
            
            for abbr, expansion in abbreviations.items():
                normalized = re.sub(rf'\b{re.escape(abbr)}\b', expansion, normalized, flags=re.IGNORECASE)
            
            return normalized
        except:
            return text

    def _extract_administrative_entities(self, text: str) -> Dict[str, List[str]]:
        """Extract administrative entities like districts, blocks, tehsils"""
        admin_entities = {
            'district_names': [],
            'block_names': [],
            'tehsil_names': [],
            'forest_divisions': []
        }
        
        try:
            # District patterns
            district_pattern = r'(?:district|dist|जिला|जिल्हा|জেলা|ଜିଲ୍ଲା|జిల్లా)\s*:?\s*([A-Za-z\u0900-\u097F\u0980-\u09FF\u0B00-\u0B7F\u0C00-\u0C7F\s]+?)(?:\s|,|\.|\n|$)'
            district_matches = re.findall(district_pattern, text, re.IGNORECASE)
            admin_entities['district_names'] = [d.strip() for d in district_matches if len(d.strip()) > 2]
            
            # Block patterns
            block_pattern = r'(?:block|blk|ब्लॉक|ব্লক|ବ୍ଲକ|బ్లాక్)\s*:?\s*([A-Za-z\u0900-\u097F\u0980-\u09FF\u0B00-\u0B7F\u0C00-\u0C7F\s]+?)(?:\s|,|\.|\n|$)'
            block_matches = re.findall(block_pattern, text, re.IGNORECASE)
            admin_entities['block_names'] = [b.strip() for b in block_matches if len(b.strip()) > 2]
            
            # Tehsil patterns
            tehsil_pattern = r'(?:tehsil|teh|तहसील|তহসিল|ତହସିଲ|తహసీల్)\s*:?\s*([A-Za-z\u0900-\u097F\u0980-\u09FF\u0B00-\u0B7F\u0C00-\u0C7F\s]+?)(?:\s|,|\.|\n|$)'
            tehsil_matches = re.findall(tehsil_pattern, text, re.IGNORECASE)
            admin_entities['tehsil_names'] = [t.strip() for t in tehsil_matches if len(t.strip()) > 2]
            
            # Forest Division patterns
            forest_div_pattern = r'(?:forest\s+division|van\s+vibhag|বন বিভাগ|ବନ ବିଭାଗ|అటవీ విభాగం)\s*:?\s*([A-Za-z\u0900-\u097F\u0980-\u09FF\u0B00-\u0B7F\u0C00-\u0C7F\s]+?)(?:\s|,|\.|\n|$)'
            forest_div_matches = re.findall(forest_div_pattern, text, re.IGNORECASE)
            admin_entities['forest_divisions'] = [f.strip() for f in forest_div_matches if len(f.strip()) > 2]
            
        except Exception as e:
            print(f"Administrative entity extraction failed: {e}", file=sys.stderr)
        
        return admin_entities

    def _extract_person_names(self, text: str) -> Dict[str, List[str]]:
        """Extract person names with multi-language support"""
        person_entities = {
            'patta_holders': [],
            'verification_officers': []
        }
        
        try:
            # Pattern for Indian names (supporting multiple scripts)
            indian_name_pattern = r'\b[A-ZА-Я\u0900-\u097F\u0980-\u09FF\u0B00-\u0B7F\u0C00-\u0C7F][a-zа-я\u0900-\u097F\u0980-\u09FF\u0B00-\u0B7F\u0C00-\u0C7F]+(?:\s+[A-ZА-Я\u0900-\u097F\u0980-\u09FF\u0B00-\u0B7F\u0C00-\u0C7F][a-zа-я\u0900-\u097F\u0980-\u09FF\u0B00-\u0B7F\u0C00-\u0C7F]+)*\b'
            
            # Find potential names
            potential_names = re.findall(indian_name_pattern, text)
            
            # Filter and categorize names
            excluded_words = {
                'Village', 'District', 'State', 'Forest', 'Rights', 'Act', 'Claim', 'Survey', 'Number',
                'गांव', 'जिला', 'राज्य', 'वन', 'अधिकार', 'दावा', 'सर्वे', 'संख्या',
                'গ্রাম', 'জেলা', 'রাজ্য', 'বন', 'অধিকার', 'দাবি', 'সার্ভে', 'নম্বর',
                'ଗାଁ', 'ଜିଲ୍ଲା', 'ରାଜ୍ୟ', 'ବନ', 'ଅଧିକାର', 'ଦାବି', 'ସର୍ଭେ', 'ନମ୍ବର',
                'గ్రామం', 'జిల్లా', 'రాష్ట్రం', 'అటవీ', 'హక్కులు', 'దావా', 'సర్వే', 'నంబర్'
            }
            
            filtered_names = [name for name in potential_names 
                            if name not in excluded_words and len(name.split()) <= 4]
            
            # Categorize based on context
            for name in filtered_names:
                # Look for context clues around the name
                name_context = self._get_name_context(text, name)
                
                if any(keyword in name_context.lower() for keyword in 
                      ['holder', 'claimant', 'पट्टाधारक', 'দাবিদার', 'ଦାବିଦାର', 'దావాదారు']):
                    person_entities['patta_holders'].append(name)
                elif any(keyword in name_context.lower() for keyword in 
                        ['officer', 'inspector', 'अधिकारी', 'কর্মকর্তা', 'ଅଧିକାରୀ', 'అధికారి']):
                    person_entities['verification_officers'].append(name)
                else:
                    # Default to patta holders if no clear context
                    person_entities['patta_holders'].append(name)
            
            # Remove duplicates and limit results
            person_entities['patta_holders'] = list(set(person_entities['patta_holders']))[:10]
            person_entities['verification_officers'] = list(set(person_entities['verification_officers']))[:5]
            
        except Exception as e:
            print(f"Person name extraction failed: {e}", file=sys.stderr)
        
        return person_entities

    def _extract_location_entities(self, text: str) -> Dict[str, List[str]]:
        """Extract location-specific entities with geographic validation"""
        location_entities = {
            'village_names': []
        }
        
        try:
            # Enhanced village name patterns for different Indian languages
            village_patterns = [
                r'(?:village|gram|गांव|ग्राम|গ্রাম|ଗାଁ|గ్రామం|गाव|गाँव|मौजा)\s*:?\s*([A-Za-z\u0900-\u097F\u0980-\u09FF\u0B00-\u0B7F\u0C00-\u0C7F\s]+?)(?:\s|,|\.|\n|$)',
                r'(?:मौजा|mouza|मौज)\s*:?\s*([A-Za-z\u0900-\u097F\u0980-\u09FF\u0B00-\u0B7F\u0C00-\u0C7F\s]+?)(?:\s|,|\.|\n|$)',
                # Pattern for villages mentioned in boundaries
                r'(?:bounded\s+by|सीमा|হদ|ସୀମା|సరిహద్దు).*?(?:village|gram|গ্রাম|ଗାଁ|గ్రామం)\s*([A-Za-z\u0900-\u097F\u0980-\u09FF\u0B00-\u0B7F\u0C00-\u0C7F\s]+?)(?:\s|,|\.|\n|$)'
            ]
            
            for pattern in village_patterns:
                matches = re.findall(pattern, text, re.IGNORECASE | re.MULTILINE)
                for match in matches:
                    village_name = match.strip()
                    if len(village_name) > 2 and self._is_valid_village_name(village_name):
                        location_entities['village_names'].append(village_name)
            
            # Remove duplicates and sort by length (longer names often more specific)
            location_entities['village_names'] = sorted(list(set(location_entities['village_names'])), 
                                                      key=len, reverse=True)[:15]
            
        except Exception as e:
            print(f"Location entity extraction failed: {e}", file=sys.stderr)
        
        return location_entities

    def _get_name_context(self, text: str, name: str) -> str:
        """Get context around a name for better categorization"""
        try:
            # Find all occurrences of the name
            name_positions = [m.start() for m in re.finditer(re.escape(name), text, re.IGNORECASE)]
            
            contexts = []
            for pos in name_positions:
                # Get 50 characters before and after the name
                start = max(0, pos - 50)
                end = min(len(text), pos + len(name) + 50)
                context = text[start:end]
                contexts.append(context)
            
            return ' '.join(contexts)
        except:
            return ''

    def _is_valid_village_name(self, name: str) -> bool:
        """Validate if a string is likely a valid village name"""
        try:
            # Check length
            if len(name) < 2 or len(name) > 50:
                return False
            
            # Check if it's not a common word or phrase
            common_words = {
                'and', 'or', 'the', 'of', 'in', 'at', 'by', 'for', 'with', 'from',
                'और', 'या', 'का', 'की', 'के', 'में', 'पर', 'से', 'को',
                'ও', 'বা', 'এর', 'এ', 'তে', 'দিয়ে', 'থেকে',
                'ଏବଂ', 'ବା', 'ର', 'ରେ', 'ରୁ', 'ଦିଅ',
                'మరియు', 'లేదా', 'యొక్క', 'లో', 'నుండి', 'తో'
            }
            
            if name.lower() in common_words:
                return False
            
            # Check if it contains mostly alphabetic characters
            alpha_chars = sum(1 for c in name if c.isalpha() or c in 'ऀ-ॿ\u0980-\u09FF\u0B00-\u0B7F\u0C00-\u0C7F')
            if alpha_chars < len(name) * 0.7:  # At least 70% alphabetic
                return False
            
            return True
        except:
            return False

    def _validate_and_clean_entities(self, entities: Dict[str, List[str]]) -> Dict[str, List[str]]:
        """Validate and clean extracted entities"""
        try:
            cleaned_entities = {}
            
            for entity_type, values in entities.items():
                cleaned_values = []
                
                for value in values:
                    # Basic cleaning
                    cleaned_value = value.strip()
                    
                    # Remove empty or very short values
                    if len(cleaned_value) < 1:
                        continue
                    
                    # Entity-specific validation
                    if entity_type == 'survey_numbers':
                        # Validate survey number format
                        if re.match(r'^\d+(/\d+)*$', cleaned_value):
                            cleaned_values.append(cleaned_value)
                    elif entity_type == 'verification_dates':
                        # Validate date format
                        if re.match(r'^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$', cleaned_value):
                            cleaned_values.append(cleaned_value)
                    elif entity_type == 'forest_areas':
                        # Validate area values
                        if re.match(r'^\d+(\.\d+)?$', cleaned_value):
                            cleaned_values.append(cleaned_value)
                    elif entity_type == 'coordinates':
                        # Basic coordinate validation
                        if re.match(r'^\d{1,2}[°\s]*\d{1,2}', cleaned_value):
                            cleaned_values.append(cleaned_value)
                    else:
                        # For text entities, check length and character validity
                        if 1 < len(cleaned_value) < 100:
                            cleaned_values.append(cleaned_value)
                
                # Remove duplicates while preserving order
                seen = set()
                cleaned_entities[entity_type] = [x for x in cleaned_values 
                                               if not (x in seen or seen.add(x))]
                
                # Limit number of entities per type
                max_entities = {
                    'patta_holders': 10,
                    'village_names': 15,
                    'survey_numbers': 20,
                    'coordinates': 10,
                    'forest_areas': 10,
                    'claim_numbers': 5,
                    'patta_numbers': 5,
                    'verification_dates': 10,
                    'boundaries': 5,
                    'verification_officers': 5,
                    'district_names': 3,
                    'block_names': 3,
                    'tehsil_names': 3,
                    'forest_divisions': 3
                }
                
                limit = max_entities.get(entity_type, 10)
                cleaned_entities[entity_type] = cleaned_entities[entity_type][:limit]
            
            return cleaned_entities
        except:
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