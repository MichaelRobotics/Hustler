import { NextRequest, NextResponse } from "next/server";
import { requireRequestExperience } from "@/lib/helpers/experience-access-gate";
import { trackIntentBackground } from "../../../../lib/analytics/background-tracking";

export async function POST(request: NextRequest) {
  try {
    const { experienceId, funnelId } = await request.json();

    if (!funnelId) {
      return NextResponse.json(
        { error: "Missing funnelId" },
        { status: 400 }
      );
    }

    const access = await requireRequestExperience(request, { bodyExperienceId: experienceId });
    if (!access.ok) return access.response;

    // Track intent in the background
    await trackIntentBackground(access.experience.whopExperienceId, funnelId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ [API] Error tracking intent:", error);
    return NextResponse.json(
      { error: "Failed to track intent" },
      { status: 500 }
    );
  }
}
