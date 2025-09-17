#!/usr/bin/env node

/**
 * Test script for Smart Upselling Sync
 * This script tests the product sync functionality directly
 */

import { getWhopApiClient } from './lib/whop-api-client.js';

async function testSmartUpsellingSync() {
    console.log('🧪 Testing Smart Upselling Sync...\n');

    try {
        // Test company ID from your logs
        const companyId = 'biz_VjqUDhcKO2cAuG';
        
        console.log(`📊 Testing with company: ${companyId}\n`);

        // Get Whop API client
        console.log('🔧 Getting Whop API client...');
        const whopClient = getWhopApiClient();
        console.log('✅ Whop API client created\n');

        // Test 1: Get business products
        console.log('🏪 Testing getCompanyProducts...');
        try {
            const businessProducts = await whopClient.getCompanyProducts(companyId);
            console.log(`✅ Found ${businessProducts.length} business products`);
            
            if (businessProducts.length > 0) {
                console.log('📋 Business Products:');
                businessProducts.forEach((product, index) => {
                    console.log(`  ${index + 1}. ${product.title} (${product.model}) - $${product.price}`);
                    if (product.includedApps && product.includedApps.length > 0) {
                        console.log(`     Includes ${product.includedApps.length} apps: ${product.includedApps.join(', ')}`);
                    }
                });
            } else {
                console.log('⚠️ No business products found');
            }
        } catch (error) {
            console.error('❌ Error fetching business products:', error);
        }

        console.log('\n' + '='.repeat(50) + '\n');

        // Test 2: Get installed apps
        console.log('📱 Testing getInstalledApps...');
        try {
            const installedApps = await whopClient.getInstalledApps(companyId);
            console.log(`✅ Found ${installedApps.length} installed apps`);
            
            if (installedApps.length > 0) {
                console.log('📋 Installed Apps:');
                installedApps.forEach((app, index) => {
                    console.log(`  ${index + 1}. ${app.name || app.id} - ${app.description || 'No description'}`);
                });
            } else {
                console.log('⚠️ No installed apps found');
            }
        } catch (error) {
            console.error('❌ Error fetching installed apps:', error);
        }

        console.log('\n' + '='.repeat(50) + '\n');

        // Test 3: Test funnel naming logic
        console.log('🎯 Testing funnel naming logic...');
        try {
            const businessProducts = await whopClient.getCompanyProducts(companyId);
            const funnelName = whopClient.determineFunnelName(businessProducts);
            const funnelProduct = whopClient.getFunnelProduct(businessProducts);
            const upsellProducts = whopClient.getUpsellProducts(businessProducts, funnelProduct?.id || '');
            
            console.log(`✅ Funnel name: "${funnelName}"`);
            if (funnelProduct) {
                console.log(`✅ Funnel product: ${funnelProduct.title} (${funnelProduct.includedApps?.length || 0} apps)`);
            } else {
                console.log('⚠️ No funnel product found');
            }
            console.log(`✅ Upsell products: ${upsellProducts.length}`);
            
            if (upsellProducts.length > 0) {
                console.log('📋 Upsell Products:');
                upsellProducts.forEach((product, index) => {
                    console.log(`  ${index + 1}. ${product.title} - $${product.price}`);
                });
            }
        } catch (error) {
            console.error('❌ Error testing funnel logic:', error);
        }

        console.log('\n🎉 Test completed!');

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run the test
testSmartUpsellingSync().catch(console.error);
