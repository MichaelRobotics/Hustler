/**
 * Product Category Helper
 * 
 * Helper functions for determining product categories based on product and plan data.
 */

/**
 * Check if a product has any paid plan (renewal or one-time) with price > 0
 * 
 * Price checking logic (matching existing codebase pattern):
 * - For renewal plans: check renewal_price first, then initial_price, then price
 * - For one-time plans: check initial_price first, then price
 * 
 * @param product - The WhopProduct to check
 * @returns true if any plan has price > 0, false otherwise
 */
export function hasAnyPaidPlan(product: { plans?: Array<{
  id?: string;
  price?: number;
  initial_price?: number;
  renewal_price?: number;
  plan_type?: string;
}> }): boolean {
  if (!product.plans || product.plans.length === 0) {
    return false;
  }

  return product.plans.some(plan => {
    // For renewal plans: check renewal_price first, then initial_price, then price
    // This matches the pattern in lib/whop-api-client.ts line 537-539
    if (plan.plan_type === 'renewal') {
      const effectivePrice = plan.renewal_price !== undefined && plan.renewal_price !== null
        ? plan.renewal_price
        : (plan.initial_price ?? plan.price ?? 0);
      return effectivePrice > 0;
    }
    
    // For one-time plans: check initial_price first, then price
    // This matches the pattern in lib/whop-api-client.ts line 553
    const effectivePrice = plan.initial_price ?? plan.price ?? 0;
    return effectivePrice > 0;
  });
}

