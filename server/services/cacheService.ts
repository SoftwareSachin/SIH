import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

interface CacheEntry {
  data: any;
  timestamp: number;
  expires: number;
}

class CacheService {
  private memoryCache = new Map<string, CacheEntry>();
  private readonly cacheDir = path.join(process.cwd(), '.cache');
  private readonly maxMemoryEntries = 100;
  private readonly defaultTTL = 30 * 60 * 1000; // 30 minutes

  constructor() {
    this.ensureCacheDir();
  }

  private ensureCacheDir() {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  private generateKey(prefix: string, input: string): string {
    const hash = createHash('sha256').update(input).digest('hex');
    return `${prefix}_${hash}`;
  }

  private cleanupMemoryCache() {
    if (this.memoryCache.size >= this.maxMemoryEntries) {
      const entries = Array.from(this.memoryCache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      // Remove oldest 20% of entries
      const toRemove = Math.floor(entries.length * 0.2);
      for (let i = 0; i < toRemove; i++) {
        this.memoryCache.delete(entries[i][0]);
      }
    }
  }

  async get<T>(key: string): Promise<T | null> {
    // Check memory cache first
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry && Date.now() < memoryEntry.expires) {
      return memoryEntry.data as T;
    }

    // Check disk cache
    const filePath = path.join(this.cacheDir, `${key}.json`);
    try {
      if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const entry: CacheEntry = JSON.parse(fileContent);
        
        if (Date.now() < entry.expires) {
          // Load into memory cache for faster access
          this.memoryCache.set(key, entry);
          return entry.data as T;
        } else {
          // Expired, clean up
          fs.unlinkSync(filePath);
        }
      }
    } catch (error) {
      console.error('Cache read error:', error);
    }

    return null;
  }

  async set<T>(key: string, data: T, ttl: number = this.defaultTTL): Promise<void> {
    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
      expires: Date.now() + ttl
    };

    // Store in memory cache
    this.cleanupMemoryCache();
    this.memoryCache.set(key, entry);

    // Store in disk cache for persistence
    const filePath = path.join(this.cacheDir, `${key}.json`);
    try {
      fs.writeFileSync(filePath, JSON.stringify(entry));
    } catch (error) {
      console.error('Cache write error:', error);
    }
  }

  // Specialized cache methods for AI processing
  async cacheOCRResult(imageHash: string, ocrData: any, ttl?: number): Promise<void> {
    const key = this.generateKey('ocr', imageHash);
    await this.set(key, ocrData, ttl);
  }

  async getCachedOCRResult(imageHash: string): Promise<any | null> {
    const key = this.generateKey('ocr', imageHash);
    return await this.get(key);
  }

  async cacheEntityExtraction(textHash: string, entities: any, ttl?: number): Promise<void> {
    const key = this.generateKey('ner', textHash);
    await this.set(key, entities, ttl);
  }

  async getCachedEntityExtraction(textHash: string): Promise<any | null> {
    const key = this.generateKey('ner', textHash);
    return await this.get(key);
  }

  async cachePreprocessedImage(originalHash: string, processedPath: string, ttl?: number): Promise<void> {
    const key = this.generateKey('preprocess', originalHash);
    await this.set(key, processedPath, ttl || 24 * 60 * 60 * 1000); // 24 hours
  }

  async getCachedPreprocessedImage(originalHash: string): Promise<string | null> {
    const key = this.generateKey('preprocess', originalHash);
    const cachedPath = await this.get<string>(key);
    
    // Verify file still exists
    if (cachedPath && fs.existsSync(cachedPath)) {
      return cachedPath;
    }
    
    return null;
  }

  generateImageHash(filePath: string): string {
    const fileBuffer = fs.readFileSync(filePath);
    return createHash('sha256').update(fileBuffer).digest('hex');
  }

  generateTextHash(text: string): string {
    return createHash('sha256').update(text).digest('hex');
  }

  async clear(): Promise<void> {
    this.memoryCache.clear();
    
    try {
      const files = fs.readdirSync(this.cacheDir);
      for (const file of files) {
        fs.unlinkSync(path.join(this.cacheDir, file));
      }
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }

  getCacheStats(): { memoryEntries: number; diskEntries: number } {
    let diskEntries = 0;
    try {
      diskEntries = fs.readdirSync(this.cacheDir).length;
    } catch (error) {
      // Directory doesn't exist or can't be read
    }

    return {
      memoryEntries: this.memoryCache.size,
      diskEntries
    };
  }
}

export const cacheService = new CacheService();