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
   */
  async getInstalledApps(companyId: string): Promise<WhopApp[]> {
    try {
      // Use the existing SDK pattern - this might need to be adjusted based on actual SDK methods
      const apps = await (this.whopSdk as any).apps.listAppConnections({
        companyId: companyId
      });
      
      return apps || [];
    } catch (error) {
      console.error("Error fetching installed apps:", error);
      throw new Error(`Failed to fetch installed apps: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Get company products
   */
  async getCompanyProducts(companyId: string): Promise<WhopProduct[]> {
    try {
      // Use the existing SDK pattern - this might need to be adjusted based on actual SDK methods
      const products = await (this.whopSdk as any).products.list({
        companyId: companyId
      });
      
      return products || [];
    } catch (error) {
      console.error("Error fetching company products:", error);
      throw new Error(`Failed to fetch company products: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Get company memberships
   */
  async getCompanyMemberships(companyId: string): Promise<WhopMembership[]> {
    try {
      // Use the existing SDK pattern - this might need to be adjusted based on actual SDK methods
      const memberships = await (this.whopSdk as any).memberships.list({
        companyId: companyId
      });
      
      return memberships || [];
    } catch (error) {
      console.error("Error fetching company memberships:", error);
      throw new Error(`Failed to fetch company memberships: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
