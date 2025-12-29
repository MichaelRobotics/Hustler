import { NextRequest, NextResponse } from 'next/server';
import { withWhopAuth, type AuthContext } from '@/lib/middleware/whop-auth';
import { getUserContext } from '@/lib/context/user-context';
import { updateProductSync, type UpdateSyncResult, type ProductChange } from '@/lib/sync';
import { createResource, type CreateResourceInput } from '@/lib/actions/resource-actions';
import { db } from '@/lib/supabase/db-server';
import { resources } from '@/lib/supabase/schema';
import { eq, and } from 'drizzle-orm';
import { getWhopApiClient } from '@/lib/whop-api-client';
import { whopSdk } from '@/lib/whop-sdk';
import type { AuthenticatedUser } from '@/lib/context/user-context';
import { upsertPlansForProduct, getPlansForProduct } from '@/lib/actions/plan-actions';
import { updateResource } from '@/lib/actions/resource-actions';

/**
 * Apply specific changes detected by update sync
 */
async function applySpecificChanges(user: AuthenticatedUser, syncResult: UpdateSyncResult) {
  const result = {
    created: 0,
    updated: 0,
    deleted: 0,
    errorCount: 0,
    errors: [] as string[],
  };

  try {
    // Get Whop API client
    const whopClient = getWhopApiClient(user.experience.whopCompanyId, user.whopUserId);
    console.log(`[API] 🔍 Using WhopApiClient for company: ${user.experience.whopCompanyId}, user: ${user.whopUserId}`);

    // Fetch all data once to avoid caching issues
    console.log(`[API] 🔍 Fetching all products once to avoid caching issues...`);
    const allProductsRaw = await whopClient.getCompanyProducts();
    // Additional filter to ensure archived products are excluded
    const allProducts = allProductsRaw.filter((product: any) => {
      if (product.visibility === 'archived') {
        console.log(`[API] ⚠️ Filtering out archived product: "${product.title || product.name}" (${product.id})`);
        return false;
      }
      return true;
    });
    console.log(`[API] ✅ Fetched ${allProducts.length} products (${allProductsRaw.length - allProducts.length} archived filtered out)`);

    // Process each change
    for (const change of syncResult.changes) {
      try {
        if (change.type === 'created') {
          // Create new resource (plan sync is handled inside createResourceFromWhop)
          await createResourceFromWhop(user, whopClient, change.whopProductId, allProducts);
          result.created++;
        } else if (change.type === 'updated') {
          // Update existing resource (plan sync is handled inside updateResourceFromWhop)
          await updateResourceFromWhop(user, whopClient, change.whopProductId, allProducts);
          result.updated++;
        } else if (change.type === 'deleted') {
          // Delete resource
          await deleteResource(user, change.whopProductId);
          result.deleted++;
        }
      } catch (error) {
        result.errorCount++;
        result.errors.push(`Failed to ${change.type} ${change.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        console.error(`[API] Error processing ${change.type} for ${change.name}:`, error);
      }
    }

    return result;
  } catch (error) {
    console.error('[API] Error in applySpecificChanges:', error);
    throw error;
  }
}

/**
 * Create a new resource from Whop product
 * Note: Apps are no longer supported - only products are synced
 */
async function createResourceFromWhop(user: AuthenticatedUser, whopClient: any, whopProductId: string, allProducts: any[]) {
  // Only handle products, not apps
  if (whopProductId.startsWith('app_')) {
    throw new Error(`App sync is no longer supported. Only products (prod_*) can be synced.`);
  }
  
    // It's a product - use pre-fetched products data
    console.log(`[API] 🔍 Using pre-fetched ${allProducts.length} products data`);
  const product = allProducts.find((p: any) => p.id === whopProductId);
    
    if (!product) {
      throw new Error(`Product ${whopProductId} not found in Whop API`);
  }
  
  // Determine category based on product price/free status
  const productCategory = product.isFree || product.price === 0 ? "FREE_VALUE" : "PAID";
  
  // Generate product link
  let trackingUrl: string;
  
    // For products, use discovery page URL or fallback
    if (product.discoveryPageUrl) {
      trackingUrl = product.discoveryPageUrl;
    } else {
      // Fallback to simple checkout link
      trackingUrl = `https://whop.com/checkout/${product.id}`;
  }
  
  // Fetch product image from Whop SDK galleryImages ONLY
  const defaultPlaceholder = 'https://assets-2-prod.whop.com/uploads/user_16843562/image/experiences/2025-10-24/e6822e55-e666-43de-aec9-e6e116ea088f.webp';
  let productImage = defaultPlaceholder;
  
    // For products, fetch from galleryImages using Whop SDK
    try {
      const productResult = await whopSdk.accessPasses.getAccessPass({
        accessPassId: whopProductId,
      });
      
      if (productResult.galleryImages?.nodes && productResult.galleryImages.nodes.length > 0) {
        const firstImage = productResult.galleryImages.nodes[0];
        if (firstImage?.source?.url) {
          productImage = firstImage.source.url;
          console.log(`✅ [API] Fetched product image from galleryImages for ${product.title}`);
        } else {
          console.log(`⚠️ [API] galleryImages found but no source.url for ${product.title}, using placeholder`);
        }
      } else {
        console.log(`⚠️ [API] No galleryImages found for ${product.title}, using placeholder`);
      }
    } catch (imageError) {
      // Use placeholder if SDK fetch fails
      console.warn(`⚠️ [API] Failed to fetch product image for ${product.title}, using placeholder:`, imageError);
  }
  
  // Format price for database storage
  const formattedPrice = product.price > 0 ? product.price.toString() : null;
  
  // Skip products with empty names
  if (!product.title || !product.title.trim()) {
    throw new Error(`Product ${whopProductId} has empty name`);
  }

  // Handle duplicate names intelligently
  let resourceName = product.title.trim();
  
  // Check if a resource with this name already exists
  const existingResourceWithSameName = await db.query.resources.findFirst({
    where: and(
      eq(resources.experienceId, user.experience.id),
      eq(resources.name, resourceName)
    ),
  });
  
  // If name exists, try different strategies to make it unique
  if (existingResourceWithSameName) {
    // Strategy 1: Add product type suffix
    resourceName = `${product.title.trim()} (Product)`;
    
    // Check if this name is also taken
    const existingWithType = await db.query.resources.findFirst({
      where: and(
        eq(resources.experienceId, user.experience.id),
        eq(resources.name, resourceName)
      ),
    });
    
    // Strategy 2: Add short product ID if type suffix is also taken
    if (existingWithType) {
      resourceName = `${product.title.trim()} (${whopProductId.slice(-6)})`;
      console.log(`[API] Name conflict with type suffix, using ID suffix: "${resourceName}"`);
    } else {
      console.log(`[API] Name conflict detected, using type suffix: "${resourceName}"`);
    }
  }

  // Use the same createResource action as trigger-product-sync
  console.log(`[API] 🔍 About to create resource with link: ${trackingUrl}`);
  console.log(`[API] 🔍 Full createResource input:`, {
    name: resourceName,
    type: "WHOP",
    category: productCategory,
    link: trackingUrl,
    description: product.description,
    whopProductId: product.id,
    productApps: productCategory === "FREE_VALUE" ? [] : undefined,
    image: productImage,
    price: formattedPrice
  });
  const resourceInput: CreateResourceInput = {
    name: resourceName,
    type: "WHOP",
    category: productCategory,
    link: trackingUrl,
    description: product.description,
    whopProductId: product.id,
    productApps: productCategory === "FREE_VALUE" ? [] : undefined,
    image: productImage,
    price: formattedPrice
  };
  const resource = await createResource(user, resourceInput);
  console.log(`[API] ✅ Created resource with link: ${resource.link}`);
  
  // Sync plans for products (prod_*)
  if (whopProductId.startsWith('prod_')) {
    try {
      console.log(`[API] Syncing plans for product ${whopProductId}, plans count: ${product.plans?.length || 0}`);
      await upsertPlansForProduct(
        whopProductId,
        resource.id,
        user.experience.id,
        product.plans,
      );
      
      // After plans are synced, set default plan (lowest price)
      const productPlans = await getPlansForProduct(whopProductId, user.experience.id);
      if (productPlans.length > 0) {
        // Helper function to get effective price for a plan
        const getEffectivePrice = (plan: any) => {
          if (plan.planType === 'renewal' && plan.renewalPrice && parseFloat(plan.renewalPrice) !== 0) {
            return parseFloat(plan.renewalPrice);
          }
          return parseFloat(plan.initialPrice || "999999");
        };
        
        // Find plan with lowest price
        const lowestPricePlan = productPlans.reduce((lowest: any, plan: any) => {
          const lowestPrice = getEffectivePrice(lowest);
          const currentPrice = getEffectivePrice(plan);
          return currentPrice < lowestPrice ? plan : lowest;
        });
        
        // Determine the price to use for the resource
        const resourcePrice = lowestPricePlan.planType === 'renewal' && lowestPricePlan.renewalPrice && parseFloat(lowestPricePlan.renewalPrice) !== 0
          ? lowestPricePlan.renewalPrice
          : (lowestPricePlan.initialPrice || undefined);
        
        // Update resource with default plan
        await updateResource(user, resource.id, {
          planId: lowestPricePlan.planId,
          purchaseUrl: lowestPricePlan.purchaseUrl || undefined,
          price: resourcePrice,
        });
        console.log(`[API] Set default plan ${lowestPricePlan.planId} for resource ${resource.id}`);
      }
    } catch (error) {
      console.error(`[API] Error syncing plans for product ${whopProductId}:`, error);
      // Don't throw - resource creation succeeded even if plan sync failed
    }
  }
  
  return resource;
}

/**
 * Update an existing resource from Whop product
 * Note: Apps are no longer supported - only products are synced
 */
async function updateResourceFromWhop(user: AuthenticatedUser, whopClient: any, whopProductId: string, allProducts: any[]) {
  // Only handle products, not apps
  if (whopProductId.startsWith('app_')) {
    throw new Error(`App sync is no longer supported. Only products (prod_*) can be synced.`);
  }
  
    // It's a product - use pre-fetched products data
    console.log(`[API] 🔍 Using pre-fetched ${allProducts.length} products data`);
  const product = allProducts.find((p: any) => p.id === whopProductId);
    
    if (!product) {
      throw new Error(`Product ${whopProductId} not found in Whop API`);
  }

  // Find the existing resource
  const existingResource = await db.query.resources.findFirst({
    where: and(
      eq(resources.whopProductId, whopProductId),
      eq(resources.experienceId, user.experience.id)
    ),
  });

  if (!existingResource) {
    throw new Error(`Resource with whopProductId ${whopProductId} not found in database`);
  }

  // Determine category based on product price/free status
  const productCategory = product.isFree || product.price === 0 ? "FREE_VALUE" : "PAID";
  
  // Generate product link
  let trackingUrl: string;
  
    // For products, use discovery page URL or fallback
    if (product.discoveryPageUrl) {
      trackingUrl = product.discoveryPageUrl;
    } else {
      // Fallback to simple checkout link
      trackingUrl = `https://whop.com/checkout/${product.id}`;
  }
  
  // Fetch product image from Whop SDK galleryImages ONLY
  const defaultPlaceholder = 'https://assets-2-prod.whop.com/uploads/user_16843562/image/experiences/2025-10-24/e6822e55-e666-43de-aec9-e6e116ea088f.webp';
  let productImage = defaultPlaceholder;
  
    // For products, fetch from galleryImages using Whop SDK
    try {
      const productResult = await whopSdk.accessPasses.getAccessPass({
        accessPassId: whopProductId,
      });
      
      if (productResult.galleryImages?.nodes && productResult.galleryImages.nodes.length > 0) {
        const firstImage = productResult.galleryImages.nodes[0];
        if (firstImage?.source?.url) {
          productImage = firstImage.source.url;
          console.log(`✅ [API] Fetched product image from galleryImages for ${product.title}`);
        } else {
          console.log(`⚠️ [API] galleryImages found but no source.url for ${product.title}, using placeholder`);
        }
      } else {
        console.log(`⚠️ [API] No galleryImages found for ${product.title}, using placeholder`);
      }
    } catch (imageError) {
      // Use placeholder if SDK fetch fails
      console.warn(`⚠️ [API] Failed to fetch product image for ${product.title}, using placeholder:`, imageError);
  }
  
  // Format price for database storage
  const formattedPrice = product.price > 0 ? product.price.toString() : null;
  
  // Skip products with empty names
  if (!product.title || !product.title.trim()) {
    throw new Error(`Product ${whopProductId} has empty name`);
  }

  // Update the resource in database
  console.log(`[API] Updating resource ${existingResource.id} with new data:`, {
    name: product.title.trim(),
    category: productCategory,
    link: trackingUrl,
    description: product.description,
    image: productImage,
    price: formattedPrice,
  });
  
  const updateResult = await db.update(resources)
    .set({
      name: product.title.trim(),
      category: productCategory,
      link: trackingUrl,
      description: product.description,
      image: productImage,
      price: formattedPrice,
      updatedAt: new Date(),
    })
    .where(eq(resources.id, existingResource.id));
  
  console.log(`[API] Resource update result:`, updateResult);
  
  // Sync plans for products (prod_*)
  if (whopProductId.startsWith('prod_')) {
    try {
      console.log(`[API] Syncing plans for product ${whopProductId} (update), plans count: ${product.plans?.length || 0}`);
      await upsertPlansForProduct(
        whopProductId,
        existingResource.id,
        user.experience.id,
        product.plans,
      );
    } catch (error) {
      console.error(`[API] Error syncing plans for product ${whopProductId}:`, error);
      // Don't throw - resource update succeeded even if plan sync failed
    }
  }
  
  return existingResource;
}

/**
 * Delete a resource
 */
async function deleteResource(user: AuthenticatedUser, whopProductId: string) {
  // Find and delete the resource
  const resource = await db.query.resources.findFirst({
    where: and(
      eq(resources.whopProductId, whopProductId),
      eq(resources.experienceId, user.experience.id)
    ),
  });

  if (resource) {
    await db.delete(resources).where(eq(resources.id, resource.id));
  }
}

export const POST = withWhopAuth(async (request: NextRequest, context: AuthContext) => {
  try {
    const { user } = context;
    console.log('[API] Apply sync changes request received for user:', user.userId);
    
    // Validate experience ID is provided
    if (!user.experienceId) {
      return NextResponse.json(
        { error: "Experience ID is required" },
        { status: 400 },
      );
    }
    
    // Get the full user context from the simplified auth
    const userContext = await getUserContext(
      user.userId,
      "", // whopCompanyId is optional for experience-based isolation
      user.experienceId,
      false, // forceRefresh
      // Don't pass access level - let it be determined from Whop API
    );

    if (!userContext) {
      return NextResponse.json(
        { error: "User context not found" },
        { status: 401 },
      );
    }

    // Get the sync changes from request body
    const { syncResult } = await request.json();
    
    if (!syncResult || !syncResult.hasChanges) {
      return NextResponse.json(
        { error: "No changes to apply" },
        { status: 400 },
      );
    }

    console.log('[API] Applying sync changes:', {
      created: syncResult.summary.created,
      updated: syncResult.summary.updated,
      deleted: syncResult.summary.deleted,
      total: syncResult.summary.total,
    });

    // Apply the specific changes detected by update sync
    const result = await applySpecificChanges(userContext.user, syncResult);

    console.log('[API] Sync changes applied successfully:', {
      created: result.created,
      updated: result.updated,
      deleted: result.deleted,
      errorCount: result.errorCount,
    });
    
    return NextResponse.json({
      success: true,
      message: 'Sync changes applied successfully',
      result: {
        created: result.created,
        updated: result.updated,
        deleted: result.deleted,
        errorCount: result.errorCount,
        errors: result.errors,
      }
    });
  } catch (error) {
    console.error('[API] Apply sync changes error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to apply sync changes',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
});
