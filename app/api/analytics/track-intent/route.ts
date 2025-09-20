import { NextRequest, NextResponse } from "next/server";
import { trackIntentBackground } from "../../../lib/analytics/background-tracking";

export async function POST(request: NextRequest) {
  try {
    const { experienceId, funnelId } = await request.json();

    if (!experienceId || !funnelId) {
      return NextResponse.json(
        { error: "Missing experienceId or funnelId" },
        { status: 400 }
      );
    }

    // Track intent in the background
    await trackIntentBackground(experienceId, funnelId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ [API] Error tracking intent:", error);
    return NextResponse.json(
      { error: "Failed to track intent" },
      { status: 500 }
    );
  }
}
