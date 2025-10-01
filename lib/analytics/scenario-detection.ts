export interface ScenarioData {
  scenario: 'PRODUCT' | 'AFFILIATE' | 'error' | 'free_product';
  companyId: string;
  productId: string;
  userId: string;
  amount: number;
  currency: string;
  affiliateCommission?: number;
  productOwnerRevenue?: number;
  metadata?: {
    membershipId?: string;
    paymentId?: string;
    timestamp?: string;
    error?: string;
  };
}

/**
 * Detect scenario from webhook data
 */
export async function detectScenario(webhookData: any): Promise<ScenarioData> {
  try {
    console.log(`[Scenario Detection] Analyzing webhook data:`, {
      companyId: webhookData.company_id,
      productId: webhookData.product_id,
      userId: webhookData.user_id,
      amount: webhookData.amount
    });

    const YOUR_COMPANY_ID = process.env.NEXT_PUBLIC_WHOP_COMPANY_ID;
    
    if (!YOUR_COMPANY_ID) {
      console.error('[Scenario Detection] NEXT_PUBLIC_WHOP_COMPANY_ID not configured');
      return createErrorScenario(webhookData, 'NEXT_PUBLIC_WHOP_COMPANY_ID not configured');
    }

    // Check if this is a free product (amount = 0)
    const amount = parseFloat(webhookData.final_amount || webhookData.amount || '0');
    if (amount <= 0) {
      console.log('[Scenario Detection] Free product purchase detected - no analytics needed (this is normal)');
      return createFreeProductScenario(webhookData);
    }

    // Check if affiliate commission exists
    const affiliateCommission = webhookData.affiliate_commission || webhookData.affiliate_reward;
    
    if (!affiliateCommission) {
      console.log('[Scenario Detection] No affiliate commission found - treating as direct product purchase');
      // This is a direct product purchase, not an affiliate scenario
      // We'll handle this as a PRODUCT scenario with no affiliate commission
    }

    if (affiliateCommission) {
      // Handle affiliate scenarios
      const recipientCompanyId = affiliateCommission.recipient_company_id || 
                                 affiliateCommission.company_id || 
                                 affiliateCommission.affiliate_company_id;

      if (!recipientCompanyId) {
        console.log('[Scenario Detection] No recipient company ID found in affiliate commission');
        return createErrorScenario(webhookData, 'No recipient company ID');
      }

      const affiliateAmount = parseFloat(affiliateCommission.amount || '0');
      const totalAmount = parseFloat(webhookData.final_amount || webhookData.amount || '0');
      const productOwnerAmount = totalAmount - affiliateAmount;

      if (recipientCompanyId === YOUR_COMPANY_ID) {
        // Scenario 1: You get affiliate commission, Whop Owner gets product revenue
        console.log('[Scenario Detection] Scenario 1: You get affiliate commission, Whop Owner gets product revenue');
        return {
          scenario: 'PRODUCT',
          companyId: webhookData.company_id,
          productId: webhookData.product_id,
          userId: webhookData.user_id,
          amount: totalAmount,
          currency: webhookData.currency || 'usd',
          affiliateCommission: affiliateAmount,
          productOwnerRevenue: productOwnerAmount,
          metadata: {
            membershipId: webhookData.membership_id,
            paymentId: webhookData.id,
            timestamp: webhookData.created_at
          }
        };
      } else {
        // Scenario 2: Other company gets affiliate commission, Whop Owner gets affiliate commission
        console.log('[Scenario Detection] Scenario 2: Other company gets affiliate commission, Whop Owner gets affiliate commission');
        return {
          scenario: 'AFFILIATE',
          companyId: webhookData.company_id,
          productId: webhookData.product_id,
          userId: webhookData.user_id,
          amount: totalAmount,
          currency: webhookData.currency || 'usd',
          affiliateCommission: affiliateAmount,
          productOwnerRevenue: productOwnerAmount,
          metadata: {
            membershipId: webhookData.membership_id,
            paymentId: webhookData.id,
            timestamp: webhookData.created_at
          }
        };
      }
    } else {
      // Handle direct product purchases (no affiliate commission)
      console.log('[Scenario Detection] Direct product purchase detected - no affiliate commission');
      const totalAmount = parseFloat(webhookData.final_amount || webhookData.amount || '0');
      
      return {
        scenario: 'PRODUCT',
        companyId: webhookData.company_id,
        productId: webhookData.product_id,
        userId: webhookData.user_id,
        amount: totalAmount,
        currency: webhookData.currency || 'usd',
        affiliateCommission: 0, // No affiliate commission for direct purchases
        productOwnerRevenue: totalAmount, // Full amount goes to product owner
        metadata: {
          membershipId: webhookData.membership_id,
          paymentId: webhookData.id,
          timestamp: webhookData.created_at
        }
      };
    }

  } catch (error) {
    console.error('[Scenario Detection] Error detecting scenario:', error);
    return createErrorScenario(webhookData, error instanceof Error ? error.message : 'Unknown error');
  }
}

/**
 * Create free product scenario data
 */
function createFreeProductScenario(webhookData: any): ScenarioData {
  console.log(`[Scenario Detection] Creating free product scenario`);
  return {
    scenario: 'free_product',
    companyId: webhookData.company_id,
    productId: webhookData.product_id,
    userId: webhookData.user_id,
    amount: 0,
    currency: webhookData.currency || 'usd',
    metadata: {
      membershipId: webhookData.membership_id,
      paymentId: webhookData.id,
      timestamp: webhookData.created_at
    }
  };
}

/**
 * Create error scenario data
 */
function createErrorScenario(webhookData: any, reason: string): ScenarioData {
  console.log(`[Scenario Detection] Creating error scenario: ${reason}`);
  return {
    scenario: 'error',
    companyId: webhookData.company_id,
    productId: webhookData.product_id,
    userId: webhookData.user_id,
    amount: parseFloat(webhookData.amount || '0'),
    currency: webhookData.currency || 'usd',
    metadata: {
      membershipId: webhookData.membership_id,
      paymentId: webhookData.id,
      timestamp: webhookData.created_at,
      error: reason
    }
  };
}

/**
 * Validate scenario data
 */
export function validateScenarioData(scenarioData: ScenarioData): boolean {
  if (!scenarioData.companyId || !scenarioData.productId || !scenarioData.userId) {
    console.error('[Scenario Detection] Invalid scenario data - missing required fields');
    return false;
  }

  // Free products are valid scenarios that don't need analytics
  if (scenarioData.scenario === 'free_product') {
    console.log('[Scenario Detection] ✅ Free product scenario - no analytics needed (this is normal)');
    return false; // Don't process analytics, but this is not an error
  }

  if (scenarioData.amount <= 0) {
    console.log('[Scenario Detection] Free product detected (amount: $0) - skipping analytics (this is expected behavior)');
    return false;
  }

  if (scenarioData.scenario === 'PRODUCT' && (!scenarioData.productOwnerRevenue || scenarioData.productOwnerRevenue <= 0)) {
    console.error('[Scenario Detection] Invalid PRODUCT scenario - no product owner revenue');
    return false;
  }

  if (scenarioData.scenario === 'AFFILIATE' && (!scenarioData.affiliateCommission || scenarioData.affiliateCommission <= 0)) {
    console.error('[Scenario Detection] Invalid AFFILIATE scenario - no affiliate commission');
    return false;
  }

  return true;
}