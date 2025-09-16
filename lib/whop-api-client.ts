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
  name: string;
  description?: string;
  price?: number;
  currency?: string;
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
   * Get company products
   * Uses the same approach as memberships since products are access passes
   */
  async getCompanyProducts(companyId: string): Promise<WhopProduct[]> {
    try {
      console.log(`Fetching products for company ${companyId}...`);
      
      // Use the same logic as memberships since products are access passes
      const memberships = await this.getCompanyMemberships(companyId);
      
      // Map memberships to products (they're essentially the same thing)
      const products = memberships.map((membership: any) => ({
        id: membership.id,
        name: membership.name,
        description: membership.description,
        price: membership.price,
        currency: membership.currency
      }));
      
      console.log(`Mapped to ${products.length} products`);
      return products;
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
}

// Singleton instance
let whopApiClient: WhopApiClient | null = null;

export function getWhopApiClient(): WhopApiClient {
  if (!whopApiClient) {
    whopApiClient = new WhopApiClient();
  }
  
  return whopApiClient;
}
