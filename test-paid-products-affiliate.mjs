#!/usr/bin/env node

import { whopSdk } from './lib/whop-sdk.ts';

async function testPaidProductsAffiliate() {
  console.log('🚀 Starting Paid Products Affiliate Test\n');
  console.log('=' .repeat(50));

  const companyId = process.env.NEXT_PUBLIC_WHOP_COMPANY_ID || 'biz_QG3JlRNIE910HW';
  const agentUserId = process.env.NEXT_PUBLIC_WHOP_AGENT_USER_ID || 'user_23pKfUV4sWNlH';
  const affiliateCode = 'your_app_affiliate_code';

  console.log('🔗 Testing Paid Products Affiliate Creation...\n');

  try {
    // Step 1: Get all access passes and plans
    console.log('📋 Step 1: Fetching all products and plans...');
    const sdkWithContext = whopSdk.withUser(agentUserId).withCompany(companyId);
    
    const [accessPassesResult, plansResult] = await Promise.all([
      sdkWithContext.companies.listAccessPasses({
        companyId: companyId,
        visibility: "visible",
        first: 20
      }),
      sdkWithContext.companies.listPlans({
        companyId: companyId,
        visibility: "visible",
        first: 20
      })
    ]);

    const accessPasses = accessPassesResult?.accessPasses?.nodes || [];
    const plans = plansResult?.plans?.nodes || [];
    
    console.log(`✅ Found ${accessPasses.length} access passes`);
    console.log(`✅ Found ${plans.length} plans`);

    // Step 2: Find paid products
    console.log('\n📋 Step 2: Analyzing products for paid options...');
    
    const paidProducts = [];
    const freeProducts = [];

    for (const accessPass of accessPasses) {
      // Find plans for this access pass
      const accessPassPlans = plans.filter(plan => plan.accessPass?.id === accessPass.id);
      
      if (accessPassPlans.length > 0) {
        // Find the cheapest plan
        let minPrice = Infinity;
        let cheapestPlan = null;
        
        for (const plan of accessPassPlans) {
          const price = plan.rawInitialPrice || 0;
          if (price < minPrice) {
            minPrice = price;
            cheapestPlan = plan;
          }
        }
        
        const product = {
          id: accessPass.id,
          title: accessPass.title,
          price: minPrice,
          currency: cheapestPlan?.baseCurrency || 'usd',
          route: accessPass.route,
          plans: accessPassPlans,
          cheapestPlan: cheapestPlan
        };
        
        if (minPrice > 0) {
          paidProducts.push(product);
          console.log(`💰 PAID: ${product.title} - $${product.price} (${product.plans.length} plans)`);
        } else {
          freeProducts.push(product);
          console.log(`🆓 FREE: ${product.title} - $${product.price} (${product.plans.length} plans)`);
        }
      }
    }

    console.log(`\n📊 Summary: ${paidProducts.length} paid products, ${freeProducts.length} free products`);

    // Step 3: Test affiliate links for paid products
    if (paidProducts.length > 0) {
      console.log('\n📋 Step 3: Creating affiliate links for paid products...');
      
      for (const product of paidProducts) {
        console.log(`\n🔗 Testing product: ${product.title}`);
        
        try {
          // Create discovery link
          const discoveryUrl = new URL(`https://whop.com/${product.route || product.id}`);
          discoveryUrl.searchParams.set('a', affiliateCode);
          discoveryUrl.searchParams.set('funnel_id', 'test_funnel_123');
          discoveryUrl.searchParams.set('block_id', 'offer_block');
          discoveryUrl.searchParams.set('utm_source', 'funnel');
          discoveryUrl.searchParams.set('utm_campaign', 'test_funnel_123');
          discoveryUrl.searchParams.set('utm_content', 'offer_block');

          console.log(`✅ Discovery URL: ${discoveryUrl.toString()}`);

          // Create checkout session
          if (product.cheapestPlan) {
            try {
              const checkoutSession = await sdkWithContext.payments.createCheckoutSession({
                planId: product.cheapestPlan.id,
                affiliateCode: affiliateCode,
                metadata: {
                  funnelId: 'test_funnel_123',
                  blockId: 'offer_block',
                  productId: product.id,
                  productName: product.title,
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
          }

        } catch (error) {
          console.log(`❌ Error creating affiliate links for ${product.title}: ${error.message}`);
        }
      }
    } else {
      console.log('\n⚠️ No paid products found to test with');
      console.log('💡 You need to create a paid product in your Whop company to test affiliate checkout');
    }

    // Step 4: Test free products (discovery links only)
    if (freeProducts.length > 0) {
      console.log('\n📋 Step 4: Creating discovery links for free products...');
      
      for (const product of freeProducts) {
        console.log(`\n🔗 Testing free product: ${product.title}`);
        
        try {
          // Create discovery link (no checkout session for free products)
          const discoveryUrl = new URL(`https://whop.com/${product.route || product.id}`);
          discoveryUrl.searchParams.set('a', affiliateCode);
          discoveryUrl.searchParams.set('funnel_id', 'test_funnel_123');
          discoveryUrl.searchParams.set('block_id', 'value_delivery');
          discoveryUrl.searchParams.set('utm_source', 'funnel');
          discoveryUrl.searchParams.set('utm_campaign', 'test_funnel_123');
          discoveryUrl.searchParams.set('utm_content', 'value_delivery');

          console.log(`✅ Discovery URL: ${discoveryUrl.toString()}`);
          console.log(`💡 Free products only get discovery links, no checkout sessions`);

        } catch (error) {
          console.log(`❌ Error creating discovery link for ${product.title}: ${error.message}`);
        }
      }
    }

    // Step 5: Summary and recommendations
    console.log('\n📋 Step 5: Summary and Recommendations...');
    console.log('\n🎯 How to use affiliate links in your funnel:');
    console.log('1. For FREE products: Use discovery links with affiliate tracking');
    console.log('2. For PAID products: Use both discovery links AND checkout sessions');
    console.log('3. Discovery links: Direct users to product pages with affiliate tracking');
    console.log('4. Checkout sessions: Direct users to payment with metadata for attribution');
    console.log('5. Webhook correlation: Extract funnel context from plan.metadata');

    console.log('\n💡 Next steps:');
    console.log('1. Create paid products in your Whop company');
    console.log('2. Use the affiliate links in your funnel blocks');
    console.log('3. Set up webhook handling for funnel attribution');
    console.log('4. Track conversions and revenue by funnel/block');

    console.log('\n✅ Paid products affiliate test completed!');

  } catch (error) {
    console.error('❌ Paid products affiliate test failed:', error.message);
  }

  console.log('\n=' .repeat(50));
  console.log('🏁 Test completed');
}

testPaidProductsAffiliate();
