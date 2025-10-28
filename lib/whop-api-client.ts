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
      const strategies = [
        { name: "Ultra-fast", timeout: 2000, first: 5 },
        { name: "Fast", timeout: 5000, first: 10 },
        { name: "Standard", timeout: 10000, first: 20 }
      ];
      
      for (const strategy of strategies) {
        try {
          console.log(`🔍 Trying ${strategy.name} strategy (${strategy.timeout}ms timeout, first: ${strategy.first})...`);
          
          // Use global SDK for experiences with type assertion (SDK types may be incomplete)
          const experiencesResult = await Promise.race([
            (whopSdk.companies as any).listExperiences({
              companyId: this.companyId,
              first: strategy.first
            }),
            new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error("API timeout")), strategy.timeout)
            )
          ]);
          
          const experiences = experiencesResult?.experiences?.nodes || [];
          console.log(`✅ ${strategy.name} strategy succeeded! Found ${experiences.length} experiences`);
          
          if (experiences.length > 0) {
            // Get company route for discovery page URLs
            const companyRoute = await this.getCompanyRoute();
            
            const apps = experiences.map((exp: any) => {
              // Generate a slug from the app name and experience ID
              const appName = (exp.app?.name || exp.name || 'app')
                .toLowerCase()
                .replace(/[^a-z0-9]/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '');
              
              const experienceIdSuffix = exp.id?.replace('exp_', '') || '';
              const experienceSlug = `${appName}-${experienceIdSuffix}`;
              
              return {
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
                // NEW: Add logo information from app data
                logo: exp.app?.icon?.sourceUrl || exp.logo?.sourceUrl || undefined,
                bannerImage: exp.bannerImage?.sourceUrl || undefined
              };
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
      
      // If all strategies failed, throw error
      throw new Error("All API strategies failed");
      
    } catch (error) {
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
      
      // DEBUG: Log all plans to see what we're getting
      console.log(`🔍 DEBUG - All plans fetched:`, plans.map(p => ({
        id: p.id,
        initial_price: p.initial_price,
        currency: p.currency,
        title: p.title,
        plan_type: p.plan_type,
        product_id: p.product?.id,
        product_title: p.product?.title
      })));

      console.log("🔍 Step 2: Fetching all products...");
      const products: any[] = [];
      for await (const productListItem of client.products.list({ company_id: this.companyId })) {
        products.push(productListItem);
      }
      console.log(`✅ Found ${products.length} products`);
      
      // Filter out products that don't have proper product associations
      const validProducts = products.filter(product => {
        // Only include products that have at least one plan associated with them
        const hasAssociatedPlans = plans.some(plan => plan.product?.id === product.id);
        if (!hasAssociatedPlans) {
          console.log(`⚠️ Filtering out product "${product.title}" (${product.id}) - no associated plans`);
        }
        return hasAssociatedPlans;
      });
      
      console.log(`🔍 Filtered products: ${validProducts.length}/${products.length} (excluded products without plans)`);

      // Filter out archived products
      const visibleProducts = validProducts.filter(product => product.visibility !== 'archived');
      console.log(`🔍 Filtered products: ${visibleProducts.length}/${validProducts.length} (excluded archived)`);
      
      // Use all visible products (no filtering)
      const finalProducts = visibleProducts;
      
      console.log(`🔍 Final products: ${finalProducts.length}/${visibleProducts.length} (no filtering applied)`);

      console.log("🔍 Step 3: Correlating plans with products and getting detailed product data...");
      const correlatedProducts: WhopProduct[] = [];

      for (const product of finalProducts) {
        try {
          // Get detailed product data
          const detailedProduct = await client.products.retrieve(product.id);
          
          // Find plans for this product
          const productPlans = plans.filter(plan => plan.product?.id === product.id);

          console.log(`🔍 Processing product "${detailedProduct.title}" (${detailedProduct.id}) with ${productPlans.length} plans`);
          
          // DEBUG: Log all plans for Profittest
          if (detailedProduct.title === "Profittest") {
            console.log(`🔍 DEBUG Profittest - All plans found:`, productPlans.map(p => ({
              id: p.id,
              initial_price: p.initial_price,
              currency: p.currency,
              title: p.title,
              plan_type: p.plan_type,
              product_id: p.product?.id
            })));
          }
          
          // Calculate pricing - handle both one-time and subscription plans
          let minPrice = Infinity;
          let currency = 'usd';
          let isFree = true;
          
          if (productPlans.length > 0) {
            productPlans.forEach((plan, index) => {
              let effectivePrice = 0;
              
              if (plan.plan_type === 'renewal') {
                // For subscription plans, use renewal_price (monthly cost)
                effectivePrice = plan.renewal_price || plan.initial_price || 0;
                console.log(`  Plan ${index + 1}: ${plan.id} - SUBSCRIPTION - renewal_price: ${plan.renewal_price}, initial_price: ${plan.initial_price}, billing_period: ${plan.billing_period} days, effective_price: ${effectivePrice}`);
              } else {
                // For one-time plans, use initial_price
                effectivePrice = plan.initial_price || 0;
                console.log(`  Plan ${index + 1}: ${plan.id} - ONE-TIME - initial_price: ${effectivePrice}, currency: ${plan.currency}`);
              }
              
              if (effectivePrice < minPrice) {
                minPrice = effectivePrice;
                currency = plan.currency || 'usd';
              }
            });
            isFree = minPrice === 0;
          } else {
            console.log(`⚠️ No plans found for "${detailedProduct.title}" - will be marked as FREE`);
            minPrice = 0;
          }

          const finalPrice = isFree ? 0 : minPrice;
          console.log(`🔍 Final calculation for "${detailedProduct.title}": minPrice=${minPrice}, isFree=${isFree}, finalPrice=${finalPrice}`);

          // Generate URLs
            const companyRoute = await this.getCompanyRoute();
          let discoveryPageUrl: string | undefined;
          if (companyRoute && detailedProduct.route) {
            discoveryPageUrl = `https://whop.com/${companyRoute}/${detailedProduct.route}/`;
          } else if (detailedProduct.route) {
            discoveryPageUrl = `https://whop.com/${detailedProduct.route}/`;
          }
          const checkoutUrl = detailedProduct.route ? `https://whop.com/${detailedProduct.route}/checkout` : undefined;

          console.log(`🔍 PRODUCT ${detailedProduct.title}: ${isFree ? 'FREE' : 'PAID'} ($${finalPrice}) - URL: ${discoveryPageUrl}`);

          correlatedProducts.push({
            id: detailedProduct.id,
            title: detailedProduct.title || detailedProduct.headline || `Product ${detailedProduct.id}`,
            description: detailedProduct.description || detailedProduct.headline || '',
            price: finalPrice,
            currency: currency,
            model: isFree ? 'free' : (productPlans.some(p => p.plan_type === 'renewal') ? 'recurring' : 'one-time') as 'free' | 'one-time' | 'recurring',
            includedApps: [],
            plans: productPlans.map(plan => ({
              id: plan.id,
              price: plan.plan_type === 'renewal' ? (plan.renewal_price || plan.initial_price || 0) : (plan.initial_price || 0),
              currency: plan.currency || 'usd',
              title: plan.title || `Plan ${plan.id}`,
              plan_type: plan.plan_type,
              renewal_price: plan.renewal_price,
              billing_period: plan.billing_period
            })),
            visibility: (detailedProduct.visibility || 'visible') as 'visible' | 'hidden' | 'archived' | 'quick_link',
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

      console.log(`✅ Successfully processed ${correlatedProducts.length} products using direct SDK API`);
      
      // INVESTIGATION: Log final product structure
      if (correlatedProducts.length > 0) {
        console.log(`🔍 INVESTIGATION: Final product object structure:`);
        console.log(JSON.stringify(correlatedProducts[0], null, 2));
        console.log(`🔍 INVESTIGATION: Product object keys:`, Object.keys(correlatedProducts[0]));
      }

      return correlatedProducts;
      
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
    // Use company route if available, otherwise fall back to company ID
    const companyIdentifier = app.companyRoute || this.companyId;
    
    // Use experience slug if available, otherwise fall back to experience ID
    const experienceIdentifier = app.appSlug || app.experienceId;
    
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
