# FRA Atlas Test Documents

This directory contains sample documents in various formats to test the genuine AI processing pipeline of the FRA Atlas system.

## Document Types Created

### 1. Individual Forest Rights (IFR) Documents
- **Madhya Pradesh IFR Certificate**: `ifr_madhya_pradesh.txt`
- **Generated Image**: `IFR_government_certificate_document_7c3f6e63.png`
- Contains: Patta holder name (Ram Singh), village (Garhwa), survey number (150/43), patta number (150043/4-220), coordinates, claim number

### 2. Community Forest Resource Rights (CFR) Documents  
- **Telangana CFR Certificate**: `cfr_telangana.txt`
- **Generated Image**: `CFR_Telangana_government_document_8ac1e565.png`
- Contains: Community name (Jangubai Grama Sangham), village, survey numbers, area (125.75 hectares), Telugu/English text

### 3. Forest Rights Patta Documents
- **Odisha Patta**: `patta_odisha.txt` 
- **Generated Image**: `Odisha_Patta_official_document_17145ea3.png`
- Contains: Patta holder (Sita Devi), Odia/English text, survey number (285/1), coordinates, verification dates

### 4. Verification Reports
- **Tripura Verification Report**: `verification_tripura.txt`
- **Generated Image**: `Bengali_verification_report_document_[ID].png`
- Contains: Bengali/English text, verification committee details, recommendation status

## Testing Features

These documents are designed to test the following AI processing components:

### OCR (Optical Character Recognition)
- Multi-language text extraction (Hindi, Telugu, Odia, Bengali, English)
- Government form structure recognition
- Handwriting and printed text processing

### NER (Named Entity Recognition)  
- **Village Names**: Garhwa, Jangubai, Kalahandi, Raima
- **Patta Holders**: Ram Singh, Sita Devi, Arun Chakraborty
- **Coordinates**: Various lat/long formats
- **Claim Numbers**: IFR/2024/MP/GAR/001, CFR/2024/TS/ADL/003, etc.
- **Survey Numbers**: 150/43, 285/1, 185/3, etc.
- **Areas**: 2.5 hectares, 125.75 hectares, 1.25 acres, 0.75 hectare

### Computer Vision & Asset Detection
- Document structure recognition
- Official seal/stamp detection  
- Multi-column layout processing
- Table extraction capabilities

## Usage Instructions

1. **Upload to FRA Atlas**: Use the document upload feature in the application
2. **Monitor Processing**: Check `/api/ai/processing-status` for queue status
3. **View Results**: Extract entities and processed text from the API responses
4. **Test Different Formats**: Try both text files and generated images

## File Formats Available

- **Text Files**: `.txt` format for testing text processing
- **HTML Files**: `.html` format for structured document testing  
- **Generated Images**: `.png` format for testing real OCR pipeline
- **Multi-language**: Documents in Hindi, Telugu, Odia, Bengali, and English

## States Covered

- **Madhya Pradesh**: Hindi/English documents
- **Telangana**: Telugu/English documents  
- **Odisha**: Odia/English documents
- **Tripura**: Bengali/English documents

All documents follow authentic government formatting and contain realistic FRA data for comprehensive testing of the AI processing pipeline.