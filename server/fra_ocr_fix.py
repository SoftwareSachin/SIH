#!/usr/bin/env python3
"""
Fixed FRA OCR Detection Function - to replace the broken one
"""

import re

def detect_fra_document_type_fixed(self, text: str) -> str:
    """
    FIXED: Intelligently detect FRA document type using proper fra_document_types configuration
    Correctly identifies IFR, CR, CFR, Patta, Verification, Gram Sabha, and Claim Application documents
    """
    text_lower = text.lower()
    type_scores = {}
    
    # Score each document type using its defined keywords from fra_document_types
    for doc_type, config in self.fra_document_types.items():
        score = 0
        keywords = config.get('keywords', [])
        
        # Calculate weighted keyword match score
        for keyword in keywords:
            if keyword.lower() in text_lower:
                # Weight longer, more specific keywords higher
                weight = max(2, len(keyword.split()))
                score += weight
        
        # Document-specific structural scoring for higher accuracy
        if doc_type == 'community_forest_resource_rights':
            # CFR gets highest priority for forest resource terms
            if any(term in text_lower for term in ['cfr', 'forest resource', 'community forest', 'संसाधन']):
                score += 6  # Higher weight for CFR specificity
            if any(term in text_lower for term in ['management', 'conservation', 'committee', 'schedule ii']):
                score += 3
                
        elif doc_type == 'individual_forest_rights':
            if any(term in text_lower for term in ['individual', 'ifr', 'applicant', 'श्री']):
                score += 4
            if re.search(r'survey\s*(?:no|number)', text_lower):
                score += 3
                
        elif doc_type == 'community_rights':
            if any(term in text_lower for term in ['community use', 'minor forest', 'mfp', 'collective']):
                score += 4
            # Reduce score if it's clearly CFR content to avoid misclassification
            if any(term in text_lower for term in ['forest resource', 'cfr', 'management']):
                score -= 3
                
        elif doc_type == 'claim_application':
            if any(term in text_lower for term in ['application', 'claim', 'दावा', 'आवेदन']):
                score += 5
            if re.search(r'application\s*(?:no|number)', text_lower):
                score += 4
                
        elif doc_type == 'patta_document':
            if any(term in text_lower for term in ['title deed', 'granted', 'issued', 'ownership']):
                score += 4
            if re.search(r'patta\s*(?:no|number)', text_lower):
                score += 5
                
        elif doc_type == 'verification_report':
            if any(term in text_lower for term in ['field verification', 'inspection', 'verified by']):
                score += 4
                
        elif doc_type == 'gram_sabha_resolution':
            if any(term in text_lower for term in ['resolution', 'meeting', 'decided']):
                score += 4
            if re.search(r'resolution\s*(?:no|number)', text_lower):
                score += 5
        
        # General form structure indicators
        if re.search(r'form\s*[a-z]', text_lower):
            score += 2
        if text.count(':') > 5:  # Structured form
            score += 1
            
        type_scores[doc_type] = score
    
    # Return the type with highest score above confidence threshold
    if type_scores:
        best_type = max(type_scores, key=type_scores.get)
        max_score = type_scores[best_type]
        
        if max_score >= 5:  # High confidence threshold
            return best_type
        elif max_score >= 3:  # Medium confidence threshold
            return best_type
    
    # Smart fallback based on content analysis
    if any(term in text_lower for term in ['cfr', 'forest resource', 'संसाधन']):
        return 'community_forest_resource_rights'
    elif any(term in text_lower for term in ['application', 'claim', 'दावा']):
        return 'claim_application'
    elif any(term in text_lower for term in ['patta', 'title', 'granted']):
        return 'patta_document'
    else:
        return 'individual_forest_rights'


# Test the fixed function
if __name__ == "__main__":
    print("Testing fixed CFR detection...")
    
    # Mock fra_document_types for testing
    class MockOCR:
        def __init__(self):
            self.fra_document_types = {
                'community_forest_resource_rights': {
                    'keywords': [
                        'community forest resource rights', 'cfr', 'community forest rights',
                        'सामुदायिक वन संसाधन अधिकार', 'সামাজিক বন সম্পদ অধিকার', 
                        'ସାମୁଦାୟିକ ବନ ସମ୍ପଦ ଅଧିକାର', 'సామాజిక అటవీ వనరుల హక్కులు',
                        'form b', 'schedule ii', 'community forest'
                    ]
                },
                'community_rights': {
                    'keywords': [
                        'community rights', 'cr', 'community use rights', 'सामुदायिक अधिकार', 
                        'সামাজিক অধিকার', 'ସାମୁଦାୟିକ ଅଧିକାର', 'సామాజిక హక్కులు',
                        'form c', 'schedule iii', 'community patta'
                    ]
                }
            }
        
        def detect_fra_document_type(self, text):
            return detect_fra_document_type_fixed(self, text)
    
    # Test CFR content
    cfr_content = '''
    Community Forest Resource Rights (CFR) Application
    Schedule II Form B
    Management Committee: Village Forest Committee
    Forest Area: 100 hectares
    '''
    
    ocr = MockOCR()
    result = ocr.detect_fra_document_type(cfr_content)
    print(f"CFR Test Result: {result}")
    print("✅ FIXED!" if result == 'community_forest_resource_rights' else "❌ Still broken")