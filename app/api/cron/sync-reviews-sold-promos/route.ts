/**
 * Sync Reviews, Sold Count, and Promo Stock Cron Job
 * 
 * Runs periodically to sync:
 * 1. Reviews from Whop API for each product
 * 2. Sold count (member_count) from Whop API products
 * 3. Promo stock numbers from Whop API
 * 4. Update templates with aggregated review data, sold counts, and promo stock
 * 
 * Schedule: Hourly (0 * * * *)
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/db-server";
import { experiences, resources } from "@/lib/supabase/schema";
import { eq, and, isNotNull } from "drizzle-orm";
import { syncReviewsForProduct } from "@/lib/services/reviews-sync-service";
import { syncPromosFromWhopAPI } from "@/lib/actions/seasonal-discount-actions";
import { updateTemplatesWithProductData } from "@/lib/services/template-sync-service";
import { getWhopApiClient } from "@/lib/whop-api-client";

export async function GET(request: NextRequest) {
  return POST(request);
}

export async function POST(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request (optional security check)
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    console.log("🔄 [SYNC-CRON] Starting reviews, sold count, and promo stock sync cron job...");
    
    const startTime = Date.now();
    const results = {
      experiencesProcessed: 0,
      reviewsSynced: 0,
      resourcesUpdated: 0,
      promosSynced: 0,
      templatesUpdated: 0,
      errors: [] as string[],
    };

    // Fetch all experiences
    const allExperiences = await db.query.experiences.findMany({
      columns: {
        id: true,
        whopExperienceId: true,
        whopCompanyId: true,
      },
    });

    console.log(`[SYNC-CRON] Found ${allExperiences.length} experiences to process`);

    // Process each experience
    for (const experience of allExperiences) {
      try {
        console.log(`[SYNC-CRON] Processing experience ${experience.whopExperienceId} (${experience.id})`);

        // Get all resources with whopProductId for this experience
        const resourcesWithProducts = await db.query.resources.findMany({
          where: and(
            eq(resources.experienceId, experience.id),
            isNotNull(resources.whopProductId)
          ),
          columns: {
            id: true,
            whopProductId: true,
          },
        });

        if (resourcesWithProducts.length === 0) {
          console.log(`[SYNC-CRON] No resources with whopProductId for experience ${experience.whopExperienceId}`);
          continue;
        }

        // 1. Sync reviews for each product
        for (const resource of resourcesWithProducts) {
          if (resource.whopProductId) {
            try {
              const reviewCount = await syncReviewsForProduct(
                experience.id,
                resource.whopProductId,
                resource.id
              );
              results.reviewsSynced += reviewCount;
            } catch (error) {
              const errorMsg = `Error syncing reviews for product ${resource.whopProductId}: ${error instanceof Error ? error.message : String(error)}`;
              console.error(`[SYNC-CRON] ⚠️ ${errorMsg}`);
              results.errors.push(errorMsg);
            }
          }
        }

        // 2. Update sold count from Whop API products
        try {
          // Get Whop API client (we need a user ID, but for cron we'll use the first admin user or skip)
          // For now, we'll fetch products and update sold count directly
          const whopClient = getWhopApiClient(experience.whopCompanyId, ''); // Empty user ID for cron
          const products = await whopClient.getCompanyProducts();

          for (const product of products) {
            if (product.activeUsersCount !== undefined) {
              try {
                await db
                  .update(resources)
                  .set({
                    sold: product.activeUsersCount,
                    updatedAt: new Date(),
                  })
                  .where(and(
                    eq(resources.whopProductId, product.id),
                    eq(resources.experienceId, experience.id)
                  ));
                results.resourcesUpdated++;
              } catch (error) {
                const errorMsg = `Error updating sold count for product ${product.id}: ${error instanceof Error ? error.message : String(error)}`;
                console.error(`[SYNC-CRON] ⚠️ ${errorMsg}`);
                results.errors.push(errorMsg);
              }
            }
          }
        } catch (error) {
          const errorMsg = `Error updating sold counts: ${error instanceof Error ? error.message : String(error)}`;
          console.error(`[SYNC-CRON] ⚠️ ${errorMsg}`);
          results.errors.push(errorMsg);
        }

        // 3. Sync promo stock
        try {
          const promoCount = await syncPromosFromWhopAPI(experience.id, experience.whopCompanyId);
          results.promosSynced += promoCount;
        } catch (error) {
          const errorMsg = `Error syncing promo stock: ${error instanceof Error ? error.message : String(error)}`;
          console.error(`[SYNC-CRON] ⚠️ ${errorMsg}`);
          results.errors.push(errorMsg);
        }

        // 4. Update templates with aggregated data
        try {
          const templateResult = await updateTemplatesWithProductData(experience.id);
          results.templatesUpdated += templateResult.updated;
          if (templateResult.errors.length > 0) {
            results.errors.push(...templateResult.errors);
          }
        } catch (error) {
          const errorMsg = `Error updating templates: ${error instanceof Error ? error.message : String(error)}`;
          console.error(`[SYNC-CRON] ⚠️ ${errorMsg}`);
          results.errors.push(errorMsg);
        }

        results.experiencesProcessed++;
      } catch (error) {
        const errorMsg = `Error processing experience ${experience.whopExperienceId}: ${error instanceof Error ? error.message : String(error)}`;
        console.error(`[SYNC-CRON] ⚠️ ${errorMsg}`);
        results.errors.push(errorMsg);
      }
    }

    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.log(`[SYNC-CRON] ✅ Sync completed in ${elapsed}s:`, {
      experiencesProcessed: results.experiencesProcessed,
      reviewsSynced: results.reviewsSynced,
      resourcesUpdated: results.resourcesUpdated,
      promosSynced: results.promosSynced,
      templatesUpdated: results.templatesUpdated,
      errors: results.errors.length,
    });

    return NextResponse.json({
      success: true,
      message: "Sync completed successfully",
      results,
      elapsed,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error("❌ [SYNC-CRON] Sync cron job failed:", error);
    return NextResponse.json(
      { 
        error: "Sync failed", 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}


