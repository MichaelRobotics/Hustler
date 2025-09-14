/**
 * Tenant-Specific Production Metrics
 * 
 * Tracks performance, errors, and resource usage per tenant (experience)
 * for production monitoring and optimization.
 */

interface TenantMetrics {
  tenantId: string;
  experienceId: string;
  activeConversations: number;
  totalRequests: number;
  rateLimitHits: number;
  errors: number;
  averageResponseTime: number;
  memoryUsage: number;
  lastActivity: Date;
}

interface GlobalMetrics {
  totalTenants: number;
  totalActiveConversations: number;
  totalRequests: number;
  totalRateLimitHits: number;
  totalErrors: number;
  averageResponseTime: number;
  memoryUsage: number;
}

export class TenantMetricsCollector {
  private tenantMetrics: Map<string, TenantMetrics> = new Map();
  private readonly maxTenants = 1000; // Prevent memory leaks
  private readonly cleanupIntervalMs = 300000; // 5 minutes
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startCleanup();
  }

  /**
   * Record a request for a tenant
   */
  recordRequest(tenantId: string, experienceId: string, responseTime: number): void {
    const metrics = this.getOrCreateTenantMetrics(tenantId, experienceId);
    
    metrics.totalRequests++;
    metrics.averageResponseTime = this.calculateAverageResponseTime(
      metrics.averageResponseTime,
      metrics.totalRequests,
      responseTime
    );
    metrics.lastActivity = new Date();
    
    this.tenantMetrics.set(tenantId, metrics);
  }

  /**
   * Record a rate limit hit for a tenant
   */
  recordRateLimitHit(tenantId: string, experienceId: string): void {
    const metrics = this.getOrCreateTenantMetrics(tenantId, experienceId);
    metrics.rateLimitHits++;
    metrics.lastActivity = new Date();
    this.tenantMetrics.set(tenantId, metrics);
  }

  /**
   * Record an error for a tenant
   */
  recordError(tenantId: string, experienceId: string, error: Error): void {
    const metrics = this.getOrCreateTenantMetrics(tenantId, experienceId);
    metrics.errors++;
    metrics.lastActivity = new Date();
    this.tenantMetrics.set(tenantId, metrics);
    
    console.error(`[Tenant ${tenantId}] Error:`, error.message);
  }

  /**
   * Update active conversations count for a tenant
   */
  updateActiveConversations(tenantId: string, experienceId: string, count: number): void {
    const metrics = this.getOrCreateTenantMetrics(tenantId, experienceId);
    metrics.activeConversations = count;
    metrics.lastActivity = new Date();
    this.tenantMetrics.set(tenantId, metrics);
  }

  /**
   * Get metrics for a specific tenant
   */
  getTenantMetrics(tenantId: string): TenantMetrics | undefined {
    return this.tenantMetrics.get(tenantId);
  }

  /**
   * Get all tenant metrics
   */
  getAllTenantMetrics(): TenantMetrics[] {
    return Array.from(this.tenantMetrics.values());
  }

  /**
   * Get global metrics across all tenants
   */
  getGlobalMetrics(): GlobalMetrics {
    const allMetrics = this.getAllTenantMetrics();
    
    return {
      totalTenants: allMetrics.length,
      totalActiveConversations: allMetrics.reduce((sum, m) => sum + m.activeConversations, 0),
      totalRequests: allMetrics.reduce((sum, m) => sum + m.totalRequests, 0),
      totalRateLimitHits: allMetrics.reduce((sum, m) => sum + m.rateLimitHits, 0),
      totalErrors: allMetrics.reduce((sum, m) => sum + m.errors, 0),
      averageResponseTime: this.calculateGlobalAverageResponseTime(allMetrics),
      memoryUsage: this.getMemoryUsage(),
    };
  }

  /**
   * Get tenant health score (0-100)
   */
  getTenantHealthScore(tenantId: string): number {
    const metrics = this.tenantMetrics.get(tenantId);
    if (!metrics) return 0;

    let score = 100;

    // Deduct points for errors
    const errorRate = metrics.totalRequests > 0 ? metrics.errors / metrics.totalRequests : 0;
    score -= Math.min(errorRate * 50, 50); // Max 50 points deduction for errors

    // Deduct points for rate limit hits
    const rateLimitRate = metrics.totalRequests > 0 ? metrics.rateLimitHits / metrics.totalRequests : 0;
    score -= Math.min(rateLimitRate * 30, 30); // Max 30 points deduction for rate limits

    // Deduct points for slow response times
    if (metrics.averageResponseTime > 5000) { // 5 seconds
      score -= Math.min((metrics.averageResponseTime - 5000) / 100, 20); // Max 20 points deduction
    }

    return Math.max(0, Math.round(score));
  }

  /**
   * Get top tenants by activity
   */
  getTopTenantsByActivity(limit: number = 10): TenantMetrics[] {
    return this.getAllTenantMetrics()
      .sort((a, b) => b.totalRequests - a.totalRequests)
      .slice(0, limit);
  }

  /**
   * Get tenants with issues (high error rate or rate limit hits)
   */
  getTenantsWithIssues(): TenantMetrics[] {
    return this.getAllTenantMetrics().filter(metrics => {
      const errorRate = metrics.totalRequests > 0 ? metrics.errors / metrics.totalRequests : 0;
      const rateLimitRate = metrics.totalRequests > 0 ? metrics.rateLimitHits / metrics.totalRequests : 0;
      
      return errorRate > 0.1 || rateLimitRate > 0.2; // 10% error rate or 20% rate limit rate
    });
  }

  /**
   * Clean up old tenant data
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, this.cleanupIntervalMs);
  }

  private cleanup(): void {
    const now = new Date();
    const cutoffTime = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago

    // Remove inactive tenants
    for (const [tenantId, metrics] of this.tenantMetrics.entries()) {
      if (metrics.lastActivity < cutoffTime) {
        this.tenantMetrics.delete(tenantId);
      }
    }

    // Limit total tenants to prevent memory leaks
    if (this.tenantMetrics.size > this.maxTenants) {
      const sortedTenants = Array.from(this.tenantMetrics.entries())
        .sort((a, b) => a[1].lastActivity.getTime() - b[1].lastActivity.getTime());
      
      const toRemove = sortedTenants.slice(0, this.tenantMetrics.size - this.maxTenants);
      toRemove.forEach(([tenantId]) => this.tenantMetrics.delete(tenantId));
    }

    console.log(`[TenantMetrics] Cleaned up, ${this.tenantMetrics.size} active tenants`);
  }

  private getOrCreateTenantMetrics(tenantId: string, experienceId: string): TenantMetrics {
    if (!this.tenantMetrics.has(tenantId)) {
      this.tenantMetrics.set(tenantId, {
        tenantId,
        experienceId,
        activeConversations: 0,
        totalRequests: 0,
        rateLimitHits: 0,
        errors: 0,
        averageResponseTime: 0,
        memoryUsage: 0,
        lastActivity: new Date(),
      });
    }
    return this.tenantMetrics.get(tenantId)!;
  }

  private calculateAverageResponseTime(currentAverage: number, totalRequests: number, newResponseTime: number): number {
    if (totalRequests === 1) return newResponseTime;
    return (currentAverage * (totalRequests - 1) + newResponseTime) / totalRequests;
  }

  private calculateGlobalAverageResponseTime(allMetrics: TenantMetrics[]): number {
    if (allMetrics.length === 0) return 0;
    
    const totalRequests = allMetrics.reduce((sum, m) => sum + m.totalRequests, 0);
    if (totalRequests === 0) return 0;
    
    const weightedSum = allMetrics.reduce((sum, m) => sum + (m.averageResponseTime * m.totalRequests), 0);
    return weightedSum / totalRequests;
  }

  private getMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed / 1024 / 1024; // MB
    }
    return 0;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.tenantMetrics.clear();
  }
}

// Export singleton instance
export const tenantMetricsCollector = new TenantMetricsCollector();


