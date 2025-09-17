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
  private whopSdk = whopSdk;
  private companyId: string;
  
  constructor(companyId: string) {
    this.companyId = companyId;
  }
  
  /**
   * Get installed apps for a company
   * Uses experiences.listExperiences() since experiences represent installed apps
   */
  async getInstalledApps(): Promise<WhopApp[]> {
    try {
      console.log(`Fetching experiences for company ${this.companyId}...`);
      
      // Use SDK with company context
      const sdkWithCompany = this.whopSdk.withCompany(this.companyId);
      
      // Use the correct SDK method to get company experiences (which includes installed apps)
      const result = await sdkWithCompany.experiences.listExperiences({
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
      console.log(`Fetching access passes for FREE apps from company ${this.companyId}...`);
      
      // Use SDK with company context
      const sdkWithCompany = this.whopSdk.withCompany(this.companyId);
      
      // Get company's experiences
      const experiencesResult = await sdkWithCompany.experiences.listExperiences({
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
          const accessPassesResult = await sdkWithCompany.experiences.listAccessPassesForExperience({
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
      
      // Use SDK with company context for proper authentication
      const sdkWithCompany = this.whopSdk.withCompany(this.companyId);
      
      // Try to get company products using the SDK
      // Note: This might need to be adjusted based on actual SDK methods available
      console.log("🔍 Fetching company products from discovery page...");
      
      try {
        // Try to get company products using available SDK methods
        // Note: This might need to be adjusted based on actual SDK methods available
        console.log("⚠️ SDK products method not available, using fallback approach");
        throw new Error("SDK products method not available");
        
      } catch (sdkError) {
        console.warn("SDK products method not available, falling back to access passes approach:", sdkError);
        
        // Fallback: Get access passes from experiences as a temporary solution
        // This is NOT the correct approach but maintains functionality
        console.log("⚠️ Using fallback method - this should be fixed to use proper discovery page API");
        
        const experiencesResult = await sdkWithCompany.experiences.listExperiences({
          companyId: this.companyId,
          first: 100
        });
        
        const experiences = experiencesResult?.experiencesV2?.nodes || [];
        console.log(`Found ${experiences.length} company experiences (fallback)`);
        
        const allProducts: WhopProduct[] = [];
        
        // Get access passes for each experience (FALLBACK ONLY)
        for (const exp of experiences) {
          if (!exp) continue;
          
          try {
            console.log(`🔍 Getting access passes for experience: ${exp.name} (${exp.id})`);
            const accessPassesResult = await sdkWithCompany.experiences.listAccessPassesForExperience({
              experienceId: exp.id
            });
            
            const accessPasses = accessPassesResult?.accessPasses || [];
            console.log(`✅ Experience ${exp.name} has ${accessPasses.length} access passes`);
            
            // Map access passes to product format
            const expProducts = accessPasses.map((pass: any) => {
              console.log(`🔍 Access Pass ${pass.id}:`, JSON.stringify(pass, null, 2));
              
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
        
        console.log(`⚠️ FALLBACK: Mapped to ${allProducts.length} products from access passes`);
        return allProducts;
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
      const experiencesResult = await this.whopSdk.experiences.listExperiences({
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
          const accessPassesResult = await this.whopSdk.experiences.listAccessPassesForExperience({
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
      const app = await (this.whopSdk as any).apps.getAppConnection({
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
      const product = await (this.whopSdk as any).products.get({
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
      const membership = await (this.whopSdk as any).memberships.get({
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
      const result = await (this.whopSdk as any).access.checkIfUserHasAccessToCompany({
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

// Cache instances by company ID
const whopApiClientCache = new Map<string, WhopApiClient>();

export function getWhopApiClient(companyId: string): WhopApiClient {
  if (!whopApiClientCache.has(companyId)) {
    whopApiClientCache.set(companyId, new WhopApiClient(companyId));
  }
  
  return whopApiClientCache.get(companyId)!;
}
