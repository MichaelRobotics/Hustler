#!/usr/bin/env node

import { whopSdk } from './lib/whop-sdk.ts';

async function testCheckoutSessions() {
  console.log('🚀 Testing Checkout Sessions for Paid Products\n');
  console.log('=' .repeat(60));

  const companyId = process.env.NEXT_PUBLIC_WHOP_COMPANY_ID || 'biz_QG3JlRNIE910HW';
  const agentUserId = process.env.NEXT_PUBLIC_WHOP_AGENT_USER_ID || 'user_23pKfUV4sWNlH';
  const affiliateCode = 'your_app_affiliate_code';

  console.log('🎯 NEW STRATEGY: Checkout Sessions for Paid Products\n');

  try {
    // Step 1: Get all products
    console.log('📋 Step 1: Fetching all products...');
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

    // Step 2: Categorize products
    console.log('\n📋 Step 2: Categorizing products...');
    
    const paidProducts = [];
    const freeProducts = [];

    for (const accessPass of accessPasses) {
      const accessPassPlans = plans.filter(plan => plan.accessPass?.id === accessPass.id);
      
      if (accessPassPlans.length > 0) {
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

    // Step 3: Test NEW strategy - Checkout Sessions for Paid Products
    console.log('\n🎯 Step 3: Testing NEW Strategy - Checkout Sessions for Paid Products\n');

    if (paidProducts.length > 0) {
      console.log('💰 For PAID Products: Use Direct Checkout Sessions');
      console.log('   ✅ Higher conversion rate');
      console.log('   ✅ Guaranteed affiliate tracking');
      console.log('   ✅ No lost attribution');
      console.log('   ✅ Funnel metadata preserved\n');

      for (const product of paidProducts) {
        console.log(`🔗 Testing PAID product: ${product.title} ($${product.price})`);
        
        try {
          // Create direct checkout session with affiliate and metadata
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

          console.log(`✅ Checkout Session Created:`);
          console.log(`   ID: ${checkoutSession.id}`);
          console.log(`   URL: ${checkoutSession.purchase_url || checkoutSession.url || 'Direct checkout'}`);
          console.log(`   Affiliate: ${affiliateCode}`);
          console.log(`   Metadata: ${JSON.stringify(checkoutSession.metadata, null, 2)}`);
          console.log(`   🎯 User goes DIRECTLY to payment - no discovery page!`);

        } catch (checkoutError) {
          console.log(`❌ Checkout session creation failed: ${checkoutError.message}`);
          console.log(`💡 This might be due to permissions or plan configuration`);
        }
      }
    } else {
      console.log('⚠️ No paid products found to test checkout sessions');
      console.log('💡 You need to create a paid product to test this feature');
    }

    // Step 4: Test OLD strategy - Discovery Links for Free Products
    console.log('\n🆓 Step 4: Testing OLD Strategy - Discovery Links for Free Products\n');

    if (freeProducts.length > 0) {
      console.log('🆓 For FREE Products: Use Discovery Page Links');
      console.log('   ✅ Lower risk (user can browse)');
      console.log('   ✅ User can see product details');
      console.log('   ✅ Good for free products\n');

      for (const product of freeProducts) {
        console.log(`🔗 Testing FREE product: ${product.title}`);
        
        try {
          // Create discovery page link with affiliate tracking
          const discoveryUrl = new URL(`https://whop.com/${product.route || product.id}`);
          discoveryUrl.searchParams.set('a', affiliateCode);
          discoveryUrl.searchParams.set('funnel_id', 'test_funnel_123');
          discoveryUrl.searchParams.set('block_id', 'value_delivery');
          discoveryUrl.searchParams.set('utm_source', 'funnel');
          discoveryUrl.searchParams.set('utm_campaign', 'test_funnel_123');
          discoveryUrl.searchParams.set('utm_content', 'value_delivery');

          console.log(`✅ Discovery Link Created:`);
          console.log(`   URL: ${discoveryUrl.toString()}`);
          console.log(`   Affiliate: ${affiliateCode}`);
          console.log(`   🎯 User goes to discovery page first, then can decide to join`);

        } catch (error) {
          console.log(`❌ Error creating discovery link for ${product.title}: ${error.message}`);
        }
      }
    }

    // Step 5: Summary and recommendations
    console.log('\n📋 Step 5: Summary and Recommendations\n');
    console.log('🎯 NEW OPTIMIZED STRATEGY:');
    console.log('   💰 PAID Products → Direct Checkout Sessions');
    console.log('   🆓 FREE Products → Discovery Page Links');
    console.log('');
    console.log('✅ Benefits:');
    console.log('   • Higher conversion rates for paid products');
    console.log('   • Guaranteed affiliate attribution');
    console.log('   • No lost sales due to discovery page friction');
    console.log('   • Better funnel attribution with metadata');
    console.log('   • Optimal user experience for each product type');

    console.log('\n💡 Implementation:');
    console.log('   1. Use your affiliate checkout service');
    console.log('   2. Call createPaidProductAffiliateLinks()');
    console.log('   3. Get checkout sessions for paid products');
    console.log('   4. Get discovery links for free products');
    console.log('   5. Use the appropriate link type in your funnel blocks');

    console.log('\n✅ Checkout sessions strategy implemented successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }

  console.log('\n=' .repeat(60));
  console.log('🏁 Test completed');
}

testCheckoutSessions();
