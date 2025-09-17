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
      
      // Use GraphQL API to get discovery page products
      // This is the correct way to access discovery page products that users can see
      console.log("🔍 Using GraphQL discoverySearch to get discovery page products");
      console.log(`🔍 Company: ${this.companyId}, User: ${this.userId}`);
      
      try {
        const apiKey = process.env.WHOP_API_KEY;
        if (!apiKey) {
          throw new Error("WHOP_API_KEY not found in environment variables");
        }
        
        // GraphQL query to get discovery page products
        const discoveryQuery = `
          query DiscoverySearch($query: String!) {
            discoverySearch(query: $query) {
              accessPasses {
                id
                title
                route
                headline
                description
                logo {
                  sourceUrl
                }
                price {
                  amount
                  currency
                  model
                }
                includedApps {
                  id
                  name
                }
              }
            }
          }
        `;
        
        // Make GraphQL request to get discovery page products
        const response = await fetch('https://api.whop.com/public-graphql', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'x-on-behalf-of': this.userId,
            'x-company-id': this.companyId,
          },
          body: JSON.stringify({
            query: discoveryQuery,
            variables: {
              query: '' // Empty query to get all products
            }
          })
        });
        
        if (!response.ok) {
          throw new Error(`GraphQL request failed with status ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log(`🔍 GraphQL Response:`, JSON.stringify(data, null, 2));
        
        if (data.errors) {
          console.error("❌ GraphQL errors:", data.errors);
          throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
        }
        
        const accessPasses = data.data?.discoverySearch?.accessPasses || [];
        console.log(`Found ${accessPasses.length} discovery page products via GraphQL`);
        
        if (accessPasses.length === 0) {
          console.log("⚠️ No discovery page products found");
          return [];
        }
        
        // Map discovery page products to our format
        const mappedProducts: WhopProduct[] = accessPasses.map((pass: any) => {
          console.log(`🔍 Discovery Product ${pass.id}:`, JSON.stringify(pass, null, 2));
          
          return {
            id: pass.id,
            title: pass.title || pass.headline || `Product ${pass.id}`,
            description: pass.description || '',
            price: pass.price?.amount || 0,
            currency: pass.price?.currency || 'usd',
            model: pass.price?.model || (pass.price?.amount > 0 ? 'one-time' : 'free') as 'free' | 'one-time' | 'recurring',
            includedApps: pass.includedApps || [],
            plans: [],
            visibility: 'visible' as const
          };
        });
        
        console.log(`✅ Mapped to ${mappedProducts.length} discovery page products`);
        return mappedProducts;
        
      } catch (graphqlError) {
        console.error("❌ GraphQL discovery search failed:", graphqlError);
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
