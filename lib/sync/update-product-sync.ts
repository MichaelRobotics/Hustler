/**
 * Update Product Sync System
 * 
 * This module handles checking for product/app updates without applying changes.
 * It compares current database state with Whop API data and reports differences.
 */

import { and, eq, isNotNull } from "drizzle-orm";
import type { AuthenticatedUser } from "../context/user-context";
import { db } from "../supabase/db-server";
import { experiences, resources, users } from "../supabase/schema";
import { getWhopApiClient, type WhopProduct as ApiWhopProduct, type WhopApp } from "../whop-api-client";
import { updateOriginTemplateFromProduct, shouldUpdateOriginTemplate, shouldCreateOriginTemplate, createOriginTemplateFromProduct } from "../services/origin-template-service";
import { whopSdk } from "../whop-sdk";

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
          eq(resources.type, "MY_PRODUCTS"),
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

      // Create maps for easy lookup
      const currentResourcesMap = new Map(
        currentResources.map((r: any) => [r.whopProductId, r])
      );

      const whopProductsMap = new Map(
        whopProducts.map(p => [p.id, p])
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
        // Get first product with whopProductId to check company data
        const firstProduct = await db.query.resources.findFirst({
          where: and(
            eq(resources.experienceId, user.experience.id),
            eq(resources.type, "MY_PRODUCTS"),
            isNotNull(resources.whopProductId)
          ),
        });

        if (firstProduct?.whopProductId) {
          // Check if origin template should be created (doesn't exist yet)
          const shouldCreate = await shouldCreateOriginTemplate(experienceId);
          if (shouldCreate) {
            console.log(`[UPDATE-SYNC] 📦 Creating origin template for experience ${experienceId}...`);
            try {
              const originTemplate = await createOriginTemplateFromProduct(experienceId, firstProduct.whopProductId);
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
                accessPassId: firstProduct.whopProductId,
              });
              if (productResult) {
                const shouldUpdate = await shouldUpdateOriginTemplate(experienceId, productResult);
                if (shouldUpdate) {
                  console.log(`[UPDATE-SYNC] 📦 Updating origin template for company logo/banner changes...`);
                  await updateOriginTemplateFromProduct(experienceId, firstProduct.whopProductId);
                  console.log(`[UPDATE-SYNC] ✅ Origin template updated successfully`);
                }
              }
            } catch (error) {
              console.error(`[UPDATE-SYNC] ⚠️ Error fetching product data for origin template update:`, error);
            }
          }
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
      
      return apiProducts.map((product: ApiWhopProduct) => ({
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

    // Check price changes - normalize prices to avoid "100" vs "100.00" false positives
    const currentPrice = currentResource.price || '';
    const newPrice = whopProduct.price > 0 ? whopProduct.price.toString() : '';
    
    // Normalize prices by parsing as numbers and comparing
    const currentPriceNum = parseFloat(currentPrice) || 0;
    const newPriceNum = parseFloat(newPrice) || 0;
    
    if (currentPriceNum !== newPriceNum) {
      changes.price = {
        old: currentPrice,
        new: newPrice,
      };
    }

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

