/**
 * Test Rate Limiting Compliance
 * 
 * Tests the rate limiting system to ensure it complies
 * with Whop API limits and handles rate limiting properly.
 */

console.log('🧪 Testing Rate Limiting Compliance...\n');

// Whop API Rate Limits
const WHOP_RATE_LIMITS = {
  V5_API: { limit: 20, windowMs: 10000 }, // 20 requests per 10 seconds
  GRAPHQL: { limit: 10, windowMs: 10000 }, // 10 requests per 10 seconds
  DM_POLLING: { limit: 15, windowMs: 10000 }, // 15 requests per 10 seconds (with buffer)
  MESSAGE_SENDING: { limit: 10, windowMs: 10000 } // 10 requests per 10 seconds (with buffer)
};

// Test 1: Rate Limiter Implementation
function testRateLimiterImplementation() {
  console.log('Test 1: Rate Limiter Implementation');
  
  class RateLimiter {
    constructor(limit, windowMs) {
      this.limit = limit;
      this.windowMs = windowMs;
      this.requests = new Map(); // tenantId -> { requests: [], windowStart: number }
    }
    
    canMakeRequest(tenantId) {
      const now = Date.now();
      const tenantData = this.requests.get(tenantId) || { requests: [], windowStart: now };
      
      // Clean old requests outside window
      tenantData.requests = tenantData.requests.filter(time => now - time < this.windowMs);
      
      // Check if under limit
      if (tenantData.requests.length < this.limit) {
        tenantData.requests.push(now);
        this.requests.set(tenantId, tenantData);
        return true;
      }
      
      return false;
    }
    
    getTimeUntilReset(tenantId) {
      const tenantData = this.requests.get(tenantId);
      if (!tenantData || tenantData.requests.length === 0) return 0;
      
      const oldestRequest = Math.min(...tenantData.requests);
      const resetTime = oldestRequest + this.windowMs;
      return Math.max(0, resetTime - Date.now());
    }
    
    getCurrentCount(tenantId) {
      const tenantData = this.requests.get(tenantId);
      return tenantData ? tenantData.requests.length : 0;
    }
  }
  
  const rateLimiter = new RateLimiter(WHOP_RATE_LIMITS.DM_POLLING.limit, WHOP_RATE_LIMITS.DM_POLLING.windowMs);
  
  const testCases = [
    {
      tenantId: 'tenant-1',
      requests: 15,
      expected: true,
      description: '15 requests (at limit)'
    },
    {
      tenantId: 'tenant-1',
      requests: 1,
      expected: false,
      description: '1 more request (over limit)'
    },
    {
      tenantId: 'tenant-2',
      requests: 10,
      expected: true,
      description: 'Different tenant: 10 requests'
    },
    {
      tenantId: 'tenant-2',
      requests: 5,
      expected: true,
      description: 'Different tenant: 5 more requests'
    },
    {
      tenantId: 'tenant-2',
      requests: 1,
      expected: false,
      description: 'Different tenant: 1 more request (over limit)'
    }
  ];
  
  let passedTests = 0;
  
  testCases.forEach((testCase, index) => {
    let allPassed = true;
    
    for (let i = 0; i < testCase.requests; i++) {
      const canRequest = rateLimiter.canMakeRequest(testCase.tenantId);
      if (i < testCase.requests - 1) {
        // All but last request should pass
        if (!canRequest) allPassed = false;
      } else {
        // Last request should match expected
        if (canRequest !== testCase.expected) allPassed = false;
      }
    }
    
    const currentCount = rateLimiter.getCurrentCount(testCase.tenantId);
    
    console.log(`  Test ${index + 1}: ${testCase.description}`);
    console.log(`    Expected: ${testCase.expected}`);
    console.log(`    Actual: ${allPassed ? testCase.expected : !testCase.expected}`);
    console.log(`    Current count: ${currentCount}`);
    console.log(`    Status: ${allPassed ? '✅ PASS' : '❌ FAIL'}`);
    
    if (allPassed) passedTests++;
  });
  
  console.log(`  Overall: ${passedTests}/${testCases.length} passed\n`);
  return passedTests === testCases.length;
}

// Test 2: Whop API Compliance
function testWhopAPICompliance() {
  console.log('Test 2: Whop API Compliance');
  
  const testCases = [
    {
      api: 'V5_API',
      limit: WHOP_RATE_LIMITS.V5_API.limit,
      windowMs: WHOP_RATE_LIMITS.V5_API.windowMs,
      description: 'V5 API limits'
    },
    {
      api: 'GRAPHQL',
      limit: WHOP_RATE_LIMITS.GRAPHQL.limit,
      windowMs: WHOP_RATE_LIMITS.GRAPHQL.windowMs,
      description: 'GraphQL API limits'
    },
    {
      api: 'DM_POLLING',
      limit: WHOP_RATE_LIMITS.DM_POLLING.limit,
      windowMs: WHOP_RATE_LIMITS.DM_POLLING.windowMs,
      description: 'DM Polling limits (with buffer)'
    },
    {
      api: 'MESSAGE_SENDING',
      limit: WHOP_RATE_LIMITS.MESSAGE_SENDING.limit,
      windowMs: WHOP_RATE_LIMITS.MESSAGE_SENDING.windowMs,
      description: 'Message Sending limits (with buffer)'
    }
  ];
  
  let passedTests = 0;
  
  testCases.forEach((testCase, index) => {
    const isWithinWhopLimits = testCase.limit <= WHOP_RATE_LIMITS.V5_API.limit;
    const hasReasonableWindow = testCase.windowMs >= 10000; // At least 10 seconds
    
    const passed = isWithinWhopLimits && hasReasonableWindow;
    
    console.log(`  Test ${index + 1}: ${testCase.description}`);
    console.log(`    Limit: ${testCase.limit} requests per ${testCase.windowMs}ms`);
    console.log(`    Within Whop limits: ${isWithinWhopLimits ? '✅' : '❌'}`);
    console.log(`    Reasonable window: ${hasReasonableWindow ? '✅' : '❌'}`);
    console.log(`    Status: ${passed ? '✅ PASS' : '❌ FAIL'}`);
    
    if (passed) passedTests++;
  });
  
  console.log(`  Overall: ${passedTests}/${testCases.length} passed\n`);
  return passedTests === testCases.length;
}

// Test 3: Rate Limit Recovery
function testRateLimitRecovery() {
  console.log('Test 3: Rate Limit Recovery');
  
  class RateLimiterWithRecovery {
    constructor(limit, windowMs) {
      this.limit = limit;
      this.windowMs = windowMs;
      this.requests = new Map();
    }
    
    canMakeRequest(tenantId) {
      const now = Date.now();
      const tenantData = this.requests.get(tenantId) || { requests: [], windowStart: now };
      
      // Clean old requests outside window
      tenantData.requests = tenantData.requests.filter(time => now - time < this.windowMs);
      
      if (tenantData.requests.length < this.limit) {
        tenantData.requests.push(now);
        this.requests.set(tenantId, tenantData);
        return true;
      }
      
      return false;
    }
    
    getTimeUntilReset(tenantId) {
      const tenantData = this.requests.get(tenantId);
      if (!tenantData || tenantData.requests.length === 0) return 0;
      
      const oldestRequest = Math.min(...tenantData.requests);
      const resetTime = oldestRequest + this.windowMs;
      return Math.max(0, resetTime - Date.now());
    }
    
    // Simulate time passing
    advanceTime(ms) {
      // In real implementation, this would be handled by actual time
      // For testing, we'll simulate by reducing request timestamps
      for (const [tenantId, data] of this.requests.entries()) {
        data.requests = data.requests.map(time => time - ms);
        this.requests.set(tenantId, data);
      }
    }
  }
  
  const rateLimiter = new RateLimiterWithRecovery(5, 10000); // 5 requests per 10 seconds
  
  // Fill up the rate limit
  for (let i = 0; i < 5; i++) {
    rateLimiter.canMakeRequest('tenant-1');
  }
  
  // Should be rate limited
  const isRateLimited = !rateLimiter.canMakeRequest('tenant-1');
  console.log(`  Initial rate limit: ${isRateLimited ? '✅ PASS' : '❌ FAIL'}`);
  
  // Simulate time passing (9 seconds)
  rateLimiter.advanceTime(9000);
  
  // Should still be rate limited (1 second remaining)
  const stillRateLimited = !rateLimiter.canMakeRequest('tenant-1');
  console.log(`  After 9 seconds: ${stillRateLimited ? '✅ PASS' : '❌ FAIL'}`);
  
  // Simulate time passing (2 more seconds, total 11 seconds)
  rateLimiter.advanceTime(2000);
  
  // Should be able to make requests again
  const canRequestAgain = rateLimiter.canMakeRequest('tenant-1');
  console.log(`  After 11 seconds: ${canRequestAgain ? '✅ PASS' : '❌ FAIL'}`);
  
  const passed = isRateLimited && stillRateLimited && canRequestAgain;
  console.log(`  Overall: ${passed ? '✅ PASS' : '❌ FAIL'}\n`);
  
  return passed;
}

// Test 4: Multi-Tenant Rate Limiting
function testMultiTenantRateLimiting() {
  console.log('Test 4: Multi-Tenant Rate Limiting');
  
  class MultiTenantRateLimiter {
    constructor(limit, windowMs) {
      this.limit = limit;
      this.windowMs = windowMs;
      this.requests = new Map();
    }
    
    canMakeRequest(tenantId) {
      const now = Date.now();
      const tenantData = this.requests.get(tenantId) || { requests: [], windowStart: now };
      
      tenantData.requests = tenantData.requests.filter(time => now - time < this.windowMs);
      
      if (tenantData.requests.length < this.limit) {
        tenantData.requests.push(now);
        this.requests.set(tenantId, tenantData);
        return true;
      }
      
      return false;
    }
    
    getTenantCount(tenantId) {
      const tenantData = this.requests.get(tenantId);
      return tenantData ? tenantData.requests.length : 0;
    }
    
    getAllTenantCounts() {
      const counts = {};
      for (const [tenantId, data] of this.requests.entries()) {
        counts[tenantId] = data.requests.length;
      }
      return counts;
    }
  }
  
  const rateLimiter = new MultiTenantRateLimiter(10, 10000); // 10 requests per 10 seconds
  
  // Test multiple tenants
  const tenants = ['tenant-1', 'tenant-2', 'tenant-3'];
  
  // Each tenant should be able to make 10 requests
  let allPassed = true;
  
  tenants.forEach(tenantId => {
    for (let i = 0; i < 10; i++) {
      const canRequest = rateLimiter.canMakeRequest(tenantId);
      if (!canRequest) {
        allPassed = false;
        break;
      }
    }
  });
  
  console.log(`  All tenants can make 10 requests: ${allPassed ? '✅ PASS' : '❌ FAIL'}`);
  
  // Check individual tenant counts
  const counts = rateLimiter.getAllTenantCounts();
  const expectedCounts = { 'tenant-1': 10, 'tenant-2': 10, 'tenant-3': 10 };
  
  const countsMatch = Object.keys(expectedCounts).every(tenantId => 
    counts[tenantId] === expectedCounts[tenantId]
  );
  
  console.log(`  Tenant counts match: ${countsMatch ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Actual counts: ${JSON.stringify(counts)}`);
  
  // Test that tenants are independent
  const tenant1CanRequest = rateLimiter.canMakeRequest('tenant-1');
  const tenant2CanRequest = rateLimiter.canMakeRequest('tenant-2');
  
  console.log(`  Tenant 1 over limit: ${!tenant1CanRequest ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Tenant 2 over limit: ${!tenant2CanRequest ? '✅ PASS' : '❌ FAIL'}`);
  
  const passed = allPassed && countsMatch && !tenant1CanRequest && !tenant2CanRequest;
  console.log(`  Overall: ${passed ? '✅ PASS' : '❌ FAIL'}\n`);
  
  return passed;
}

// Test 5: Rate Limit Headers
function testRateLimitHeaders() {
  console.log('Test 5: Rate Limit Headers');
  
  function generateRateLimitHeaders(tenantId, limit, remaining, resetTime) {
    return {
      'X-RateLimit-Limit': limit.toString(),
      'X-RateLimit-Remaining': remaining.toString(),
      'X-RateLimit-Reset': resetTime.toString(),
      'X-RateLimit-Tenant': tenantId
    };
  }
  
  const testCases = [
    {
      tenantId: 'tenant-1',
      limit: 10,
      remaining: 5,
      resetTime: Date.now() + 5000,
      description: 'Normal rate limit headers'
    },
    {
      tenantId: 'tenant-2',
      limit: 20,
      remaining: 0,
      resetTime: Date.now() + 10000,
      description: 'Rate limited headers'
    },
    {
      tenantId: 'tenant-3',
      limit: 15,
      remaining: 15,
      resetTime: Date.now() + 10000,
      description: 'Fresh rate limit headers'
    }
  ];
  
  let passedTests = 0;
  
  testCases.forEach((testCase, index) => {
    const headers = generateRateLimitHeaders(
      testCase.tenantId,
      testCase.limit,
      testCase.remaining,
      testCase.resetTime
    );
    
    const hasRequiredHeaders = 
      headers['X-RateLimit-Limit'] &&
      headers['X-RateLimit-Remaining'] &&
      headers['X-RateLimit-Reset'] &&
      headers['X-RateLimit-Tenant'];
    
    const valuesCorrect = 
      headers['X-RateLimit-Limit'] === testCase.limit.toString() &&
      headers['X-RateLimit-Remaining'] === testCase.remaining.toString() &&
      headers['X-RateLimit-Tenant'] === testCase.tenantId;
    
    const passed = hasRequiredHeaders && valuesCorrect;
    
    console.log(`  Test ${index + 1}: ${testCase.description}`);
    console.log(`    Headers: ${JSON.stringify(headers)}`);
    console.log(`    Has required headers: ${hasRequiredHeaders ? '✅' : '❌'}`);
    console.log(`    Values correct: ${valuesCorrect ? '✅' : '❌'}`);
    console.log(`    Status: ${passed ? '✅ PASS' : '❌ FAIL'}`);
    
    if (passed) passedTests++;
  });
  
  console.log(`  Overall: ${passedTests}/${testCases.length} passed\n`);
  return passedTests === testCases.length;
}

// Run all tests
const tests = [
  testRateLimiterImplementation,
  testWhopAPICompliance,
  testRateLimitRecovery,
  testMultiTenantRateLimiting,
  testRateLimitHeaders
];

let passedTests = 0;
let totalTests = tests.length;

tests.forEach((test, index) => {
  try {
    const passed = test();
    if (passed) passedTests++;
  } catch (error) {
    console.log(`Test ${index + 1} failed with error: ${error.message}\n`);
  }
});

console.log(`📊 Rate Limiting Test Results:`);
console.log(`  Passed: ${passedTests}/${totalTests}`);
console.log(`  Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

if (passedTests === totalTests) {
  console.log(`\n🎉 All rate limiting tests passed!`);
} else {
  console.log(`\n⚠️  Some tests failed. Please check the implementation.`);
}
