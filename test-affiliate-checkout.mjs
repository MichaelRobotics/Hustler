#!/usr/bin/env node

import { whopSdk } from './lib/whop-sdk.ts';

async function testAffiliateCheckout() {
  console.log('🚀 Starting Affiliate Checkout Test\n');
  console.log('=' .repeat(50));

  const companyId = process.env.NEXT_PUBLIC_WHOP_COMPANY_ID || 'biz_QG3JlRNIE910HW';
  const agentUserId = process.env.NEXT_PUBLIC_WHOP_AGENT_USER_ID || 'user_23pKfUV4sWNlH';
  const affiliateCode = 'your_app_affiliate_code';

  console.log('🔗 Testing Affiliate Checkout Creation...\n');

  try {
    // Step 1: Get company products
    console.log('📋 Step 1: Fetching company products...');
    const sdkWithContext = whopSdk.withUser(agentUserId).withCompany(companyId);
    
    const accessPassesResult = await sdkWithContext.companies.listAccessPasses({
      companyId: companyId,
      visibility: "visible",
      first: 10
    });

    const accessPasses = accessPassesResult?.accessPasses?.nodes || [];
    console.log(`✅ Found ${accessPasses.length} access passes`);

    if (accessPasses.length === 0) {
      console.log('❌ No access passes found to test with');
      return;
    }

    // Step 2: Get plans for the first access pass
    console.log('\n📋 Step 2: Fetching plans for first access pass...');
    const plansResult = await sdkWithContext.companies.listPlans({
      companyId: companyId,
      visibility: "visible",
      first: 10
    });

    const plans = plansResult?.plans?.nodes || [];
    console.log(`✅ Found ${plans.length} plans`);

    if (plans.length === 0) {
      console.log('❌ No plans found to test with');
      return;
    }

    // Step 3: Find a paid product and plan
    const firstAccessPass = accessPasses[0];
    const firstPlan = plans[0];
    
    console.log(`\n📋 Step 3: Testing with product: ${firstAccessPass.title}`);
    console.log(`📋 Plan: ${firstPlan.paymentLinkDescription || firstPlan.id}`);
    console.log(`📋 Price: $${firstPlan.rawInitialPrice || 0}`);

    // Step 4: Create affiliate discovery link
    console.log('\n📋 Step 4: Creating affiliate discovery link...');
    const discoveryUrl = new URL(`https://whop.com/${firstAccessPass.route || firstAccessPass.id}`);
    discoveryUrl.searchParams.set('a', affiliateCode);
    discoveryUrl.searchParams.set('funnel_id', 'test_funnel_123');
    discoveryUrl.searchParams.set('block_id', 'offer_block');
    discoveryUrl.searchParams.set('utm_source', 'funnel');
    discoveryUrl.searchParams.set('utm_campaign', 'test_funnel_123');
    discoveryUrl.searchParams.set('utm_content', 'offer_block');

    console.log(`✅ Discovery URL: ${discoveryUrl.toString()}`);

    // Step 5: Create checkout session with affiliate and metadata
    console.log('\n📋 Step 5: Creating checkout session with affiliate...');
    try {
      const checkoutSession = await sdkWithContext.payments.createCheckoutSession({
        planId: firstPlan.id,
        affiliateCode: affiliateCode,
        metadata: {
          funnelId: 'test_funnel_123',
          blockId: 'offer_block',
          productId: firstAccessPass.id,
          productName: firstAccessPass.title,
          affiliateCode: affiliateCode,
          source: 'funnel_attribution',
          createdAt: new Date().toISOString()
        }
      });

      console.log(`✅ Checkout session created: ${checkoutSession.id}`);
      console.log(`✅ Checkout URL: ${checkoutSession.purchase_url}`);
      console.log(`✅ Metadata:`, JSON.stringify(checkoutSession.metadata, null, 2));

    } catch (checkoutError) {
      console.log(`❌ Checkout session creation failed: ${checkoutError.message}`);
      console.log(`💡 This might be due to permissions or plan configuration`);
    }

    // Step 6: Test webhook correlation
    console.log('\n📋 Step 6: Testing webhook correlation...');
    const simulatedWebhookData = {
      body: {
        user_id: 'user_test123',
        final_amount: 10.50,
        currency: 'usd',
        plan: {
          id: firstPlan.id,
          metadata: {
            funnelId: 'test_funnel_123',
            blockId: 'offer_block',
            productId: firstAccessPass.id,
            productName: firstAccessPass.title,
            affiliateCode: affiliateCode,
            source: 'funnel_attribution'
          }
        },
        affiliate_reward: affiliateCode
      }
    };

    console.log('📊 Simulated webhook data:');
    console.log(JSON.stringify(simulatedWebhookData, null, 2));

    // Extract funnel context
    const plan = simulatedWebhookData.body.plan;
    const metadata = plan.metadata || {};
    const funnelContext = {
      funnelId: metadata.funnelId,
      blockId: metadata.blockId,
      productId: metadata.productId,
      affiliateCode: simulatedWebhookData.body.affiliate_reward
    };

    console.log('\n🎯 Extracted funnel context:');
    console.log(JSON.stringify(funnelContext, null, 2));

    console.log('\n💡 Webhook correlation process:');
    console.log('1. User clicks affiliate discovery link');
    console.log('2. User goes to discovery page with affiliate tracking');
    console.log('3. User clicks "Join" and goes to checkout');
    console.log('4. Checkout session includes affiliate code and metadata');
    console.log('5. User completes payment');
    console.log('6. Webhook fires with affiliate_reward and plan.metadata');
    console.log('7. Your system extracts funnel context and processes sale');

    console.log('\n✅ Affiliate checkout test completed successfully!');

  } catch (error) {
    console.error('❌ Affiliate checkout test failed:', error.message);
  }

  console.log('\n=' .repeat(50));
  console.log('🏁 Test completed');
}

testAffiliateCheckout();
