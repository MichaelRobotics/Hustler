/**
 * Company Logo Service
 * 
 * Handles retrieving company logos from Whop API and updating experience records.
 * Uses the new Whop SDK format as specified by the user.
 */

import Whop from '@whop/sdk';
import { eq } from "drizzle-orm";
import { db } from "../supabase/db-server";
import { experiences } from "../supabase/schema";

// Initialize Whop SDK with the new format
const whopClient = new Whop({
  appID: process.env.NEXT_PUBLIC_WHOP_APP_ID!,
  apiKey: process.env.WHOP_API_KEY!,
});

/**
 * Retrieve company logo from Whop API
 * 
 * @param companyId - Whop company ID (biz_xxxxxxxxxxxxxx)
 * @returns Company logo URL or null if not found
 */
export async function retrieveCompanyLogo(companyId: string): Promise<string | null> {
  try {
    console.log(`[Company Logo] Retrieving logo for company: ${companyId}`);
    
    // Use the new Whop SDK format to retrieve company data
    const company = await whopClient.companies.retrieve(companyId);
    
    if (!company) {
      console.log(`[Company Logo] No company found for ID: ${companyId}`);
      return null;
    }
    
    // Extract logo URL from company data
    const logoUrl = company.logo?.url || null;
    
    if (logoUrl) {
      console.log(`[Company Logo] Retrieved logo URL: ${logoUrl}`);
    } else {
      console.log(`[Company Logo] No logo found for company: ${companyId}`);
    }
    
    return logoUrl;
  } catch (error) {
    console.error(`[Company Logo] Error retrieving logo for company ${companyId}:`, error);
    return null;
  }
}

/**
 * Update experience record with company logo
 * 
 * @param experienceId - Experience ID to update
 * @param logoUrl - Logo URL to save
 * @returns Success boolean
 */
export async function updateExperienceLogo(
  experienceId: string, 
  logoUrl: string
): Promise<boolean> {
  try {
    console.log(`[Company Logo] Updating experience ${experienceId} with logo: ${logoUrl}`);
    
    // Update the experience record with the logo URL
    const [updatedExperience] = await db
      .update(experiences)
      .set({
        logo: logoUrl,
        updatedAt: new Date(),
      })
      .where(eq(experiences.id, experienceId))
      .returning();
    
    if (updatedExperience) {
      console.log(`[Company Logo] Successfully updated experience ${experienceId} with logo`);
      return true;
    } else {
      console.error(`[Company Logo] Failed to update experience ${experienceId}`);
      return false;
    }
  } catch (error) {
    console.error(`[Company Logo] Error updating experience ${experienceId} with logo:`, error);
    return false;
  }
}

/**
 * Retrieve and update company logo for an experience
 * 
 * @param experienceId - Experience ID to update
 * @param companyId - Whop company ID to retrieve logo from
 * @returns Success boolean
 */
export async function retrieveAndUpdateCompanyLogo(
  experienceId: string,
  companyId: string
): Promise<boolean> {
  try {
    console.log(`[Company Logo] Starting logo retrieval and update for experience ${experienceId}, company ${companyId}`);
    
    // Step 1: Retrieve logo from Whop API
    const logoUrl = await retrieveCompanyLogo(companyId);
    
    if (!logoUrl) {
      console.log(`[Company Logo] No logo found for company ${companyId}, skipping update`);
      return false;
    }
    
    // Step 2: Update experience record with logo
    const success = await updateExperienceLogo(experienceId, logoUrl);
    
    if (success) {
      console.log(`[Company Logo] Successfully retrieved and updated logo for experience ${experienceId}`);
    } else {
      console.error(`[Company Logo] Failed to update experience ${experienceId} with logo`);
    }
    
    return success;
  } catch (error) {
    console.error(`[Company Logo] Error in retrieveAndUpdateCompanyLogo:`, error);
    return false;
  }
}

/**
 * Update logo for all experiences of a specific company
 * 
 * @param companyId - Whop company ID
 * @returns Number of experiences updated
 */
export async function updateLogosForCompany(companyId: string): Promise<number> {
  try {
    console.log(`[Company Logo] Updating logos for all experiences of company: ${companyId}`);
    
    // Find all experiences for this company
    const companyExperiences = await db.query.experiences.findMany({
      where: eq(experiences.whopCompanyId, companyId),
      columns: { id: true, whopCompanyId: true, name: true }
    });
    
    if (companyExperiences.length === 0) {
      console.log(`[Company Logo] No experiences found for company: ${companyId}`);
      return 0;
    }
    
    console.log(`[Company Logo] Found ${companyExperiences.length} experiences for company ${companyId}`);
    
    // Retrieve logo once for the company
    const logoUrl = await retrieveCompanyLogo(companyId);
    
    if (!logoUrl) {
      console.log(`[Company Logo] No logo found for company ${companyId}, skipping all updates`);
      return 0;
    }
    
    // Update all experiences with the logo
    let updatedCount = 0;
    for (const experience of companyExperiences) {
      const success = await updateExperienceLogo(experience.id, logoUrl);
      if (success) {
        updatedCount++;
        console.log(`[Company Logo] Updated experience ${experience.name} (${experience.id})`);
      }
    }
    
    console.log(`[Company Logo] Successfully updated ${updatedCount}/${companyExperiences.length} experiences`);
    return updatedCount;
  } catch (error) {
    console.error(`[Company Logo] Error updating logos for company ${companyId}:`, error);
    return 0;
  }
}
