/**
 * Production Metrics and Monitoring for MVP Scale
 * 
 * Tracks key performance indicators and system health
 */

interface MetricData {
  timestamp: number;
  value: number;
  metadata?: Record<string, any>;
}

interface SystemMetrics {
  messageProcessingTime: MetricData[];
  websocketConnections: number;
  activeConversations: number;
  errorRate: number;
  cacheHitRate: number;
  memoryUsage: NodeJS.MemoryUsage;
  uptime: number;
}

class ProductionMetrics {
  private metrics: SystemMetrics = {
    messageProcessingTime: [],
    websocketConnections: 0,
    activeConversations: 0,
    errorRate: 0,
    cacheHitRate: 0,
    memoryUsage: process.memoryUsage(),
    uptime: process.uptime(),
  };

  private errorCount = 0;
  private totalRequests = 0;
  private cacheHits = 0;
  private cacheMisses = 0;

  /**
   * Record message processing time
   */
  recordMessageProcessingTime(timeMs: number, conversationId?: string) {
    this.metrics.messageProcessingTime.push({
      timestamp: Date.now(),
      value: timeMs,
      metadata: { conversationId },
    });

    // Keep only last 1000 entries to prevent memory leaks
    if (this.metrics.messageProcessingTime.length > 1000) {
      this.metrics.messageProcessingTime = this.metrics.messageProcessingTime.slice(-1000);
    }
  }

  /**
   * Record an error
   */
  recordError(error: Error, context?: string) {
    this.errorCount++;
    this.totalRequests++;
    this.updateErrorRate();

    console.error(`Production Error [${context || 'Unknown'}]:`, {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Record a successful request
   */
  recordSuccess() {
    this.totalRequests++;
    this.updateErrorRate();
  }

  /**
   * Record cache hit
   */
  recordCacheHit() {
    this.cacheHits++;
    this.updateCacheHitRate();
  }

  /**
   * Record cache miss
   */
  recordCacheMiss() {
    this.cacheMisses++;
    this.updateCacheHitRate();
  }

  /**
   * Update WebSocket connection count
   */
  updateWebSocketConnections(count: number) {
    this.metrics.websocketConnections = count;
  }

  /**
   * Update active conversations count
   */
  updateActiveConversations(count: number) {
    this.metrics.activeConversations = count;
  }

  /**
   * Get current metrics
   */
  getMetrics(): SystemMetrics {
    this.metrics.memoryUsage = process.memoryUsage();
    this.metrics.uptime = process.uptime();
    
    return { ...this.metrics };
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary() {
    const avgProcessingTime = this.metrics.messageProcessingTime.length > 0
      ? this.metrics.messageProcessingTime.reduce((sum, m) => sum + m.value, 0) / this.metrics.messageProcessingTime.length
      : 0;

    const p95ProcessingTime = this.getPercentile(95);
    const p99ProcessingTime = this.getPercentile(99);

    return {
      averageProcessingTime: Math.round(avgProcessingTime),
      p95ProcessingTime: Math.round(p95ProcessingTime),
      p99ProcessingTime: Math.round(p99ProcessingTime),
      errorRate: this.metrics.errorRate,
      cacheHitRate: this.metrics.cacheHitRate,
      websocketConnections: this.metrics.websocketConnections,
      activeConversations: this.metrics.activeConversations,
      memoryUsage: this.metrics.memoryUsage,
      uptime: Math.round(this.metrics.uptime),
    };
  }

  /**
   * Get percentile value from processing times
   */
  private getPercentile(percentile: number): number {
    if (this.metrics.messageProcessingTime.length === 0) return 0;
    
    const sorted = [...this.metrics.messageProcessingTime]
      .sort((a, b) => a.value - b.value);
    
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index]?.value || 0;
  }

  /**
   * Update error rate
   */
  private updateErrorRate() {
    this.metrics.errorRate = this.totalRequests > 0 
      ? (this.errorCount / this.totalRequests) * 100 
      : 0;
  }

  /**
   * Update cache hit rate
   */
  private updateCacheHitRate() {
    const totalCacheRequests = this.cacheHits + this.cacheMisses;
    this.metrics.cacheHitRate = totalCacheRequests > 0 
      ? (this.cacheHits / totalCacheRequests) * 100 
      : 0;
  }

  /**
   * Reset metrics (useful for testing)
   */
  reset() {
    this.metrics = {
      messageProcessingTime: [],
      websocketConnections: 0,
      activeConversations: 0,
      errorRate: 0,
      cacheHitRate: 0,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime(),
    };
    this.errorCount = 0;
    this.totalRequests = 0;
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }
}

// Global metrics instance
export const productionMetrics = new ProductionMetrics();

/**
 * Performance monitoring decorator
 */
export function withPerformanceMonitoring<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  operationName: string
) {
  return async (...args: T): Promise<R> => {
    const startTime = Date.now();
    
    try {
      const result = await fn(...args);
      const processingTime = Date.now() - startTime;
      
      productionMetrics.recordMessageProcessingTime(processingTime);
      productionMetrics.recordSuccess();
      
      return result;
    } catch (error) {
      productionMetrics.recordError(
        error instanceof Error ? error : new Error(String(error)),
        operationName
      );
      throw error;
    }
  };
}

/**
 * Cache monitoring decorator
 */
export function withCacheMonitoring<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  cacheKey: string
) {
  return async (...args: T): Promise<R> => {
    const startTime = Date.now();
    
    try {
      const result = await fn(...args);
      const processingTime = Date.now() - startTime;
      
      // Determine if this was a cache hit based on processing time
      // This is a simple heuristic - in production you'd want more sophisticated tracking
      if (processingTime < 10) { // Very fast = likely cache hit
        productionMetrics.recordCacheHit();
      } else {
        productionMetrics.recordCacheMiss();
      }
      
      return result;
    } catch (error) {
      productionMetrics.recordError(
        error instanceof Error ? error : new Error(String(error)),
        `cache_${cacheKey}`
      );
      throw error;
    }
  };
}

