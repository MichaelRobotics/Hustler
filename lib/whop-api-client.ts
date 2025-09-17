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
  
  constructor() {
    // Use the existing whopSdk instance
  }
  
  /**
   * Get installed apps for a company
   * Uses experiences.listExperiences() since experiences represent installed apps
   */
  async getInstalledApps(companyId: string): Promise<WhopApp[]> {
    try {
      console.log(`Fetching experiences for company ${companyId}...`);
      
      // Use the correct SDK method to get company experiences (which includes installed apps)
      const result = await this.whopSdk.experiences.listExperiences({
        companyId: companyId,
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
   * Get company products from discovery page
   * These are the actual products customers see on the owner's Whop
   */
  async getCompanyProducts(companyId: string): Promise<WhopProduct[]> {
    try {
      console.log(`Fetching owner's business products for company ${companyId}...`);
      
      // Use direct HTTP API call since SDK doesn't have this method
      // Try v2 OAuth endpoint first
      const response = await fetch(`https://api.whop.com/v2/oauth/company/products?companyId=${companyId}&first=100`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.WHOP_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log(`🔍 API Response:`, JSON.stringify(result, null, 2));
      const products = result?.products?.nodes || [];
      console.log(`Found ${products.length} business products`);
      
      // Map to our product format
      const mappedProducts = products.map((product: any) => ({
        id: product.id,
        title: product.title,
        description: product.description,
        price: product.price?.amount || 0,
        currency: product.price?.currency || 'usd',
        model: product.price?.model || 'free',
        includedApps: product.includedApps || [],
        plans: product.plans || [],
        visibility: product.visibility || 'visible'
      }));
      
      console.log(`Mapped to ${mappedProducts.length} business products`);
      return mappedProducts;
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

// Singleton instance
let whopApiClient: WhopApiClient | null = null;

export function getWhopApiClient(): WhopApiClient {
  if (!whopApiClient) {
    whopApiClient = new WhopApiClient();
  }
  
  return whopApiClient;
}
