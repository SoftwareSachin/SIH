import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { nanoid } from 'nanoid';

const execAsync = promisify(exec);

export interface TrainingExample {
  id: string;
  imagePath: string;
  groundTruth: string;
  fieldType: string;
  language: string;
  confidence: number;
  created: Date;
  corrected: boolean;
  corrections?: string[];
}

export interface TrainingSet {
  id: string;
  name: string;
  description: string;
  examples: TrainingExample[];
  language: string;
  documentType: string;
  created: Date;
  totalExamples: number;
  qualityScore: number;
}

export interface TesstralınConfig {
  language: string;
  outputDir: string;
  maxIterations: number;
  learningRate: number;
  targetErrorRate: number;
  fonts: string[];
  unicharset?: string;
}

/**
 * Training Data Manager implementing guide recommendations for tesstrain integration
 * 
 * Features:
 * - Human-in-the-loop correction collection
 * - Automatic training data generation from corrections
 * - tesstrain.sh integration for model fine-tuning
 * - Synthetic data generation using text2image
 * - Training set quality assessment
 * - Iterative model improvement
 */
export class TrainingDataManager {
  private readonly trainingDir: string;
  private readonly tessDataDir: string;
  private trainingExamples: Map<string, TrainingExample> = new Map();
  private trainingSets: Map<string, TrainingSet> = new Map();

  constructor() {
    this.trainingDir = path.join(process.cwd(), 'training_data');
    this.tessDataDir = path.join(process.cwd(), 'tessdata');
    this.initializeDirectories();
    this.loadExistingData();
  }

  /**
   * Initialize training directories
   */
  private initializeDirectories(): void {
    const dirs = [
      this.trainingDir,
      path.join(this.trainingDir, 'corrected'),
      path.join(this.trainingDir, 'synthetic'),
      path.join(this.trainingDir, 'models'),
      this.tessDataDir
    ];

    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });

    console.log('📁 Training data directories initialized');
  }

  /**
   * Load existing training data
   */
  private loadExistingData(): void {
    try {
      const dataFile = path.join(this.trainingDir, 'training_data.json');
      if (fs.existsSync(dataFile)) {
        const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
        
        data.examples?.forEach((example: any) => {
          this.trainingExamples.set(example.id, {
            ...example,
            created: new Date(example.created)
          });
        });

        data.trainingSets?.forEach((set: any) => {
          this.trainingSets.set(set.id, {
            ...set,
            created: new Date(set.created)
          });
        });

        console.log(`📚 Loaded ${this.trainingExamples.size} training examples and ${this.trainingSets.size} training sets`);
      }
    } catch (error) {
      console.warn('Could not load existing training data:', error);
    }
  }

  /**
   * Save training data to disk
   */
  private saveData(): void {
    try {
      const data = {
        examples: Array.from(this.trainingExamples.values()),
        trainingSets: Array.from(this.trainingSets.values())
      };

      const dataFile = path.join(this.trainingDir, 'training_data.json');
      fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Failed to save training data:', error);
    }
  }

  /**
   * Add corrected example from human review
   */
  async addCorrectedExample(
    imagePath: string,
    originalText: string,
    correctedText: string,
    fieldType: string,
    language: string = 'eng+hin'
  ): Promise<string> {
    const exampleId = nanoid();
    
    try {
      // Copy image to training directory
      const trainingImagePath = path.join(this.trainingDir, 'corrected', `${exampleId}.png`);
      await fs.promises.copyFile(imagePath, trainingImagePath);

      // Create ground truth file
      const gtPath = path.join(this.trainingDir, 'corrected', `${exampleId}.gt.txt`);
      await fs.promises.writeFile(gtPath, correctedText, 'utf8');

      const example: TrainingExample = {
        id: exampleId,
        imagePath: trainingImagePath,
        groundTruth: correctedText,
        fieldType,
        language,
        confidence: this.calculateExampleConfidence(originalText, correctedText),
        created: new Date(),
        corrected: true,
        corrections: this.getCorrections(originalText, correctedText)
      };

      this.trainingExamples.set(exampleId, example);
      this.saveData();

      console.log(`✅ Added corrected training example: ${exampleId} (${fieldType})`);
      return exampleId;

    } catch (error) {
      console.error('Failed to add corrected example:', error);
      throw error;
    }
  }

  /**
   * Generate synthetic training data using text2image
   */
  async generateSyntheticData(
    textLines: string[],
    language: string = 'eng',
    documentType: string = 'fra-document'
  ): Promise<string[]> {
    console.log(`🎨 Generating ${textLines.length} synthetic training examples...`);
    
    const syntheticIds: string[] = [];
    const fontsDir = '/usr/share/fonts';
    
    // Common fonts for Indian documents
    const fonts = [
      'liberation-fonts/LiberationSerif-Regular.ttf',
      'liberation-fonts/LiberationSans-Regular.ttf',
      'dejavu-fonts/DejaVuSerif.ttf',
      'dejavu-fonts/DejaVuSans.ttf'
    ];

    for (let i = 0; i < textLines.length; i++) {
      const text = textLines[i];
      const syntheticId = nanoid();
      
      try {
        const font = fonts[i % fonts.length];
        const fontPath = path.join(fontsDir, font);
        
        const outputImage = path.join(this.trainingDir, 'synthetic', `${syntheticId}.png`);
        const outputGt = path.join(this.trainingDir, 'synthetic', `${syntheticId}.gt.txt`);

        // Use text2image to generate training data
        const command = [
          'text2image',
          `--text="${text}"`,
          `--outputbase="${path.join(this.trainingDir, 'synthetic', syntheticId)}"`,
          `--font="${fontPath}"`,
          '--fonts_dir=/usr/share/fonts',
          '--ptsize=14',
          '--xsize=800',
          '--ysize=200',
          '--char_spacing=0.2',
          '--leading=1.2',
          '--margin=10'
        ].join(' ');

        await execAsync(command);

        // Verify files were created
        if (fs.existsSync(outputImage) && fs.existsSync(outputGt)) {
          const example: TrainingExample = {
            id: syntheticId,
            imagePath: outputImage,
            groundTruth: text,
            fieldType: 'synthetic',
            language,
            confidence: 1.0, // Synthetic data has perfect ground truth
            created: new Date(),
            corrected: false
          };

          this.trainingExamples.set(syntheticId, example);
          syntheticIds.push(syntheticId);
        }

      } catch (error) {
        console.warn(`Failed to generate synthetic example ${i}:`, error);
      }
    }

    this.saveData();
    console.log(`✅ Generated ${syntheticIds.length} synthetic training examples`);
    return syntheticIds;
  }

  /**
   * Create training set from examples
   */
  createTrainingSet(
    name: string,
    description: string,
    exampleIds: string[],
    language: string = 'eng+hin',
    documentType: string = 'fra-document'
  ): string {
    const setId = nanoid();
    const examples = exampleIds
      .map(id => this.trainingExamples.get(id))
      .filter(Boolean) as TrainingExample[];

    const trainingSet: TrainingSet = {
      id: setId,
      name,
      description,
      examples,
      language,
      documentType,
      created: new Date(),
      totalExamples: examples.length,
      qualityScore: this.calculateSetQuality(examples)
    };

    this.trainingSets.set(setId, trainingSet);
    this.saveData();

    console.log(`📦 Created training set '${name}' with ${examples.length} examples`);
    return setId;
  }

  /**
   * Train custom Tesseract model using tesstrain
   */
  async trainCustomModel(
    trainingSetId: string,
    config: TesstralınConfig
  ): Promise<{
    success: boolean;
    modelPath?: string;
    logs: string;
    metrics?: {
      characterErrorRate: number;
      wordErrorRate: number;
      iterations: number;
    };
  }> {
    const trainingSet = this.trainingSets.get(trainingSetId);
    if (!trainingSet) {
      throw new Error(`Training set not found: ${trainingSetId}`);
    }

    console.log(`🚀 Starting tesstrain for model: ${config.language}`);

    try {
      // Prepare training data
      const workDir = path.join(this.trainingDir, 'models', trainingSetId);
      await this.prepareTesttrainData(trainingSet, workDir);

      // Run tesstrain
      const result = await this.runTesstrain(workDir, config);
      
      if (result.success && result.modelPath) {
        // Copy trained model to tessdata
        const targetPath = path.join(this.tessDataDir, `${config.language}.traineddata`);
        await fs.promises.copyFile(result.modelPath, targetPath);
        
        console.log(`✅ Custom model trained and deployed: ${config.language}`);
      }

      return result;

    } catch (error) {
      console.error('Training failed:', error);
      return {
        success: false,
        logs: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Prepare data for tesstrain
   */
  private async prepareTesttrainData(trainingSet: TrainingSet, workDir: string): Promise<void> {
    // Create directory structure
    const dirs = [
      workDir,
      path.join(workDir, 'ground_truth'),
      path.join(workDir, 'images')
    ];

    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });

    // Copy training examples
    for (const example of trainingSet.examples) {
      const imageName = `${example.id}.png`;
      const gtName = `${example.id}.gt.txt`;

      await fs.promises.copyFile(
        example.imagePath,
        path.join(workDir, 'images', imageName)
      );

      await fs.promises.writeFile(
        path.join(workDir, 'ground_truth', gtName),
        example.groundTruth,
        'utf8'
      );
    }

    console.log(`📋 Prepared ${trainingSet.examples.length} examples for training`);
  }

  /**
   * Run tesstrain.sh script
   */
  private async runTesstrain(
    workDir: string,
    config: TesstralınConfig
  ): Promise<{
    success: boolean;
    modelPath?: string;
    logs: string;
    metrics?: {
      characterErrorRate: number;
      wordErrorRate: number;
      iterations: number;
    };
  }> {
    try {
      // tesstrain command
      const command = [
        'tesstrain.sh',
        `--lang ${config.language}`,
        `--linedata_only`,
        `--noextract_font_properties`,
        `--langdata_dir /usr/share/tessdata/langdata`,
        `--tessdata_dir /usr/share/tessdata`,
        `--output_dir ${config.outputDir}`,
        `--max_iterations ${config.maxIterations}`,
        `--target_error_rate ${config.targetErrorRate}`,
        `--save_box_tiff`,
        `--workspace_dir ${workDir}`
      ].join(' ');

      console.log('🔄 Running tesstrain command...');
      const { stdout, stderr } = await execAsync(command, {
        cwd: workDir,
        timeout: 30 * 60 * 1000 // 30 minutes timeout
      });

      const logs = stdout + stderr;
      
      // Check for success
      const modelPath = path.join(config.outputDir, `${config.language}.traineddata`);
      const success = fs.existsSync(modelPath);

      // Extract metrics from logs
      const metrics = this.extractTrainingMetrics(logs);

      return {
        success,
        modelPath: success ? modelPath : undefined,
        logs,
        metrics
      };

    } catch (error) {
      return {
        success: false,
        logs: error instanceof Error ? error.message : 'Training command failed'
      };
    }
  }

  /**
   * Extract training metrics from tesstrain logs
   */
  private extractTrainingMetrics(logs: string): {
    characterErrorRate: number;
    wordErrorRate: number;
    iterations: number;
  } | undefined {
    try {
      const cerMatch = logs.match(/CER=([0-9.]+)/);
      const werMatch = logs.match(/WER=([0-9.]+)/);
      const iterMatch = logs.match(/Iteration (\d+)/g);

      if (cerMatch && werMatch) {
        return {
          characterErrorRate: parseFloat(cerMatch[1]),
          wordErrorRate: parseFloat(werMatch[1]),
          iterations: iterMatch ? iterMatch.length : 0
        };
      }
    } catch (error) {
      console.warn('Could not extract training metrics:', error);
    }

    return undefined;
  }

  /**
   * Calculate example confidence based on corrections needed
   */
  private calculateExampleConfidence(original: string, corrected: string): number {
    if (original === corrected) return 1.0;
    
    const originalWords = original.split(/\s+/);
    const correctedWords = corrected.split(/\s+/);
    
    const maxLength = Math.max(originalWords.length, correctedWords.length);
    if (maxLength === 0) return 1.0;
    
    let matches = 0;
    for (let i = 0; i < Math.min(originalWords.length, correctedWords.length); i++) {
      if (originalWords[i] === correctedWords[i]) {
        matches++;
      }
    }
    
    return matches / maxLength;
  }

  /**
   * Get list of corrections made
   */
  private getCorrections(original: string, corrected: string): string[] {
    const corrections: string[] = [];
    
    if (original !== corrected) {
      const originalWords = original.split(/\s+/);
      const correctedWords = corrected.split(/\s+/);
      
      for (let i = 0; i < Math.max(originalWords.length, correctedWords.length); i++) {
        const orig = originalWords[i] || '';
        const corr = correctedWords[i] || '';
        
        if (orig !== corr) {
          corrections.push(`'${orig}' → '${corr}'`);
        }
      }
    }
    
    return corrections;
  }

  /**
   * Calculate training set quality
   */
  private calculateSetQuality(examples: TrainingExample[]): number {
    if (examples.length === 0) return 0;
    
    let score = 0;
    
    // Size factor
    if (examples.length >= 1000) score += 30;
    else if (examples.length >= 500) score += 20;
    else if (examples.length >= 100) score += 10;
    else score += examples.length / 10;
    
    // Quality factor
    const avgConfidence = examples.reduce((sum, ex) => sum + ex.confidence, 0) / examples.length;
    score += avgConfidence * 30;
    
    // Diversity factor
    const fieldTypes = new Set(examples.map(ex => ex.fieldType));
    score += Math.min(20, fieldTypes.size * 5);
    
    // Correction factor
    const correctedCount = examples.filter(ex => ex.corrected).length;
    score += (correctedCount / examples.length) * 20;
    
    return Math.min(100, Math.round(score));
  }

  /**
   * Get training statistics
   */
  getStatistics(): {
    totalExamples: number;
    correctedExamples: number;
    syntheticExamples: number;
    trainingSets: number;
    languageBreakdown: Record<string, number>;
    fieldTypeBreakdown: Record<string, number>;
  } {
    const examples = Array.from(this.trainingExamples.values());
    
    const stats = {
      totalExamples: examples.length,
      correctedExamples: examples.filter(ex => ex.corrected).length,
      syntheticExamples: examples.filter(ex => ex.fieldType === 'synthetic').length,
      trainingSets: this.trainingSets.size,
      languageBreakdown: {} as Record<string, number>,
      fieldTypeBreakdown: {} as Record<string, number>
    };

    examples.forEach(ex => {
      stats.languageBreakdown[ex.language] = (stats.languageBreakdown[ex.language] || 0) + 1;
      stats.fieldTypeBreakdown[ex.fieldType] = (stats.fieldTypeBreakdown[ex.fieldType] || 0) + 1;
    });

    return stats;
  }

  /**
   * Export training set for external use
   */
  async exportTrainingSet(trainingSetId: string, format: 'lstmf' | 'tiff' = 'lstmf'): Promise<string> {
    const trainingSet = this.trainingSets.get(trainingSetId);
    if (!trainingSet) {
      throw new Error(`Training set not found: ${trainingSetId}`);
    }

    const exportDir = path.join(this.trainingDir, 'exports', trainingSetId);
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    // Export based on format
    if (format === 'lstmf') {
      // Export in LSTM format for tesstrain
      for (const example of trainingSet.examples) {
        const baseName = path.basename(example.imagePath, '.png');
        await fs.promises.copyFile(
          example.imagePath,
          path.join(exportDir, `${baseName}.png`)
        );
        await fs.promises.writeFile(
          path.join(exportDir, `${baseName}.gt.txt`),
          example.groundTruth,
          'utf8'
        );
      }
    }

    console.log(`📤 Exported training set to: ${exportDir}`);
    return exportDir;
  }
}

export const trainingDataManager = new TrainingDataManager();