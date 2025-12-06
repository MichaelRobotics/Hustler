import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/db-server";
import { originTemplates, experiences } from "@/lib/supabase/schema";
import { eq } from "drizzle-orm";
import {
  type AuthContext,
  createErrorResponse,
  withWhopAuth,
} from "@/lib/middleware/whop-auth";
import { getUserContext } from "@/lib/context/user-context";

async function getOriginTemplateByExperienceIdHandler(
  request: NextRequest,
  context: AuthContext,
) {
  try {
    const { user } = context;
    const url = new URL(request.url);
    const experienceId = url.pathname.split('/').pop();

    if (!experienceId) {
      return createErrorResponse(
        "MISSING_EXPERIENCE_ID",
        "Experience ID is required"
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

    // Get origin template for this experience
    const originTemplate = await db.query.originTemplates.findFirst({
      where: eq(originTemplates.experienceId, experience.id),
    });

    if (!originTemplate) {
      return NextResponse.json({
        success: true,
        originTemplate: null,
      });
    }

    return NextResponse.json({
      success: true,
      originTemplate,
    });
  } catch (error) {
    console.error("Error fetching origin template:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch origin template" },
      { status: 500 }
    );
  }
}

async function updateOriginTemplateHandler(
  request: NextRequest,
  context: AuthContext,
) {
  try {
    const { user } = context;
    const url = new URL(request.url);
    const experienceId = url.pathname.split('/').pop();

    if (!experienceId) {
      return createErrorResponse(
        "MISSING_EXPERIENCE_ID",
        "Experience ID is required"
      );
    }

    // Get the full user context
    const userContext = await getUserContext(
      user.userId,
      "",
      experienceId,
      false,
    );

    if (!userContext) {
      return NextResponse.json(
        { error: "User context not found" },
        { status: 401 }
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

    // Get existing origin template
    const existing = await db.query.originTemplates.findFirst({
      where: eq(originTemplates.experienceId, experience.id),
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Origin template not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { companyLogoUrl, companyBannerImageUrl, themePrompt, defaultThemeData } = body;

    // Update origin template
    const updated = await db
      .update(originTemplates)
      .set({
        companyLogoUrl: companyLogoUrl !== undefined ? companyLogoUrl : existing.companyLogoUrl,
        companyBannerImageUrl: companyBannerImageUrl !== undefined ? companyBannerImageUrl : existing.companyBannerImageUrl,
        themePrompt: themePrompt !== undefined ? themePrompt : existing.themePrompt,
        defaultThemeData: defaultThemeData || existing.defaultThemeData,
        updatedAt: new Date(),
      })
      .where(eq(originTemplates.id, existing.id))
      .returning();

    console.log("✅ Origin template updated successfully:", updated[0]?.id);

    return NextResponse.json({
      success: true,
      originTemplate: updated[0],
    });
  } catch (error: any) {
    console.error("Error updating origin template:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update origin template" },
      { status: 500 }
    );
  }
}

export const GET = withWhopAuth(getOriginTemplateByExperienceIdHandler);
export const PUT = withWhopAuth(updateOriginTemplateHandler);


