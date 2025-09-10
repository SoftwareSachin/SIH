#!/usr/bin/env python3
"""
Direct Python OCR Script
Called directly by Node.js for OCR processing
"""

import sys
import json
import time
import os
from pathlib import Path
import tempfile

import cv2
import numpy as np
import pytesseract
from PIL import Image, ImageEnhance, ImageFilter, ImageOps
from pdf2image import convert_from_path

class DirectOCRProcessor:
    """
    Direct OCR processor that can be called from Node.js
    """
    
    def __init__(self):
        self.supported_formats = {'.pdf', '.png', '.jpg', '.jpeg', '.tiff', '.bmp', '.webp'}
        self.languages = {
            'eng': 'English',
            'hin': 'Hindi', 
            'ben': 'Bengali',
            'ori': 'Odia',
            'tel': 'Telugu',
            'tam': 'Tamil',
            'guj': 'Gujarati',
            'mar': 'Marathi',
            'kan': 'Kannada',
            'mal': 'Malayalam',
            'pan': 'Punjabi',
            'urd': 'Urdu'
        }

    def preprocess_image(self, image, enhance_type="document"):
        """Advanced image preprocessing for optimal OCR results"""
        try:
            # Convert to RGB if needed
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Convert PIL to OpenCV format
            cv_image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
            
            if enhance_type == "document":
                cv_image = self._preprocess_document(cv_image)
            elif enhance_type == "form":
                cv_image = self._preprocess_form(cv_image)
            elif enhance_type == "handwriting":
                cv_image = self._preprocess_handwriting(cv_image)
            
            # Convert back to PIL
            processed_image = Image.fromarray(cv2.cvtColor(cv_image, cv2.COLOR_BGR2RGB))
            return processed_image
            
        except Exception as e:
            print(f"Warning: Preprocessing failed: {e}. Using original image.", file=sys.stderr)
            return image

    def _preprocess_document(self, image):
        """Preprocessing optimized for printed documents"""
        # Grayscale conversion
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Noise reduction
        denoised = cv2.medianBlur(gray, 3)
        
        # Contrast enhancement using CLAHE
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
        enhanced = clahe.apply(denoised)
        
        # Morphological operations to improve text clarity
        kernel = np.ones((1,1), np.uint8)
        enhanced = cv2.morphologyEx(enhanced, cv2.MORPH_CLOSE, kernel)
        
        # Adaptive thresholding for better binarization
        binary = cv2.adaptiveThreshold(
            enhanced, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
        )
        
        return cv2.cvtColor(binary, cv2.COLOR_GRAY2BGR)

    def _preprocess_form(self, image):
        """Preprocessing optimized for forms with tables/fields"""
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Strong denoising for forms
        denoised = cv2.bilateralFilter(gray, 9, 75, 75)
        
        # Edge-preserving smoothing
        enhanced = cv2.edgePreservingFilter(denoised, flags=1, sigma_s=50, sigma_r=0.4)
        
        # Otsu's thresholding for binary conversion
        _, binary = cv2.threshold(enhanced, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        
        return cv2.cvtColor(binary, cv2.COLOR_GRAY2BGR)

    def _preprocess_handwriting(self, image):
        """Preprocessing optimized for handwritten text"""
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Gentle denoising to preserve handwriting details
        denoised = cv2.fastNlMeansDenoising(gray)
        
        # Contrast enhancement
        enhanced = cv2.equalizeHist(denoised)
        
        # Adaptive thresholding with larger neighborhood
        binary = cv2.adaptiveThreshold(
            enhanced, 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY, 15, 10
        )
        
        return cv2.cvtColor(binary, cv2.COLOR_GRAY2BGR)

    def detect_language(self, image):
        """Detect the primary language in the image using OSD"""
        try:
            # Use Tesseract's script detection
            osd_result = pytesseract.image_to_osd(image, output_type=pytesseract.Output.DICT)
            
            # Extract script information
            script = osd_result.get('script', '').lower()
            
            # Map scripts to languages
            script_language_map = {
                'latin': 'eng',
                'devanagari': 'hin',
                'bengali': 'ben',
                'oriya': 'ori',
                'telugu': 'tel',
                'tamil': 'tam',
                'gujarati': 'guj',
                'gurmukhi': 'pan'
            }
            
            detected_lang = script_language_map.get(script, 'eng')
            print(f"Detected script: {script} -> language: {detected_lang}", file=sys.stderr)
            return detected_lang
            
        except Exception as e:
            print(f"Warning: Language detection failed: {e}. Defaulting to English.", file=sys.stderr)
            return 'eng'

    def ocr_with_tesseract(self, image, language='eng', psm=3):
        """Perform OCR using Tesseract with configurable parameters"""
        try:
            start_time = time.time()
            
            # Configure Tesseract
            custom_config = f'--oem 1 --psm {psm} -l {language}'
            
            # Get text and confidence data
            text = pytesseract.image_to_string(image, config=custom_config, lang=language)
            
            # Get detailed data for confidence calculation
            data = pytesseract.image_to_data(image, config=custom_config, lang=language, output_type=pytesseract.Output.DICT)
            
            # Calculate average confidence
            confidences = [int(conf) for conf in data['conf'] if int(conf) > 0]
            avg_confidence = sum(confidences) / len(confidences) if confidences else 0
            
            processing_time = time.time() - start_time
            
            return {
                'text': text.strip(),
                'confidence': round(avg_confidence, 2),
                'processing_time': round(processing_time, 3),
                'method': f'Tesseract-{language}-PSM{psm}',
                'word_count': len(text.split()),
                'character_count': len(text),
                'language': language
            }
            
        except Exception as e:
            print(f"Error: Tesseract OCR failed: {e}", file=sys.stderr)
            return {
                'text': '',
                'confidence': 0.0,
                'processing_time': 0.0,
                'method': 'Tesseract-Error',
                'word_count': 0,
                'character_count': 0,
                'language': language,
                'error': str(e)
            }

    def multi_engine_ocr(self, image, auto_language=True):
        """Run OCR with multiple configurations and return the best result"""
        results = []
        
        # Detect language if auto mode is enabled
        if auto_language:
            detected_lang = self.detect_language(image)
        else:
            detected_lang = 'eng'
        
        # Test different PSM modes for different content types
        psm_configs = [
            (3, "document"),    # Fully automatic page segmentation
            (6, "form"),        # Uniform block of text
            (7, "line"),        # Single text line
            (8, "word"),        # Single word
        ]
        
        for psm, content_type in psm_configs:
            # Preprocess image for specific content type
            processed_image = self.preprocess_image(image, content_type)
            
            # Run OCR
            result = self.ocr_with_tesseract(processed_image, detected_lang, psm)
            result['content_type'] = content_type
            result['preprocessing'] = content_type
            results.append(result)
        
        # Select best result based on confidence and text length
        best_result = max(results, key=lambda x: (x['confidence'], len(x['text'])))
        
        # Add metadata about all attempts
        best_result['all_attempts'] = results
        best_result['total_engines_tested'] = len(results)
        
        return best_result

    def process_pdf(self, pdf_path):
        """Process multi-page PDF documents"""
        try:
            start_time = time.time()
            
            # Convert PDF to images
            images = convert_from_path(pdf_path, dpi=300, fmt='PNG')
            print(f"PDF converted to {len(images)} pages", file=sys.stderr)
            
            results = []
            total_confidence = 0
            
            for page_num, image in enumerate(images, 1):
                print(f"Processing page {page_num}/{len(images)}", file=sys.stderr)
                
                # Process each page
                page_result = self.multi_engine_ocr(image)
                
                # Create result for this page
                page_data = {
                    'text': page_result['text'],
                    'confidence': page_result['confidence'],
                    'language': page_result['language'],
                    'processing_time': page_result['processing_time'],
                    'method': page_result['method'],
                    'page_count': 1,
                    'metadata': {
                        'page_number': page_num,
                        'content_type': page_result.get('content_type', 'document'),
                        'word_count': page_result.get('word_count', 0),
                        'character_count': page_result.get('character_count', 0)
                    }
                }
                
                results.append(page_data)
                total_confidence += page_result['confidence']
            
            total_processing_time = time.time() - start_time
            average_confidence = total_confidence / len(results) if results else 0
            
            return {
                'type': 'batch',
                'results': results,
                'total_pages': len(images),
                'total_processing_time': round(total_processing_time, 3),
                'average_confidence': round(average_confidence, 2)
            }
            
        except Exception as e:
            print(f"Error: PDF processing failed: {e}", file=sys.stderr)
            return {
                'type': 'error',
                'error': str(e)
            }

    def process_image(self, image_path):
        """Process single image file"""
        try:
            start_time = time.time()
            
            # Load and validate image
            image = Image.open(image_path)
            print(f"Processing image: {image.size} pixels, {image.mode} mode", file=sys.stderr)
            
            # Run multi-engine OCR
            result = self.multi_engine_ocr(image)
            
            total_processing_time = time.time() - start_time
            
            return {
                'type': 'single',
                'text': result['text'],
                'confidence': result['confidence'],
                'language': result['language'],
                'processing_time': round(total_processing_time, 3),
                'method': result['method'],
                'page_count': 1,
                'metadata': {
                    'image_size': f"{image.size[0]}x{image.size[1]}",
                    'image_mode': image.mode,
                    'content_type': result.get('content_type', 'document'),
                    'word_count': result.get('word_count', 0),
                    'character_count': result.get('character_count', 0),
                    'preprocessing': result.get('preprocessing', 'document')
                }
            }
            
        except Exception as e:
            print(f"Error: Image processing failed: {e}", file=sys.stderr)
            return {
                'type': 'error',
                'error': str(e)
            }

def main():
    """Main function called from command line"""
    if len(sys.argv) != 2:
        print("Usage: python python_ocr.py <file_path>", file=sys.stderr)
        sys.exit(1)
    
    file_path = sys.argv[1]
    
    # Validate file exists
    if not os.path.exists(file_path):
        result = {'type': 'error', 'error': f'File not found: {file_path}'}
        print(json.dumps(result))
        sys.exit(1)
    
    # Initialize processor
    processor = DirectOCRProcessor()
    
    # Determine file type and process
    file_extension = Path(file_path).suffix.lower()
    
    if file_extension not in processor.supported_formats:
        result = {'type': 'error', 'error': f'Unsupported format: {file_extension}'}
        print(json.dumps(result))
        sys.exit(1)
    
    # Process the file
    if file_extension == '.pdf':
        result = processor.process_pdf(file_path)
    else:
        result = processor.process_image(file_path)
    
    # Output result as JSON
    print(json.dumps(result, indent=2))

if __name__ == "__main__":
    main()