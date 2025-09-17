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

  constructor(companyId: string, userId: string) {
    this.companyId = companyId;
    this.userId = userId;
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
      
      // Get experiences for the company (these represent installed apps)
      const experiencesResult = await (sdkWithContext.experiences as any).listExperiences({
        companyId: this.companyId,
        first: 100
      });
      
      const experiences = experiencesResult?.experiencesV2?.nodes || [];
      console.log(`Found ${experiences.length} installed apps for company ${this.companyId}`);
      
      if (experiences.length === 0) {
        console.log("⚠️ No installed apps found for company");
        return [];
      }
      
      // Map experiences to app format
      const apps: WhopApp[] = experiences.map((exp: any) => ({
        id: exp.app?.id || exp.id,
        name: exp.app?.name || exp.name,
        description: exp.description,
        price: 0, // Apps are free
        currency: 'usd',
        discoveryPageUrl: undefined, // Apps don't have discovery pages
        checkoutUrl: undefined, // Apps don't have checkout
        route: undefined
      }));
      
      console.log(`✅ Mapped to ${apps.length} installed apps`);
      return apps;
      
    } catch (error) {
      console.error("Error fetching installed apps:", error);
      throw new Error(`Failed to fetch installed apps: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      
      // Get access passes (discovery page products) - use global SDK
      const accessPassesResult = await (whopSdk.companies as any).listAccessPasses({
        companyId: this.companyId,
        visibility: "all",
        first: 100
      });
      
      const accessPasses = accessPassesResult?.accessPasses?.nodes || [];
      console.log(`🔍 Found ${accessPasses.length} access passes for company ${this.companyId}`);
      
      if (accessPasses.length === 0) {
        console.log("⚠️ No discovery page products found - this means no products to upsell");
        return [];
      }
      
      // Get plans for pricing information
      const plansResult = await (whopSdk.companies as any).listPlans({
        companyId: this.companyId,
        visibility: "all",
        first: 100
      });
      
      const plans = plansResult?.plans?.nodes || [];
      console.log(`🔍 Found ${plans.length} plans for company ${this.companyId}`);
      
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
