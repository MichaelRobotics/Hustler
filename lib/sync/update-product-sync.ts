/**
 * Update Product Sync System
 * 
 * This module handles checking for product/app updates without applying changes.
 * It compares current database state with Whop API data and reports differences.
 */

import { and, eq, isNotNull } from "drizzle-orm";
import type { AuthenticatedUser } from "../context/user-context";
import { db } from "../supabase/db-server";
import { experiences, resources, users, plans } from "../supabase/schema";
import { getWhopApiClient, type WhopProduct as ApiWhopProduct, type WhopApp } from "../whop-api-client";
import { updateOriginTemplateFromProduct, shouldUpdateOriginTemplate, shouldCreateOriginTemplate, createOriginTemplateFromProduct } from "../services/origin-template-service";
import { whopSdk } from "../whop-sdk";
import { syncReviewsForProduct } from "../services/reviews-sync-service";
import { syncPromosFromWhopAPI } from "../actions/seasonal-discount-actions";
import { updateTemplatesWithProductData } from "../services/template-sync-service";
import { syncAllPlanMemberCounts } from "../services/plan-member-sync-service";
import { upsertPlansForProduct, ensurePlansExistForProduct } from "../actions/plan-actions";
import { hasAnyPaidPlan } from "./product-category-helper";

export interface ProductChange {
  type: 'created' | 'updated' | 'deleted';
  category: 'PAID' | 'FREE_VALUE';
  name: string;
  whopProductId: string;
  changes?: {
    name?: { old: string; new: string };
    description?: { old: string; new: string };
    price?: { old: string; new: string };
    image?: { old: string; new: string };
  };
}

export interface UpdateSyncResult {
  hasChanges: boolean;
  changes: ProductChange[];
  summary: {
    created: number;
    updated: number;
    deleted: number;
    total: number;
  };
  lastChecked: Date;
}

export class UpdateProductSync {
  /**
   * Check for product/app updates without applying changes
   */
  async checkForUpdates(
    user: AuthenticatedUser,
  ): Promise<UpdateSyncResult> {
    const experienceId = user.experienceId;
    
    console.log(`[UPDATE-SYNC] 🔍 Checking for updates for experience ${experienceId}`);
    
    const result: UpdateSyncResult = {
      hasChanges: false,
      changes: [],
      summary: {
        created: 0,
        updated: 0,
        deleted: 0,
        total: 0,
      },
      lastChecked: new Date(),
    };

    try {
      // Get current database resources using database UUID, not Whop experience ID
      // Use direct SQL query with limit to avoid timeout on large datasets
      const currentResources = await db
        .select({
          id: resources.id,
          name: resources.name,
          description: resources.description,
          category: resources.category,
          link: resources.link,
          image: resources.image,
          price: resources.price,
          whopProductId: resources.whopProductId,
          updatedAt: resources.updatedAt,
        })
        .from(resources)
        .where(
          and(
            eq(resources.experienceId, user.experience.id), // Use database UUID
            isNotNull(resources.whopProductId)
          )
        )
        .limit(1000); // Reasonable limit to prevent timeout

      console.log(`[UPDATE-SYNC] 📊 Found ${currentResources.length} current resources in database`);

      // Get Whop API client
      const whopClient = getWhopApiClient(user.experience.whopCompanyId, user.whopUserId);

      // Fetch current products from Whop API
      const whopProducts = await this.fetchWhopProducts(whopClient);

      console.log(`[UPDATE-SYNC] 📊 Found ${whopProducts.length} products from Whop API`);

      // Additional safety filter for archived products before comparison
      // This ensures archived products are excluded even if they slip through fetchWhopProducts
      const nonArchivedProducts = whopProducts.filter((product: ApiWhopProduct) => {
        if (product.visibility === 'archived') {
          console.log(`[UPDATE-SYNC] ⚠️ Additional filter: Excluding archived product "${product.title}" (${product.id})`);
          return false;
        }
        return true;
      });

      if (whopProducts.length !== nonArchivedProducts.length) {
        console.log(`[UPDATE-SYNC] ⚠️ Additional filter removed ${whopProducts.length - nonArchivedProducts.length} archived products from update check`);
      }

      // Create maps for easy lookup
      const currentResourcesMap = new Map(
        currentResources.map((r: any) => [r.whopProductId, r])
      );

      const whopProductsMap = new Map(
        nonArchivedProducts.map(p => [p.id, p])
      );

      // Check for created products
      whopProductsMap.forEach((product, productId) => {
        if (!currentResourcesMap.has(productId)) {
          result.changes.push({
            type: 'created',
            category: (hasAnyPaidPlan(product) || (!product.isFree && product.price > 0)) ? 'PAID' : 'FREE_VALUE',
            name: product.title,
            whopProductId: productId,
          });
          result.summary.created++;
        }
      });

      // Check for updated products
      const updatePromises = Array.from(whopProductsMap.entries()).map(async ([productId, product]) => {
        const currentResource = currentResourcesMap.get(productId);
        if (currentResource) {
          const changes = await this.detectChanges(currentResource, product);
          if (changes && Object.keys(changes).length > 0) {
            result.changes.push({
              type: 'updated',
              category: (hasAnyPaidPlan(product) || (!product.isFree && product.price > 0)) ? 'PAID' : 'FREE_VALUE',
              name: product.title,
              whopProductId: productId,
              changes,
            });
            result.summary.updated++;
          }
        }
      });
      await Promise.all(updatePromises);

      // Check for deleted products
      currentResourcesMap.forEach((resource, productId) => {
        if (!whopProductsMap.has(productId as string)) {
          result.changes.push({
            type: 'deleted',
            category: (resource as any).category as 'PAID' | 'FREE_VALUE',
            name: (resource as any).name,
            whopProductId: productId as string,
          });
          result.summary.deleted++;
        }
      });

      // Check for new/updated plans for products (prod_*)
      // This ensures resources with products have their plans synced, including NEW plans
      // Check both: products from API and resources in DB
      console.log(`[UPDATE-SYNC] 🔍 Checking for new/updated plans in resources with products...`);
      
      // Get all resources with products (prod_*) from database
      const resourcesWithProducts = currentResources.filter(
        (r: any) => r.whopProductId?.startsWith('prod_') ?? false
      );

      const plansSyncPromises = resourcesWithProducts.map(async (resource: any) => {
        const productId = resource.whopProductId;
        if (!productId) return;

        try {
          // Try to get product data from API response first
          const productFromApi = whopProductsMap.get(productId);
          
          // Always use upsertPlansForProduct to detect and sync NEW plans
          // This will upsert all plans from API, adding new ones and updating existing ones
          await upsertPlansForProduct(
            productId,
            resource.id,
            user.experience.id,
            productFromApi?.plans,
          );
          
          // Get count after sync to report
          const syncedPlans = await db.query.plans.findMany({
            where: and(
              eq(plans.whopProductId, productId),
              eq(plans.resourceId, resource.id),
            ),
            columns: { id: true },
          });
          
          console.log(`[UPDATE-SYNC] ✅ Synced plans for product ${productId} (${syncedPlans.length} plans total)`);
        } catch (error) {
          console.error(`[UPDATE-SYNC] Error syncing plans for product ${productId}:`, error);
          // Don't throw - continue with other products
        }
      });

      await Promise.all(plansSyncPromises);
      console.log(`[UPDATE-SYNC] ✅ Completed plans sync for ${resourcesWithProducts.length} products`);

      result.summary.total = result.changes.length;
      result.hasChanges = result.summary.total > 0;

      console.log(`[UPDATE-SYNC] 📋 Update check complete:`, {
        created: result.summary.created,
        updated: result.summary.updated,
        deleted: result.summary.deleted,
        total: result.summary.total,
        hasChanges: result.hasChanges,
      });

      // Check if origin template exists and needs update, or should be created
      try {
        // Get products with whopProductId to check company data
        // Use direct SQL query with limit to avoid timeout
        const productsWithIds = await db
          .select()
          .from(resources)
          .where(
            and(
              eq(resources.experienceId, user.experience.id),
              isNotNull(resources.whopProductId)
            )
          )
          .limit(100); // Limit for origin template check (only need one valid product)

        // Find a valid product by trying to fetch it from Whop SDK
        let validProduct = null;
        for (const product of productsWithIds) {
          if (!product.whopProductId) continue;
          
          try {
            const productResult = await whopSdk.accessPasses.getAccessPass({
              accessPassId: product.whopProductId,
            });
            if (productResult) {
              validProduct = product;
              break;
            }
          } catch (error) {
            // Product doesn't exist, try next one
            console.log(`[UPDATE-SYNC] ⚠️ Product ${product.whopProductId} not found, trying next...`);
            continue;
          }
        }

        if (validProduct?.whopProductId) {
          // Check if origin template should be created (doesn't exist yet)
          const shouldCreate = await shouldCreateOriginTemplate(experienceId);
          if (shouldCreate) {
            console.log(`[UPDATE-SYNC] 📦 Creating origin template for experience ${experienceId} using product ${validProduct.whopProductId}...`);
            try {
              const originTemplate = await createOriginTemplateFromProduct(experienceId, validProduct.whopProductId);
              if (originTemplate) {
                console.log(`[UPDATE-SYNC] ✅ Origin template created successfully`);
              } else {
                console.log(`[UPDATE-SYNC] ⚠️ Origin template creation returned null (may already exist)`);
              }
            } catch (createError) {
              console.error(`[UPDATE-SYNC] ⚠️ Error creating origin template:`, createError);
            }
          } else {
            // Origin template exists, check if it needs update (company logo/banner changes)
            try {
              const productResult = await whopSdk.accessPasses.getAccessPass({
                accessPassId: validProduct.whopProductId,
              });
              if (productResult) {
                const shouldUpdate = await shouldUpdateOriginTemplate(experienceId, productResult);
                if (shouldUpdate) {
                  console.log(`[UPDATE-SYNC] 📦 Updating origin template for company logo/banner changes...`);
                  await updateOriginTemplateFromProduct(experienceId, validProduct.whopProductId);
                  console.log(`[UPDATE-SYNC] ✅ Origin template updated successfully`);
                }
              }
            } catch (error) {
              console.error(`[UPDATE-SYNC] ⚠️ Error fetching product data for origin template update:`, error);
            }
          }
        } else if (productsWithIds.length > 0) {
          console.log(`[UPDATE-SYNC] ⚠️ No valid products found for origin template creation (all products may have been deleted)`);
        } else {
          console.log(`[UPDATE-SYNC] ℹ️ No products with whopProductId found, skipping origin template check`);
        }
      } catch (originTemplateError) {
        // Don't fail the update check if origin template creation/update fails
        console.error(`[UPDATE-SYNC] ⚠️ Error with origin template (non-critical):`, originTemplateError);
      }

      // Sync reviews, promo stock, and update templates
      try {
        console.log(`[UPDATE-SYNC] 🔄 Syncing reviews, promo stock, and updating templates...`);
        
        // Get all resources with whopProductId for this experience
        const resourcesWithProducts = await db.query.resources.findMany({
          where: and(
            eq(resources.experienceId, user.experience.id),
            isNotNull(resources.whopProductId)
          ),
          columns: {
            id: true,
            whopProductId: true,
          },
        });

        // Sync reviews for each product (only for resources with whopProductId)
        for (const resource of resourcesWithProducts) {
          if (resource.whopProductId) {
            try {
              await syncReviewsForProduct(user.experience.id, resource.whopProductId, resource.id);
            } catch (error) {
              console.error(`[UPDATE-SYNC] ⚠️ Error syncing reviews for product ${resource.whopProductId}:`, error);
            }
          }
          // Skip review sync for plan-only resources (reviews only in DB)
        }

        // Sync plan member counts (for plan-only resources)
        try {
          const planMemberSyncResult = await syncAllPlanMemberCounts(user.experience.id);
          console.log(`[UPDATE-SYNC] ✅ Synced member counts for ${planMemberSyncResult.synced} plans`);
          if (planMemberSyncResult.errors > 0) {
            console.warn(`[UPDATE-SYNC] ⚠️ ${planMemberSyncResult.errors} errors during plan member count sync`);
          }
        } catch (error) {
          console.error(`[UPDATE-SYNC] ⚠️ Error syncing plan member counts:`, error);
        }

        // Sync promo stock
        try {
          await syncPromosFromWhopAPI(user.experience.id, user.experience.whopCompanyId);
        } catch (error) {
          console.error(`[UPDATE-SYNC] ⚠️ Error syncing promo stock:`, error);
        }

        // Update templates with aggregated data
        try {
          const templateResult = await updateTemplatesWithProductData(user.experience.id);
          console.log(`[UPDATE-SYNC] ✅ Updated ${templateResult.updated} templates`);
        } catch (error) {
          console.error(`[UPDATE-SYNC] ⚠️ Error updating templates:`, error);
        }
      } catch (syncError) {
        // Don't fail the update check if reviews/promo/template sync fails
        console.error(`[UPDATE-SYNC] ⚠️ Error during reviews/promo/template sync (non-critical):`, syncError);
      }

      return result;

    } catch (error) {
      console.error("[UPDATE-SYNC] ❌ Error checking for updates:", error);
      throw error;
    }
  }

  /**
   * Fetch products from Whop API
   */
  private async fetchWhopProducts(whopClient: any): Promise<ApiWhopProduct[]> {
    try {
      const apiProducts = await whopClient.getCompanyProducts();
      
      // Map products and filter out archived ones
      const mappedProducts = apiProducts.map((product: ApiWhopProduct) => ({
        id: product.id,
        title: product.title || "Unnamed Product",
        description: product.description,
        price: product.price || 0,
        currency: product.currency || 'usd',
        model: product.model || 'free',
        includedApps: product.includedApps || [],
        plans: product.plans || [],
        visibility: product.visibility || 'visible',
        status: (product.status as "active" | "inactive" | "draft") || "active",
        category: product.category,
        tags: product.tags || [],
        imageUrl: product.imageUrl,
        createdAt: product.createdAt ? new Date(product.createdAt) : new Date(),
        updatedAt: product.updatedAt ? new Date(product.updatedAt) : new Date(),
        discoveryPageUrl: product.discoveryPageUrl,
        checkoutUrl: product.checkoutUrl,
        route: product.route,
        isFree: product.isFree,
      }));
      
      // Explicitly filter out archived products as a safety measure
      const filteredProducts = mappedProducts.filter((product: ApiWhopProduct) => {
        const isArchived = product.visibility === 'archived';
        if (isArchived) {
          console.log(`[UPDATE-SYNC] ⚠️ Filtering out archived product: "${product.title}" (${product.id})`);
        }
        return !isArchived;
      });
      
      if (mappedProducts.length !== filteredProducts.length) {
        console.log(`[UPDATE-SYNC] ⚠️ Filtered out ${mappedProducts.length - filteredProducts.length} archived products`);
      }
      
      return filteredProducts;
    } catch (error) {
      console.error("Error fetching Whop products:", error);
      return [];
    }
  }

  // REMOVED: fetchWhopApps method - app sync is no longer supported

  /**
   * Detect changes between current resource and Whop product
   */
  private async detectChanges(currentResource: any, whopProduct: ApiWhopProduct): Promise<any> {
    const changes: any = {};

    // Check name changes - trim whitespace before comparison to avoid false positives
    const currentName = (currentResource.name || '').trim();
    const whopProductName = (whopProduct.title || '').trim();
    
    if (currentName !== whopProductName) {
      // Check if this is just a suffix removal (e.g., "Test (abc123)" → "Test")
      // Pattern: "BaseName (suffix)" → "BaseName"
      const suffixPattern = new RegExp(`^${whopProductName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\([^)]+\\)$`);
      
      if (!suffixPattern.test(currentName)) {
        // Only report as change if it's not just a suffix removal
        changes.name = {
          old: currentResource.name,
          new: whopProduct.title,
        };
      }
    }

    // Check description changes
    const currentDesc = currentResource.description || '';
    const newDesc = whopProduct.description || '';
    if (currentDesc !== newDesc) {
      changes.description = {
        old: currentDesc,
        new: newDesc,
      };
    }

    // Price changes are not checked - prices are managed separately and should not trigger sync updates

    // Check image changes - fetch from Whop SDK galleryImages ONLY (no product.logo/bannerImage/imageUrl)
    const currentImage = currentResource.image || '';
    const defaultPlaceholder = 'https://assets-2-prod.whop.com/uploads/user_16843562/image/experiences/2025-10-24/e6822e55-e666-43de-aec9-e6e116ea088f.webp';
    let newImage = defaultPlaceholder;
    
    // Fetch product image from galleryImages using Whop SDK
    try {
      const productResult = await whopSdk.accessPasses.getAccessPass({
        accessPassId: whopProduct.id,
      });
      
      if (productResult.galleryImages?.nodes && productResult.galleryImages.nodes.length > 0) {
        const firstImage = productResult.galleryImages.nodes[0];
        if (firstImage?.source?.url) {
          newImage = firstImage.source.url;
          console.log(`✅ [UPDATE-SYNC] Fetched product image from galleryImages for ${whopProduct.title}`);
        } else {
          console.log(`⚠️ [UPDATE-SYNC] galleryImages found but no source.url for ${whopProduct.title}, using placeholder`);
        }
      } else {
        console.log(`⚠️ [UPDATE-SYNC] No galleryImages found for ${whopProduct.title}, using placeholder`);
      }
    } catch (imageError) {
      // Use placeholder if SDK fetch fails
      console.warn(`⚠️ [UPDATE-SYNC] Failed to fetch product image for ${whopProduct.title}, using placeholder:`, imageError);
    }
    
    if (currentImage !== newImage) {
      changes.image = {
        old: currentImage,
        new: newImage,
      };
    }

    // Skip link checking - not needed for update sync

    return changes;
  }

  /**
   * Detect changes between current resource and Whop app
   */
  private detectAppChanges(currentResource: any, whopApp: WhopApp): any {
    const changes: any = {};

    // Check name changes - trim whitespace before comparison to avoid false positives
    const currentName = (currentResource.name || '').trim();
    const whopAppName = (whopApp.name || '').trim();
    
    if (currentName !== whopAppName) {
      // Check if this is just a suffix removal (e.g., "Test (abc123)" → "Test")
      // Pattern: "BaseName (suffix)" → "BaseName"
      const suffixPattern = new RegExp(`^${whopAppName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\([^)]+\\)$`);
      
      if (!suffixPattern.test(currentName)) {
        // Only report as change if it's not just a suffix removal
        changes.name = {
          old: currentResource.name,
          new: whopApp.name,
        };
      }
    }

    // Skip description checking for apps - not needed for update sync

    // Check image changes - apps use logo/banner (no gallery images)
    const currentImage = currentResource.image || '';
    const newImage = whopApp.logo || whopApp.bannerImage || 
      'https://assets-2-prod.whop.com/uploads/user_16843562/image/experiences/2025-10-24/e6822e55-e666-43de-aec9-e6e116ea088f.webp';
    if (currentImage !== newImage) {
      changes.image = {
        old: currentImage,
        new: newImage,
      };
    }

    // Skip link checking - not needed for update sync

    return changes;
  }
}

// Export singleton instance
export const updateProductSync = new UpdateProductSync();

