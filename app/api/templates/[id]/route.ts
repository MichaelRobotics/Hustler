import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/db-server";
import { templates, themes, experiences, users } from "@/lib/supabase/schema";
import { eq, and } from "drizzle-orm";
import {
  type AuthContext,
  createErrorResponse,
  withWhopAuth,
} from "@/lib/middleware/whop-auth";

async function getTemplateHandler(
  request: NextRequest,
  context: AuthContext
) {
  try {
    const { user } = context;
    const experienceId = user.experienceId;
    const url = new URL(request.url);
    const templateId = url.pathname.split('/').pop();

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

    // Get template
    const template = await db.query.templates.findFirst({
      where: and(
        eq(templates.id, templateId),
        eq(templates.experienceId, experience.id)
      ),
      with: {
        theme: true,
      },
    });

    if (!template) {
      return NextResponse.json(
        { success: false, error: "Template not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      template,
    });
  } catch (error) {
    console.error("Error fetching template:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch template" },
      { status: 500 }
    );
  }
}

async function updateTemplateHandler(
  request: NextRequest,
  context: AuthContext
) {
  try {
    const { user } = context;
    const experienceId = user.experienceId;
    const url = new URL(request.url);
    const templateId = url.pathname.split('/').pop();

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

    const body = await request.json();
    const { name, templateData } = body;

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

    // Update template
    const updatedTemplate = await db.update(templates)
      .set({
        name,
        templateData,
        updatedAt: new Date(),
      })
      .where(and(
        eq(templates.id, templateId),
        eq(templates.experienceId, experience.id)
      ))
      .returning();

    if (updatedTemplate.length === 0) {
      return NextResponse.json(
        { success: false, error: "Template not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      template: updatedTemplate[0],
    });
  } catch (error) {
    console.error("Error updating template:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update template" },
      { status: 500 }
    );
  }
}

async function deleteTemplateHandler(
  request: NextRequest,
  context: AuthContext
) {
  try {
    const { user } = context;
    const experienceId = user.experienceId;
    const url = new URL(request.url);
    const templateId = url.pathname.split('/').pop();

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

    // Delete template
    const deletedTemplate = await db.delete(templates)
      .where(and(
        eq(templates.id, templateId),
        eq(templates.experienceId, experience.id)
      ))
      .returning();

    if (deletedTemplate.length === 0) {
      return NextResponse.json(
        { success: false, error: "Template not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Template deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting template:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete template" },
      { status: 500 }
    );
  }
}

export const GET = withWhopAuth(getTemplateHandler);
export const PUT = withWhopAuth(updateTemplateHandler);
export const DELETE = withWhopAuth(deleteTemplateHandler);
