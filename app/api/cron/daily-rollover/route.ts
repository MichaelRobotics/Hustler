/**
 * Daily Rollover Cron Job
 * 
 * Runs daily to rollover analytics metrics from today to yesterday
 * and reset today's metrics to zero.
 */

import { NextRequest, NextResponse } from "next/server";
import { dailyRolloverService } from "@/lib/analytics/daily-rollover-service";

export async function POST(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request (optional security check)
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    console.log("🔄 Starting daily rollover cron job...");
    
    // Get stats before rollover
    const beforeStats = await dailyRolloverService.getRolloverStats();
    console.log("📊 Before rollover stats:", beforeStats);
    
    // Perform rollover
    await dailyRolloverService.performDailyRollover();
    
    // Get stats after rollover
    const afterStats = await dailyRolloverService.getRolloverStats();
    console.log("📊 After rollover stats:", afterStats);
    
    return NextResponse.json({
      success: true,
      message: "Daily rollover completed successfully",
      beforeStats,
      afterStats,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error("❌ Daily rollover cron job failed:", error);
    return NextResponse.json(
      { 
        error: "Daily rollover failed", 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Also support GET for manual testing
export async function GET(request: NextRequest) {
  return POST(request);
}
