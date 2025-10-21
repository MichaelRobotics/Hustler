import { NextRequest, NextResponse } from "next/server";
import { getConnectionStats, checkDatabaseConnection } from "@/lib/supabase/db-server";

export async function GET(request: NextRequest) {
  try {
    const connectionStats = await getConnectionStats();
    const isConnected = await checkDatabaseConnection();
    
    return NextResponse.json({
      success: true,
      connection: {
        isConnected,
        stats: connectionStats,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error("Error getting connection stats:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error",
        connection: {
          isConnected: false,
          stats: {
            active: 0,
            idle: 0,
            total: 0,
            max: 5,
            usage: "0/5",
            health: "critical"
          },
          timestamp: new Date().toISOString()
        }
      },
      { status: 500 }
    );
  }
}
