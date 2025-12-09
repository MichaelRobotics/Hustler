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

    // Validate templateId is a valid UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(templateId)) {
      return NextResponse.json(
        { success: false, error: `Invalid template ID format: ${templateId}. Expected UUID.` },
        { status: 400 }
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

    console.log('🔍 [UPDATE-TEMPLATE] Request details:', {
      templateId,
      experienceId,
      hasName: name !== undefined,
      hasTemplateData: templateData !== undefined,
    });

    // Get experience record
    const experience = await db.query.experiences.findFirst({
      where: eq(experiences.whopExperienceId, experienceId),
    });

    if (!experience) {
      console.error('❌ [UPDATE-TEMPLATE] Experience not found:', experienceId);
      return NextResponse.json(
        { success: false, error: "Experience not found" },
        { status: 404 }
      );
    }

    console.log('✅ [UPDATE-TEMPLATE] Experience found:', experience.id);

    // Check if template exists before updating
    const existingTemplate = await db.query.templates.findFirst({
      where: and(
        eq(templates.id, templateId),
        eq(templates.experienceId, experience.id)
      ),
    });

    if (!existingTemplate) {
      console.error('❌ [UPDATE-TEMPLATE] Template not found:', {
        templateId,
        experienceId: experience.id,
        searchedExperienceId: experience.id,
      });
      
      // List all templates for this experience for debugging
      const allTemplates = await db.query.templates.findMany({
        where: eq(templates.experienceId, experience.id),
        columns: { id: true, name: true },
      });
      console.log('📋 [UPDATE-TEMPLATE] Available templates for this experience:', allTemplates.map((t: any) => ({ id: t.id, name: t.name })));
      
      return NextResponse.json(
        { success: false, error: `Template not found. Template ID: ${templateId}, Experience ID: ${experience.id}` },
        { status: 404 }
      );
    }

    console.log('✅ [UPDATE-TEMPLATE] Template found:', existingTemplate.name);

    // Build update object - only include fields that are provided
    const updateFields: any = {
      updatedAt: new Date(),
    };
    
    if (name !== undefined) {
      updateFields.name = name;
    }
    
    if (templateData !== undefined) {
      updateFields.templateData = templateData;
    }

    console.log('🔄 [UPDATE-TEMPLATE] Updating template with fields:', Object.keys(updateFields));

    // Update template
    const updatedTemplate = await db.update(templates)
      .set(updateFields)
      .where(and(
        eq(templates.id, templateId),
        eq(templates.experienceId, experience.id)
      ))
      .returning();

    if (updatedTemplate.length === 0) {
      console.error('❌ [UPDATE-TEMPLATE] Update returned no rows');
      return NextResponse.json(
        { success: false, error: "Template update returned no rows" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      template: updatedTemplate[0],
    });
  } catch (error) {
    console.error("Error updating template:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const url = new URL(request.url);
    const templateIdFromUrl = url.pathname.split('/').pop();
    const experienceIdFromContext = context.user?.experienceId || 'unknown';
    console.error("Error details:", {
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      templateId: templateIdFromUrl || 'unknown',
      experienceId: experienceIdFromContext,
    });
    return NextResponse.json(
      { success: false, error: `Failed to update template: ${errorMessage}` },
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

    // Validate template ID is a valid UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(templateId)) {
      return NextResponse.json(
        { success: false, error: `Invalid template ID format: "${templateId}". Template ID must be a valid UUID.` },
        { status: 400 }
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
