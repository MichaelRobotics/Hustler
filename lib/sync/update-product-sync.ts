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
import { upsertPlansForProduct, ensurePlansExistForProduct } from "../actions/plan-actions";

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
      const currentResources = await db.query.resources.findMany({
        where: and(
          eq(resources.experienceId, user.experience.id), // Use database UUID
          isNotNull(resources.whopProductId)
        ),
        columns: {
          id: true,
          name: true,
          description: true,
          category: true,
          link: true,
          image: true,
          price: true,
          whopProductId: true,
          updatedAt: true,
        },
      });

      console.log(`[UPDATE-SYNC] 📊 Found ${currentResources.length} current resources in database`);

      // Get Whop API client
      const whopClient = getWhopApiClient(user.experience.whopCompanyId, user.whopUserId);

      // Fetch current products from Whop API
      const [whopProducts, whopApps] = await Promise.all([
        this.fetchWhopProducts(whopClient),
        this.fetchWhopApps(whopClient, user.experience.whopCompanyId)
      ]);

      console.log(`[UPDATE-SYNC] 📊 Found ${whopProducts.length} products and ${whopApps.length} apps from Whop API`);

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

      const whopAppsMap = new Map(
        whopApps.map(a => [a.id, a])
      );

      // Check for created products/apps
      whopProductsMap.forEach((product, productId) => {
        if (!currentResourcesMap.has(productId)) {
          result.changes.push({
            type: 'created',
            category: product.isFree ? 'FREE_VALUE' : 'PAID',
            name: product.title,
            whopProductId: productId,
          });
          result.summary.created++;
        }
      });

      whopAppsMap.forEach((app, appId) => {
        if (!currentResourcesMap.has(appId)) {
          result.changes.push({
            type: 'created',
            category: 'FREE_VALUE',
            name: app.name,
            whopProductId: appId,
          });
          result.summary.created++;
        }
      });

      // Check for updated products/apps
      const updatePromises = Array.from(whopProductsMap.entries()).map(async ([productId, product]) => {
        const currentResource = currentResourcesMap.get(productId);
        if (currentResource) {
          const changes = await this.detectChanges(currentResource, product);
          if (changes && Object.keys(changes).length > 0) {
            result.changes.push({
              type: 'updated',
              category: product.isFree ? 'FREE_VALUE' : 'PAID',
              name: product.title,
              whopProductId: productId,
              changes,
            });
            result.summary.updated++;
          }
        }
      });
      await Promise.all(updatePromises);

      whopAppsMap.forEach((app, appId) => {
        const currentResource = currentResourcesMap.get(appId);
        if (currentResource) {
          const changes = this.detectAppChanges(currentResource, app);
          if (changes && Object.keys(changes).length > 0) {
            result.changes.push({
              type: 'updated',
              category: 'FREE_VALUE',
              name: app.name,
              whopProductId: appId,
              changes,
            });
            result.summary.updated++;
          }
        }
      });

      // Check for deleted products/apps
      currentResourcesMap.forEach((resource, productId) => {
        if (!whopProductsMap.has(productId as string) && !whopAppsMap.has(productId as string)) {
          result.changes.push({
            type: 'deleted',
            category: (resource as any).category as 'PAID' | 'FREE_VALUE',
            name: (resource as any).name,
            whopProductId: productId as string,
          });
          result.summary.deleted++;
        }
      });

      // Check for missing plans for products (prod_*)
      // This ensures resources with products have their plans synced
      // Check both: products from API and resources in DB
      console.log(`[UPDATE-SYNC] 🔍 Checking for missing plans in resources with products...`);
      
      // Get all resources with products (prod_*) from database
      const resourcesWithProducts = currentResources.filter(
        (r: any) => r.whopProductId?.startsWith('prod_') ?? false
      );

      const missingPlansCheckPromises = resourcesWithProducts.map(async (resource: any) => {
        const productId = resource.whopProductId;
        if (!productId) return;

        try {
          // Try to get product data from API response first
          const productFromApi = whopProductsMap.get(productId);
          
          // Use consolidated helper to check and sync plans
          const result = await ensurePlansExistForProduct(
            productId,
            resource.id,
            user.experience.id,
            productFromApi?.plans,
          );
          
          if (result.synced) {
            console.log(`[UPDATE-SYNC] ⚠️ Synced ${result.planCount} plans for product ${productId} (resource ${resource.id})`);
          } else {
            console.log(`[UPDATE-SYNC] ✅ Plans already exist for product ${productId} (${result.planCount} plans found)`);
          }
        } catch (error) {
          console.error(`[UPDATE-SYNC] Error checking/syncing plans for product ${productId}:`, error);
          // Don't throw - continue with other products
        }
      });

      await Promise.all(missingPlansCheckPromises);
      console.log(`[UPDATE-SYNC] ✅ Completed missing plans check for ${resourcesWithProducts.length} products`);

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
        const productsWithIds = await db.query.resources.findMany({
          where: and(
            eq(resources.experienceId, user.experience.id),
            isNotNull(resources.whopProductId)
          ),
        });

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

  /**
   * Fetch apps from Whop API
   */
  private async fetchWhopApps(whopClient: any, companyId: string): Promise<WhopApp[]> {
    try {
      const installedApps = await whopClient.getInstalledApps();
      console.log(`[UPDATE-SYNC] 🔍 Fetched ${installedApps.length} installed apps from Whop API`);
      
      // Get current experience to exclude it from apps
      const currentExperience = await db.query.experiences.findFirst({
        where: eq(experiences.whopCompanyId, companyId),
        columns: { whopExperienceId: true }
      });

      console.log(`[UPDATE-SYNC] 🔍 Current experience ID: ${currentExperience?.whopExperienceId}`);

      const filteredApps = installedApps.filter((app: WhopApp) => {
        const shouldInclude = app.experienceId !== currentExperience?.whopExperienceId;
        console.log(`[UPDATE-SYNC] 🔍 App "${app.name}" (${app.experienceId}) - ${shouldInclude ? 'INCLUDED' : 'EXCLUDED'}`);
        return shouldInclude;
      });

      console.log(`[UPDATE-SYNC] 🔍 After filtering: ${filteredApps.length} apps (excluded current experience)`);
      
      // Debug: Check app structure for link generation
      if (filteredApps.length > 0) {
        const sampleApp = filteredApps[0];
        console.log(`[UPDATE-SYNC] 🔍 Sample app structure for link generation:`, {
          id: sampleApp.id,
          name: sampleApp.name,
          experienceId: sampleApp.experienceId,
          companyRoute: sampleApp.companyRoute,
          appSlug: sampleApp.appSlug,
          hasRequiredFields: !!(sampleApp.companyRoute || sampleApp.experienceId)
        });
      }
      
      return filteredApps;
    } catch (error) {
      console.error("Error fetching Whop apps:", error);
      return [];
    }
  }

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

