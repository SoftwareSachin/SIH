#!/usr/bin/env python3
"""
Advanced Python OCR Service
A comprehensive, from-scratch OCR service using multiple engines for maximum accuracy.
"""

import os
import json
import logging
import tempfile
import time
from typing import Dict, List, Optional, Any, Union
from pathlib import Path

import cv2
import numpy as np
import pytesseract
from PIL import Image, ImageEnhance, ImageFilter, ImageOps
from pdf2image import convert_from_path
import fastapi
from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.responses import JSONResponse
import uvicorn
from pydantic import BaseModel

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# OCR Result Models
class OCRResult(BaseModel):
    text: str
    confidence: float
    language: str
    processing_time: float
    method: str
    page_count: int = 1
    metadata: Dict[str, Any] = {}

class BatchOCRResult(BaseModel):
    results: List[OCRResult]
    total_pages: int
    total_processing_time: float
    average_confidence: float

class AdvancedOCRProcessor:
    """
    Advanced OCR processor with multiple engines and preprocessing techniques
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
        
        # Initialize Tesseract with language data
        self._verify_tesseract_setup()
        
    def _verify_tesseract_setup(self):
        """Verify Tesseract installation and language data"""
        try:
            # Test basic Tesseract functionality
            pytesseract.get_tesseract_version()
            logger.info("✅ Tesseract OCR engine verified")
            
            # Check available languages
            available_langs = pytesseract.get_languages()
            supported_langs = [lang for lang in self.languages.keys() if lang in available_langs]
            logger.info(f"✅ Available languages: {', '.join(supported_langs)}")
            
        except Exception as e:
            logger.error(f"❌ Tesseract setup error: {e}")
            raise RuntimeError("Tesseract OCR not properly configured")

    def preprocess_image(self, image: Image.Image, enhance_type: str = "document") -> Image.Image:
        """
        Advanced image preprocessing for optimal OCR results
        """
        try:
            # Convert to RGB if needed
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Convert PIL to OpenCV format
            cv_image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
            
            if enhance_type == "document":
                # Document-specific preprocessing
                cv_image = self._preprocess_document(cv_image)
            elif enhance_type == "form":
                # Form-specific preprocessing
                cv_image = self._preprocess_form(cv_image)
            elif enhance_type == "handwriting":
                # Handwriting-specific preprocessing
                cv_image = self._preprocess_handwriting(cv_image)
            
            # Convert back to PIL
            processed_image = Image.fromarray(cv2.cvtColor(cv_image, cv2.COLOR_BGR2RGB))
            return processed_image
            
        except Exception as e:
            logger.warning(f"Preprocessing failed: {e}. Using original image.")
            return image

    def _preprocess_document(self, image: np.ndarray) -> np.ndarray:
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

    def _preprocess_form(self, image: np.ndarray) -> np.ndarray:
        """Preprocessing optimized for forms with tables/fields"""
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Strong denoising for forms
        denoised = cv2.bilateralFilter(gray, 9, 75, 75)
        
        # Edge-preserving smoothing
        enhanced = cv2.edgePreservingFilter(denoised, flags=1, sigma_s=50, sigma_r=0.4)
        
        # Otsu's thresholding for binary conversion
        _, binary = cv2.threshold(enhanced, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        
        return cv2.cvtColor(binary, cv2.COLOR_GRAY2BGR)

    def _preprocess_handwriting(self, image: np.ndarray) -> np.ndarray:
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

    def detect_language(self, image: Image.Image) -> str:
        """
        Detect the primary language in the image using OSD (Orientation and Script Detection)
        """
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
            logger.info(f"Detected script: {script} -> language: {detected_lang}")
            return detected_lang
            
        except Exception as e:
            logger.warning(f"Language detection failed: {e}. Defaulting to English.")
            return 'eng'

    def ocr_with_tesseract(self, image: Image.Image, language: str = 'eng', psm: int = 3) -> Dict[str, Any]:
        """
        Perform OCR using Tesseract with configurable parameters
        """
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
            logger.error(f"Tesseract OCR failed: {e}")
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

    def multi_engine_ocr(self, image: Image.Image, auto_language: bool = True) -> Dict[str, Any]:
        """
        Run OCR with multiple configurations and return the best result
        """
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

    def process_pdf(self, pdf_path: str) -> BatchOCRResult:
        """
        Process multi-page PDF documents
        """
        try:
            start_time = time.time()
            
            # Convert PDF to images
            images = convert_from_path(pdf_path, dpi=300, fmt='PNG')
            logger.info(f"PDF converted to {len(images)} pages")
            
            results = []
            total_confidence = 0
            
            for page_num, image in enumerate(images, 1):
                logger.info(f"Processing page {page_num}/{len(images)}")
                
                # Process each page
                page_result = self.multi_engine_ocr(image)
                
                # Create OCR result for this page
                ocr_result = OCRResult(
                    text=page_result['text'],
                    confidence=page_result['confidence'],
                    language=page_result['language'],
                    processing_time=page_result['processing_time'],
                    method=page_result['method'],
                    page_count=1,
                    metadata={
                        'page_number': page_num,
                        'content_type': page_result.get('content_type', 'document'),
                        'word_count': page_result.get('word_count', 0),
                        'character_count': page_result.get('character_count', 0)
                    }
                )
                
                results.append(ocr_result)
                total_confidence += page_result['confidence']
            
            total_processing_time = time.time() - start_time
            average_confidence = total_confidence / len(results) if results else 0
            
            return BatchOCRResult(
                results=results,
                total_pages=len(images),
                total_processing_time=round(total_processing_time, 3),
                average_confidence=round(average_confidence, 2)
            )
            
        except Exception as e:
            logger.error(f"PDF processing failed: {e}")
            raise HTTPException(status_code=500, detail=f"PDF processing error: {str(e)}")

    def process_image(self, image_path: str) -> OCRResult:
        """
        Process single image file
        """
        try:
            start_time = time.time()
            
            # Load and validate image
            image = Image.open(image_path)
            logger.info(f"Processing image: {image.size} pixels, {image.mode} mode")
            
            # Run multi-engine OCR
            result = self.multi_engine_ocr(image)
            
            total_processing_time = time.time() - start_time
            
            return OCRResult(
                text=result['text'],
                confidence=result['confidence'],
                language=result['language'],
                processing_time=round(total_processing_time, 3),
                method=result['method'],
                page_count=1,
                metadata={
                    'image_size': f"{image.size[0]}x{image.size[1]}",
                    'image_mode': image.mode,
                    'content_type': result.get('content_type', 'document'),
                    'word_count': result.get('word_count', 0),
                    'character_count': result.get('character_count', 0),
                    'preprocessing': result.get('preprocessing', 'document')
                }
            )
            
        except Exception as e:
            logger.error(f"Image processing failed: {e}")
            raise HTTPException(status_code=500, detail=f"Image processing error: {str(e)}")

# Initialize OCR processor
ocr_processor = AdvancedOCRProcessor()

# FastAPI app
app = FastAPI(
    title="Advanced Python OCR Service",
    description="Comprehensive OCR service built from scratch with multiple engines",
    version="1.0.0"
)

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "Advanced Python OCR",
        "version": "1.0.0",
        "engines": ["Tesseract"],
        "supported_languages": list(ocr_processor.languages.keys())
    }

@app.post("/ocr/process", response_model=Union[OCRResult, BatchOCRResult])
async def process_document(
    file: UploadFile = File(...),
    auto_language: bool = Form(default=True),
    content_type: str = Form(default="document")
):
    """
    Process uploaded document (image or PDF) with OCR
    """
    try:
        # Validate file format
        file_extension = Path(file.filename or "").suffix.lower()
        if file_extension not in ocr_processor.supported_formats:
            raise HTTPException(
                status_code=400, 
                detail=f"Unsupported format: {file_extension}. Supported: {', '.join(ocr_processor.supported_formats)}"
            )
        
        # Create temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_extension) as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_file_path = temp_file.name
        
        try:
            # Process based on file type
            if file_extension == '.pdf':
                result = ocr_processor.process_pdf(temp_file_path)
            else:
                result = ocr_processor.process_image(temp_file_path)
            
            logger.info(f"✅ Successfully processed {file.filename}")
            return result
            
        finally:
            # Clean up temporary file
            os.unlink(temp_file_path)
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Processing failed: {e}")
        raise HTTPException(status_code=500, detail=f"OCR processing failed: {str(e)}")

@app.get("/ocr/languages")
async def get_supported_languages():
    """Get list of supported languages"""
    return {
        "languages": ocr_processor.languages,
        "total_count": len(ocr_processor.languages)
    }

@app.get("/ocr/formats")
async def get_supported_formats():
    """Get list of supported file formats"""
    return {
        "formats": list(ocr_processor.supported_formats),
        "total_count": len(ocr_processor.supported_formats)
    }

if __name__ == "__main__":
    # Run the server
    port = int(os.environ.get("OCR_PORT", 8001))
    uvicorn.run(
        "ocr_service:app",
        host="0.0.0.0",
        port=port,
        reload=False,
        log_level="info"
    )