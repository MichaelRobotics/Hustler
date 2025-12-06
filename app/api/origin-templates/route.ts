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

async function getOriginTemplateHandler(
  request: NextRequest,
  context: AuthContext,
) {
  try {
    const { user } = context;
    const experienceId = user.experienceId;
    const url = new URL(request.url);
    const requestedExperienceId = url.searchParams.get("experienceId") || experienceId;

    if (!requestedExperienceId) {
      return createErrorResponse(
        "MISSING_EXPERIENCE_ID",
        "Experience ID is required"
      );
    }

    // Get experience record
    const experience = await db.query.experiences.findFirst({
      where: eq(experiences.whopExperienceId, requestedExperienceId),
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

async function createOriginTemplateHandler(
  request: NextRequest,
  context: AuthContext,
) {
  try {
    const { user } = context;
    const experienceId = user.experienceId;

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

    const body = await request.json();
    const { companyLogoUrl, companyBannerImageUrl, themePrompt, defaultThemeData } = body;

    if (!defaultThemeData) {
      return NextResponse.json(
        { success: false, error: "defaultThemeData is required" },
        { status: 400 }
      );
    }

    // Check if origin template already exists
    const existing = await db.query.originTemplates.findFirst({
      where: eq(originTemplates.experienceId, userContext.user.experience.id),
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "Origin template already exists for this experience" },
        { status: 409 }
      );
    }

    // Create origin template
    const newOriginTemplate = await db.insert(originTemplates).values({
      experienceId: userContext.user.experience.id,
      companyLogoUrl: companyLogoUrl || null,
      companyBannerImageUrl: companyBannerImageUrl || null,
      themePrompt: themePrompt || null,
      defaultThemeData: defaultThemeData,
    }).returning();

    console.log("✅ Origin template created successfully:", newOriginTemplate[0]?.id);

    return NextResponse.json({
      success: true,
      originTemplate: newOriginTemplate[0],
    });
  } catch (error: any) {
    console.error("Error creating origin template:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create origin template" },
      { status: 500 }
    );
  }
}

export const GET = withWhopAuth(getOriginTemplateHandler);
export const POST = withWhopAuth(createOriginTemplateHandler);


