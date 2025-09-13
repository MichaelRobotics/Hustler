/**
 * Admin API for Tenant Metrics
 * 
 * Provides monitoring and analytics for multi-tenant DM polling system.
 * Only accessible to admin users.
 */

import { NextRequest, NextResponse } from "next/server";
import { validateToken } from "@whop-apps/sdk";
import { tenantMetricsCollector } from "@/lib/monitoring/tenant-metrics";

/**
 * Get tenant metrics for monitoring
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate admin user
    const headersList = await request.headers;
    const { userId: whopUserId } = await validateToken({ headers: headersList });
    
    if (!whopUserId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    const includeGlobal = searchParams.get('includeGlobal') === 'true';

    let response: any = {};

    if (tenantId) {
      // Get specific tenant metrics
      const tenantMetrics = tenantMetricsCollector.getTenantMetrics(tenantId);
      if (!tenantMetrics) {
        return NextResponse.json(
          { error: "Tenant not found" },
          { status: 404 }
        );
      }
      
      response = {
        tenant: tenantMetrics,
        healthScore: tenantMetricsCollector.getTenantHealthScore(tenantId),
      };
    } else {
      // Get all tenant metrics
      response = {
        tenants: tenantMetricsCollector.getAllTenantMetrics(),
        topTenants: tenantMetricsCollector.getTopTenantsByActivity(10),
        tenantsWithIssues: tenantMetricsCollector.getTenantsWithIssues(),
      };
    }

    if (includeGlobal) {
      response.global = tenantMetricsCollector.getGlobalMetrics();
    }

    return NextResponse.json({
      success: true,
      data: response,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error("Error fetching tenant metrics:", error);
    
    return NextResponse.json(
      { 
        error: "Failed to fetch tenant metrics",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * Get tenant health dashboard
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate admin user
    const headersList = await request.headers;
    const { userId: whopUserId } = await validateToken({ headers: headersList });
    
    if (!whopUserId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { action } = await request.json();

    switch (action) {
      case 'health_dashboard':
        const allTenants = tenantMetricsCollector.getAllTenantMetrics();
        const globalMetrics = tenantMetricsCollector.getGlobalMetrics();
        
        // Calculate health scores for all tenants
        const tenantHealthScores = allTenants.map(tenant => ({
          tenantId: tenant.tenantId,
          experienceId: tenant.experienceId,
          healthScore: tenantMetricsCollector.getTenantHealthScore(tenant.tenantId),
          activeConversations: tenant.activeConversations,
          totalRequests: tenant.totalRequests,
          errorRate: tenant.totalRequests > 0 ? tenant.errors / tenant.totalRequests : 0,
          rateLimitRate: tenant.totalRequests > 0 ? tenant.rateLimitHits / tenant.totalRequests : 0,
          averageResponseTime: tenant.averageResponseTime,
          lastActivity: tenant.lastActivity,
        }));

        return NextResponse.json({
          success: true,
          data: {
            global: globalMetrics,
            tenants: tenantHealthScores,
            summary: {
              healthyTenants: tenantHealthScores.filter(t => t.healthScore >= 80).length,
              warningTenants: tenantHealthScores.filter(t => t.healthScore >= 60 && t.healthScore < 80).length,
              criticalTenants: tenantHealthScores.filter(t => t.healthScore < 60).length,
            },
          },
          timestamp: new Date().toISOString(),
        });

      case 'top_performers':
        const topTenants = tenantMetricsCollector.getTopTenantsByActivity(20);
        return NextResponse.json({
          success: true,
          data: topTenants,
          timestamp: new Date().toISOString(),
        });

      case 'problem_tenants':
        const problemTenants = tenantMetricsCollector.getTenantsWithIssues();
        return NextResponse.json({
          success: true,
          data: problemTenants,
          timestamp: new Date().toISOString(),
        });

      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error("Error processing tenant metrics request:", error);
    
    return NextResponse.json(
      { 
        error: "Failed to process request",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

