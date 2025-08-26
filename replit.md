# FRA Atlas - AI-Powered Forest Rights Act Management System

## Overview

FRA Atlas is a comprehensive WebGIS-based Decision Support System designed for integrated monitoring and management of Forest Rights Act (FRA) implementation. The system combines AI-powered document processing, geospatial analysis, and decision support capabilities to digitize legacy FRA records, create interactive maps of forest rights claims, and recommend Central Sector Scheme eligibility for patta holders.

The application targets states like Madhya Pradesh, Tripura, Odisha, and Telangana, providing tools for digitizing Individual Forest Rights (IFR), Community Rights (CR), and Community Forest Resource Rights (CFR) claims while integrating satellite-based asset mapping and scheme recommendation engines.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **React + TypeScript SPA**: Modern single-page application using React 18 with TypeScript for type safety
- **Vite Build System**: Fast development server and optimized production builds
- **Component Library**: Shadcn/ui components built on Radix UI primitives for accessible, customizable UI components
- **Styling**: Tailwind CSS with CSS variables for theming and responsive design
- **State Management**: TanStack Query for server state management with optimistic updates and caching
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod schema validation for type-safe form handling

### Backend Architecture
- **Express.js API Server**: RESTful API built with Express and TypeScript
- **Database Layer**: Drizzle ORM with PostgreSQL for type-safe database operations
- **Authentication**: Replit OAuth integration with session-based authentication using PostgreSQL session store
- **File Upload**: Multer middleware for handling document uploads (PDF, images)
- **Microservices Pattern**: Separated services for AI processing, document handling, and decision support

### Geographic Information System (WebGIS)
- **Interactive Mapping**: WebGIS portal for visualizing FRA claims, village boundaries, forest cover, and detected assets
- **Spatial Data Support**: GeoJSON and Shapefile integration with EPSG:4326 coordinate system
- **Layer Management**: Toggle-able map layers for different data types (claims, boundaries, satellite imagery)
- **Export Capabilities**: Data export functionality for spatial and tabular data

### AI Processing Pipeline
- **Document Digitization**: OCR pipeline using Tesseract.js for extracting text from scanned FRA documents
- **Named Entity Recognition (NER)**: AI models to identify claimant names, village names, coordinates, and claim status from documents
- **Computer Vision**: Satellite imagery analysis for land-use classification and asset detection (agricultural land, water bodies, homesteads)
- **Confidence Scoring**: ML model outputs include confidence scores for data quality assessment

### Decision Support System (DSS)
- **Rule-Based Engine**: Eligibility assessment for Central Sector Schemes (PM-KISAN, Jal Jeevan Mission, MGNREGA)
- **Priority Scoring**: Algorithm for ranking villages and interventions based on mapped assets and demographics
- **Recommendation Engine**: AI-powered suggestions for scheme implementations and resource allocation

### Data Management
- **Schema Design**: Comprehensive database schema covering users, geographic hierarchies, claims, documents, assets, and recommendations
- **Audit Trail**: Complete tracking of data changes and processing status
- **Role-Based Access**: Multi-tier user roles (admin, state, district, field, NGO, public) with appropriate permissions
- **Data Provenance**: Metadata tracking for source documents, processing confidence, and data lineage

## External Dependencies

### Database and Infrastructure
- **Neon Database**: Serverless PostgreSQL hosting with WebSocket support for real-time capabilities
- **Replit Hosting**: Development and deployment platform with integrated authentication

### AI and Machine Learning
- **Tesseract.js**: Client-side OCR for document text extraction
- **Computer Vision APIs**: Satellite imagery analysis for land-use classification and asset detection
- **NLP Libraries**: Named entity recognition for parsing extracted document text

### Authentication and Security
- **Replit OAuth**: OpenID Connect integration for user authentication
- **Session Management**: PostgreSQL-backed session storage with connect-pg-simple

### UI and Mapping
- **Radix UI**: Accessible component primitives for form controls and interactive elements
- **Lucide Icons**: Comprehensive icon library for consistent UI iconography
- **Satellite Imagery**: Integration with satellite tile services for base mapping
- **GIS Libraries**: Geospatial data processing and visualization capabilities

### Development Tools
- **Drizzle Kit**: Database schema management and migrations
- **TypeScript**: Type safety across frontend and backend
- **ESBuild**: Fast JavaScript bundling for production builds
- **PostCSS**: CSS processing with Tailwind CSS integration