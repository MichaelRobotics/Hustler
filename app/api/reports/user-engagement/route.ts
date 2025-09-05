import { NextRequest, NextResponse } from 'next/server';
import { withCustomerAuth, createSuccessResponse, createErrorResponse, type AuthContext } from '../../../../lib/middleware/simple-auth';
import { reportingSystem } from '../../../../lib/reporting/reports';

/**
 * User Engagement Report API Route
 * Handles user engagement report generation with proper authentication and authorization
 */

/**
 * GET /api/reports/user-engagement - Generate user engagement report
 */
async function generateUserEngagementReportHandler(request: NextRequest, context: AuthContext) {
  try {
    const { user } = context;
    const url = new URL(request.url);
    
    // Extract query parameters
    const startDate = url.searchParams.get('startDate') ? new Date(url.searchParams.get('startDate')!) : undefined;
    const endDate = url.searchParams.get('endDate') ? new Date(url.searchParams.get('endDate')!) : undefined;
    const userIds = url.searchParams.get('userIds')?.split(',') || undefined;
    const format = url.searchParams.get('format') as 'json' | 'csv' | 'pdf' || 'json';

    // Generate the report
    const report = await reportingSystem.generateUserEngagementReport(user, {
      startDate,
      endDate,
      userIds,
      format
    });

    // Export in requested format
    if (format !== 'json') {
      const exportedData = await reportingSystem.exportReport(report, format);
      
      return new NextResponse(exportedData, {
        headers: {
          'Content-Type': format === 'csv' ? 'text/csv' : 'application/pdf',
          'Content-Disposition': `attachment; filename="user-engagement-report.${format}"`
        }
      });
    }

    return createSuccessResponse(report, 'User engagement report generated successfully');
  } catch (error) {
    console.error('Error generating user engagement report:', error);
    return createErrorResponse(
      'INTERNAL_ERROR',
      (error as Error).message
    );
  }
}

// Export the protected route handler
export const GET = withCustomerAuth(generateUserEngagementReportHandler);
