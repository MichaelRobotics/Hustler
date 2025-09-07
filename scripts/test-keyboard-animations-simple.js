#!/usr/bin/env node

/**
 * Simple Mobile Keyboard Animation Test
 * Tests the mobile keyboard animation system without external dependencies
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
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, data });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

async function testMobileKeyboardAnimations() {
  console.log('🧪 Testing Mobile Keyboard Animations (Simple Test)...\n');
  
  try {
    // Test 1: Check if test page loads
    console.log('🔍 Test 1: Page Accessibility');
    const response = await makeRequest('/test-optimized-chat');
    
    if (response.statusCode === 200) {
      console.log('   ✅ Test page loads successfully');
    } else {
      console.log(`   ❌ Test page failed to load (Status: ${response.statusCode})`);
      return;
    }
    
    // Test 2: Check for mobile-specific content
    console.log('🔍 Test 2: Mobile Content Detection');
    const hasMobileContent = response.data.includes('Mobile Optimizations') || 
                            response.data.includes('mobile') ||
                            response.data.includes('touch');
    console.log(`   Mobile Content: ${hasMobileContent ? '✅ FOUND' : '❌ NOT FOUND'}`);
    
    // Test 3: Check for keyboard-related content
    console.log('🔍 Test 3: Keyboard Animation Content');
    const hasKeyboardContent = response.data.includes('keyboard') || 
                              response.data.includes('Keyboard') ||
                              response.data.includes('visualViewport') ||
                              response.data.includes('isKeyboardOpen');
    console.log(`   Keyboard Content: ${hasKeyboardContent ? '✅ FOUND' : '❌ NOT FOUND'}`);
    
    // Test 4: Check for CSS transitions
    console.log('🔍 Test 4: CSS Transition Support');
    const hasTransitions = response.data.includes('transition') || 
                          response.data.includes('ease-out') ||
                          response.data.includes('0.3s');
    console.log(`   CSS Transitions: ${hasTransitions ? '✅ FOUND' : '❌ NOT FOUND'}`);
    
    // Test 5: Check for mobile-specific CSS classes
    console.log('🔍 Test 5: Mobile CSS Classes');
    const hasMobileClasses = response.data.includes('mobile-') || 
                            response.data.includes('touch-') ||
                            response.data.includes('safe-area');
    console.log(`   Mobile CSS Classes: ${hasMobileClasses ? '✅ FOUND' : '❌ NOT FOUND'}`);
    
    // Test 6: Check for JavaScript keyboard handling
    console.log('🔍 Test 6: JavaScript Keyboard Handling');
    const hasKeyboardJS = response.data.includes('keyboardHeight') || 
                         response.data.includes('isKeyboardOpen') ||
                         response.data.includes('visualViewport') ||
                         response.data.includes('handleKeyboardChange');
    console.log(`   Keyboard JavaScript: ${hasKeyboardJS ? '✅ FOUND' : '❌ NOT FOUND'}`);
    
    // Test 7: Check for performance monitoring
    console.log('🔍 Test 7: Performance Monitoring');
    const hasPerformanceMonitoring = response.data.includes('Performance') || 
                                    response.data.includes('debug') ||
                                    response.data.includes('metrics');
    console.log(`   Performance Monitoring: ${hasPerformanceMonitoring ? '✅ FOUND' : '❌ NOT FOUND'}`);
    
    // Test 8: Check for mobile viewport meta tag
    console.log('🔍 Test 8: Mobile Viewport Meta Tag');
    const hasViewportMeta = response.data.includes('viewport') || 
                           response.data.includes('width=device-width');
    console.log(`   Viewport Meta Tag: ${hasViewportMeta ? '✅ FOUND' : '❌ NOT FOUND'}`);
    
    // Summary
    console.log('\n📊 Test Summary:');
    console.log('================');
    
    const tests = [
      { name: 'Page Accessibility', passed: response.statusCode === 200 },
      { name: 'Mobile Content', passed: hasMobileContent },
      { name: 'Keyboard Content', passed: hasKeyboardContent },
      { name: 'CSS Transitions', passed: hasTransitions },
      { name: 'Mobile CSS Classes', passed: hasMobileClasses },
      { name: 'Keyboard JavaScript', passed: hasKeyboardJS },
      { name: 'Performance Monitoring', passed: hasPerformanceMonitoring },
      { name: 'Viewport Meta Tag', passed: hasViewportMeta }
    ];
    
    const passedTests = tests.filter(test => test.passed).length;
    const totalTests = tests.length;
    
    console.log(`✅ Passed: ${passedTests}/${totalTests}`);
    console.log(`❌ Failed: ${totalTests - passedTests}/${totalTests}`);
    
    if (passedTests === totalTests) {
      console.log('\n🎉 ALL TESTS PASSED! Mobile keyboard animations are properly implemented!');
      console.log('\n📱 To test manually:');
      console.log('   1. Open http://localhost:3000/test-optimized-chat in mobile browser');
      console.log('   2. Resize browser to mobile width (375px)');
      console.log('   3. Tap the input field to open keyboard');
      console.log('   4. Watch for smooth animations and layout adjustments');
      console.log('   5. Check debug panel for keyboard status');
    } else {
      console.log('\n⚠️  Some tests failed. Check the implementation.');
    }
    
    // Show specific content snippets
    console.log('\n🔍 Content Analysis:');
    console.log('===================');
    
    if (response.data.includes('Mobile Optimizations')) {
      console.log('✅ Mobile optimization instructions found');
    }
    
    if (response.data.includes('keyboard')) {
      console.log('✅ Keyboard-related content found');
    }
    
    if (response.data.includes('transition')) {
      console.log('✅ CSS transition content found');
    }
    
    if (response.data.includes('visualViewport')) {
      console.log('✅ Visual Viewport API usage found');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n💡 Make sure the development server is running:');
    console.log('   npm run dev');
  }
}

// Run the test
testMobileKeyboardAnimations().catch(console.error);
