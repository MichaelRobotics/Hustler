import { whopSdk } from '@/lib/whop-sdk';

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
}

export class WhopApiClient {
  private companyId: string;
  private userId: string;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 30000; // 30 seconds cache

  constructor(companyId: string, userId: string) {
    this.companyId = companyId;
    this.userId = userId;
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
   * Get installed apps (experiences) in the company
   * These are used for FREE resources
   */
  async getInstalledApps(): Promise<WhopApp[]> {
    try {
      console.log(`Fetching installed apps for company ${this.companyId}...`);
      
      // Use global SDK with proper context (same pattern as other APIs)
      const sdkWithContext = whopSdk.withUser(this.userId).withCompany(this.companyId);
      
      console.log("🔍 Getting installed apps using listExperiences...");
      
      // Ultra-fast API call with minimal data
      const operationTimeout = 15000; // 15 seconds total
      const startTime = Date.now();
      
      console.log(`🚀 Starting ultra-fast listExperiences API call with ${operationTimeout}ms timeout...`);
      
      const experiencesResult = await Promise.race([
        this.getCachedOrFetch(
          `experiences-${this.companyId}`,
          () => this.retryApiCall(
            () => (sdkWithContext.experiences as any).listExperiences({
              companyId: this.companyId,
              first: 10, // Ultra-minimal data: only 10 experiences
              // Add specific filters to reduce query complexity
              onAccessPass: false, // Only get experiences not tied to access passes
              accessPassId: undefined // Don't filter by access pass
            }),
            "listExperiences",
            1, // Only 1 retry for faster failure
            8000 // Ultra-fast timeout: 8s per attempt
          )
        ),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error(`Installed apps fetch timeout after ${operationTimeout}ms`)), operationTimeout)
        )
      ]);
      
      const elapsed = Date.now() - startTime;
      console.log(`✅ listExperiences API call completed in ${elapsed}ms`);
      
      const experiences = (experiencesResult as any)?.experiencesV2?.nodes || [];
      console.log(`Found ${experiences.length} installed apps for company ${this.companyId}`);
      
      if (experiences.length === 0) {
        console.log("⚠️ No installed apps found for company");
        return [];
      }
      
      // Map experiences to app format
      const apps: WhopApp[] = experiences.map((exp: any) => {
        console.log(`🔍 Mapping experience:`, {
          id: exp.id,
          name: exp.name,
          appId: exp.app?.id,
          appName: exp.app?.name,
          description: exp.description
        });
        
        return {
          id: exp.app?.id || exp.id,
          name: exp.app?.name || exp.name,
          description: exp.description,
          price: 0, // Apps are free
          currency: 'usd',
          discoveryPageUrl: undefined, // Apps don't have discovery pages
          checkoutUrl: undefined, // Apps don't have checkout
          route: undefined
        };
      });
      
      console.log(`✅ Mapped to ${apps.length} installed apps`);
      return apps;
      
    } catch (error) {
      console.error("❌ Error fetching installed apps:", error);
      console.log("⚠️ Falling back to empty array - no FREE apps will be created");
      // Return empty array instead of throwing to allow sync to continue
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
      
      // ULTRA-FAST API CALLS with circuit breaker pattern
      const operationTimeout = 20000; // Reduced to 20 seconds total
      const startTime = Date.now();
      
      console.log(`🚀 Starting ultra-fast API calls with ${operationTimeout}ms timeout...`);
      
      // Create both API calls with minimal data and ultra-fast timeouts
      const accessPassesPromise = this.getCachedOrFetch(
        `accessPasses-${this.companyId}`,
        () => this.retryApiCall(
          () => (whopSdk.companies as any).listAccessPasses({
            companyId: this.companyId,
            visibility: "visible",
            first: 10 // Ultra-minimal data: only 10 products
          }),
          "listAccessPasses",
          1, // Only 1 retry
          5000 // Ultra-fast timeout: 5s per attempt
        )
      );
      
      const plansPromise = this.getCachedOrFetch(
        `plans-${this.companyId}`,
        () => this.retryApiCall(
          () => (whopSdk.companies as any).listPlans({
            companyId: this.companyId,
            visibility: "visible",
            first: 10 // Ultra-minimal data: only 10 plans
          }),
          "listPlans",
          1, // Only 1 retry
          5000 // Ultra-fast timeout: 5s per attempt
        )
      );
      
      // Execute with circuit breaker - if one fails, continue with the other
      let accessPassesResult: any = null;
      let plansResult: any = null;
      
      try {
        console.log("🔄 Attempting parallel API calls...");
        const results = await Promise.race([
          Promise.allSettled([accessPassesPromise, plansPromise]),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error(`Discovery products fetch timeout after ${operationTimeout}ms`)), operationTimeout)
          )
        ]);
        
        // Process results even if one failed
        if (results[0].status === 'fulfilled') {
          accessPassesResult = results[0].value;
          console.log("✅ listAccessPasses succeeded");
        } else {
          console.log("❌ listAccessPasses failed:", results[0].reason?.message);
        }
        
        if (results[1].status === 'fulfilled') {
          plansResult = results[1].value;
          console.log("✅ listPlans succeeded");
        } else {
          console.log("❌ listPlans failed:", results[1].reason?.message);
        }
        
        // If both failed, throw error
        if (!accessPassesResult && !plansResult) {
          throw new Error("Both API calls failed");
        }
        
      } catch (error) {
        console.error("❌ Parallel API calls failed:", error);
        // Continue with null results - we'll handle this gracefully
      }
      
      const elapsed = Date.now() - startTime;
      console.log(`✅ API calls completed in ${elapsed}ms`);
      
      const accessPasses = (accessPassesResult as any)?.accessPasses?.nodes || [];
      const plans = (plansResult as any)?.plans?.nodes || [];
      
      console.log(`🔍 Found ${accessPasses.length} access passes and ${plans.length} plans for company ${this.companyId}`);
      
      // Graceful fallback: if no data, return empty array but don't fail
      if (accessPasses.length === 0 && plans.length === 0) {
        console.log("⚠️ No discovery page products found - continuing with empty products");
        return [];
      }
      
      // If we have access passes but no plans, continue with empty plans
      if (accessPasses.length === 0) {
        console.log("⚠️ No access passes found, but continuing with plans only");
        return [];
      }
      
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
      
      console.log("🔍 Mapping access passes to products...");
      
      const mappedProducts: WhopProduct[] = accessPasses.map((accessPass: any) => {
        // Get plans for this access pass
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
        const discoveryPageUrl = accessPass.route ? `https://whop.com/${accessPass.route}` : undefined;
        const checkoutUrl = accessPass.route ? `https://whop.com/${accessPass.route}/checkout` : undefined;
        
        console.log(`🔍 DISCOVERY PAGE PRODUCT ${accessPass.title}: ${isFree ? 'FREE' : 'PAID'} ($${price})`);
        
        return {
          id: accessPass.id,
          title: accessPass.title || accessPass.headline || `Product ${accessPass.id}`,
          description: accessPass.shortenedDescription || accessPass.creatorPitch || '',
          price: price,
          currency: currency,
          model: isFree ? 'free' : (accessPassPlans.some(p => p.planType === 'renewal') ? 'recurring' : 'one-time') as 'free' | 'one-time' | 'recurring',
          includedApps: [], // Access passes don't have included apps
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
          // Additional fields
          verified: accessPass.verified,
          activeUsersCount: accessPass.activeUsersCount,
          reviewsAverage: accessPass.reviewsAverage,
          logo: accessPass.logo?.sourceUrl,
          bannerImage: accessPass.bannerImage?.source?.url,
          isFree
        };
      });
      
      console.log(`✅ Mapped to ${mappedProducts.length} DISCOVERY PAGE PRODUCTS`);
      console.log("🎉 SUCCESS: SDK methods work perfectly!");
      return mappedProducts;
      
    } catch (error) {
      console.error("❌ Failed to get discovery page products:", error);
      console.log("⚠️ Falling back to empty array - smart upselling won't work");
      return [];
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
