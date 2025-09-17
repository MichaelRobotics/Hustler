import { whopSdk } from "./whop-sdk";

export interface WhopApp {
  id: string;
  name: string;
  description?: string;
  icon?: {
    sourceUrl: string;
  };
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
  updatedAt?: string;
}

export interface WhopMembership {
  id: string;
  name: string;
  description?: string;
  price?: number;
  currency?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

export class WhopApiClient {
  private companyId: string;
  private userId: string;
  
  constructor(companyId: string, userId: string) {
    this.companyId = companyId;
    this.userId = userId;
  }
  
  /**
   * Get installed apps for a company
   * Uses experiences.listExperiences() since experiences represent installed apps
   */
  async getInstalledApps(): Promise<WhopApp[]> {
    try {
      console.log(`Fetching experiences for company ${this.companyId} with user ${this.userId}...`);
      
      // Use global SDK with proper context (same pattern as other APIs)
      const sdkWithContext = whopSdk.withUser(this.userId).withCompany(this.companyId);
      
      // Use the correct SDK method to get company experiences (which includes installed apps)
      const result = await sdkWithContext.experiences.listExperiences({
        companyId: this.companyId,
        first: 100 // Get up to 100 experiences
      });
      
      console.log(`Found ${result?.experiencesV2?.nodes?.length || 0} experiences`);
      
      // Extract apps from experiences
      const apps = result?.experiencesV2?.nodes?.map((exp: any) => ({
        id: exp.app?.id || exp.id,
        name: exp.app?.name || exp.name,
        description: exp.description,
        icon: exp.app?.icon?.sourceUrl || exp.logo?.sourceUrl
      })) || [];
      
      console.log(`Mapped to ${apps.length} apps`);
      return apps;
    } catch (error) {
      console.error("Error fetching installed apps:", error);
      throw new Error(`Failed to fetch installed apps: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get access passes from experiences for FREE apps
   * These are used to get FREE resources from the funnel product
   */
  async getAccessPassesForFreeApps(): Promise<WhopApp[]> {
    try {
      console.log(`Fetching access passes for FREE apps from company ${this.companyId} with user ${this.userId}...`);
      
      // Use global SDK with proper context (same pattern as other APIs)
      const sdkWithContext = whopSdk.withUser(this.userId).withCompany(this.companyId);
      
      // Get company's experiences
      const experiencesResult = await sdkWithContext.experiences.listExperiences({
        companyId: this.companyId,
        first: 100
      });
      
      const experiences = experiencesResult?.experiencesV2?.nodes || [];
      console.log(`Found ${experiences.length} company experiences for access passes`);
      
      const freeApps: WhopApp[] = [];
      
      // Get access passes for each experience
      for (const exp of experiences) {
        if (!exp) continue;
        
        try {
          console.log(`🔍 Getting access passes for experience: ${exp.name} (${exp.id})`);
          const accessPassesResult = await sdkWithContext.experiences.listAccessPassesForExperience({
            experienceId: exp.id
          });
          
          const accessPasses = accessPassesResult?.accessPasses || [];
          console.log(`✅ Experience ${exp.name} has ${accessPasses.length} access passes`);
          
          // Map access passes to app format (these are FREE apps)
          const expApps = accessPasses.map((pass: any) => ({
            id: pass.id,
            name: pass.title || pass.name || `App ${pass.id}`,
            description: pass.description || pass.shortenedDescription,
            icon: pass.icon?.sourceUrl || undefined
          }));
          
          freeApps.push(...expApps);
        } catch (expError) {
          console.warn(`⚠️ Failed to get access passes for experience ${exp?.name} (${exp?.id}):`, expError);
          // Continue with other experiences
        }
      }
      
      console.log(`Mapped to ${freeApps.length} FREE apps from access passes`);
      return freeApps;
    } catch (error) {
      console.error("Error fetching access passes for FREE apps:", error);
      throw new Error(`Failed to fetch access passes for FREE apps: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Get company products from discovery page
   * These are the actual business products customers see on the owner's Whop
   */
  async getCompanyProducts(): Promise<WhopProduct[]> {
    try {
      console.log(`Fetching owner's discovery page products for company ${this.companyId}...`);
      
      // Use global SDK with proper context (same pattern as other APIs)
      const sdkWithContext = whopSdk.withUser(this.userId).withCompany(this.companyId);
      
      console.log("🔍 Fetching company products from discovery page using proper API...");
      
      // Based on our investigation, there's no direct API to get all discovery page products
      // The limitation is that apps can only access their own experiences and their access passes
      // This is a fundamental limitation of the Whop API architecture
      
      console.log("🔍 Using experiences approach - this is the only available method");
      console.log(`🔍 Company: ${this.companyId}, User: ${this.userId}`);
      console.log("⚠️ Note: This will only return products that include YOUR app, not all discovery page products");
      
      try {
        // Get experiences for the company (these represent their business)
        const experiencesResult = await sdkWithContext.experiences.listExperiences({
          companyId: this.companyId,
          first: 100
        });
        
        const experiences = experiencesResult?.experiencesV2?.nodes || [];
        console.log(`Found ${experiences.length} experiences for company ${this.companyId}`);
        
        if (experiences.length === 0) {
          console.log("⚠️ No experiences found for company - this means no products");
          return [];
        }
        
        // Debug: Log all experiences to see what apps are included
        console.log(`🔍 DETAILED ANALYSIS: Found ${experiences.length} experiences for company ${this.companyId}`);
        console.log(`🔍 Our App ID: ${process.env.NEXT_PUBLIC_WHOP_APP_ID}`);
        
        experiences.forEach((exp: any, index: number) => {
          const isOurApp = exp.app?.id === process.env.NEXT_PUBLIC_WHOP_APP_ID;
          console.log(`🔍 Experience ${index + 1}:`, {
            id: exp.id,
            name: exp.name,
            appId: exp.app?.id,
            appName: exp.app?.name,
            isOurApp: isOurApp,
            description: exp.description
          });
        });
        
        // Count how many are our app vs other apps
        const ourAppCount = experiences.filter((exp: any) => exp.app?.id === process.env.NEXT_PUBLIC_WHOP_APP_ID).length;
        const otherAppCount = experiences.length - ourAppCount;
        console.log(`📊 BREAKDOWN: ${ourAppCount} experiences with OUR app, ${otherAppCount} experiences with OTHER apps`);
        
        if (otherAppCount > 0) {
          console.log("🎉 SUCCESS: We CAN see other apps installed in the company!");
        } else {
          console.log("⚠️ LIMITATION: We can only see experiences with our own app");
        }
        
        // Get access passes from experiences - these ARE the discovery page products
        const allProducts: WhopProduct[] = [];
        
        for (const exp of experiences) {
          if (!exp) continue;
          
          try {
            console.log(`🔍 Getting access passes for experience: ${exp.name} (${exp.id})`);
            const accessPassesResult = await sdkWithContext.experiences.listAccessPassesForExperience({
              experienceId: exp.id
            });
            
            const accessPasses = accessPassesResult?.accessPasses || [];
            console.log(`✅ Experience ${exp.name} has ${accessPasses.length} access passes (products)`);
            
            // Map access passes to product format
            const expProducts = accessPasses.map((pass: any) => {
              console.log(`🔍 Access Pass (Product) ${pass.id}:`, JSON.stringify(pass, null, 2));
              
              return {
                id: pass.id,
                title: pass.title || pass.name || `Product ${pass.id}`,
                description: pass.description || pass.shortenedDescription,
                price: pass.rawInitialPrice || pass.price?.amount || 0,
                currency: pass.baseCurrency || pass.price?.currency || 'usd',
                model: pass.price?.model || (pass.rawInitialPrice > 0 ? 'one-time' : 'free') as 'free' | 'one-time' | 'recurring',
                includedApps: pass.includedApps || pass.apps || [],
                plans: pass.plans || [],
                visibility: 'visible' as const
              };
            });
            
            allProducts.push(...expProducts);
          } catch (expError) {
            console.warn(`⚠️ Failed to get access passes for experience ${exp?.name} (${exp?.id}):`, expError);
            // Continue with other experiences
          }
        }
        
        console.log(`✅ Found ${allProducts.length} discovery page products via access passes`);
        console.log("ℹ️ Note: These are only products that include YOUR app, not all discovery page products");
        return allProducts;
        
      } catch (sdkError) {
        console.error("❌ SDK approach failed:", sdkError);
        console.log("⚠️ Falling back to empty array - smart upselling won't work");
        return [];
      }
      
    } catch (error) {
      console.error("Error fetching company products:", error);
      throw new Error(`Failed to fetch company products: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Get company memberships/products
   * Uses access passes from experiences since these represent purchasable items
   */
  async getCompanyMemberships(companyId: string): Promise<WhopMembership[]> {
    try {
      console.log(`Fetching memberships for company ${companyId}...`);
      
      // First get all experiences for the company
      const experiencesResult = await whopSdk.experiences.listExperiences({
        companyId: companyId,
        first: 100
      });
      
      const experiences = experiencesResult?.experiencesV2?.nodes || [];
      console.log(`Found ${experiences.length} experiences to check for access passes`);
      
      const memberships = [];
      
      // Get access passes for each experience
      for (const exp of experiences) {
        if (!exp) continue; // Skip null/undefined experiences
        
        try {
          console.log(`🔍 Checking access passes for experience: ${exp.name} (${exp.id})`);
          const accessPassesResult = await whopSdk.experiences.listAccessPassesForExperience({
            experienceId: exp.id
          });
          
          const accessPasses = accessPassesResult?.accessPasses || [];
          console.log(`✅ Experience ${exp.name} has ${accessPasses.length} access passes`);
          
          // Map access passes to memberships
          const expMemberships = accessPasses.map((pass: any) => ({
            id: pass.id,
            name: pass.title,
            description: pass.shortenedDescription,
            price: pass.rawInitialPrice || 0,
            currency: pass.baseCurrency || 'usd'
          }));
          
          memberships.push(...expMemberships);
        } catch (expError) {
          console.warn(`⚠️ Failed to get access passes for experience ${exp?.name} (${exp?.id}):`, expError);
          // This is expected for many experiences - not all have access passes
          // Continue with other experiences
        }
      }
      
      console.log(`Total memberships found: ${memberships.length}`);
      return memberships;
    } catch (error) {
      console.error("Error fetching company memberships:", error);
      // Return empty array for now since memberships might not be available
      console.log("Returning empty memberships array due to API error");
      return [];
    }
  }
  
  /**
   * Get app information by ID
   */
  async getAppById(appId: string): Promise<WhopApp | null> {
    try {
      const app = await (whopSdk as any).apps.getAppConnection({
        appConnectionId: appId
      });
      
      return app || null;
    } catch (error) {
      console.error("Error fetching app by ID:", error);
      return null;
    }
  }
  
  /**
   * Get product information by ID
   */
  async getProductById(productId: string): Promise<WhopProduct | null> {
    try {
      const product = await (whopSdk as any).products.get({
        productId: productId
      });
      
      return product || null;
    } catch (error) {
      console.error("Error fetching product by ID:", error);
      return null;
    }
  }
  
  /**
   * Get membership information by ID
   */
  async getMembershipById(membershipId: string): Promise<WhopMembership | null> {
    try {
      const membership = await (whopSdk as any).memberships.get({
        membershipId: membershipId
      });
      
      return membership || null;
    } catch (error) {
      console.error("Error fetching membership by ID:", error);
      return null;
    }
  }

  /**
   * Check if user has access to company and their access level
   */
  async checkIfUserHasAccessToCompany(companyId: string, userId: string): Promise<{ hasAccess: boolean; accessLevel: 'admin' | 'customer' | 'no_access' }> {
    try {
      const result = await (whopSdk as any).access.checkIfUserHasAccessToCompany({
        companyId: companyId,
        userId: userId
      });
      
      return result || { hasAccess: false, accessLevel: 'no_access' };
    } catch (error) {
      console.error("Error checking user access to company:", error);
      return { hasAccess: false, accessLevel: 'no_access' };
    }
  }

  /**
   * Determine funnel name based on products
   * Priority: FREE product > Cheapest product > Fallback
   */
  determineFunnelName(products: WhopProduct[]): string {
    const freeProducts = products.filter(p => p.price === 0 || p.model === 'free');
    const paidProducts = products.filter(p => p.price > 0 && p.model !== 'free');
    const cheapestProduct = paidProducts.sort((a, b) => a.price - b.price)[0];
    
    if (freeProducts.length > 0) {
      console.log(`🎯 Using FREE product for funnel name: ${freeProducts[0].title}`);
      return freeProducts[0].title;
    } else if (cheapestProduct) {
      console.log(`🎯 Using cheapest product for funnel name: ${cheapestProduct.title}`);
      return cheapestProduct.title;
    } else {
      console.log(`🎯 No products found, using fallback name`);
      return "App Installation";
    }
  }

  /**
   * Get the product that the funnel should be named after
   */
  getFunnelProduct(products: WhopProduct[]): WhopProduct | null {
    const freeProducts = products.filter(p => p.price === 0 || p.model === 'free');
    const paidProducts = products.filter(p => p.price > 0 && p.model !== 'free');
    const cheapestProduct = paidProducts.sort((a, b) => a.price - b.price)[0];
    
    return freeProducts.length > 0 ? freeProducts[0] : cheapestProduct || null;
  }

  /**
   * Get upsell products (all PAID products except the funnel product)
   */
  getUpsellProducts(products: WhopProduct[], funnelProductId: string): WhopProduct[] {
    return products.filter(p => p.id !== funnelProductId && p.price > 0 && p.model !== 'free');
  }

  /**
   * Get cheapest plan for a product
   */
  getCheapestPlan(product: WhopProduct) {
    if (!product.plans || product.plans.length === 0) return null;
    return product.plans.sort((a, b) => a.price - b.price)[0];
  }
}

// Cache instances by company ID + user ID combination for proper multi-tenancy
const whopApiClientCache = new Map<string, WhopApiClient>();

export function getWhopApiClient(companyId: string, userId: string): WhopApiClient {
  const cacheKey = `${companyId}:${userId}`;
  
  if (!whopApiClientCache.has(cacheKey)) {
    whopApiClientCache.set(cacheKey, new WhopApiClient(companyId, userId));
  }
  
  return whopApiClientCache.get(cacheKey)!;
}
