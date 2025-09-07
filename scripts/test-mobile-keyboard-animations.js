#!/usr/bin/env node

/**
 * Mobile Keyboard Animation Test Script
 * Tests the mobile keyboard animation system in FunnelPreviewChat
 */

const puppeteer = require('puppeteer');

async function testMobileKeyboardAnimations() {
  console.log('🧪 Testing Mobile Keyboard Animations...\n');
  
  let browser;
  try {
    // Launch browser with mobile viewport
    browser = await puppeteer.launch({ 
      headless: false, // Set to true for CI/CD
      defaultViewport: { width: 375, height: 667 }, // iPhone SE size
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Set mobile user agent
    await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1');
    
    // Navigate to test page
    console.log('📱 Navigating to test page...');
    await page.goto('http://localhost:3000/test-optimized-chat', { 
      waitUntil: 'networkidle0',
      timeout: 10000 
    });
    
    // Wait for page to load
    await page.waitForTimeout(2000);
    
    // Test 1: Check if mobile detection is working
    console.log('🔍 Test 1: Mobile Detection');
    const mobileStatus = await page.evaluate(() => {
      const debugPanel = document.querySelector('[class*="fixed"][class*="bottom"][class*="right"]');
      if (debugPanel) {
        const text = debugPanel.textContent;
        const isMobile = text.includes('Mobile: YES');
        const isTouch = text.includes('Touch: YES');
        return { isMobile, isTouch, debugText: text };
      }
      return { isMobile: false, isTouch: false, debugText: 'Debug panel not found' };
    });
    
    console.log(`   Mobile Detection: ${mobileStatus.isMobile ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Touch Detection: ${mobileStatus.isTouch ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Debug Panel: ${mobileStatus.debugText.includes('Preview Chat Performance') ? '✅ FOUND' : '❌ NOT FOUND'}\n`);
    
    // Test 2: Check if input field exists and is visible
    console.log('🔍 Test 2: Input Field Detection');
    const inputExists = await page.evaluate(() => {
      const textarea = document.querySelector('textarea[placeholder*="Type or choose response"]');
      const sendButton = document.querySelector('button[type="button"]');
      return {
        textareaExists: !!textarea,
        sendButtonExists: !!sendButton,
        textareaVisible: textarea ? textarea.offsetParent !== null : false
      };
    });
    
    console.log(`   Textarea Exists: ${inputExists.textareaExists ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Send Button Exists: ${inputExists.sendButtonExists ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Input Visible: ${inputExists.textareaVisible ? '✅ PASS' : '❌ FAIL'}\n`);
    
    // Test 3: Simulate keyboard opening (focus input)
    console.log('🔍 Test 3: Keyboard Animation Simulation');
    
    // Focus the input field
    await page.focus('textarea[placeholder*="Type or choose response"]');
    await page.waitForTimeout(500);
    
    // Check keyboard state after focus
    const keyboardStateAfterFocus = await page.evaluate(() => {
      const debugPanel = document.querySelector('[class*="fixed"][class*="bottom"][class*="right"]');
      if (debugPanel) {
        const text = debugPanel.textContent;
        const isInputFocused = text.includes('Input Focus: YES');
        const keyboardStatus = text.includes('Keyboard: OPEN') ? 'OPEN' : 'CLOSED';
        return { isInputFocused, keyboardStatus, debugText: text };
      }
      return { isInputFocused: false, keyboardStatus: 'UNKNOWN', debugText: 'Debug panel not found' };
    });
    
    console.log(`   Input Focused: ${keyboardStateAfterFocus.isInputFocused ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Keyboard Status: ${keyboardStateAfterFocus.keyboardStatus}`);
    
    // Test 4: Check for mobile-specific CSS classes and styles
    console.log('🔍 Test 4: Mobile CSS Classes');
    const mobileClasses = await page.evaluate(() => {
      const container = document.querySelector('[class*="h-full"][class*="flex"][class*="flex-col"]');
      const inputContainer = document.querySelector('[class*="flex-shrink-0"][class*="border-t"]');
      
      return {
        containerClasses: container ? container.className : 'Not found',
        inputContainerClasses: inputContainer ? inputContainer.className : 'Not found',
        hasMobileClasses: container ? container.className.includes('mobile') : false,
        hasTouchClasses: container ? container.className.includes('touch') : false
      };
    });
    
    console.log(`   Mobile Classes Present: ${mobileClasses.hasMobileClasses ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Touch Classes Present: ${mobileClasses.hasTouchClasses ? '✅ PASS' : '❌ FAIL'}\n`);
    
    // Test 5: Test input functionality
    console.log('🔍 Test 5: Input Functionality');
    await page.type('textarea[placeholder*="Type or choose response"]', 'Test message for keyboard animation');
    await page.waitForTimeout(500);
    
    const inputValue = await page.evaluate(() => {
      const textarea = document.querySelector('textarea[placeholder*="Type or choose response"]');
      return textarea ? textarea.value : '';
    });
    
    console.log(`   Text Input: ${inputValue.includes('Test message') ? '✅ PASS' : '❌ FAIL'}`);
    
    // Test 6: Check for Visual Viewport API support
    console.log('🔍 Test 6: Visual Viewport API Support');
    const viewportSupport = await page.evaluate(() => {
      return {
        hasVisualViewport: typeof window.visualViewport !== 'undefined',
        hasResizeEvent: typeof window.visualViewport?.addEventListener === 'function'
      };
    });
    
    console.log(`   Visual Viewport API: ${viewportSupport.hasVisualViewport ? '✅ SUPPORTED' : '❌ NOT SUPPORTED'}`);
    console.log(`   Resize Event Listener: ${viewportSupport.hasResizeEvent ? '✅ SUPPORTED' : '❌ NOT SUPPORTED'}\n`);
    
    // Test 7: Check for keyboard animation CSS transitions
    console.log('🔍 Test 7: Animation CSS Transitions');
    const animationSupport = await page.evaluate(() => {
      const container = document.querySelector('[class*="h-full"][class*="flex"][class*="flex-col"]');
      if (container) {
        const styles = window.getComputedStyle(container);
        return {
          hasTransition: styles.transition !== 'all 0s ease 0s',
          transitionDuration: styles.transitionDuration,
          transitionProperty: styles.transitionProperty
        };
      }
      return { hasTransition: false, transitionDuration: '0s', transitionProperty: 'all' };
    });
    
    console.log(`   CSS Transitions: ${animationSupport.hasTransition ? '✅ ENABLED' : '❌ DISABLED'}`);
    console.log(`   Transition Duration: ${animationSupport.transitionDuration}`);
    console.log(`   Transition Property: ${animationSupport.transitionProperty}\n`);
    
    // Summary
    console.log('📊 Test Summary:');
    console.log('================');
    const tests = [
      { name: 'Mobile Detection', passed: mobileStatus.isMobile },
      { name: 'Touch Detection', passed: mobileStatus.isTouch },
      { name: 'Input Field Exists', passed: inputExists.textareaExists },
      { name: 'Input Visible', passed: inputExists.textareaVisible },
      { name: 'Input Focused', passed: keyboardStateAfterFocus.isInputFocused },
      { name: 'Mobile CSS Classes', passed: mobileClasses.hasMobileClasses },
      { name: 'Text Input', passed: inputValue.includes('Test message') },
      { name: 'Visual Viewport API', passed: viewportSupport.hasVisualViewport },
      { name: 'CSS Transitions', passed: animationSupport.hasTransition }
    ];
    
    const passedTests = tests.filter(test => test.passed).length;
    const totalTests = tests.length;
    
    console.log(`✅ Passed: ${passedTests}/${totalTests}`);
    console.log(`❌ Failed: ${totalTests - passedTests}/${totalTests}`);
    
    if (passedTests === totalTests) {
      console.log('\n🎉 ALL TESTS PASSED! Mobile keyboard animations are working correctly!');
    } else {
      console.log('\n⚠️  Some tests failed. Check the implementation.');
    }
    
    // Keep browser open for manual inspection
    console.log('\n🔍 Browser will stay open for 10 seconds for manual inspection...');
    await page.waitForTimeout(10000);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the test
testMobileKeyboardAnimations().catch(console.error);
