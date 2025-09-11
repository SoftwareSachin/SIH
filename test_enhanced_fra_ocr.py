#!/usr/bin/env python3
"""
Test script for Enhanced FRA OCR improvements
"""

import sys
import json
import time
from pathlib import Path

# Add server directory to path
sys.path.append('server')

# Import the enhanced FRA OCR
from fra_ocr_enhanced import EnhancedFRAOCR

def test_enhanced_ocr():
    """Test the enhanced FRA OCR on sample document"""
    print("🚀 Testing Enhanced FRA OCR Improvements")
    print("=" * 50)
    
    # Initialize enhanced OCR
    ocr = EnhancedFRAOCR()
    
    # Test with sample FRA document
    sample_path = "sample_fra_claim.png"
    
    if not Path(sample_path).exists():
        print(f"❌ Sample file not found: {sample_path}")
        return
    
    print(f"📄 Processing: {sample_path}")
    print("-" * 30)
    
    start_time = time.time()
    
    # Process with enhanced OCR
    result = ocr.process_fra_document(sample_path)
    
    processing_time = time.time() - start_time
    
    if result['type'] == 'error':
        print(f"❌ OCR Error: {result['error']}")
        return
    
    # Display results
    print(f"✅ Processing completed in {processing_time:.2f}s")
    print(f"🎯 OCR Confidence: {result['confidence']:.2f}%")
    print(f"📊 Quality Score: {result.get('quality_score', 'N/A'):.2f}%")
    print(f"🔤 Language: {result['language']}")
    print(f"📋 Document Type: {result['document_type']}")
    print(f"⚙️ Method: {result['method']}")
    
    print("\n📝 Extracted Text:")
    print("-" * 30)
    print(result['text'][:500])  # First 500 characters
    if len(result['text']) > 500:
        print(f"... (total {len(result['text'])} characters)")
    
    print("\n🔍 Extracted Entities:")
    print("-" * 30)
    for entity_type, values in result['entities'].items():
        if values:
            print(f"{entity_type}: {values[:3]}")  # Show first 3 values
    
    print("\n📊 Quality Assessment:")
    print("-" * 30)
    qa = result.get('quality_assessment', {})
    print(f"Overall Score: {qa.get('overall_score', 0):.2f}%")
    print(f"Confidence Score: {qa.get('confidence_score', 0):.2f}%")
    print(f"Entity Score: {qa.get('entity_score', 0):.2f}%")
    print(f"Structure Score: {qa.get('structure_score', 0):.2f}%")
    print(f"Content Score: {qa.get('content_score', 0):.2f}%")
    print(f"Validation Score: {qa.get('validation_score', 0):.2f}%")
    
    if qa.get('recommendations'):
        print(f"\n💡 Recommendations:")
        for rec in qa['recommendations']:
            print(f"  • {rec}")
    
    # Check if we achieved >80% confidence
    confidence = result['confidence']
    quality_score = result.get('quality_score', 0)
    
    print(f"\n🎯 Target Achievement:")
    print("-" * 30)
    print(f"Target Confidence: >80%")
    print(f"Achieved Confidence: {confidence:.2f}%")
    print(f"Quality Score: {quality_score:.2f}%")
    
    if confidence >= 80:
        print("✅ SUCCESS: Achieved >80% confidence!")
    else:
        print("⚠️  Target not reached - need further improvements")
    
    # Check text quality
    text_lower = result['text'].lower()
    quality_indicators = [
        'forest rights act' in text_lower,
        'name:' in text_lower or 'नाम' in result['text'],
        'village:' in text_lower or 'गांव' in result['text'],
        'patta' in text_lower or 'पट्टा' in result['text'],
        any(char.isdigit() for char in result['text']),  # Has numbers
        len(result['text']) > 100  # Reasonable length
    ]
    
    print(f"\n🔍 Text Quality Indicators:")
    print("-" * 30)
    print(f"✅ Contains 'Forest Rights Act': {quality_indicators[0]}")
    print(f"✅ Contains Name field: {quality_indicators[1]}")
    print(f"✅ Contains Village field: {quality_indicators[2]}")
    print(f"✅ Contains Patta reference: {quality_indicators[3]}")
    print(f"✅ Contains numbers: {quality_indicators[4]}")
    print(f"✅ Reasonable text length: {quality_indicators[5]}")
    
    quality_ratio = sum(quality_indicators) / len(quality_indicators) * 100
    print(f"\nText Quality: {quality_ratio:.1f}%")
    
    return result

if __name__ == "__main__":
    try:
        result = test_enhanced_ocr()
        print(f"\n🏁 Test completed successfully!")
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()