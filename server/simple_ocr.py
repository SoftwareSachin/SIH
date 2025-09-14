#!/usr/bin/env python3
"""
Simplified OCR Service for FRA Atlas
Uses tesseract binary directly without numpy/opencv dependencies
"""

import os
import json
import subprocess
import tempfile
import time
from pathlib import Path
from PIL import Image, ImageEnhance, ImageFilter

def preprocess_image_simple(image_path: str, output_path: str) -> bool:
    """Simple image preprocessing using only PIL"""
    try:
        with Image.open(image_path) as img:
            # Convert to RGB if needed
            if img.mode != 'RGB':
                img = img.convert('RGB')
            
            # Simple enhancements
            enhancer = ImageEnhance.Contrast(img)
            img = enhancer.enhance(1.2)
            
            enhancer = ImageEnhance.Sharpness(img)
            img = enhancer.enhance(1.1)
            
            # Apply slight denoising
            img = img.filter(ImageFilter.MedianFilter(size=3))
            
            # Save processed image
            img.save(output_path, 'PNG', quality=95)
            return True
            
    except Exception as e:
        print(f"Preprocessing failed: {e}")
        return False

def run_tesseract_ocr(image_path: str, language: str = 'eng') -> dict:
    """Run tesseract OCR using subprocess"""
    try:
        start_time = time.time()
        
        # Run tesseract to get text
        cmd_text = ['tesseract', image_path, 'stdout', '-l', language]
        result_text = subprocess.run(cmd_text, capture_output=True, text=True, timeout=30)
        
        if result_text.returncode != 0:
            raise Exception(f"Tesseract failed: {result_text.stderr}")
        
        text = result_text.stdout.strip()
        
        # Run tesseract to get confidence data
        cmd_data = ['tesseract', image_path, 'stdout', '-l', language, '--psm', '3', 'tsv']
        result_data = subprocess.run(cmd_data, capture_output=True, text=True, timeout=30)
        
        # Calculate confidence from TSV output
        confidence = 0.0
        if result_data.returncode == 0:
            lines = result_data.stdout.strip().split('\n')
            confidences = []
            for line in lines[1:]:  # Skip header
                parts = line.split('\t')
                if len(parts) >= 11 and parts[10].strip():  # conf column
                    try:
                        conf = float(parts[10])
                        if conf > 0:
                            confidences.append(conf)
                    except ValueError:
                        continue
            
            if confidences:
                confidence = sum(confidences) / len(confidences)
        
        processing_time = time.time() - start_time
        
        return {
            'text': text,
            'confidence': round(confidence, 2),
            'processing_time': round(processing_time, 3),
            'method': f'Tesseract-Direct-{language}',
            'language': language,
            'word_count': len(text.split()),
            'character_count': len(text)
        }
        
    except subprocess.TimeoutExpired:
        return {
            'text': '',
            'confidence': 0.0,
            'processing_time': 30.0,
            'method': 'Tesseract-Timeout',
            'language': language,
            'error': 'OCR processing timeout'
        }
    except Exception as e:
        return {
            'text': '',
            'confidence': 0.0,
            'processing_time': 0.0,
            'method': 'Tesseract-Error',
            'language': language,
            'error': str(e)
        }

def process_document(file_path: str) -> dict:
    """Process a document file with OCR"""
    try:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")
        
        file_ext = Path(file_path).suffix.lower()
        
        if file_ext == '.pdf':
            return process_pdf(file_path)
        else:
            return process_image(file_path)
            
    except Exception as e:
        return {
            'type': 'error',
            'error': str(e),
            'processing_time': 0.0
        }

def process_pdf(pdf_path: str) -> dict:
    """Process PDF using pdf2image"""
    try:
        from pdf2image import convert_from_path
        
        start_time = time.time()
        
        # Convert PDF to images
        images = convert_from_path(pdf_path, dpi=200)
        
        results = []
        total_confidence = 0
        
        for page_num, image in enumerate(images, 1):
            # Save image to temp file
            with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as temp_file:
                image.save(temp_file.name, 'PNG')
                temp_path = temp_file.name
            
            try:
                # Preprocess
                processed_path = temp_path.replace('.png', '_processed.png')
                preprocess_image_simple(temp_path, processed_path)
                
                # OCR
                result = run_tesseract_ocr(processed_path, 'eng')
                result['page_number'] = page_num
                results.append(result)
                total_confidence += result['confidence']
                
            finally:
                # Cleanup temp files
                for path in [temp_path, processed_path]:
                    if os.path.exists(path):
                        os.unlink(path)
        
        total_processing_time = time.time() - start_time
        avg_confidence = total_confidence / len(results) if results else 0
        
        return {
            'type': 'fra_batch',
            'results': results,
            'total_pages': len(images),
            'total_processing_time': round(total_processing_time, 3),
            'average_quality_score': round(avg_confidence, 2),
            'document_classification': 'multi_page_document',
            'aggregated_entities': extract_fra_entities([r['text'] for r in results])
        }
        
    except Exception as e:
        return {
            'type': 'error',
            'error': f"PDF processing failed: {str(e)}",
            'processing_time': 0.0
        }

def process_image(image_path: str) -> dict:
    """Process single image file"""
    try:
        start_time = time.time()
        
        # Preprocess image
        processed_path = image_path.replace(Path(image_path).suffix, '_processed.png')
        preprocess_success = preprocess_image_simple(image_path, processed_path)
        
        # Use processed image if successful, otherwise original
        ocr_path = processed_path if preprocess_success else image_path
        
        # Run OCR
        result = run_tesseract_ocr(ocr_path, 'eng')
        
        # Extract FRA entities
        entities = extract_fra_entities([result['text']])
        
        total_processing_time = time.time() - start_time
        
        # Cleanup
        if os.path.exists(processed_path):
            os.unlink(processed_path)
        
        return {
            'type': 'fra_single',
            'text': result['text'],
            'quality_score': result['confidence'],
            'language': result['language'],
            'processing_time': round(total_processing_time, 3),
            'method': result['method'],
            'entities': entities,
            'document_classification': 'single_document',
            'metadata': {
                'strategy_used': 'direct_tesseract',
                'preprocessing_applied': preprocess_success
            }
        }
        
    except Exception as e:
        return {
            'type': 'error',
            'error': f"Image processing failed: {str(e)}",
            'processing_time': 0.0
        }

def extract_fra_entities(texts: list) -> dict:
    """Simple FRA entity extraction using string patterns"""
    entities = {
        'patta_holders': [],
        'village_names': [],
        'survey_numbers': [],
        'claim_numbers': [],
        'forest_areas': []
    }
    
    for text in texts:
        lines = text.split('\n')
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # Look for patterns that might be names, villages, etc.
            words = line.split()
            
            # Simple pattern matching for FRA documents
            if any(keyword in line.lower() for keyword in ['name', 'holder', 'claimant']):
                # Extract potential names
                for word in words:
                    if len(word) > 2 and word.isalpha() and word[0].isupper():
                        entities['patta_holders'].append(word)
            
            if any(keyword in line.lower() for keyword in ['village', 'gram', 'tehsil']):
                # Extract potential village names
                for word in words:
                    if len(word) > 3 and word.isalpha() and word[0].isupper():
                        entities['village_names'].append(word)
            
            # Look for numbers that might be survey numbers
            for word in words:
                if '/' in word and any(c.isdigit() for c in word):
                    entities['survey_numbers'].append(word)
                elif word.isdigit() and len(word) >= 3:
                    entities['claim_numbers'].append(word)
    
    # Remove duplicates and limit results
    for key in entities:
        entities[key] = list(set(entities[key]))[:10]  # Max 10 of each type
    
    return entities

def main():
    """Main function for command line usage"""
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python simple_ocr.py <file_path>")
        sys.exit(1)
    
    file_path = sys.argv[1]
    result = process_document(file_path)
    print(json.dumps(result, indent=2))

if __name__ == "__main__":
    main()