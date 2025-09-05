/**
 * Performance Monitoring System
 * 
 * Monitors system performance metrics, database query performance,
 * API response times, error rates, and resource usage.
 */

import { db } from '../supabase/db';
import { realTimeUpdates } from '../websocket/updates';

export interface PerformanceMetrics {
  timestamp: Date;
  apiResponseTime: number;
  databaseQueryTime: number;
  memoryUsage: number;
  cpuUsage: number;
  errorRate: number;
  activeConnections: number;
  requestCount: number;
}

export interface DatabasePerformanceMetrics {
  query: string;
  executionTime: number;
  timestamp: Date;
  success: boolean;
  errorMessage?: string;
}

export interface APIPerformanceMetrics {
  endpoint: string;
  method: string;
  responseTime: number;
  statusCode: number;
  timestamp: Date;
  userId?: string;
  companyId?: string;
}

export interface SystemHealthStatus {
  status: 'healthy' | 'warning' | 'critical';
  timestamp: Date;
  metrics: PerformanceMetrics;
  alerts: Array<{
    type: 'performance' | 'error' | 'resource';
    message: string;
    severity: 'low' | 'medium' | 'high';
  }>;
}

class PerformanceMonitoring {
  private metrics: PerformanceMetrics[] = [];
  private databaseMetrics: DatabasePerformanceMetrics[] = [];
  private apiMetrics: APIPerformanceMetrics[] = [];
  private maxMetricsHistory = 1000;
  private alertThresholds = {
    apiResponseTime: 2000, // 2 seconds
    databaseQueryTime: 1000, // 1 second
    memoryUsage: 80, // 80%
    cpuUsage: 80, // 80%
    errorRate: 5 // 5%
  };

  /**
   * Start monitoring API request
   */
  startAPIMonitoring(endpoint: string, method: string, userId?: string, companyId?: string) {
    const startTime = Date.now();
    
    return {
      end: (statusCode: number) => {
        const responseTime = Date.now() - startTime;
        this.recordAPIMetric({
          endpoint,
          method,
          responseTime,
          statusCode,
          timestamp: new Date(),
          userId,
          companyId
        });
      }
    };
  }

  /**
   * Start monitoring database query
   */
  startDatabaseMonitoring(query: string) {
    const startTime = Date.now();
    
    return {
      end: (success: boolean, errorMessage?: string) => {
        const executionTime = Date.now() - startTime;
        this.recordDatabaseMetric({
          query,
          executionTime,
          timestamp: new Date(),
          success,
          errorMessage
        });
      }
    };
  }

  /**
   * Record API performance metric
   */
  private recordAPIMetric(metric: APIPerformanceMetrics): void {
    this.apiMetrics.push(metric);
    
    // Keep only recent metrics
    if (this.apiMetrics.length > this.maxMetricsHistory) {
      this.apiMetrics = this.apiMetrics.slice(-this.maxMetricsHistory);
    }

    // Check for performance alerts
    this.checkAPIPerformanceAlerts(metric);
  }

  /**
   * Record database performance metric
   */
  private recordDatabaseMetric(metric: DatabasePerformanceMetrics): void {
    this.databaseMetrics.push(metric);
    
    // Keep only recent metrics
    if (this.databaseMetrics.length > this.maxMetricsHistory) {
      this.databaseMetrics = this.databaseMetrics.slice(-this.maxMetricsHistory);
    }

    // Check for performance alerts
    this.checkDatabasePerformanceAlerts(metric);
  }

  /**
   * Record system performance metrics
   */
  async recordSystemMetrics(): Promise<void> {
    try {
      const metrics = await this.collectSystemMetrics();
      this.metrics.push(metrics);
      
      // Keep only recent metrics
      if (this.metrics.length > this.maxMetricsHistory) {
        this.metrics = this.metrics.slice(-this.maxMetricsHistory);
      }

      // Check for system alerts
      await this.checkSystemAlerts(metrics);
    } catch (error) {
      console.error('Error recording system metrics:', error);
    }
  }

  /**
   * Collect current system metrics
   */
  private async collectSystemMetrics(): Promise<PerformanceMetrics> {
    const timestamp = new Date();
    
    // Calculate API response time (average of last 10 requests)
    const recentAPIMetrics = this.apiMetrics.slice(-10);
    const apiResponseTime = recentAPIMetrics.length > 0
      ? recentAPIMetrics.reduce((sum, metric) => sum + metric.responseTime, 0) / recentAPIMetrics.length
      : 0;

    // Calculate database query time (average of last 10 queries)
    const recentDBMetrics = this.databaseMetrics.slice(-10);
    const databaseQueryTime = recentDBMetrics.length > 0
      ? recentDBMetrics.reduce((sum, metric) => sum + metric.executionTime, 0) / recentDBMetrics.length
      : 0;

    // Calculate error rate (percentage of failed requests in last 100)
    const recentRequests = this.apiMetrics.slice(-100);
    const errorCount = recentRequests.filter(metric => metric.statusCode >= 400).length;
    const errorRate = recentRequests.length > 0 ? (errorCount / recentRequests.length) * 100 : 0;

    // Get system resource usage (simplified - would need more sophisticated monitoring in production)
    const memoryUsage = this.getMemoryUsage();
    const cpuUsage = this.getCPUUsage();
    const activeConnections = this.getActiveConnections();
    const requestCount = this.apiMetrics.length;

    return {
      timestamp,
      apiResponseTime,
      databaseQueryTime,
      memoryUsage,
      cpuUsage,
      errorRate,
      activeConnections,
      requestCount
    };
  }

  /**
   * Get memory usage percentage
   */
  private getMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usage = process.memoryUsage();
      // Simplified calculation - in production, you'd want more sophisticated monitoring
      return (usage.heapUsed / usage.heapTotal) * 100;
    }
    return 0;
  }

  /**
   * Get CPU usage percentage
   */
  private getCPUUsage(): number {
    // Simplified - in production, you'd want more sophisticated CPU monitoring
    return 0;
  }

  /**
   * Get active connections count
   */
  private getActiveConnections(): number {
    // Simplified - in production, you'd want to track actual database connections
    return 0;
  }

  /**
   * Check API performance alerts
   */
  private checkAPIPerformanceAlerts(metric: APIPerformanceMetrics): void {
    if (metric.responseTime > this.alertThresholds.apiResponseTime) {
      this.sendAlert('performance', `Slow API response: ${metric.endpoint} took ${metric.responseTime}ms`, 'medium');
    }

    if (metric.statusCode >= 500) {
      this.sendAlert('error', `API error: ${metric.endpoint} returned ${metric.statusCode}`, 'high');
    }
  }

  /**
   * Check database performance alerts
   */
  private checkDatabasePerformanceAlerts(metric: DatabasePerformanceMetrics): void {
    if (metric.executionTime > this.alertThresholds.databaseQueryTime) {
      this.sendAlert('performance', `Slow database query: ${metric.query.substring(0, 100)}... took ${metric.executionTime}ms`, 'medium');
    }

    if (!metric.success) {
      this.sendAlert('error', `Database error: ${metric.errorMessage}`, 'high');
    }
  }

  /**
   * Check system alerts
   */
  private async checkSystemAlerts(metrics: PerformanceMetrics): Promise<void> {
    if (metrics.memoryUsage > this.alertThresholds.memoryUsage) {
      this.sendAlert('resource', `High memory usage: ${metrics.memoryUsage.toFixed(2)}%`, 'high');
    }

    if (metrics.cpuUsage > this.alertThresholds.cpuUsage) {
      this.sendAlert('resource', `High CPU usage: ${metrics.cpuUsage.toFixed(2)}%`, 'high');
    }

    if (metrics.errorRate > this.alertThresholds.errorRate) {
      this.sendAlert('error', `High error rate: ${metrics.errorRate.toFixed(2)}%`, 'high');
    }
  }

  /**
   * Send alert notification
   */
  private async sendAlert(type: 'performance' | 'error' | 'resource', message: string, severity: 'low' | 'medium' | 'high'): Promise<void> {
    try {
      // Send real-time notification
      await realTimeUpdates.sendSystemNotification(
        'system', // Would need actual company ID in production
        severity === 'high' ? 'error' : severity === 'medium' ? 'warning' : 'info',
        `${type.charAt(0).toUpperCase() + type.slice(1)} Alert`,
        message
      );

      console.warn(`[${severity.toUpperCase()}] ${type.toUpperCase()} ALERT: ${message}`);
    } catch (error) {
      console.error('Error sending alert:', error);
    }
  }

  /**
   * Get system health status
   */
  async getSystemHealthStatus(): Promise<SystemHealthStatus> {
    const latestMetrics = this.metrics[this.metrics.length - 1];
    if (!latestMetrics) {
      return {
        status: 'healthy',
        timestamp: new Date(),
        metrics: {
          timestamp: new Date(),
          apiResponseTime: 0,
          databaseQueryTime: 0,
          memoryUsage: 0,
          cpuUsage: 0,
          errorRate: 0,
          activeConnections: 0,
          requestCount: 0
        },
        alerts: []
      };
    }

    const alerts: Array<{
      type: 'performance' | 'error' | 'resource';
      message: string;
      severity: 'low' | 'medium' | 'high';
    }> = [];

    // Check for alerts
    if (latestMetrics.apiResponseTime > this.alertThresholds.apiResponseTime) {
      alerts.push({
        type: 'performance',
        message: `API response time is high: ${latestMetrics.apiResponseTime.toFixed(2)}ms`,
        severity: 'medium'
      });
    }

    if (latestMetrics.databaseQueryTime > this.alertThresholds.databaseQueryTime) {
      alerts.push({
        type: 'performance',
        message: `Database query time is high: ${latestMetrics.databaseQueryTime.toFixed(2)}ms`,
        severity: 'medium'
      });
    }

    if (latestMetrics.memoryUsage > this.alertThresholds.memoryUsage) {
      alerts.push({
        type: 'resource',
        message: `Memory usage is high: ${latestMetrics.memoryUsage.toFixed(2)}%`,
        severity: 'high'
      });
    }

    if (latestMetrics.errorRate > this.alertThresholds.errorRate) {
      alerts.push({
        type: 'error',
        message: `Error rate is high: ${latestMetrics.errorRate.toFixed(2)}%`,
        severity: 'high'
      });
    }

    // Determine overall status
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (alerts.some(alert => alert.severity === 'high')) {
      status = 'critical';
    } else if (alerts.some(alert => alert.severity === 'medium')) {
      status = 'warning';
    }

    return {
      status,
      timestamp: new Date(),
      metrics: latestMetrics,
      alerts
    };
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    averageAPIResponseTime: number;
    averageDatabaseQueryTime: number;
    totalRequests: number;
    errorRate: number;
    uptime: number;
  } {
    const recentAPIMetrics = this.apiMetrics.slice(-100);
    const recentDBMetrics = this.databaseMetrics.slice(-100);

    const averageAPIResponseTime = recentAPIMetrics.length > 0
      ? recentAPIMetrics.reduce((sum, metric) => sum + metric.responseTime, 0) / recentAPIMetrics.length
      : 0;

    const averageDatabaseQueryTime = recentDBMetrics.length > 0
      ? recentDBMetrics.reduce((sum, metric) => sum + metric.executionTime, 0) / recentDBMetrics.length
      : 0;

    const totalRequests = this.apiMetrics.length;
    const errorCount = this.apiMetrics.filter(metric => metric.statusCode >= 400).length;
    const errorRate = totalRequests > 0 ? (errorCount / totalRequests) * 100 : 0;

    // Calculate uptime (simplified)
    const uptime = this.metrics.length > 0 
      ? Date.now() - this.metrics[0].timestamp.getTime()
      : 0;

    return {
      averageAPIResponseTime,
      averageDatabaseQueryTime,
      totalRequests,
      errorRate,
      uptime
    };
  }

  /**
   * Get slow queries report
   */
  getSlowQueriesReport(limit: number = 10): DatabasePerformanceMetrics[] {
    return this.databaseMetrics
      .filter(metric => metric.executionTime > this.alertThresholds.databaseQueryTime)
      .sort((a, b) => b.executionTime - a.executionTime)
      .slice(0, limit);
  }

  /**
   * Get error report
   */
  getErrorReport(limit: number = 10): APIPerformanceMetrics[] {
    return this.apiMetrics
      .filter(metric => metric.statusCode >= 400)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Clear old metrics
   */
  clearOldMetrics(): void {
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

    this.metrics = this.metrics.filter(metric => metric.timestamp > cutoffTime);
    this.databaseMetrics = this.databaseMetrics.filter(metric => metric.timestamp > cutoffTime);
    this.apiMetrics = this.apiMetrics.filter(metric => metric.timestamp > cutoffTime);
  }

  /**
   * Start periodic monitoring
   */
  startMonitoring(intervalMs: number = 60000): void {
    setInterval(async () => {
      await this.recordSystemMetrics();
      this.clearOldMetrics();
    }, intervalMs);
  }
}

// Export singleton instance
export const performanceMonitoring = new PerformanceMonitoring();

// Export types
// Types are already exported above
