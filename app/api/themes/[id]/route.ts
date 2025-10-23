import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/db-server";
import { themes, experiences } from "@/lib/supabase/schema";
import { eq, and } from "drizzle-orm";
import {
  type AuthContext,
  createErrorResponse,
  withWhopAuth,
} from "@/lib/middleware/whop-auth";

async function updateThemeHandler(
  request: NextRequest,
  context: AuthContext
) {
  try {
    const { user } = context;
    const experienceId = user.experienceId;
    const url = new URL(request.url);
    const themeId = url.pathname.split('/').pop();

    if (!experienceId) {
      return createErrorResponse(
        "MISSING_EXPERIENCE_ID",
        "Experience ID is required"
      );
    }

    if (!themeId) {
      return createErrorResponse(
        "MISSING_THEME_ID",
        "Theme ID is required"
      );
    }

    const body = await request.json();
    const { name, themePrompt, accentColor, ringColor } = body;

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

    // Update theme
    const updatedTheme = await db.update(themes)
      .set({
        name,
        themePrompt,
        accentColor,
        ringColor,
        updatedAt: new Date(),
      })
      .where(and(
        eq(themes.id, themeId),
        eq(themes.experienceId, experience.id)
      ))
      .returning();

    if (updatedTheme.length === 0) {
      return NextResponse.json(
        { success: false, error: "Theme not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      theme: updatedTheme[0],
    });
  } catch (error) {
    console.error("Error updating theme:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update theme" },
      { status: 500 }
    );
  }
}

async function deleteThemeHandler(
  request: NextRequest,
  context: AuthContext
) {
  try {
    const { user } = context;
    const experienceId = user.experienceId;
    const url = new URL(request.url);
    const themeId = url.pathname.split('/').pop();

    if (!experienceId) {
      return createErrorResponse(
        "MISSING_EXPERIENCE_ID",
        "Experience ID is required"
      );
    }

    if (!themeId) {
      return createErrorResponse(
        "MISSING_THEME_ID",
        "Theme ID is required"
      );
    }

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

    // Delete theme
    const deletedTheme = await db.delete(themes)
      .where(and(
        eq(themes.id, themeId),
        eq(themes.experienceId, experience.id)
      ))
      .returning();

    if (deletedTheme.length === 0) {
      return NextResponse.json(
        { success: false, error: "Theme not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Theme deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting theme:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete theme" },
      { status: 500 }
    );
  }
}

export const PUT = withWhopAuth(updateThemeHandler);
export const DELETE = withWhopAuth(deleteThemeHandler);
