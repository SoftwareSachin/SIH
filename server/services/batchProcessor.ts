import { EventEmitter } from 'events';
import { documentProcessor } from './documentProcessor';
import { storage } from '../storage';

interface BatchJob {
  id: string;
  documents: Array<{
    id: string;
    filePath: string;
    fileType: string;
    claimId: string;
  }>;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: {
    total: number;
    processed: number;
    failed: number;
  };
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

interface ProcessingQueue {
  id: string;
  priority: 'high' | 'normal' | 'low';
  documentId: string;
  filePath: string;
  fileType: string;
  claimId: string;
  retryCount: number;
  maxRetries: number;
}

class BatchProcessor extends EventEmitter {
  private queue: ProcessingQueue[] = [];
  private processing: Map<string, ProcessingQueue> = new Map();
  private batchJobs: Map<string, BatchJob> = new Map();
  private maxConcurrentJobs = 3;
  private isProcessing = false;

  constructor() {
    super();
    this.startProcessor();
  }

  // Add documents to batch processing queue
  async addBatch(documents: Array<{
    id: string;
    filePath: string;
    fileType: string;
    claimId: string;
    priority?: 'high' | 'normal' | 'low';
  }>): Promise<string> {
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const batchJob: BatchJob = {
      id: batchId,
      documents,
      status: 'pending',
      progress: {
        total: documents.length,
        processed: 0,
        failed: 0
      }
    };

    this.batchJobs.set(batchId, batchJob);

    // Add each document to processing queue
    documents.forEach((doc, index) => {
      const queueItem: ProcessingQueue = {
        id: `${batchId}_${index}`,
        priority: doc.priority || 'normal',
        documentId: doc.id,
        filePath: doc.filePath,
        fileType: doc.fileType,
        claimId: doc.claimId,
        retryCount: 0,
        maxRetries: 3
      };
      
      this.queue.push(queueItem);
    });

    // Sort queue by priority
    this.sortQueue();
    
    console.log(`Batch ${batchId} added with ${documents.length} documents`);
    return batchId;
  }

  // Add single document for immediate processing
  async addDocument(document: {
    id: string;
    filePath: string;
    fileType: string;
    claimId: string;
    priority?: 'high' | 'normal' | 'low';
  }): Promise<string> {
    const jobId = `single_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const queueItem: ProcessingQueue = {
      id: jobId,
      priority: document.priority || 'high', // Single docs get higher priority
      documentId: document.id,
      filePath: document.filePath,
      fileType: document.fileType,
      claimId: document.claimId,
      retryCount: 0,
      maxRetries: 3
    };
    
    this.queue.unshift(queueItem); // Add to front for immediate processing
    this.sortQueue();
    
    console.log(`Document ${document.id} added for immediate processing`);
    return jobId;
  }

  private sortQueue() {
    // Sort by priority: high -> normal -> low
    this.queue.sort((a, b) => {
      const priorityOrder = { high: 3, normal: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  private async startProcessor() {
    this.isProcessing = true;
    
    while (this.isProcessing) {
      try {
        // Process items if queue has items and we're under concurrent limit
        if (this.queue.length > 0 && this.processing.size < this.maxConcurrentJobs) {
          const item = this.queue.shift()!;
          this.processing.set(item.id, item);
          
          // Process in background
          this.processDocument(item).catch(error => {
            console.error(`Failed to process document ${item.documentId}:`, error);
            this.handleProcessingError(item, error);
          });
        }
        
        // Wait before next iteration
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error('Error in batch processor:', error);
      }
    }
  }

  private async processDocument(item: ProcessingQueue) {
    try {
      console.log(`Starting OCR processing for document ${item.documentId}`);
      
      // Mark document as processing
      await storage.updateDocument(item.documentId, {
        processingStatus: 'processing',
        processingAttempts: item.retryCount + 1
      });

      // Process with OCR
      const result = await documentProcessor.processDocument(
        item.filePath, 
        item.fileType, 
        item.documentId
      );

      // Update document with results
      await storage.updateDocument(item.documentId, {
        ocrText: result.text,
        ocrConfidence: result.confidence.toString(),
        extractedEntities: result.entities,
        processedAt: new Date(),
        processingStatus: 'processed',
        ocrLanguage: result.language as any,
        processingTime: result.metadata.processingTime,
        imageQuality: result.metadata.imageQuality,
        preprocessingApplied: result.metadata.preprocessingApplied
      });

      // Update batch progress if applicable
      this.updateBatchProgress(item.id, 'success');
      
      // Remove from processing
      this.processing.delete(item.id);
      
      console.log(`Successfully processed document ${item.documentId} with ${result.confidence}% confidence`);
      
      // Emit success event
      this.emit('documentProcessed', {
        documentId: item.documentId,
        result,
        jobId: item.id
      });

    } catch (error) {
      console.error(`Processing failed for document ${item.documentId}:`, error);
      await this.handleProcessingError(item, error);
    }
  }

  private async handleProcessingError(item: ProcessingQueue, error: any) {
    item.retryCount++;
    
    if (item.retryCount <= item.maxRetries) {
      // Retry: put back in queue with lower priority
      item.priority = 'low';
      this.queue.push(item);
      this.sortQueue();
      console.log(`Retrying document ${item.documentId}, attempt ${item.retryCount}/${item.maxRetries}`);
    } else {
      // Max retries exceeded - mark as failed
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      await storage.updateDocument(item.documentId, {
        processingStatus: 'failed',
        lastError: errorMessage,
        processingAttempts: item.retryCount
      });
      
      this.updateBatchProgress(item.id, 'failed');
      
      console.error(`Document ${item.documentId} failed after ${item.maxRetries} retries: ${errorMessage}`);
      
      // Emit failure event
      this.emit('documentFailed', {
        documentId: item.documentId,
        error: errorMessage,
        jobId: item.id
      });
    }
    
    // Remove from processing
    this.processing.delete(item.id);
  }

  private updateBatchProgress(jobId: string, result: 'success' | 'failed') {
    // Find which batch this job belongs to
    const batchId = jobId.split('_')[1]; // Extract batch ID from job ID
    const batch = this.batchJobs.get(`batch_${batchId}`);
    
    if (batch) {
      if (result === 'success') {
        batch.progress.processed++;
      } else {
        batch.progress.failed++;
      }
      
      // Check if batch is complete
      const totalCompleted = batch.progress.processed + batch.progress.failed;
      if (totalCompleted >= batch.progress.total) {
        batch.status = 'completed';
        batch.completedAt = new Date();
        
        console.log(`Batch ${batch.id} completed: ${batch.progress.processed} successful, ${batch.progress.failed} failed`);
        
        // Emit batch completion event
        this.emit('batchCompleted', batch);
      }
    }
  }

  // Get queue status
  getQueueStatus() {
    return {
      queued: this.queue.length,
      processing: this.processing.size,
      totalActive: this.queue.length + this.processing.size,
      maxConcurrent: this.maxConcurrentJobs
    };
  }

  // Get batch status
  getBatchStatus(batchId: string): BatchJob | undefined {
    return this.batchJobs.get(batchId);
  }

  // Get all batches
  getAllBatches(): BatchJob[] {
    return Array.from(this.batchJobs.values());
  }

  // Clear completed batches (cleanup)
  clearCompletedBatches() {
    const completedBatches = Array.from(this.batchJobs.entries())
      .filter(([_, batch]) => batch.status === 'completed')
      .map(([id, _]) => id);
    
    completedBatches.forEach(id => this.batchJobs.delete(id));
    console.log(`Cleared ${completedBatches.length} completed batches`);
  }

  // Update processing configuration
  setMaxConcurrentJobs(max: number) {
    this.maxConcurrentJobs = Math.max(1, Math.min(10, max)); // Limit between 1-10
    console.log(`Max concurrent jobs updated to ${this.maxConcurrentJobs}`);
  }

  // Get processing statistics
  async getProcessingStats() {
    const totalProcessed = await storage.getTotalProcessedDocuments();
    const queueStatus = this.getQueueStatus();
    
    return {
      totalProcessed,
      ...queueStatus,
      activeBatches: this.batchJobs.size,
      completedBatches: Array.from(this.batchJobs.values())
        .filter(batch => batch.status === 'completed').length
    };
  }

  // Stop processor
  stop() {
    this.isProcessing = false;
    console.log('Batch processor stopped');
  }
}

// Create singleton instance
export const batchProcessor = new BatchProcessor();
export type { BatchJob, ProcessingQueue };