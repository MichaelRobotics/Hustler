import { whopSdk } from '@/lib/whop-sdk';

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
  if (name.includes('chat') || name.includes('community') || name.includes('social') || 
      name.includes('discord') || name.includes('forum') || name.includes('livestream') || 
      name.includes('clip') || name.includes('site') || name.includes('list')) {
    return 'community';
  }
  
  // Free/Utility apps
  if (name.includes('free') || name.includes('utility') || name.includes('tool')) {
    return 'other';
  }
  
  return 'other';
}

export interface WhopProduct {
  id: string;
  title: string;
  description?: string;
  price: number;
  currency: string;
  model: 'free' | 'one-time' | 'recurring';
  includedApps: string[];
  plans: Array<{
    id: string;
    price: number;
    currency: string;
    title?: string;
  }>;
  visibility: 'archived' | 'hidden' | 'quick_link' | 'visible';
  status?: string;
  category?: string;
  tags?: string[];
  imageUrl?: string;
  createdAt?: string;
  // URLs for discovery page and checkout
  discoveryPageUrl?: string;
  checkoutUrl?: string;
  route?: string; // The route used to construct discovery page URL
  updatedAt?: string;
  isFree?: boolean; // Helper field for FREE/PAID detection
}

export interface WhopApp {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  discoveryPageUrl?: string;
  checkoutUrl?: string;
  route?: string;
  experienceId?: string; // The experience ID for this app installation
  companyRoute?: string; // Company route for URL generation
  appSlug?: string; // App slug for custom URLs
}

export class WhopApiClient {
  private companyId: string;
  private userId: string;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 30000; // 30 seconds cache

  constructor(companyId: string, userId: string) {
    this.companyId = companyId;
    this.userId = userId;
    
    // Validate required parameters
    if (!companyId || !userId) {
      throw new Error("WhopApiClient requires both companyId and userId");
    }
    
    // Validate environment variables
    if (!process.env.WHOP_API_KEY) {
      console.warn("⚠️ WHOP_API_KEY not found in environment variables");
    }
    if (!process.env.NEXT_PUBLIC_WHOP_APP_ID) {
      console.warn("⚠️ NEXT_PUBLIC_WHOP_APP_ID not found in environment variables");
    }
  }

  /**
   * Get cached data or execute API call
   */
  private async getCachedOrFetch<T>(
    cacheKey: string,
    apiCall: () => Promise<T>
  ): Promise<T> {
    const cached = this.cache.get(cacheKey);
    const now = Date.now();
    
    if (cached && (now - cached.timestamp) < this.CACHE_TTL) {
      console.log(`📦 Using cached data for ${cacheKey}`);
      return cached.data;
    }
    
    console.log(`🔄 Fetching fresh data for ${cacheKey}`);
    const data = await apiCall();
    this.cache.set(cacheKey, { data, timestamp: now });
    return data;
  }

  /**
   * Get company route/slug for custom URLs
   */
  async getCompanyRoute(): Promise<string | null> {
    try {
      console.log(`🔍 Getting company route for company ${this.companyId}...`);
      
      const companyResult = await whopSdk.companies.getCompany({
        companyId: this.companyId
      });
      
      const company = companyResult as any;
      // Use the actual route field from Whop API
      const route = company?.route || null;
      
      console.log(`✅ Company route: ${route}`);
      return route;
    } catch (error) {
      console.error("❌ Error getting company route:", error);
      return null;
    }
  }

  /**
   * Get installed apps (experiences) in the company
   * These are used for FREE resources
   */
  async getInstalledApps(): Promise<WhopApp[]> {
    try {
      console.log(`Fetching installed apps for company ${this.companyId}...`);
      
      // MULTIPLE RETRY STRATEGY: Try different approaches
      const strategies = [
        { name: "Ultra-fast", timeout: 2000, first: 10 },
        { name: "Fast", timeout: 5000, first: 20 },
        { name: "Standard", timeout: 10000, first: 50 }
      ];
      
      for (const strategy of strategies) {
        try {
          console.log(`🚀 Trying ${strategy.name} strategy for experiences (${strategy.timeout}ms timeout, first: ${strategy.first})...`);
          
          // Use proper SDK context with required companyId parameter
          const sdkWithContext = whopSdk.withUser(this.userId).withCompany(this.companyId);
          
          const experiencesResult = await Promise.race([
            sdkWithContext.experiences.listExperiences({
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
          
          // INVESTIGATION: Log full experience object structure to see all available fields
          if (experiences.length > 0) {
            console.log(`🔍 INVESTIGATION: Full experience object structure:`);
            console.log(JSON.stringify(experiences[0], null, 2));
            console.log(`🔍 INVESTIGATION: Experience object keys:`, Object.keys(experiences[0] || {}));
            if (experiences[0]?.app) {
              console.log(`🔍 INVESTIGATION: App object keys:`, Object.keys(experiences[0].app));
            }
          }
          
          if (experiences.length > 0) {
            // Get company route for custom URLs
            const companyRoute = await this.getCompanyRoute();
            
            const apps: WhopApp[] = experiences.map((exp: any) => {
              // Generate experience slug: {appName}-{experienceIdSuffix}
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
                description: exp.description,
                price: 0,
                currency: 'usd',
                discoveryPageUrl: undefined,
                checkoutUrl: undefined,
                route: undefined, // Apps don't have custom routes
                experienceId: exp.id, // Store the experience ID for this app installation
                companyRoute: companyRoute || undefined, // Company route for URL generation
                appSlug: experienceSlug // Generated experience slug
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
   * Get DISCOVERY PAGE PRODUCTS (not apps) using SDK methods
   * These are the actual products customers can buy for PAID upsells
   */
  async getCompanyProducts(): Promise<WhopProduct[]> {
    console.log(`🔍 Getting DISCOVERY PAGE PRODUCTS for company ${this.companyId}...`);
    
    try {
      console.log("🔍 Getting discovery page products using SDK methods...");
      
      // MULTIPLE RETRY STRATEGY: Try different approaches
      const strategies = [
        { name: "Ultra-fast", timeout: 2000, first: 5 },
        { name: "Fast", timeout: 5000, first: 10 },
        { name: "Standard", timeout: 10000, first: 20 }
      ];
      
      for (const strategy of strategies) {
        try {
          console.log(`🚀 Trying ${strategy.name} strategy (${strategy.timeout}ms timeout, first: ${strategy.first})...`);
          
          // Use global SDK for access passes with type assertion (SDK types may be incomplete)
          const accessPassesResult = await Promise.race([
            (whopSdk.companies as any).listAccessPasses({
              companyId: this.companyId,
              visibility: "visible",
              first: strategy.first
            }),
            new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error("API timeout")), strategy.timeout)
            )
          ]);
          
          const accessPasses = accessPassesResult?.accessPasses?.nodes || [];
          console.log(`✅ ${strategy.name} strategy succeeded! Found ${accessPasses.length} access passes`);
          
          // INVESTIGATION: Log full access pass object structure to see all available fields
          if (accessPasses.length > 0) {
            console.log(`🔍 INVESTIGATION: Full access pass object structure:`);
            console.log(JSON.stringify(accessPasses[0], null, 2));
            console.log(`🔍 INVESTIGATION: Access pass object keys:`, Object.keys(accessPasses[0]));
          }
          
          if (accessPasses.length > 0) {
            // Try to get plans (optional - don't fail if this times out)
            let plans: any[] = [];
            try {
              const plansResult = await Promise.race([
                (whopSdk.companies as any).listPlans({
                  companyId: this.companyId,
                  visibility: "visible",
                  first: strategy.first
                }),
                new Promise<never>((_, reject) => 
                  setTimeout(() => reject(new Error("Plans timeout")), strategy.timeout)
                )
              ]);
              plans = plansResult?.plans?.nodes || [];
              console.log(`✅ Found ${plans.length} plans`);
              
              // INVESTIGATION: Log full plan object structure to see all available fields
              if (plans.length > 0) {
                console.log(`🔍 INVESTIGATION: Full plan object structure:`);
                console.log(JSON.stringify(plans[0], null, 2));
                console.log(`🔍 INVESTIGATION: Plan object keys:`, Object.keys(plans[0]));
              }
              
            } catch (planError) {
              console.log("⚠️ Plans API failed, continuing with access passes only");
            }
            
            // Get company route for discovery page URLs
            const companyRoute = await this.getCompanyRoute();
            
            // Map to products
            const products = this.mapAccessPassesToProducts(accessPasses, plans, companyRoute || undefined);
            console.log(`✅ Mapped to ${products.length} DISCOVERY PAGE PRODUCTS`);
            
            // INVESTIGATION: Log final product structure to see what fields we have
            if (products.length > 0) {
              console.log(`🔍 INVESTIGATION: Final product object structure:`);
              console.log(JSON.stringify(products[0], null, 2));
              console.log(`🔍 INVESTIGATION: Product object keys:`, Object.keys(products[0]));
              
              // INVESTIGATION: Check for potential product type fields
              const product = products[0] as any;
              console.log(`🔍 INVESTIGATION: Potential product type fields:`);
              console.log(`  - category: ${product.category || 'NOT FOUND'}`);
              console.log(`  - type: ${product.type || 'NOT FOUND'}`);
              console.log(`  - tags: ${product.tags || 'NOT FOUND'}`);
              console.log(`  - businessModel: ${product.businessModel || 'NOT FOUND'}`);
              console.log(`  - appStoreCategory: ${product.appStoreCategory || 'NOT FOUND'}`);
              console.log(`  - productType: ${product.productType || 'NOT FOUND'}`);
              
              // INVESTIGATION: Test name-based classification for products
              const classifiedType = classifyAppType(product.title);
              console.log(`🔍 INVESTIGATION: Name-based classification for product "${product.title}": ${classifiedType}`);
            }
            
            return products;
          }
          
        } catch (strategyError) {
          console.log(`❌ ${strategy.name} strategy failed:`, strategyError instanceof Error ? strategyError.message : String(strategyError));
          continue; // Try next strategy
        }
      }
      
      // If all strategies failed, throw error
      throw new Error("All API strategies failed");
      
    } catch (error) {
      console.error("❌ Failed to get discovery page products:", error);
      console.log("⚠️ No PAID upsell products will be created");
      return [];
    }
  }

  /**
   * Map access passes and plans to WhopProduct format
   */
  private mapAccessPassesToProducts(accessPasses: any[], plans: any[], companyRoute?: string): WhopProduct[] {
    // Group plans by access pass ID
    const plansByAccessPass = new Map<string, any[]>();
    plans.forEach((plan: any) => {
      if (plan.accessPass?.id) {
        if (!plansByAccessPass.has(plan.accessPass.id)) {
          plansByAccessPass.set(plan.accessPass.id, []);
        }
        plansByAccessPass.get(plan.accessPass.id)!.push(plan);
      }
    });
    
    return accessPasses.map((accessPass: any) => {
      const accessPassPlans = plansByAccessPass.get(accessPass.id) || [];
      
      // Find the cheapest plan to determine if it's free
      let minPrice = Infinity;
      let currency = 'usd';
      
      if (accessPassPlans.length > 0) {
        accessPassPlans.forEach(plan => {
          const price = plan.rawInitialPrice || 0;
          if (price < minPrice) {
            minPrice = price;
            currency = plan.baseCurrency || 'usd';
          }
        });
      }
      
      const isFree = minPrice === 0 || minPrice === Infinity;
      const price = isFree ? 0 : minPrice;
      
      // Generate URLs
      let discoveryPageUrl: string | undefined;
      if (companyRoute) {
        // Use discovery page format for affiliate tracking (required by Whop docs)
        discoveryPageUrl = `https://whop.com/discover/${companyRoute}/?productId=${accessPass.id}`;
      } else if (accessPass.route) {
        // Fallback to direct access pass route
        discoveryPageUrl = `https://whop.com/${accessPass.route}`;
      }
      const checkoutUrl = accessPass.route ? `https://whop.com/${accessPass.route}/checkout` : undefined;
      
      console.log(`🔍 PRODUCT ${accessPass.title}: ${isFree ? 'FREE' : 'PAID'} ($${price}) - URL: ${discoveryPageUrl}`);
      
      return {
        id: accessPass.id,
        title: accessPass.title || accessPass.headline || `Product ${accessPass.id}`,
        description: accessPass.shortenedDescription || accessPass.creatorPitch || '',
        price: price,
        currency: currency,
        model: isFree ? 'free' : (accessPassPlans.some(p => p.planType === 'renewal') ? 'recurring' : 'one-time') as 'free' | 'one-time' | 'recurring',
        includedApps: [],
        plans: accessPassPlans.map(plan => ({
          id: plan.id,
          price: plan.rawInitialPrice || 0,
          currency: plan.baseCurrency || 'usd',
          title: plan.paymentLinkDescription || `Plan ${plan.id}`
        })),
        visibility: accessPass.visibility || 'visible' as const,
        discoveryPageUrl,
        checkoutUrl,
        route: accessPass.route,
        verified: accessPass.verified,
        activeUsersCount: accessPass.activeUsersCount,
        reviewsAverage: accessPass.reviewsAverage,
        logo: accessPass.logo?.sourceUrl,
        bannerImage: accessPass.bannerImage?.source?.url,
        isFree
      };
    });
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
        console.log(`🔄 ${operationName} attempt ${attempt}/${maxRetries} (timeout: ${timeoutMs}ms)`);
        
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
   * Determine funnel name from discovery page products
   * Uses FREE product if available, otherwise cheapest PAID product
   */
  determineFunnelName(products: WhopProduct[]): string {
    if (products.length === 0) {
      return "App Installation";
    }

    // First, try to find a FREE product
    const freeProduct = products.find(p => p.isFree);
    if (freeProduct) {
      console.log(`🎯 Using FREE product for funnel name: ${freeProduct.title}`);
      return freeProduct.title;
    }

    // If no FREE product, use the cheapest PAID product
    const paidProducts = products.filter(p => !p.isFree && p.price > 0);
    if (paidProducts.length > 0) {
      const cheapestProduct = paidProducts.reduce((cheapest, current) => 
        current.price < cheapest.price ? current : cheapest
      );
      console.log(`🎯 Using cheapest PAID product for funnel name: ${cheapestProduct.title} ($${cheapestProduct.price})`);
      return cheapestProduct.title;
    }

    // Fallback
    console.log("⚠️ No suitable product found for funnel naming, using fallback");
    return "App Installation";
  }

  /**
   * Get the funnel product from discovery page products
   * This is the product that will be used to name the funnel
   */
  getFunnelProduct(products: WhopProduct[]): WhopProduct | null {
    if (products.length === 0) {
      return null;
    }

    // First, try to find a FREE product
    const freeProduct = products.find(p => p.isFree);
    if (freeProduct) {
      console.log(`🎯 Funnel product: ${freeProduct.title} (${freeProduct.includedApps.length} apps included)`);
      return freeProduct;
    }

    // If no FREE product, use the cheapest PAID product
    const paidProducts = products.filter(p => !p.isFree && p.price > 0);
    if (paidProducts.length > 0) {
      const cheapestProduct = paidProducts.reduce((cheapest, current) => 
        current.price < cheapest.price ? current : cheapest
      );
      console.log(`🎯 Funnel product: ${cheapestProduct.title} ($${cheapestProduct.price})`);
      return cheapestProduct;
    }

    return null;
  }

  /**
   * Get upsell products (exclude the funnel product)
   */
  getUpsellProducts(products: WhopProduct[], funnelProductId: string): WhopProduct[] {
    const upsellProducts = products.filter(p => p.id !== funnelProductId);
    console.log(`🎯 Found ${upsellProducts.length} upsell products (excluding funnel product)`);
    return upsellProducts;
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
    console.log(`📱 Mobile compatibility: This URL should work on both desktop and mobile`);
    console.log(`🔧 Configuration: Company route=${companyIdentifier}, Experience slug=${experienceIdentifier}`);
    console.log(`🔍 Debug info: app.companyRoute=${app.companyRoute}, app.appSlug=${app.appSlug}, app.experienceId=${app.experienceId}`);
    
    return url.toString();
  }

}

// Cache for API clients to avoid recreating them
const whopApiClientCache = new Map<string, WhopApiClient>();

export function getWhopApiClient(companyId: string, userId: string): WhopApiClient {
  const cacheKey = `${companyId}:${userId}`;
  
  if (!whopApiClientCache.has(cacheKey)) {
    whopApiClientCache.set(cacheKey, new WhopApiClient(companyId, userId));
  }
  
  return whopApiClientCache.get(cacheKey)!;
}
