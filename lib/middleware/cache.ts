/**
 * Simple In-Memory Cache for MVP Scale
 * 
 * For production scale, consider Redis or other distributed cache
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  createdAt: number;
}

class SimpleCache {
  private cache = new Map<string, CacheEntry<any>>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every 2 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 2 * 60 * 1000);
  }

  /**
   * Set a cache entry
   */
  set<T>(key: string, data: T, ttlMs: number = 5 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
      createdAt: Date.now(),
    });
  }

  /**
   * Get a cache entry
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    return entry ? Date.now() <= entry.expiresAt : false;
  }

  /**
   * Delete a cache entry
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now();
    let expired = 0;
    let active = 0;
    
    for (const entry of this.cache.values()) {
      if (now > entry.expiresAt) {
        expired++;
      } else {
        active++;
      }
    }
    
    return {
      total: this.cache.size,
      active,
      expired,
      memoryUsage: process.memoryUsage(),
    };
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  destroy() {
    clearInterval(this.cleanupInterval);
    this.cache.clear();
  }
}

// Global cache instance
export const cache = new SimpleCache();

/**
 * Cache configuration for different data types
 */
export const CACHE_TTL = {
  // User context: 5 minutes
  USER_CONTEXT: 5 * 60 * 1000,
  
  // Conversation data: 2 minutes
  CONVERSATION: 2 * 60 * 1000,
  
  // Funnel data: 10 minutes (rarely changes)
  FUNNEL: 10 * 60 * 1000,
  
  // Experience data: 15 minutes
  EXPERIENCE: 15 * 60 * 1000,
  
  // Stage detection: 1 minute (can change frequently)
  STAGE_DETECTION: 1 * 60 * 1000,
} as const;

/**
 * Cache key generators
 */
export const CacheKeys = {
  userContext: (userId: string, experienceId: string) => 
    `user_context:${userId}:${experienceId}`,
  
  conversation: (conversationId: string) => 
    `conversation:${conversationId}`,
  
  funnel: (funnelId: string) => 
    `funnel:${funnelId}`,
  
  experience: (experienceId: string) => 
    `experience:${experienceId}`,
  
  stageInfo: (conversationId: string) => 
    `stage_info:${conversationId}`,
} as const;

/**
 * Cache wrapper for async functions
 */
export function withCache<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  keyGenerator: (...args: T) => string,
  ttl: number = CACHE_TTL.CONVERSATION
) {
  return async (...args: T): Promise<R> => {
    const key = keyGenerator(...args);
    
    // Try to get from cache first
    const cached = cache.get<R>(key);
    if (cached !== null) {
      return cached;
    }
    
    // Execute function and cache result
    const result = await fn(...args);
    cache.set(key, result, ttl);
    
    return result;
  };
}

/**
 * Invalidate cache entries by pattern
 */
export function invalidateCache(pattern: string) {
  const regex = new RegExp(pattern);
  for (const key of cache['cache'].keys()) {
    if (regex.test(key)) {
      cache.delete(key);
    }
  }
}

