import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/db-server";
import { templates, themes, experiences, users } from "@/lib/supabase/schema";
import { eq, and } from "drizzle-orm";
import {
  type AuthContext,
  createErrorResponse,
  withWhopAuth,
  authenticateWhopUser,
} from "@/lib/middleware/whop-auth";
import { getUserContext } from "@/lib/context/user-context";

async function getTemplatesHandler(
  request: NextRequest,
  context: AuthContext,
) {
  try {
    const { user } = context;
    const experienceId = user.experienceId;

    if (!experienceId) {
      return NextResponse.json(
        { error: "Experience ID is required" },
        { status: 400 }
      );
    }

    // Get the full user context from the simplified auth (whopCompanyId is now optional)
    const userContext = await getUserContext(
      user.userId,
      "", // whopCompanyId is optional for experience-based isolation
      experienceId,
      false, // forceRefresh
      // Don't pass access level - let it be determined from Whop API
    );

    if (!userContext) {
      return NextResponse.json(
        { error: "User context not found" },
        { status: 401 }
      );
    }

    // Get templates for this experience using the full user context
    const templatesList = await db.query.templates.findMany({
      where: eq(templates.experienceId, userContext.user.experience.id),
      with: {
        theme: true,
      },
      orderBy: (templates: any, { desc }: any) => [desc(templates.updatedAt)],
    });

    return NextResponse.json({
      success: true,
      templates: templatesList,
    });
  } catch (error) {
    console.error("Error fetching templates:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch templates" },
      { status: 500 }
    );
  }
}

async function createTemplateHandler(
  request: NextRequest,
  context: AuthContext,
) {
  try {
    const { user } = context;
    const experienceId = user.experienceId;

    if (!experienceId) {
      return NextResponse.json(
        { error: "Experience ID is required" },
        { status: 400 }
      );
    }

    console.log("🔍 Templates POST - Getting user context for:", { userId: user.userId, experienceId });

    let userContext;
    
    // Check if this is a development mode fallback (hardcoded user ID)
    if (user.userId === "7707d022-ce9d-4d9d-85d9-6993ce69512e") {
      console.log("🔄 Templates POST - Using development mode user context (skip getUserContext)");
      userContext = {
        user: {
          id: "7707d022-ce9d-4d9d-85d9-6993ce69512e",
          experience: {
            id: "4969a696-3708-40f2-a716-662dbdcd4cf8"
          }
        }
      };
    } else {
      try {
        // Get the full user context from the simplified auth (whopCompanyId is now optional)
        userContext = await getUserContext(
          user.userId,
          "", // whopCompanyId is optional for experience-based isolation
          experienceId,
          false, // forceRefresh
          // Don't pass access level - let it be determined from Whop API
        );

        console.log("🔍 Templates POST - User context result:", userContext ? "Found" : "Not found");

        if (!userContext) {
          console.log("❌ Templates POST - User context not found");
          return NextResponse.json(
            { error: "User context not found" },
            { status: 401 }
          );
        }
      } catch (error) {
        console.error("❌ Templates POST - Error getting user context:", error);
        return NextResponse.json(
          { error: "Failed to get user context" },
          { status: 500 }
        );
      }
    }

    const body = await request.json();
    const { name, themeId, themeSnapshot, currentSeason, templateData } = body;

    console.log("🔍 Templates POST - Request body:", { name, themeId, themeSnapshot, currentSeason, templateData });
    console.log("🔍 Templates POST - Products:", JSON.stringify(templateData.products, null, 2));
    console.log("🔍 Templates POST - FixedTextStyles:", JSON.stringify(templateData.fixedTextStyles, null, 2));
    console.log("🔍 Templates POST - FloatingAssets:", JSON.stringify(templateData.floatingAssets, null, 2));

    if (!name || !currentSeason || !templateData) {
      return NextResponse.json(
        { success: false, error: "Name, currentSeason, and templateData are required" },
        { status: 400 }
      );
    }

    // Use themeId if provided, otherwise null (for default themes)
    const finalThemeId = themeId || null;
    console.log("🔍 Templates POST - Using themeId:", finalThemeId);

    // Provide default themeSnapshot if undefined
    const finalThemeSnapshot = themeSnapshot || { name: "Default Theme", season: currentSeason };
    console.log("🔍 Templates POST - Using themeSnapshot:", finalThemeSnapshot);

    console.log("🔍 Templates POST - Creating template with:", {
      experienceId: userContext.user.experience.id,
      userId: userContext.user.id,
      name,
      themeId: finalThemeId
    });

    // Create template using the full user context
    const newTemplate = await db.insert(templates).values({
      experienceId: userContext.user.experience.id,
      userId: userContext.user.id,
      name,
      themeId: finalThemeId,
      themeSnapshot: finalThemeSnapshot,
      currentSeason,
      templateData,
    }).returning();

    console.log("🔍 Templates POST - Template created successfully:", newTemplate[0]?.id);

    return NextResponse.json({
      success: true,
      template: newTemplate[0],
    });
  } catch (error) {
    console.error("Error creating template:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create template" },
      { status: 500 }
    );
  }
}

// Custom handlers that try WHOP auth first, then fallback to development mode
export async function GET(request: NextRequest) {
  try {
    return await withWhopAuth(getTemplatesHandler)(request);
  } catch (error) {
    console.log("WHOP auth failed for GET, using development mode");
    // Fallback to development mode
    const devContext = { 
      user: { 
        userId: "7707d022-ce9d-4d9d-85d9-6993ce69512e", 
        experienceId: "exp_2Cjx49TKxbr2fa" 
      }, 
      isAuthenticated: true 
    };
    return await getTemplatesHandler(request, devContext);
  }
}

export async function POST(request: NextRequest) {
  // Read the request body once and store it
  const body = await request.json();
  
  // Try WHOP auth first with a new request that has the body
  const authRequest = new NextRequest(request.url, {
    method: request.method,
    headers: request.headers,
    body: JSON.stringify(body)
  });
  
  const response = await withWhopAuth(createTemplateHandler)(authRequest);
  
  // Check if authentication failed
  if (response.status === 401 || response.status === 400) {
    console.log("WHOP auth failed for POST, using development mode");
    // Fallback to development mode - use the stored body
    return await createTemplateDevModeWithBody(body);
  }
  
  return response;
}

// Development mode handler that bypasses authentication
async function createTemplateDevMode(request: NextRequest) {
  try {
    const body = await request.json();
    return await createTemplateDevModeWithBody(body);
  } catch (error) {
    console.error("Error creating template (dev mode):", error);
    return NextResponse.json(
      { success: false, error: "Failed to create template" },
      { status: 500 }
    );
  }
}

// Development mode handler that takes body directly
async function createTemplateDevModeWithBody(body: any) {
  try {
    const { name, themeId, themeSnapshot, currentSeason, templateData } = body;

    console.log("🔍 Templates POST (Dev Mode) - Request body:", { name, themeId, themeSnapshot, currentSeason, templateData });
    console.log("🔍 Templates POST (Dev Mode) - Products:", JSON.stringify(templateData.products, null, 2));
    console.log("🔍 Templates POST (Dev Mode) - FixedTextStyles:", JSON.stringify(templateData.fixedTextStyles, null, 2));
    console.log("🔍 Templates POST (Dev Mode) - FloatingAssets:", JSON.stringify(templateData.floatingAssets, null, 2));

    if (!name || !currentSeason || !templateData) {
      return NextResponse.json(
        { success: false, error: "Name, currentSeason, and templateData are required" },
        { status: 400 }
      );
    }

    // Use themeId if provided, otherwise null (for default themes)
    const finalThemeId = themeId || null;
    console.log("🔍 Templates POST (Dev Mode) - Using themeId:", finalThemeId);

    // Provide default themeSnapshot if undefined
    const finalThemeSnapshot = themeSnapshot || { name: "Default Theme", season: currentSeason };
    console.log("🔍 Templates POST (Dev Mode) - Using themeSnapshot:", finalThemeSnapshot);

    // Create template using hardcoded development values
    const newTemplate = await db.insert(templates).values({
      experienceId: "4969a696-3708-40f2-a716-662dbdcd4cf8",
      userId: "7707d022-ce9d-4d9d-85d9-6993ce69512e",
      name,
      themeId: finalThemeId,
      themeSnapshot: finalThemeSnapshot,
      currentSeason,
      templateData,
    }).returning();

    console.log("🔍 Templates POST (Dev Mode) - Template created successfully:", newTemplate[0]?.id);

    return NextResponse.json({
      success: true,
      template: newTemplate[0],
    });
  } catch (error) {
    console.error("Error creating template (dev mode):", error);
    return NextResponse.json(
      { success: false, error: "Failed to create template" },
      { status: 500 }
    );
  }
}
