/**
 * Company Logo API Endpoint
 * 
 * Handles retrieving and updating company logos using the new Whop SDK format.
 */

import { NextRequest, NextResponse } from "next/server";
import { retrieveCompanyLogo, updateExperienceLogo, retrieveAndUpdateCompanyLogo, updateLogosForCompany } from "../../../lib/services/company-logo-service";

/**
 * GET /api/company-logo
 * Retrieve company logo from Whop API
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    
    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "Company ID is required" },
        { status: 400 }
      );
    }
    
    console.log(`[Company Logo API] Retrieving logo for company: ${companyId}`);
    
    const logoUrl = await retrieveCompanyLogo(companyId);
    
    if (logoUrl) {
      return NextResponse.json({
        success: true,
        companyId,
        logoUrl,
        message: "Logo retrieved successfully"
      });
    } else {
      return NextResponse.json({
        success: false,
        companyId,
        message: "No logo found for company"
      });
    }
  } catch (error) {
    console.error("[Company Logo API] Error retrieving logo:", error);
    return NextResponse.json(
      { success: false, error: "Failed to retrieve logo" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/company-logo
 * Update experience with company logo
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { experienceId, companyId, logoUrl } = body;
    
    if (!experienceId) {
      return NextResponse.json(
        { success: false, error: "Experience ID is required" },
        { status: 400 }
      );
    }
    
    console.log(`[Company Logo API] Updating experience ${experienceId} with logo`);
    
    let success = false;
    let message = "";
    
    if (logoUrl) {
      // Direct logo update
      success = await updateExperienceLogo(experienceId, logoUrl);
      message = success ? "Experience updated with provided logo" : "Failed to update experience";
    } else if (companyId) {
      // Retrieve and update from company
      success = await retrieveAndUpdateCompanyLogo(experienceId, companyId);
      message = success ? "Experience updated with company logo" : "Failed to retrieve or update company logo";
    } else {
      return NextResponse.json(
        { success: false, error: "Either logoUrl or companyId is required" },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success,
      experienceId,
      message
    });
  } catch (error) {
    console.error("[Company Logo API] Error updating logo:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update logo" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/company-logo
 * Update all experiences for a company
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId } = body;
    
    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "Company ID is required" },
        { status: 400 }
      );
    }
    
    console.log(`[Company Logo API] Updating all experiences for company: ${companyId}`);
    
    const updatedCount = await updateLogosForCompany(companyId);
    
    return NextResponse.json({
      success: true,
      companyId,
      updatedCount,
      message: `Updated ${updatedCount} experiences with company logo`
    });
  } catch (error) {
    console.error("[Company Logo API] Error updating company logos:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update company logos" },
      { status: 500 }
    );
  }
}
