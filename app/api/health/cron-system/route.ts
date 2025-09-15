/**
 * Health Check Endpoint for Cron System
 * 
 * Provides comprehensive health monitoring for the DM monitoring system
 * including memory usage, rate limiting, error recovery, and tenant metrics.
 */

import { NextRequest, NextResponse } from "next/server";
import { tenantMetricsCollector } from "@/lib/monitoring/tenant-metrics";
import { cronMemoryManager, errorRecoveryManager } from "@/lib/utils/cron-polling-utils";

export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now();
    
    // Get system metrics
    const globalMetrics = tenantMetricsCollector.getGlobalMetrics();
    const memoryStats = cronMemoryManager.getMemoryStats();
    const retryStats = errorRecoveryManager.getRetryStats();
    
    // Get tenant health scores
    const tenantMetrics = tenantMetricsCollector.getAllTenantMetrics();
    const tenantHealthScores = tenantMetrics.map(metrics => ({
      tenantId: metrics.tenantId,
      healthScore: tenantMetricsCollector.getTenantHealthScore(metrics.tenantId),
      activeConversations: metrics.activeConversations,
      totalRequests: metrics.totalRequests,
      errors: metrics.errors,
      rateLimitHits: metrics.rateLimitHits,
      averageResponseTime: metrics.averageResponseTime,
    }));

    // Get tenants with issues
    const tenantsWithIssues = tenantMetricsCollector.getTenantsWithIssues();
    
    // Calculate overall system health
    const averageHealthScore = tenantHealthScores.length > 0 
      ? tenantHealthScores.reduce((sum, tenant) => sum + tenant.healthScore, 0) / tenantHealthScores.length
      : 100;

    const systemHealth = {
      status: averageHealthScore >= 80 ? 'healthy' : averageHealthScore >= 60 ? 'degraded' : 'unhealthy',
      overallScore: Math.round(averageHealthScore),
      timestamp: new Date().toISOString(),
      responseTime: Date.now() - startTime,
    };

    // Check for critical issues
    const criticalIssues = [];
    
    if (memoryStats.overLimitTenants > 0) {
      criticalIssues.push(`Memory limit exceeded for ${memoryStats.overLimitTenants} tenants`);
    }
    
    if (retryStats.activeCircuitBreakers > 0) {
      criticalIssues.push(`${retryStats.activeCircuitBreakers} circuit breakers are open`);
    }
    
    if (tenantsWithIssues.length > 0) {
      criticalIssues.push(`${tenantsWithIssues.length} tenants have high error rates`);
    }
    
    if (globalMetrics.totalErrors > 100) {
      criticalIssues.push(`High error count: ${globalMetrics.totalErrors}`);
    }

    const healthData = {
      system: systemHealth,
      metrics: {
        global: globalMetrics,
        memory: memoryStats,
        retry: retryStats,
      },
      tenants: {
        total: tenantHealthScores.length,
        healthy: tenantHealthScores.filter(t => t.healthScore >= 80).length,
        degraded: tenantHealthScores.filter(t => t.healthScore >= 60 && t.healthScore < 80).length,
        unhealthy: tenantHealthScores.filter(t => t.healthScore < 60).length,
        withIssues: tenantsWithIssues.length,
      },
      tenantHealthScores: tenantHealthScores.sort((a, b) => b.healthScore - a.healthScore),
      criticalIssues,
      recommendations: generateRecommendations(systemHealth, memoryStats, retryStats, globalMetrics),
    };

    const statusCode = systemHealth.status === 'healthy' ? 200 : 
                      systemHealth.status === 'degraded' ? 200 : 503;

    return NextResponse.json(healthData, { status: statusCode });

  } catch (error) {
    console.error("[Health Check] Error:", error);
    return NextResponse.json(
      {
        system: {
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}

/**
 * Generate system recommendations based on metrics
 */
function generateRecommendations(
  systemHealth: any,
  memoryStats: any,
  retryStats: any,
  globalMetrics: any
): string[] {
  const recommendations = [];

  if (systemHealth.overallScore < 80) {
    recommendations.push("System health is below optimal. Consider investigating error rates and response times.");
  }

  if (memoryStats.overLimitTenants > 0) {
    recommendations.push("Some tenants are exceeding memory limits. Consider implementing memory cleanup or increasing limits.");
  }

  if (retryStats.activeCircuitBreakers > 0) {
    recommendations.push("Circuit breakers are open for some operations. Check external service health and retry policies.");
  }

  if (globalMetrics.totalRateLimitHits > 50) {
    recommendations.push("High rate limit hit count. Consider optimizing API usage or increasing rate limits.");
  }

  if (globalMetrics.averageResponseTime > 5000) {
    recommendations.push("Average response time is high. Consider optimizing database queries and external API calls.");
  }

  if (globalMetrics.totalErrors > 100) {
    recommendations.push("High error count detected. Review error logs and implement better error handling.");
  }

  if (memoryStats.averageUsage > 200) {
    recommendations.push("High memory usage detected. Consider implementing memory optimization strategies.");
  }

  if (retryStats.totalRetryAttempts > 100) {
    recommendations.push("High retry attempt count. Consider improving error handling and service reliability.");
  }

  return recommendations;
}
