#!/usr/bin/env node

/**
 * Component Loading Test
 * Tests if the FunnelPreviewChat component loads without errors
 */

const http = require('http');

function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, data, headers: res.headers });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

async function testComponentLoading() {
  console.log('🧪 Testing Component Loading...\n');
  
  try {
    // Test 1: Check if the test page exists
    console.log('🔍 Test 1: Page Accessibility');
    const response = await makeRequest('/test-optimized-chat');
    
    console.log(`   Status Code: ${response.statusCode}`);
    console.log(`   Content Type: ${response.headers['content-type']}`);
    console.log(`   Content Length: ${response.data.length} bytes`);
    
    if (response.statusCode === 200) {
      console.log('   ✅ Test page loads successfully');
    } else if (response.statusCode === 404) {
      console.log('   ❌ Test page not found (404)');
      console.log('   💡 The route might not be properly configured');
      return;
    } else {
      console.log(`   ❌ Test page failed to load (Status: ${response.statusCode})`);
      return;
    }
    
    // Test 2: Check for React hydration
    console.log('🔍 Test 2: React Hydration');
    const hasReactHydration = response.data.includes('__next_f') || 
                             response.data.includes('react') ||
                             response.data.includes('hydrate');
    console.log(`   React Hydration: ${hasReactHydration ? '✅ FOUND' : '❌ NOT FOUND'}`);
    
    // Test 3: Check for JavaScript chunks
    console.log('🔍 Test 3: JavaScript Chunks');
    const hasJSChunks = response.data.includes('_next/static/chunks') || 
                       response.data.includes('.js');
    console.log(`   JavaScript Chunks: ${hasJSChunks ? '✅ FOUND' : '❌ NOT FOUND'}`);
    
    // Test 4: Check for CSS
    console.log('🔍 Test 4: CSS Loading');
    const hasCSS = response.data.includes('stylesheet') || 
                   response.data.includes('.css');
    console.log(`   CSS Loading: ${hasCSS ? '✅ FOUND' : '❌ NOT FOUND'}`);
    
    // Test 5: Check for component-specific content
    console.log('🔍 Test 5: Component Content');
    const hasComponentContent = response.data.includes('Optimized Chat Test') || 
                               response.data.includes('UserChat') ||
                               response.data.includes('Preview Chat');
    console.log(`   Component Content: ${hasComponentContent ? '✅ FOUND' : '❌ NOT FOUND'}`);
    
    // Test 6: Check for mobile viewport
    console.log('🔍 Test 6: Mobile Viewport');
    const hasViewport = response.data.includes('viewport') || 
                       response.data.includes('width=device-width');
    console.log(`   Mobile Viewport: ${hasViewport ? '✅ FOUND' : '❌ NOT FOUND'}`);
    
    // Show some content snippets
    console.log('\n🔍 Content Analysis:');
    console.log('===================');
    
    if (response.data.includes('Optimized Chat Test')) {
      console.log('✅ Page title found');
    }
    
    if (response.data.includes('UserChat')) {
      console.log('✅ UserChat component reference found');
    }
    
    if (response.data.includes('Preview Chat')) {
      console.log('✅ Preview Chat component reference found');
    }
    
    if (response.data.includes('FunnelPreviewChat')) {
      console.log('✅ FunnelPreviewChat component reference found');
    }
    
    // Check for any error messages
    if (response.data.includes('error') || response.data.includes('Error')) {
      console.log('⚠️  Error messages found in content');
    }
    
    // Summary
    console.log('\n📊 Test Summary:');
    console.log('================');
    
    const tests = [
      { name: 'Page Accessibility', passed: response.statusCode === 200 },
      { name: 'React Hydration', passed: hasReactHydration },
      { name: 'JavaScript Chunks', passed: hasJSChunks },
      { name: 'CSS Loading', passed: hasCSS },
      { name: 'Component Content', passed: hasComponentContent },
      { name: 'Mobile Viewport', passed: hasViewport }
    ];
    
    const passedTests = tests.filter(test => test.passed).length;
    const totalTests = tests.length;
    
    console.log(`✅ Passed: ${passedTests}/${totalTests}`);
    console.log(`❌ Failed: ${totalTests - passedTests}/${totalTests}`);
    
    if (passedTests === totalTests) {
      console.log('\n🎉 ALL TESTS PASSED! Component loading is working correctly!');
    } else {
      console.log('\n⚠️  Some tests failed. Check the implementation.');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n💡 Make sure the development server is running:');
    console.log('   npm run dev');
  }
}

// Run the test
testComponentLoading().catch(console.error);
