import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/db-server";
import { templates, experiences } from "@/lib/supabase/schema";
import { eq, and } from "drizzle-orm";
import {
  type AuthContext,
  createErrorResponse,
  withWhopAuth,
} from "@/lib/middleware/whop-auth";

async function setLiveTemplateHandler(
  request: NextRequest,
  context: AuthContext
) {
  try {
    const { user } = context;
    const experienceId = user.experienceId;
    const url = new URL(request.url);
    const templateId = url.pathname.split('/').slice(-2)[0]; // Get the ID from the path

    if (!experienceId) {
      return createErrorResponse(
        "MISSING_EXPERIENCE_ID",
        "Experience ID is required"
      );
    }

    if (!templateId) {
      return createErrorResponse(
        "MISSING_TEMPLATE_ID",
        "Template ID is required"
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

    // Handle special "default" case
    if (templateId === "default") {
      // Clear all live templates
      await db.update(templates)
        .set({ isLive: false })
        .where(eq(templates.experienceId, experience.id));

      return NextResponse.json({
        success: true,
        message: "Default template set - no templates are live",
      });
    }

    // Get the template being set as live
    const templateToSetLive = await db.query.templates.findFirst({
      where: and(
        eq(templates.id, templateId),
        eq(templates.experienceId, experience.id)
      ),
    });

    if (!templateToSetLive) {
      return NextResponse.json(
        { success: false, error: "Template not found" },
        { status: 404 }
      );
    }

    // Use transaction to ensure only one live template
    await db.transaction(async (tx: any) => {
      // Check if this is a "default" template (special case)
      const isDefaultTemplate = templateToSetLive.name === "Default" || templateToSetLive.name === "default";
      
      if (isDefaultTemplate) {
        // When default template is set live, clear all live templates
        await tx.update(templates)
          .set({ isLive: false })
          .where(eq(templates.experienceId, experience.id));
      } else {
        // When non-default template is set live:
        // 1. Unset all other live templates
        await tx.update(templates)
          .set({ isLive: false })
          .where(eq(templates.experienceId, experience.id));

        // 2. Create a "Default" template from the current live template state
        // This represents the baseline state that can be made live again
        const currentLiveTemplate = await tx.query.templates.findFirst({
          where: and(
            eq(templates.experienceId, experience.id),
            eq(templates.isLive, true)
          ),
        });

        // Use current live template as source for default, or create minimal default
        const defaultTemplateData = currentLiveTemplate ? {
          name: "Default",
          experienceId: experience.id,
          userId: currentLiveTemplate.userId,
          themeId: currentLiveTemplate.themeId,
          themeSnapshot: currentLiveTemplate.themeSnapshot,
          currentSeason: currentLiveTemplate.currentSeason,
          templateData: currentLiveTemplate.templateData,
          isLive: false, // Default template is not live initially
        } : {
          name: "Default",
          experienceId: experience.id,
          userId: templateToSetLive.userId,
          themeId: null,
          themeSnapshot: {
            id: `theme_default_${Date.now()}`,
            experienceId: 'default-experience',
            name: "Default Theme",
            season: "Fall",
            themePrompt: "A clean, default theme for the seasonal store",
            accentColor: "bg-blue-600 hover:bg-blue-700 text-white ring-blue-500",
            ringColor: "ring-blue-500",
            createdAt: new Date(),
            updatedAt: new Date()
          },
          currentSeason: "Fall",
          templateData: {
            themeTextStyles: {},
            themeLogos: {},
            themeGeneratedBackgrounds: {},
            themeUploadedBackgrounds: {},
            themeProducts: {},
            themeFloatingAssets: {},
            products: [],
            floatingAssets: [],
            fixedTextStyles: {},
            logoAsset: null,
            generatedBackground: null,
            uploadedBackground: null,
          },
          isLive: false,
        };

        // Check if default template already exists
        const existingDefault = await tx.query.templates.findFirst({
          where: and(
            eq(templates.experienceId, experience.id),
            eq(templates.name, "Default")
          ),
        });

        if (existingDefault) {
          // Update existing default template
          await tx.update(templates)
            .set({
              themeSnapshot: defaultTemplateData.themeSnapshot,
              currentSeason: defaultTemplateData.currentSeason,
              templateData: defaultTemplateData.templateData,
              updatedAt: new Date(),
            })
            .where(eq(templates.id, existingDefault.id));
        } else {
          // Create new default template
          await tx.insert(templates).values(defaultTemplateData);
        }

        // 3. Set the selected template as live
        await tx.update(templates)
          .set({ isLive: true })
          .where(and(
            eq(templates.id, templateId),
            eq(templates.experienceId, experience.id)
          ));
      }
    });

    return NextResponse.json({
      success: true,
      message: "Template set as live successfully",
    });
  } catch (error) {
    console.error("Error setting live template:", error);
    return NextResponse.json(
      { success: false, error: "Failed to set live template" },
      { status: 500 }
    );
  }
}

export const POST = withWhopAuth(setLiveTemplateHandler);
