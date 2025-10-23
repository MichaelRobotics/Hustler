import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/db-server";
import { templates, themes, experiences } from "@/lib/supabase/schema";
import { eq } from "drizzle-orm";

/**
 * Debug endpoint to test templates API without WHOP authentication
 */
export async function GET(request: NextRequest) {
  try {
    const experienceId = request.headers.get("X-Experience-ID");
    
    if (!experienceId) {
      return NextResponse.json(
        { success: false, error: "X-Experience-ID header is required" },
        { status: 400 }
      );
    }

    console.log("🔍 Debug - Experience ID:", experienceId);

    // Get experience record
    const experience = await db.query.experiences.findFirst({
      where: eq(experiences.whopExperienceId, experienceId),
    });

    if (!experience) {
      return NextResponse.json(
        { success: false, error: "Experience not found" },
        { status: 404 }
      );
    }

    console.log("🔍 Debug - Experience found:", experience.id);

    // Get templates for this experience
    const templatesList = await db.query.templates.findMany({
      where: eq(templates.experienceId, experience.id),
      with: {
        theme: true,
      },
      orderBy: (templates: any, { desc }: any) => [desc(templates.updatedAt)],
    });

    console.log("🔍 Debug - Templates found:", templatesList.length);

    return NextResponse.json({
      success: true,
      templates: templatesList,
      debug: {
        experienceId: experienceId,
        experienceDbId: experience.id,
        templatesCount: templatesList.length
      }
    });
  } catch (error) {
    console.error("Debug - Error fetching templates:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch templates", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
