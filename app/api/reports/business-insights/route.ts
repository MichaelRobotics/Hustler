import { NextRequest, NextResponse } from 'next/server';
import { withCustomerAuth, createSuccessResponse, createErrorResponse, type AuthContext } from '../../../../lib/middleware/whop-auth';
import { reportingSystem } from '../../../../lib/reporting/reports';

/**
 * Business Insights Report API Route
 * Handles business insights report generation with proper authentication and authorization
 */

/**
 * GET /api/reports/business-insights - Generate business insights report
 */
async function generateBusinessInsightsReportHandler(request: NextRequest, context: AuthContext) {
  try {
    const { user } = context;
    const url = new URL(request.url);
    
    // Extract query parameters
    const startDate = url.searchParams.get('startDate') ? new Date(url.searchParams.get('startDate')!) : undefined;
    const endDate = url.searchParams.get('endDate') ? new Date(url.searchParams.get('endDate')!) : undefined;
    const format = url.searchParams.get('format') as 'json' | 'csv' | 'pdf' || 'json';

    // Generate the report
    const report = await reportingSystem.generateBusinessInsightsReport(user, {
      startDate,
      endDate,
      format
    });

    // Export in requested format
    if (format !== 'json') {
      const exportedData = await reportingSystem.exportReport(report, format);
      
      return new NextResponse(exportedData, {
        headers: {
          'Content-Type': format === 'csv' ? 'text/csv' : 'application/pdf',
          'Content-Disposition': `attachment; filename="business-insights-report.${format}"`
        }
      });
    }

    return createSuccessResponse(report, 'Business insights report generated successfully');
  } catch (error) {
    console.error('Error generating business insights report:', error);
    return createErrorResponse(
      'INTERNAL_ERROR',
      (error as Error).message
    );
  }
}

// Export the protected route handler
export const GET = withCustomerAuth(generateBusinessInsightsReportHandler);
