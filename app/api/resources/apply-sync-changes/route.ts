import { NextRequest, NextResponse } from 'next/server';
import { withWhopAuth, type AuthContext } from '@/lib/middleware/whop-auth';
import { getUserContext } from '@/lib/context/user-context';
import { updateProductSync, type UpdateSyncResult, type ProductChange } from '@/lib/sync';
import { createResource } from '@/lib/actions/resource-actions';
import { db } from '@/lib/supabase/db-server';
import { resources } from '@/lib/supabase/schema';
import { eq, and } from 'drizzle-orm';
import { getWhopApiClient } from '@/lib/whop-api-client';
import type { AuthenticatedUser } from '@/lib/context/user-context';

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

    // Process each change
    for (const change of syncResult.changes) {
      try {
        if (change.type === 'created') {
          // Create new resource
          await createResourceFromWhop(user, whopClient, change.whopProductId);
          result.created++;
        } else if (change.type === 'updated') {
          // Update existing resource
          await updateResourceFromWhop(user, whopClient, change.whopProductId);
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
 * Create a new resource from Whop product or app
 */
async function createResourceFromWhop(user: AuthenticatedUser, whopClient: any, whopProductId: string) {
  let product: any = null;
  
  // Check if it's an app (starts with 'app_') or a product (starts with 'prod_')
  if (whopProductId.startsWith('app_')) {
    // It's an app - get from installed apps
    const apps = await whopClient.getInstalledApps();
    product = apps.find((app: any) => app.id === whopProductId);
    
    if (!product) {
      throw new Error(`App ${whopProductId} not found in Whop API`);
    }
    
    // Convert app to product-like structure for consistency
    product = {
      id: product.id,
      title: product.name,
      description: product.description || `Free access to ${product.name}`,
      price: 0, // Apps are always free
      currency: 'usd',
      model: 'free',
      isFree: true,
      discoveryPageUrl: null,
      imageUrl: product.logo || product.bannerImage,
      category: 'other' // Apps don't have categories
    };
  } else {
    // It's a product - get from discovery products
    const products = await whopClient.getCompanyProducts();
    product = products.find((p: any) => p.id === whopProductId);
    
    if (!product) {
      throw new Error(`Product ${whopProductId} not found in Whop API`);
    }
  }
  
  // Determine category based on product price/free status
  const productCategory = product.isFree || product.price === 0 ? "FREE_VALUE" : "PAID";
  
  // Generate product link
  let trackingUrl: string;
  
  if (whopProductId.startsWith('app_')) {
    // For apps, generate app URL
    trackingUrl = whopClient.generateAppUrl(product, undefined, true);
  } else {
    // For products, use discovery page URL or fallback
    if (product.discoveryPageUrl) {
      trackingUrl = product.discoveryPageUrl;
    } else {
      // Fallback to simple checkout link
      trackingUrl = `https://whop.com/checkout/${product.id}`;
    }
  }
  
  // Generate placeholder image if no logo available
  const productImage = product.imageUrl || 
    'https://img-v2-prod.whop.com/dUwgsAK0vIQWvHpc6_HVbZ345kdPfToaPdKOv9EY45c/plain/https://assets-2-prod.whop.com/uploads/user_16843562/image/experiences/2025-10-24/e6822e55-e666-43de-aec9-e6e116ea088f.webp';
  
  // Format price for database storage
  const formattedPrice = product.price > 0 ? product.price.toString() : null;
  
  // Skip products with empty names
  if (!product.title || !product.title.trim()) {
    throw new Error(`Product ${whopProductId} has empty name`);
  }

  // Use the same createResource action as trigger-product-sync
  const resource = await createResource(user, {
    name: product.title.trim(),
    type: "MY_PRODUCTS",
    category: productCategory,
    link: trackingUrl,
    description: product.description,
    whopProductId: product.id,
    productApps: productCategory === "FREE_VALUE" ? [] : undefined,
    image: productImage,
    price: formattedPrice
  });
  
  return resource;
}

/**
 * Update an existing resource from Whop product or app
 */
async function updateResourceFromWhop(user: AuthenticatedUser, whopClient: any, whopProductId: string) {
  let product: any = null;
  
  // Check if it's an app (starts with 'app_') or a product (starts with 'prod_')
  if (whopProductId.startsWith('app_')) {
    // It's an app - get from installed apps
    const apps = await whopClient.getInstalledApps();
    product = apps.find((app: any) => app.id === whopProductId);
    
    if (!product) {
      throw new Error(`App ${whopProductId} not found in Whop API`);
    }
    
    // Convert app to product-like structure for consistency
    product = {
      id: product.id,
      title: product.name,
      description: product.description || `Free access to ${product.name}`,
      price: 0, // Apps are always free
      currency: 'usd',
      model: 'free',
      isFree: true,
      discoveryPageUrl: null,
      imageUrl: product.logo || product.bannerImage,
      category: 'other' // Apps don't have categories
    };
  } else {
    // It's a product - get from discovery products
    const products = await whopClient.getCompanyProducts();
    product = products.find((p: any) => p.id === whopProductId);
    
    if (!product) {
      throw new Error(`Product ${whopProductId} not found in Whop API`);
    }
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
  
  if (whopProductId.startsWith('app_')) {
    // For apps, generate app URL
    trackingUrl = whopClient.generateAppUrl(product, undefined, true);
  } else {
    // For products, use discovery page URL or fallback
    if (product.discoveryPageUrl) {
      trackingUrl = product.discoveryPageUrl;
    } else {
      // Fallback to simple checkout link
      trackingUrl = `https://whop.com/checkout/${product.id}`;
    }
  }
  
  // Generate placeholder image if no logo available
  const productImage = product.imageUrl || 
    'https://img-v2-prod.whop.com/dUwgsAK0vIQWvHpc6_HVbZ345kdPfToaPdKOv9EY45c/plain/https://assets-2-prod.whop.com/uploads/user_16843562/image/experiences/2025-10-24/e6822e55-e666-43de-aec9-e6e116ea088f.webp';
  
  // Format price for database storage
  const formattedPrice = product.price > 0 ? product.price.toString() : null;
  
  // Skip products with empty names
  if (!product.title || !product.title.trim()) {
    throw new Error(`Product ${whopProductId} has empty name`);
  }

  // Update the resource in database
  await db.update(resources)
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
