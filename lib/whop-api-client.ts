import { whopSdk } from '@/lib/whop-sdk';
import Whop from '@whop/sdk';

// App type classification based on name patterns
function classifyAppType(appName: string): 'earn' | 'learn' | 'community' | 'other' {
  const name = appName.toLowerCase();
  
  // Learning/Educational apps
  if (name.includes('course') || name.includes('learn') || name.includes('education') || 
      name.includes('tutorial') || name.includes('training') || name.includes('guide')) {
    return 'learn';
  }
  
  // Earning/Monetization apps
  if (name.includes('earn') || name.includes('money') || name.includes('revenue') || 
      name.includes('profit') || name.includes('income') || name.includes('rewards') || 
      name.includes('bounties') || name.includes('giveaway') || name.includes('discount')) {
    return 'earn';
  }
  
  // Community/Social apps
  if (name.includes('community') || name.includes('social') || name.includes('chat') || 
      name.includes('forum') || name.includes('discord') || name.includes('group')) {
    return 'community';
  }
  
  return 'other';
}

export interface WhopProduct {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  model: 'free' | 'one-time' | 'recurring';
  includedApps: any[];
  plans: Array<{
    id: string;
    price: number;
    currency: string;
    title: string;
    plan_type?: string;
    renewal_price?: number;
    billing_period?: number;
  }>;
  visibility: 'visible' | 'hidden' | 'archived' | 'quick_link';
  discoveryPageUrl?: string;
  checkoutUrl?: string;
  route?: string;
  verified?: boolean;
  activeUsersCount?: number;
  reviewsAverage?: number;
  logo?: string;
  bannerImage?: string;
  isFree: boolean;
  status?: string;
  category?: string;
  tags?: string[];
  imageUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface WhopApp {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  discoveryPageUrl?: string;
  checkoutUrl?: string;
  route?: string;
  experienceId?: string;
  companyRoute?: string;
  appSlug?: string;
  logo?: string;
  bannerImage?: string;
  category?: string; // Marketplace category from Whop SDK
}

/**
 * WhopApiClient - Handles all Whop API interactions
 * Provides caching, retry strategies, and rate limiting
 */
export class WhopApiClient {
  private companyId: string;
  private userId: string;
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(companyId: string, userId: string) {
    this.companyId = companyId;
    this.userId = userId;
  }

  /**
   * Get INSTALLED APPS using SDK methods
   * These are apps that are already installed in the company
   */
  async getInstalledApps(): Promise<WhopApp[]> {
    console.log(`🔍 Getting INSTALLED APPS for company ${this.companyId}...`);
    
    try {
      console.log("🔍 Getting installed apps using SDK methods...");
      
      // MULTIPLE RETRY STRATEGY: Try different approaches
      // Reduced timeouts to prevent blocking user context loading
      const strategies = [
        { name: "Ultra-fast", timeout: 2000, first: 10 },
        { name: "Fast", timeout: 5000, first: 20 },
        { name: "Standard", timeout: 8000, first: 50 } // Reduced from 10000 to 8000
      ];
      
      for (const strategy of strategies) {
        try {
          console.log(`🔍 Trying ${strategy.name} strategy (${strategy.timeout}ms timeout, first: ${strategy.first})...`);
          
          // Use proper SDK method - whopSdk.experiences.listExperiences (not companies.listExperiences)
          const experiencesResult = await Promise.race([
            whopSdk.experiences.listExperiences({
              companyId: this.companyId, // Required by the API
              first: strategy.first,
              onAccessPass: false
            }),
            new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error("API timeout")), strategy.timeout)
            )
          ]);
          
          const experiences = experiencesResult?.experiencesV2?.nodes || [];
          console.log(`✅ ${strategy.name} strategy succeeded! Found ${experiences.length} experiences`);
          
          if (experiences.length > 0) {
            // Get company route for discovery page URLs
            const companyRoute = await this.getCompanyRoute();
            
            const apps = experiences.map((exp: any) => {
              // Generate a slug from the app name and experience ID
              const rawAppName = exp.app?.name || exp.name || 'app';
              const appName = rawAppName
                .toLowerCase()
                .replace(/[^a-z0-9]/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '');
              
              const experienceIdSuffix = exp.id?.replace('exp_', '') || '';
              const experienceSlug = `${appName}-${experienceIdSuffix}`;
              
              console.log(`🔍 [App Slug Generation] Raw app name: "${rawAppName}" → Slug: "${appName}"`);
              console.log(`🔍 [App Slug Generation] Experience ID: "${exp.id}" → Suffix: "${experienceIdSuffix}"`);
              console.log(`🔍 [App Slug Generation] Final slug: "${experienceSlug}"`);
              
              const app = {
                id: exp.app?.id || exp.id,
                name: exp.app?.name || exp.name,
                description: exp.app?.description || exp.description, // Try app description first, then experience description
                price: 0,
                currency: 'usd',
                discoveryPageUrl: undefined,
                checkoutUrl: undefined,
                route: undefined, // Apps don't have custom routes
                experienceId: exp.id, // Store the experience ID for this app installation
                companyRoute: companyRoute || undefined, // Company route for URL generation
                appSlug: experienceSlug, // Generated experience slug
                bannerImage: exp.bannerImage?.sourceUrl || undefined
              };
              
              // Debug: Log app URL generation data
              console.log(`🔍 App "${app.name}" URL generation data:`, {
                experienceId: app.experienceId,
                companyRoute: app.companyRoute,
                appSlug: app.appSlug,
                companyId: this.companyId,
                hasCompanyRoute: !!app.companyRoute,
                hasExperienceId: !!app.experienceId
              });
              
              return app;
            });
            
            console.log(`✅ Mapped to ${apps.length} installed apps from API`);
            
            // INVESTIGATION: Log final app structure to see what fields we have
            if (apps.length > 0) {
              console.log(`🔍 INVESTIGATION: Final app object structure:`);
              console.log(JSON.stringify(apps[0], null, 2));
              console.log(`🔍 INVESTIGATION: App object keys:`, Object.keys(apps[0]));
              
              // INVESTIGATION: Check for potential app type fields
              const app = apps[0] as any;
              console.log(`🔍 INVESTIGATION: Potential app type fields:`);
              console.log(`  - category: ${app.category || 'NOT FOUND'}`);
              console.log(`  - type: ${app.type || 'NOT FOUND'}`);
              console.log(`  - tags: ${app.tags || 'NOT FOUND'}`);
              console.log(`  - businessModel: ${app.businessModel || 'NOT FOUND'}`);
              console.log(`  - appStoreCategory: ${app.appStoreCategory || 'NOT FOUND'}`);
              console.log(`  - appType: ${app.appType || 'NOT FOUND'}`);
              
              // INVESTIGATION: Test name-based classification
              const classifiedType = classifyAppType(app.name);
              console.log(`🔍 INVESTIGATION: Name-based classification for "${app.name}": ${classifiedType}`);
            }
            
            return apps;
          }
          
        } catch (strategyError) {
          console.log(`❌ ${strategy.name} strategy failed:`, strategyError instanceof Error ? strategyError.message : String(strategyError));
          continue; // Try next strategy
        }
      }
      
      // If all strategies failed, return empty array instead of throwing
      // This prevents blocking user context loading
      console.warn("⚠️ All API strategies failed for getInstalledApps, returning empty array");
      console.log("⚠️ No FREE apps will be created");
      return [];
      
    } catch (error) {
      // Catch any unexpected errors and return empty array to prevent blocking
      console.error("❌ Error fetching installed apps:", error);
      console.log("⚠️ No FREE apps will be created");
      return [];
    }
  }

  /**
   * Get DISCOVERY PAGE PRODUCTS using direct Whop SDK API
   * These are the actual products customers can buy for PAID upsells
   */
  async getCompanyProducts(): Promise<WhopProduct[]> {
    console.log(`🔍 Getting DISCOVERY PAGE PRODUCTS for company ${this.companyId} using direct SDK API...`);
    
    try {
      // Create Whop SDK client
      const client = new Whop({
        appID: process.env.NEXT_PUBLIC_WHOP_APP_ID!,
        apiKey: process.env.WHOP_API_KEY!,
      });

      console.log("🔍 Step 1: Fetching all plans...");
      const plans: any[] = [];
      for await (const planListResponse of client.plans.list({ company_id: this.companyId })) {
        plans.push(planListResponse);
      }
      console.log(`✅ Found ${plans.length} plans`);
      
      // DEBUG: Log only visible/hidden plans with visibility field
      const visibleHiddenPlans = plans.filter(p => p.visibility === 'visible' || p.visibility === 'hidden');
      console.log(`🔍 DEBUG - Visible/Hidden plans fetched (${visibleHiddenPlans.length}/${plans.length}):`, visibleHiddenPlans.map(p => ({
        id: p.id,
        visibility: p.visibility,
        initial_price: p.initial_price,
        renewal_price: p.renewal_price,
        currency: p.currency,
        title: p.title,
        plan_type: p.plan_type,
        product_id: p.product?.id,
        product_name: p.product?.title || 'Unknown Product'
      })));

      console.log("🔍 Step 2: Fetching all products (regular type only)...");
      const products: any[] = [];
      for await (const productListItem of client.products.list({ 
        company_id: this.companyId,
        product_types: ["regular"]
      })) {
        products.push(productListItem);
      }
      console.log(`✅ Found ${products.length} regular products`);
      
      // DEBUG: Log all products with visibility
      console.log(`🔍 DEBUG - All products fetched:`, products.map(p => ({
        id: p.id,
        name: p.title || 'Unnamed Product',
        visibility: p.visibility || 'visible',
        status: p.status || 'active'
      })));
      
      // Create a Set of regular product IDs for efficient lookup
      const regularProductIds = new Set(products.map(p => p.id));
      
      // Filter out products that don't have proper product associations
      // Only check for plans with visibility 'visible' or 'hidden' AND whose product is in our regular products list
      const validProducts = products.filter(product => {
        // Only include products that have at least one visible/hidden plan associated with them
        // AND the plan's product must be a regular product (in our filtered list)
        const hasAssociatedPlans = plans.some(plan => 
          plan.product?.id === product.id &&
          regularProductIds.has(plan.product.id) && // Ensure plan's product is a regular product
          (plan.visibility === 'visible' || plan.visibility === 'hidden')
        );
        if (!hasAssociatedPlans) {
          console.log(`⚠️ Filtering out product "${product.title}" (${product.id}) - no visible/hidden associated plans with regular product type`);
        }
        return hasAssociatedPlans;
      });
      
      console.log(`🔍 Filtered products: ${validProducts.length}/${products.length} (excluded products without visible/hidden plans)`);

      // Filter products by visibility - include visible, hidden, and quick_link (exclude only archived)
      const visibleProducts = validProducts.filter(product => {
        const isArchived = product.visibility === 'archived';
        if (isArchived) {
          console.log(`🔍 [getCompanyProducts] ⚠️ Filtering out archived product: "${product.title}" (${product.id})`);
        }
        return product.visibility === 'visible' || product.visibility === 'hidden' || product.visibility === 'quick_link';
      });
      console.log(`🔍 Filtered products: ${visibleProducts.length}/${validProducts.length} (excluded only archived)`);
      
      // DEBUG: Log product names
      console.log(`🔍 DEBUG - Visible/Hidden/QuickLink products:`, visibleProducts.map(p => ({
        id: p.id,
        name: p.title || 'Unnamed Product',
        visibility: p.visibility
      })));
      
      // Use all visible products (no filtering)
      const finalProducts = visibleProducts;
      
      console.log(`🔍 Final products: ${finalProducts.length}/${visibleProducts.length} (no filtering applied)`);

      // Find plans without matching products and create products from them
      // Only use plans with visible/hidden visibility AND products with non-archived visibility
      // AND only consider plans whose product is a regular product type
      const visibleHiddenPlansForOrphans = plans.filter(p => {
        const planVisibility = p.visibility === 'visible' || p.visibility === 'hidden';
        const productVisibility = p.product?.visibility;
        const isNotArchived = productVisibility !== 'archived';
        const isRegularProduct = p.product?.id && regularProductIds.has(p.product.id);
        return planVisibility && isNotArchived && isRegularProduct;
      });
      const productIds = new Set(finalProducts.map(p => p.id));
      
      const orphanPlans = visibleHiddenPlansForOrphans.filter(plan => {
        const planProductId = plan.product?.id;
        return planProductId && !productIds.has(planProductId);
      });
      
      console.log(`🔍 Found ${orphanPlans.length} plans without matching products`);
      
      // Group orphan plans by product ID
      const orphanPlansByProduct = new Map<string, typeof orphanPlans>();
      orphanPlans.forEach(plan => {
        const productId = plan.product?.id;
        if (productId) {
          if (!orphanPlansByProduct.has(productId)) {
            orphanPlansByProduct.set(productId, []);
          }
          orphanPlansByProduct.get(productId)!.push(plan);
        }
      });
      
      // Create products from orphan plans
      const createdProducts: any[] = [];
      orphanPlansByProduct.forEach((plansForProduct, productId) => {
        const firstPlan = plansForProduct[0];
        const productName = firstPlan.product?.title || 'Unknown Product';
        
        // Verify the product is actually a regular product type by checking if it's in our regular products list
        // If it's not in regularProductIds, it means it wasn't returned from the API with product_types: ["regular"]
        // In that case, we should NOT create a product from its plans
        if (!regularProductIds.has(productId)) {
          console.log(`⚠️ Skipping product creation from plan: "${productName}" (${productId}) - product is not a regular type`);
          return;
        }
        
        // Only create if product name is NOT "Unknown Product" (case insensitive)
        if (productName && productName.toLowerCase() !== 'unknown product') {
          console.log(`🔍 Creating product from plan: "${productName}" (${productId})`);
          
          // Calculate price from plans (prioritize renewal plans)
          const renewalPlansForProduct = plansForProduct.filter(p => p.plan_type === 'renewal');
          const oneTimePlansForProduct = plansForProduct.filter(p => p.plan_type !== 'renewal');
          
          let minPrice = Infinity;
          let currency = 'usd';
          
          if (renewalPlansForProduct.length > 0) {
            renewalPlansForProduct.forEach(plan => {
              const effectivePrice = plan.renewal_price !== undefined && plan.renewal_price !== null 
                ? plan.renewal_price 
                : (plan.initial_price || 0);
              if (effectivePrice < minPrice) {
                minPrice = effectivePrice;
                currency = plan.currency || 'usd';
              }
            });
          } else if (oneTimePlansForProduct.length > 0) {
            oneTimePlansForProduct.forEach(plan => {
              const effectivePrice = plan.initial_price || 0;
              if (effectivePrice < minPrice) {
                minPrice = effectivePrice;
                currency = plan.currency || 'usd';
              }
            });
          }
          
          const isFree = minPrice === 0;
          const finalPrice = isFree ? 0 : minPrice;
          
          // Get purchase URL from plan (prefer first plan with purchase_url, or first plan's purchase_url)
          const planWithPurchaseUrl = plansForProduct.find(plan => plan.purchase_url) || plansForProduct[0];
          const purchaseUrl = planWithPurchaseUrl?.purchase_url || undefined;
          
          // Create product object from plan data
          // Skip if product visibility is archived
          const productVisibility = firstPlan.product?.visibility;
          if (productVisibility === 'archived') {
            console.log(`🔍 [getCompanyProducts] ⚠️ Skipping archived product from orphan plan: "${productName}" (${productId})`);
            return; // Skip creating this product
          }
          
          const safeVisibility = productVisibility || 'visible';
          
          const createdProduct = {
            id: productId,
            title: productName,
            description: firstPlan.description || '',
            visibility: safeVisibility,
            status: 'active',
            price: finalPrice,
            currency: currency,
            isFree: isFree,
            purchaseUrl: purchaseUrl, // Store purchase URL from plan
            plans: plansForProduct.map(plan => ({
              id: plan.id,
              price: plan.plan_type === 'renewal' 
                ? (plan.renewal_price !== undefined && plan.renewal_price !== null ? plan.renewal_price : (plan.initial_price || 0))
                : (plan.initial_price || 0),
              currency: plan.currency || 'usd',
              title: plan.title || `Plan ${plan.id}`,
              plan_type: plan.plan_type,
              initial_price: plan.initial_price,
              renewal_price: plan.renewal_price,
              billing_period: plan.billing_period,
              purchase_url: plan.purchase_url
            }))
          };
          
          createdProducts.push(createdProduct);
          console.log(`✅ Created product "${productName}" from plan with ${plansForProduct.length} plan(s), price: ${finalPrice}`);
        } else {
          console.log(`⚠️ Skipping plan product "${productName}" - has "Unknown Product" name`);
        }
      });
      
      // Add created products to final products list
      // Final safety check: filter out any archived products that might have slipped through
      const allProducts = [...finalProducts, ...createdProducts].filter(product => 
        product.visibility !== 'archived'
      );
      console.log(`🔍 Total products after adding from plans: ${allProducts.length} (${finalProducts.length} existing + ${createdProducts.length} created from plans, archived filtered out)`);

      console.log("🔍 Step 3: Correlating plans with products and getting detailed product data...");
      const correlatedProducts: WhopProduct[] = [];

      for (const product of allProducts) {
        try {
          // Skip archived products (shouldn't happen due to earlier filtering, but safety check)
          if (product.visibility === 'archived') {
            console.log(`🔍 [getCompanyProducts] ⚠️ Skipping archived product during processing: "${product.title}" (${product.id})`);
            continue;
          }
          
          // Get detailed product data (skip if product was created from plan)
          let detailedProduct: any;
          const isCreatedFromPlan = createdProducts.some(cp => cp.id === product.id);
          
          if (isCreatedFromPlan) {
            // Use the created product data directly (no need to fetch from API)
            console.log(`🔍 Using product created from plan: "${product.title}" (${product.id})`);
            detailedProduct = product;
          } else {
            // Get detailed product data from API
            detailedProduct = await client.products.retrieve(product.id);
            
            // Verify the product is a regular type (should be in our regular products list)
            // If it's not, skip it as it shouldn't have been processed
            if (!regularProductIds.has(product.id)) {
              console.log(`🔍 [getCompanyProducts] ⚠️ Skipping non-regular product from API: "${detailedProduct.title}" (${detailedProduct.id})`);
              continue;
            }
            
            // Check if retrieved product is archived
            if (detailedProduct.visibility === 'archived') {
              console.log(`🔍 [getCompanyProducts] ⚠️ Skipping archived product from API: "${detailedProduct.title}" (${detailedProduct.id})`);
              continue;
            }
          }
          
          // Find plans for this product - filter by visibility (only visible and hidden)
          // AND ensure the plan's product is a regular product type
          const productPlans = plans.filter(plan => 
            plan.product?.id === product.id &&
            regularProductIds.has(plan.product.id) && // Ensure plan's product is a regular product
            (plan.visibility === 'visible' || plan.visibility === 'hidden')
          );

          console.log(`🔍 Processing product "${detailedProduct.title}" (${detailedProduct.id}) with ${productPlans.length} plans`);
          
          // DEBUG: Log visible/hidden plans for Profittest (with visibility and renewal_price)
          if (detailedProduct.title === "Profittest") {
            console.log(`🔍 DEBUG Profittest - Visible/Hidden plans found:`, productPlans.map(p => ({
              id: p.id,
              visibility: p.visibility,
              initial_price: p.initial_price,
              renewal_price: p.renewal_price,
              currency: p.currency,
              title: p.title,
              plan_type: p.plan_type,
              product_id: p.product?.id
            })));
          }
          
          // Calculate pricing - prioritize renewal plans, then one-time plans
          // Skip if product was created from plan (already has price calculated)
          let minPrice = Infinity;
          let currency = 'usd';
          let isFree = true;
          
          if (isCreatedFromPlan) {
            // Use pre-calculated price from created product
            minPrice = detailedProduct.price || 0;
            currency = detailedProduct.currency || 'usd';
            isFree = detailedProduct.isFree || minPrice === 0;
            console.log(`🔍 Using pre-calculated price for created product "${detailedProduct.title}": ${minPrice} ${currency}, isFree: ${isFree}`);
          } else if (productPlans.length > 0) {
            // First, check renewal plans and find the cheapest
            const renewalPlans = productPlans.filter(plan => plan.plan_type === 'renewal');
            
            if (renewalPlans.length > 0) {
              console.log(`🔍 Found ${renewalPlans.length} renewal plan(s) - checking for cheapest...`);
              renewalPlans.forEach((plan, index) => {
                // Always prefer renewal_price over initial_price when both exist for renewal plans
                const effectivePrice = plan.renewal_price !== undefined && plan.renewal_price !== null 
                  ? plan.renewal_price 
                  : (plan.initial_price || 0);
                console.log(`  Renewal Plan ${index + 1}: ${plan.id} - renewal_price: ${plan.renewal_price}, initial_price: ${plan.initial_price}, billing_period: ${plan.billing_period} days, effective_price: ${effectivePrice}`);
                
                if (effectivePrice < minPrice) {
                  minPrice = effectivePrice;
                  currency = plan.currency || 'usd';
                }
              });
            } else {
              // If no renewal plans, check one-time plans
              const oneTimePlans = productPlans.filter(plan => plan.plan_type !== 'renewal');
              console.log(`🔍 No renewal plans found, checking ${oneTimePlans.length} one-time plan(s)...`);
              
              oneTimePlans.forEach((plan, index) => {
                const effectivePrice = plan.initial_price || 0;
                console.log(`  One-time Plan ${index + 1}: ${plan.id} - initial_price: ${effectivePrice}, currency: ${plan.currency}`);
                
                if (effectivePrice < minPrice) {
                  minPrice = effectivePrice;
                  currency = plan.currency || 'usd';
                }
              });
            }
            
            isFree = minPrice === 0;
          } else {
            console.log(`⚠️ No plans found for "${detailedProduct.title}" - will be marked as FREE`);
            minPrice = 0;
          }

          const finalPrice = isFree ? 0 : minPrice;
          console.log(`🔍 Final calculation for "${detailedProduct.title}": minPrice=${minPrice}, isFree=${isFree}, finalPrice=${finalPrice}`);

          // Generate URLs
          let discoveryPageUrl: string | undefined;
          let checkoutUrl: string | undefined;
          
          if (isCreatedFromPlan) {
            // For products created from plans, use purchase_url from plan
            discoveryPageUrl = detailedProduct.purchaseUrl || undefined;
            checkoutUrl = detailedProduct.purchaseUrl || undefined;
            console.log(`🔍 Using purchase_url from plan for created product "${detailedProduct.title}": ${discoveryPageUrl}`);
          } else {
            // For regular products, generate URLs from route
            const companyRoute = await this.getCompanyRoute();
            if (companyRoute && detailedProduct.route) {
              discoveryPageUrl = `https://whop.com/${companyRoute}/${detailedProduct.route}/`;
            } else if (detailedProduct.route) {
              discoveryPageUrl = `https://whop.com/${detailedProduct.route}/`;
            }
            checkoutUrl = detailedProduct.route ? `https://whop.com/${detailedProduct.route}/checkout` : undefined;
          }

          console.log(`🔍 PRODUCT ${detailedProduct.title}: ${isFree ? 'FREE' : 'PAID'} ($${finalPrice}) - URL: ${discoveryPageUrl}`);

          // Use plans from created product if available, otherwise from productPlans
          const plansToUse = isCreatedFromPlan && detailedProduct.plans 
            ? detailedProduct.plans 
            : productPlans.map(plan => {
                // Always prefer renewal_price over initial_price when both exist for renewal plans
                let planPrice = 0;
                if (plan.plan_type === 'renewal') {
                  planPrice = plan.renewal_price !== undefined && plan.renewal_price !== null 
                    ? plan.renewal_price 
                    : (plan.initial_price || 0);
                } else {
                  planPrice = plan.initial_price || 0;
                }
                
                return {
                  id: plan.id,
                  price: planPrice,
                  currency: plan.currency || 'usd',
                  title: plan.title || `Plan ${plan.id}`,
                  plan_type: plan.plan_type,
                  initial_price: plan.initial_price,
                  renewal_price: plan.renewal_price,
                  billing_period: plan.billing_period,
                  purchase_url: plan.purchase_url
                };
              });
          
          // Determine model type based on plans
          const hasRenewalPlans = plansToUse.some((p: any) => p.plan_type === 'renewal');
          const modelType = isFree ? 'free' : (hasRenewalPlans ? 'recurring' : 'one-time') as 'free' | 'one-time' | 'recurring';
          
          correlatedProducts.push({
            id: detailedProduct.id,
            title: detailedProduct.title || detailedProduct.headline || `Product ${detailedProduct.id}`,
            description: detailedProduct.description || detailedProduct.headline || '',
            price: finalPrice,
            currency: currency,
            model: modelType,
            includedApps: [],
            plans: plansToUse,
            visibility: (detailedProduct.visibility && detailedProduct.visibility !== 'archived' 
              ? detailedProduct.visibility 
              : 'visible') as 'visible' | 'hidden' | 'archived' | 'quick_link',
            discoveryPageUrl,
            checkoutUrl,
            route: detailedProduct.route,
            verified: detailedProduct.verified,
            activeUsersCount: detailedProduct.member_count,
            reviewsAverage: detailedProduct.published_reviews_count,
            logo: undefined, // Direct SDK API doesn't provide logo in product.retrieve
            bannerImage: undefined, // Direct SDK API doesn't provide bannerImage in product.retrieve  
            imageUrl: undefined, // Direct SDK API doesn't provide imageUrl in product.retrieve
            isFree
          });

        } catch (productError) {
          console.error(`❌ Failed to process product ${product.id}:`, productError);
          continue; // Skip this product and continue with others
        }
      }

      // Final safety check: filter out any archived products
      const finalCorrelatedProducts = correlatedProducts.filter(product => 
        product.visibility !== 'archived'
      );
      
      console.log(`✅ Successfully processed ${finalCorrelatedProducts.length} products using direct SDK API (${correlatedProducts.length - finalCorrelatedProducts.length} archived products filtered out)`);
      
      // INVESTIGATION: Log final product structure
      if (finalCorrelatedProducts.length > 0) {
        console.log(`🔍 INVESTIGATION: Final product object structure:`);
        console.log(JSON.stringify(finalCorrelatedProducts[0], null, 2));
        console.log(`🔍 INVESTIGATION: Product object keys:`, Object.keys(finalCorrelatedProducts[0]));
      }

      return finalCorrelatedProducts;
      
    } catch (error) {
      console.error("❌ Failed to get discovery page products using direct SDK API:", error);
      console.log("⚠️ No PAID upsell products will be created");
      return [];
    }
  }

  /**
   * Get company route for URL generation using direct SDK API
   */
  private async getCompanyRoute(): Promise<string | null> {
    try {
      // Create Whop SDK client
      const client = new Whop({
        appID: process.env.NEXT_PUBLIC_WHOP_APP_ID!,
        apiKey: process.env.WHOP_API_KEY!,
      });

      const company = await client.companies.retrieve(this.companyId);
      return company.route || null;
    } catch (error) {
      console.error("❌ Failed to get company route:", error);
      return null;
    }
  }

  /**
   * Retry API call with exponential backoff and timeout
   */
  private async retryApiCall<T>(
    apiCall: () => Promise<T>,
    operationName: string,
    maxRetries: number = 3,
    timeoutMs: number = 30000 // 30 second timeout per attempt
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔍 ${operationName} attempt ${attempt}/${maxRetries} (timeout: ${timeoutMs}ms)`);
        
        // Add rate limiting delay between attempts
        if (attempt > 1) {
          const rateLimitDelay = 2000; // 2s delay between retries
          console.log(`⏳ Rate limiting: waiting ${rateLimitDelay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, rateLimitDelay));
        }
        
        // Add timeout to prevent hanging
        const result = await Promise.race([
          apiCall(),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error(`${operationName} timeout after ${timeoutMs}ms`)), timeoutMs)
          )
        ]);
        
        console.log(`✅ ${operationName} succeeded on attempt ${attempt}`);
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(`❌ ${operationName} failed on attempt ${attempt}:`, lastError.message);
        
        // Check if it's a rate limit error
        if (lastError.message.includes('rate limit') || lastError.message.includes('429')) {
          console.log(`⚠️ Rate limit detected, increasing delay...`);
          const rateLimitDelay = Math.pow(2, attempt) * 3000; // 6s, 12s, 24s
          console.log(`⏳ Rate limit delay: ${rateLimitDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, rateLimitDelay));
        } else if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
          console.log(`⏳ Retrying ${operationName} in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw new Error(`${operationName} failed after ${maxRetries} attempts. Last error: ${lastError?.message}`);
  }

  /**
   * Get the cheapest plan for a product
   */
  getCheapestPlan(product: WhopProduct): { id: string; price: number; currency: string; title?: string } | null {
    if (!product.plans || product.plans.length === 0) {
      return null;
    }

    const cheapestPlan = product.plans.reduce((cheapest, current) => 
      current.price < cheapest.price ? current : cheapest
    );

    return cheapestPlan;
  }

  /**
   * Generate app URL using company route and experience slug
   * Format: https://whop.com/joined/{companyRoute}/{experienceSlug}/app/
   * Falls back to experience ID if slug not available
   * For FREE apps, no ref or affiliate parameters are added
   * 
   * This URL format is correct for both desktop and mobile:
   * - Desktop: Opens in browser with Whop iframe
   * - Mobile: Should open in Whop mobile app (if properly configured)
   */
  generateAppUrl(app: WhopApp, refId?: string, isFree: boolean = true): string {
    console.log(`🔍 [generateAppUrl] Input app data:`, {
      id: app.id,
      name: app.name,
      experienceId: app.experienceId,
      companyRoute: app.companyRoute,
      appSlug: app.appSlug,
      companyId: this.companyId
    });
    
    // Use company route if available, otherwise fall back to company ID
    const companyIdentifier = app.companyRoute || this.companyId;
    console.log(`🔍 [generateAppUrl] Company identifier: ${companyIdentifier} (from ${app.companyRoute ? 'companyRoute' : 'companyId'})`);
    
    // Use experience slug if available, otherwise fall back to experience ID
    const experienceIdentifier = app.appSlug || app.experienceId;
    console.log(`🔍 [generateAppUrl] Experience identifier: ${experienceIdentifier} (from ${app.appSlug ? 'appSlug' : 'experienceId'})`);
    
    const baseUrl = `https://whop.com/joined/${companyIdentifier}/${experienceIdentifier}/app/`;
    const url = new URL(baseUrl);
    
    // Only add ref parameter for paid apps
    if (refId && !isFree) {
      url.searchParams.set('ref', refId);
    }
    
    console.log(`✅ Generated app URL: ${url.toString()}`);
    console.log(`🔍 Mobile compatibility: This URL should work on both desktop and mobile`);
    console.log(`🔍 Configuration: Company route=${companyIdentifier}, Experience slug=${experienceIdentifier}`);
    console.log(`🔍 Debug info: app.companyRoute=${app.companyRoute}, app.appSlug=${app.appSlug}, app.experienceId=${app.experienceId}`);
    
    return url.toString();
  }
}

// Cache for API clients to avoid recreating them
const whopApiClientCache = new Map<string, WhopApiClient>();

/**
 * Get WhopApiClient instance for a company and user
 */
export function getWhopApiClient(companyId: string, userId: string): WhopApiClient {
  const cacheKey = `${companyId}:${userId}`;
  
  if (!whopApiClientCache.has(cacheKey)) {
    whopApiClientCache.set(cacheKey, new WhopApiClient(companyId, userId));
  }
  
  return whopApiClientCache.get(cacheKey)!;
}
