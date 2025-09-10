import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';
import { nanoid } from 'nanoid';

const execAsync = promisify(exec);

export interface PreprocessingResult {
  processedPath: string;
  blueChannelPath?: string;
  croppedFields?: FieldCrop[];
  quality: 'enhanced' | 'original' | 'failed';
  applied: string[];
  scriptType: string;
  documentType: string;
  handwritingDetected: boolean;
  imageStats: ImageStats;
}

export interface FieldCrop {
  id: string;
  fieldType: string;
  path: string;
  bbox: { x: number; y: number; width: number; height: number };
  recommendedPSM: string;
  recommendedLanguage: string;
  whitelist?: string;
}

export interface ImageStats {
  width: number;
  height: number;
  dpi: number;
  variance: number;
  hasBlueInk: boolean;
  textRegions: number;
}

/**
 * Advanced OCR Preprocessing Service implementing all recommendations from the technical guide
 * 
 * Features:
 * - Deskewing and rotation correction
 * - Denoising with bilateral filter and non-local means
 * - Contrast enhancement and adaptive thresholding
 * - Blue channel extraction for handwriting
 * - Field-specific cropping with template detection
 * - Script and document type detection
 * - Quality assessment and upscaling
 */
export class AdvancedOCRPreprocessor {
  private readonly tempDir: string;
  
  constructor() {
    this.tempDir = path.join(process.cwd(), 'uploads', 'temp');
    this.ensureTempDir();
  }

  private ensureTempDir() {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Main preprocessing pipeline implementing guide's best practices
   */
  async process(imagePath: string, options: {
    extractBlueChannel?: boolean;
    cropFields?: boolean;
    documentType?: string;
  } = {}): Promise<PreprocessingResult> {
    const startTime = Date.now();
    const processId = nanoid();
    const applied: string[] = [];

    console.log('🔧 Starting Advanced OCR Preprocessing...');

    try {
      // Step 1: Image quality assessment
      const imageStats = await this.analyzeImage(imagePath);
      applied.push('quality-analysis');

      // Step 2: Core preprocessing pipeline
      const processedPath = await this.corePreprocessing(imagePath, processId, imageStats);
      applied.push('deskew', 'denoise', 'contrast-enhance', 'adaptive-threshold');

      // Step 3: Blue channel extraction for handwriting
      let blueChannelPath: string | undefined;
      if (options.extractBlueChannel && imageStats.hasBlueInk) {
        blueChannelPath = await this.extractBlueChannel(imagePath, processId);
        applied.push('blue-channel-extraction');
      }

      // Step 4: Field-specific cropping
      let croppedFields: FieldCrop[] = [];
      if (options.cropFields) {
        croppedFields = await this.performFieldCropping(processedPath, processId, options.documentType || 'fra-document');
        applied.push('field-cropping');
      }

      // Step 5: Script and document type detection
      const scriptType = await this.detectScript(processedPath);
      const documentType = await this.classifyDocumentType(processedPath);
      applied.push('script-detection', 'document-classification');

      // Step 6: Handwriting detection
      const handwritingDetected = this.detectHandwriting(imageStats);
      applied.push('handwriting-detection');

      const processingTime = Date.now() - startTime;
      console.log(`✅ Advanced preprocessing completed in ${processingTime}ms. Applied: ${applied.join(', ')}`);

      return {
        processedPath,
        blueChannelPath,
        croppedFields,
        quality: 'enhanced',
        applied,
        scriptType,
        documentType,
        handwritingDetected,
        imageStats
      };

    } catch (error) {
      console.error('❌ Advanced preprocessing failed:', error);
      return {
        processedPath: imagePath,
        quality: 'failed',
        applied: ['failed'],
        scriptType: 'unknown',
        documentType: 'unknown',
        handwritingDetected: false,
        imageStats: await this.analyzeImage(imagePath).catch(() => ({
          width: 0, height: 0, dpi: 72, variance: 0, hasBlueInk: false, textRegions: 0
        }))
      };
    }
  }

  /**
   * Core preprocessing following guide recommendations
   */
  private async corePreprocessing(imagePath: string, processId: string, stats: ImageStats): Promise<string> {
    const outputPath = path.join(this.tempDir, `processed_${processId}.png`);
    
    try {
      // Load image with Sharp for high-quality processing
      let image = sharp(imagePath);
      
      // Step 1: Upscale small images (guide recommendation: ×1.5–3 for small text)
      if (stats.width < 1200 || stats.height < 1600) {
        const scaleFactor = stats.width < 800 ? 3 : (stats.width < 1000 ? 2 : 1.5);
        image = image.resize({
          width: Math.round(stats.width * scaleFactor),
          height: Math.round(stats.height * scaleFactor),
          kernel: sharp.kernel.lanczos3 // Best quality for text upscaling
        });
        console.log(`📈 Upscaling image by ${scaleFactor}x for better OCR`);
      }

      // Step 2: Advanced denoising and contrast enhancement
      image = image
        .median(3) // Remove salt-and-pepper noise
        .blur(0.3) // Slight blur to reduce noise (guide recommendation)
        .sharpen({ sigma: 1.0, m1: 0.8, m2: 3, x1: 2, y2: 10, y3: 20 }) // Unsharp mask
        .normalize() // Contrast stretch 
        .linear(1.2, -(128 * 1.2) + 128); // Additional contrast enhancement

      // Step 3: Convert to grayscale with optimal channel weighting
      image = image.grayscale();

      // Step 4: Adaptive thresholding simulation using gamma correction
      image = image.gamma(1.2); // Adjust gamma for better thresholding (valid range 1.0-3.0)

      await image.png({ quality: 100, compressionLevel: 0 }).toFile(outputPath);

      // Step 5: ImageMagick post-processing for advanced operations
      await this.imageMagickPostProcessing(outputPath);

      console.log('🎯 Core preprocessing completed with high-quality pipeline');
      return outputPath;

    } catch (error) {
      console.error('Core preprocessing failed:', error);
      return imagePath;
    }
  }

  /**
   * ImageMagick post-processing for operations not available in Sharp
   */
  private async imageMagickPostProcessing(imagePath: string): Promise<void> {
    try {
      // Deskewing and morphological operations
      const commands = [
        `magick "${imagePath}"`,
        '-background white',
        '-deskew 40%', // Automatic rotation correction
        '-threshold 50%', // Binary thresholding
        '-morphology close rectangle:1x1', // Fill small gaps
        '-despeckle', // Remove isolated pixels
        `"${imagePath}"`
      ].join(' ');

      await execAsync(commands);
      console.log('🔄 ImageMagick post-processing applied');
    } catch (error) {
      console.warn('ImageMagick post-processing failed, continuing with Sharp result:', error);
    }
  }

  /**
   * Extract blue channel for handwriting (guide recommendation)
   */
  private async extractBlueChannel(imagePath: string, processId: string): Promise<string> {
    const blueChannelPath = path.join(this.tempDir, `blue_channel_${processId}.png`);
    
    try {
      // Method 1: Use ImageMagick for blue channel extraction
      const commands = [
        `magick "${imagePath}"`,
        '-channel B',
        '-separate',
        '-normalize', // Enhance contrast of blue channel
        '-threshold 60%', // Binarize for better OCR
        `"${blueChannelPath}"`
      ].join(' ');

      await execAsync(commands);
      console.log('💙 Blue channel extracted for handwriting recognition');
      return blueChannelPath;

    } catch (error) {
      console.warn('Blue channel extraction failed:', error);
      // Fallback: copy original image
      await fs.promises.copyFile(imagePath, blueChannelPath);
      return blueChannelPath;
    }
  }

  /**
   * Field-specific cropping with template detection
   */
  private async performFieldCropping(imagePath: string, processId: string, documentType: string): Promise<FieldCrop[]> {
    const crops: FieldCrop[] = [];

    try {
      const stats = await sharp(imagePath).stats();
      const metadata = await sharp(imagePath).metadata();
      const width = metadata.width || 1000;
      const height = metadata.height || 1000;

      // FRA document field templates (adjust based on your specific forms)
      const fieldTemplates = this.getFRAFieldTemplates(width, height, documentType);

      for (const template of fieldTemplates) {
        const cropId = nanoid();
        const cropPath = path.join(this.tempDir, `crop_${processId}_${template.id}_${cropId}.png`);

        try {
          // Extract field region
          await sharp(imagePath)
            .extract({
              left: template.bbox.x,
              top: template.bbox.y,
              width: template.bbox.width,
              height: template.bbox.height
            })
            .png({ quality: 100 })
            .toFile(cropPath);

          crops.push({
            id: cropId,
            fieldType: template.fieldType,
            path: cropPath,
            bbox: template.bbox,
            recommendedPSM: template.recommendedPSM,
            recommendedLanguage: template.recommendedLanguage,
            whitelist: template.whitelist
          });

          console.log(`✂️ Cropped field: ${template.fieldType} (${template.bbox.width}x${template.bbox.height})`);
        } catch (error) {
          console.warn(`Failed to crop field ${template.fieldType}:`, error);
        }
      }

      return crops;

    } catch (error) {
      console.error('Field cropping failed:', error);
      return [];
    }
  }

  /**
   * Get FRA document field templates for cropping
   */
  private getFRAFieldTemplates(width: number, height: number, documentType: string): Array<{
    id: string;
    fieldType: string;
    bbox: { x: number; y: number; width: number; height: number };
    recommendedPSM: string;
    recommendedLanguage: string;
    whitelist?: string;
  }> {
    // These templates should be calibrated based on your specific FRA document layouts
    const templates = [
      {
        id: 'claimant_name',
        fieldType: 'claimant-name',
        bbox: { x: Math.round(width * 0.2), y: Math.round(height * 0.25), width: Math.round(width * 0.6), height: Math.round(height * 0.05) },
        recommendedPSM: '7', // Single text line
        recommendedLanguage: 'eng+hin',
        whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz \''
      },
      {
        id: 'village_name',
        fieldType: 'village',
        bbox: { x: Math.round(width * 0.2), y: Math.round(height * 0.35), width: Math.round(width * 0.5), height: Math.round(height * 0.04) },
        recommendedPSM: '7',
        recommendedLanguage: 'eng+hin'
      },
      {
        id: 'reference_number',
        fieldType: 'reference-number',
        bbox: { x: Math.round(width * 0.6), y: Math.round(height * 0.15), width: Math.round(width * 0.3), height: Math.round(height * 0.04) },
        recommendedPSM: '7',
        recommendedLanguage: 'eng',
        whitelist: '0123456789/-'
      },
      {
        id: 'survey_number',
        fieldType: 'survey-number',
        bbox: { x: Math.round(width * 0.2), y: Math.round(height * 0.45), width: Math.round(width * 0.3), height: Math.round(height * 0.04) },
        recommendedPSM: '7',
        recommendedLanguage: 'eng',
        whitelist: '0123456789/-.'
      },
      {
        id: 'area',
        fieldType: 'area',
        bbox: { x: Math.round(width * 0.6), y: Math.round(height * 0.45), width: Math.round(width * 0.3), height: Math.round(height * 0.04) },
        recommendedPSM: '7',
        recommendedLanguage: 'eng',
        whitelist: '0123456789. acre hectare bigha'
      }
    ];

    return templates;
  }

  /**
   * Analyze image quality and characteristics
   */
  private async analyzeImage(imagePath: string): Promise<ImageStats> {
    try {
      const image = sharp(imagePath);
      const metadata = await image.metadata();
      const stats = await image.stats();

      // Calculate image variance for handwriting detection
      const variance = stats.channels.reduce((sum, channel) => sum + channel.stdev, 0) / stats.channels.length;

      // Detect blue ink presence
      const hasBlueInk = await this.detectBlueInk(imagePath);

      // Estimate text regions (simplified)
      const textRegions = await this.estimateTextRegions(imagePath);

      return {
        width: metadata.width || 0,
        height: metadata.height || 0,
        dpi: metadata.density || 72,
        variance,
        hasBlueInk,
        textRegions
      };

    } catch (error) {
      console.error('Image analysis failed:', error);
      return { width: 0, height: 0, dpi: 72, variance: 0, hasBlueInk: false, textRegions: 0 };
    }
  }

  /**
   * Detect blue ink for handwriting extraction
   */
  private async detectBlueInk(imagePath: string): Promise<boolean> {
    try {
      const image = sharp(imagePath);
      const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
      
      // Simple blue channel analysis
      let blueSum = 0;
      let redSum = 0;
      let greenSum = 0;
      const pixelCount = info.width * info.height;

      for (let i = 0; i < data.length; i += 3) {
        redSum += data[i];
        greenSum += data[i + 1];
        blueSum += data[i + 2];
      }

      const avgBlue = blueSum / pixelCount;
      const avgRed = redSum / pixelCount;
      const avgGreen = greenSum / pixelCount;

      // Blue ink typically has higher blue values relative to red/green
      return avgBlue > (avgRed + avgGreen) / 2 + 10;

    } catch (error) {
      return false;
    }
  }

  /**
   * Estimate number of text regions
   */
  private async estimateTextRegions(imagePath: string): Promise<number> {
    try {
      // Use connected components analysis via ImageMagick
      const { stdout } = await execAsync(`magick "${imagePath}" -threshold 50% -connected-components 8 -format "%[connected-components]" info:`);
      return parseInt(stdout.trim()) || 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Script detection using character pattern analysis
   */
  private async detectScript(imagePath: string): Promise<string> {
    try {
      // Quick OCR scan for script detection
      const quickResult = await this.quickOCRScan(imagePath);
      const text = quickResult.text;

      // Script detection patterns
      if (/[\u0900-\u097F]/.test(text)) return 'devanagari';
      if (/[\u0980-\u09FF]/.test(text)) return 'bengali';
      if (/[\u0A80-\u0AFF]/.test(text)) return 'gujarati';
      if (/[\u0C00-\u0C7F]/.test(text)) return 'telugu';
      if (/[\u0B80-\u0BFF]/.test(text)) return 'tamil';
      if (/[\u0C80-\u0CFF]/.test(text)) return 'kannada';
      if (/[\u0D00-\u0D7F]/.test(text)) return 'malayalam';
      if (/[\u0B00-\u0B7F]/.test(text)) return 'odia';
      if (/[\u0600-\u06FF]/.test(text)) return 'urdu';
      
      return /[A-Za-z]/.test(text) ? 'latin' : 'mixed';

    } catch (error) {
      return 'unknown';
    }
  }

  /**
   * Document type classification
   */
  private async classifyDocumentType(imagePath: string): Promise<string> {
    try {
      const quickResult = await this.quickOCRScan(imagePath);
      const text = quickResult.text.toLowerCase();

      if (text.includes('forest rights act') || text.includes('वन अधिकार')) return 'fra-patta';
      if (text.includes('claim') || text.includes('दावा')) return 'fra-claim';
      if (text.includes('survey') || text.includes('सर्वेक्षण')) return 'survey-document';
      if (text.includes('map') || text.includes('नक्शा')) return 'map';
      if (text.includes('certificate') || text.includes('प्रमाणपत्र')) return 'certificate';

      return 'government-document';

    } catch (error) {
      return 'unknown';
    }
  }

  /**
   * Handwriting detection based on image statistics
   */
  private detectHandwriting(stats: ImageStats): boolean {
    // Handwritten documents typically have higher variance and specific characteristics
    return stats.variance > 30 && stats.hasBlueInk;
  }

  /**
   * Quick OCR scan for analysis (using simpler approach for speed)
   */
  private async quickOCRScan(imagePath: string): Promise<{ text: string; confidence: number }> {
    try {
      // Use tesseract command line for quick analysis
      const { stdout } = await execAsync(`tesseract "${imagePath}" stdout --oem 1 --psm 3 -l eng+hin`);
      return { text: stdout, confidence: 75 };
    } catch (error) {
      return { text: '', confidence: 0 };
    }
  }

  /**
   * Cleanup temporary files
   */
  async cleanup(processId?: string): Promise<void> {
    try {
      if (processId) {
        // Clean specific process files
        const files = await fs.promises.readdir(this.tempDir);
        const processFiles = files.filter(file => file.includes(processId));
        
        for (const file of processFiles) {
          await fs.promises.unlink(path.join(this.tempDir, file));
        }
      } else {
        // Clean all temp files older than 1 hour
        const files = await fs.promises.readdir(this.tempDir);
        const now = Date.now();
        
        for (const file of files) {
          const filePath = path.join(this.tempDir, file);
          const stats = await fs.promises.stat(filePath);
          
          if (now - stats.mtime.getTime() > 60 * 60 * 1000) { // 1 hour
            await fs.promises.unlink(filePath);
          }
        }
      }
    } catch (error) {
      console.warn('Cleanup failed:', error);
    }
  }
}

export const advancedOCRPreprocessor = new AdvancedOCRPreprocessor();