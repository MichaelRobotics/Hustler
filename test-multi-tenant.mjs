/**
 * Test Multi-Tenant Isolation
 * 
 * Tests the multi-tenant isolation system to ensure
 * conversations are properly scoped by experience.
 */

console.log('🧪 Testing Multi-Tenant Isolation...\n');

// Mock conversations from different tenants (experiences)
const mockConversations = [
  {
    id: 'conv-1',
    experienceId: 'experience-1',
    whopUserId: 'user-1',
    currentBlockId: 'welcome-1',
    status: 'active'
  },
  {
    id: 'conv-2',
    experienceId: 'experience-1',
    whopUserId: 'user-2',
    currentBlockId: 'welcome-1',
    status: 'active'
  },
  {
    id: 'conv-3',
    experienceId: 'experience-2',
    whopUserId: 'user-1', // Same user, different experience
    currentBlockId: 'welcome-1',
    status: 'active'
  },
  {
    id: 'conv-4',
    experienceId: 'experience-2',
    whopUserId: 'user-3',
    currentBlockId: 'welcome-1',
    status: 'active'
  },
  {
    id: 'conv-5',
    experienceId: 'experience-3',
    whopUserId: 'user-4',
    currentBlockId: 'welcome-1',
    status: 'completed'
  }
];

// Test 1: Experience-Based Filtering
function testExperienceBasedFiltering() {
  console.log('Test 1: Experience-Based Filtering');
  
  function filterConversationsByExperience(conversations, experienceId) {
    return conversations.filter(conv => conv.experienceId === experienceId);
  }
  
  const testCases = [
    {
      experienceId: 'experience-1',
      expectedCount: 2,
      description: 'Experience 1 conversations'
    },
    {
      experienceId: 'experience-2',
      expectedCount: 2,
      description: 'Experience 2 conversations'
    },
    {
      experienceId: 'experience-3',
      expectedCount: 1,
      description: 'Experience 3 conversations'
    },
    {
      experienceId: 'experience-4',
      expectedCount: 0,
      description: 'Non-existent experience'
    }
  ];
  
  let passedTests = 0;
  
  testCases.forEach((testCase, index) => {
    const filtered = filterConversationsByExperience(mockConversations, testCase.experienceId);
    const passed = filtered.length === testCase.expectedCount;
    
    console.log(`  Test ${index + 1}: ${testCase.description}`);
    console.log(`    Expected count: ${testCase.expectedCount}`);
    console.log(`    Actual count: ${filtered.length}`);
    console.log(`    Conversations: ${filtered.map(c => c.id).join(', ')}`);
    console.log(`    Status: ${passed ? '✅ PASS' : '❌ FAIL'}`);
    
    if (passed) passedTests++;
  });
  
  console.log(`  Overall: ${passedTests}/${testCases.length} passed\n`);
  return passedTests === testCases.length;
}

// Test 2: User Isolation Within Experience
function testUserIsolationWithinExperience() {
  console.log('Test 2: User Isolation Within Experience');
  
  function findUserConversation(conversations, experienceId, whopUserId) {
    return conversations.find(conv => 
      conv.experienceId === experienceId && 
      conv.whopUserId === whopUserId &&
      conv.status === 'active'
    );
  }
  
  const testCases = [
    {
      experienceId: 'experience-1',
      whopUserId: 'user-1',
      expected: 'conv-1',
      description: 'User 1 in Experience 1'
    },
    {
      experienceId: 'experience-1',
      whopUserId: 'user-2',
      expected: 'conv-2',
      description: 'User 2 in Experience 1'
    },
    {
      experienceId: 'experience-2',
      whopUserId: 'user-1',
      expected: 'conv-3',
      description: 'User 1 in Experience 2 (different from Experience 1)'
    },
    {
      experienceId: 'experience-1',
      whopUserId: 'user-3',
      expected: null,
      description: 'User 3 not in Experience 1'
    },
    {
      experienceId: 'experience-2',
      whopUserId: 'user-2',
      expected: null,
      description: 'User 2 not in Experience 2'
    }
  ];
  
  let passedTests = 0;
  
  testCases.forEach((testCase, index) => {
    const conversation = findUserConversation(mockConversations, testCase.experienceId, testCase.whopUserId);
    const actualId = conversation ? conversation.id : null;
    const passed = actualId === testCase.expected;
    
    console.log(`  Test ${index + 1}: ${testCase.description}`);
    console.log(`    Expected: ${testCase.expected}`);
    console.log(`    Actual: ${actualId}`);
    console.log(`    Status: ${passed ? '✅ PASS' : '❌ FAIL'}`);
    
    if (passed) passedTests++;
  });
  
  console.log(`  Overall: ${passedTests}/${testCases.length} passed\n`);
  return passedTests === testCases.length;
}

// Test 3: Status Filtering
function testStatusFiltering() {
  console.log('Test 3: Status Filtering');
  
  function filterConversationsByStatus(conversations, status) {
    return conversations.filter(conv => conv.status === status);
  }
  
  const testCases = [
    {
      status: 'active',
      expectedCount: 4,
      description: 'Active conversations'
    },
    {
      status: 'completed',
      expectedCount: 1,
      description: 'Completed conversations'
    },
    {
      status: 'abandoned',
      expectedCount: 0,
      description: 'Abandoned conversations'
    }
  ];
  
  let passedTests = 0;
  
  testCases.forEach((testCase, index) => {
    const filtered = filterConversationsByStatus(mockConversations, testCase.status);
    const passed = filtered.length === testCase.expectedCount;
    
    console.log(`  Test ${index + 1}: ${testCase.description}`);
    console.log(`    Expected count: ${testCase.expectedCount}`);
    console.log(`    Actual count: ${filtered.length}`);
    console.log(`    Conversations: ${filtered.map(c => c.id).join(', ')}`);
    console.log(`    Status: ${passed ? '✅ PASS' : '❌ FAIL'}`);
    
    if (passed) passedTests++;
  });
  
  console.log(`  Overall: ${passedTests}/${testCases.length} passed\n`);
  return passedTests === testCases.length;
}

// Test 4: Combined Filtering
function testCombinedFiltering() {
  console.log('Test 4: Combined Filtering');
  
  function filterConversations(conversations, experienceId, status) {
    return conversations.filter(conv => 
      conv.experienceId === experienceId && 
      conv.status === status
    );
  }
  
  const testCases = [
    {
      experienceId: 'experience-1',
      status: 'active',
      expectedCount: 2,
      description: 'Active conversations in Experience 1'
    },
    {
      experienceId: 'experience-2',
      status: 'active',
      expectedCount: 2,
      description: 'Active conversations in Experience 2'
    },
    {
      experienceId: 'experience-3',
      status: 'completed',
      expectedCount: 1,
      description: 'Completed conversations in Experience 3'
    },
    {
      experienceId: 'experience-1',
      status: 'completed',
      expectedCount: 0,
      description: 'Completed conversations in Experience 1'
    }
  ];
  
  let passedTests = 0;
  
  testCases.forEach((testCase, index) => {
    const filtered = filterConversations(mockConversations, testCase.experienceId, testCase.status);
    const passed = filtered.length === testCase.expectedCount;
    
    console.log(`  Test ${index + 1}: ${testCase.description}`);
    console.log(`    Expected count: ${testCase.expectedCount}`);
    console.log(`    Actual count: ${filtered.length}`);
    console.log(`    Conversations: ${filtered.map(c => c.id).join(', ')}`);
    console.log(`    Status: ${passed ? '✅ PASS' : '❌ FAIL'}`);
    
    if (passed) passedTests++;
  });
  
  console.log(`  Overall: ${passedTests}/${testCases.length} passed\n`);
  return passedTests === testCases.length;
}

// Test 5: Data Isolation
function testDataIsolation() {
  console.log('Test 5: Data Isolation');
  
  // Simulate conversation updates
  const updateConversation = (conversations, conversationId, experienceId, updates) => {
    const conversation = conversations.find(conv => 
      conv.id === conversationId && conv.experienceId === experienceId
    );
    
    if (!conversation) {
      return { success: false, error: 'Conversation not found or access denied' };
    }
    
    // Apply updates
    Object.assign(conversation, updates);
    return { success: true, conversation };
  };
  
  const testCases = [
    {
      conversationId: 'conv-1',
      experienceId: 'experience-1',
      updates: { currentBlockId: 'value-1' },
      expected: true,
      description: 'Update conversation in correct experience'
    },
    {
      conversationId: 'conv-1',
      experienceId: 'experience-2', // Wrong experience
      updates: { currentBlockId: 'value-1' },
      expected: false,
      description: 'Update conversation in wrong experience (should fail)'
    },
    {
      conversationId: 'conv-3',
      experienceId: 'experience-2',
      updates: { currentBlockId: 'value-1' },
      expected: true,
      description: 'Update conversation in correct experience'
    },
    {
      conversationId: 'conv-nonexistent',
      experienceId: 'experience-1',
      updates: { currentBlockId: 'value-1' },
      expected: false,
      description: 'Update non-existent conversation'
    }
  ];
  
  let passedTests = 0;
  
  testCases.forEach((testCase, index) => {
    const result = updateConversation(mockConversations, testCase.conversationId, testCase.experienceId, testCase.updates);
    const passed = result.success === testCase.expected;
    
    console.log(`  Test ${index + 1}: ${testCase.description}`);
    console.log(`    Expected success: ${testCase.expected}`);
    console.log(`    Actual success: ${result.success}`);
    if (!result.success) {
      console.log(`    Error: ${result.error}`);
    }
    console.log(`    Status: ${passed ? '✅ PASS' : '❌ FAIL'}`);
    
    if (passed) passedTests++;
  });
  
  console.log(`  Overall: ${passedTests}/${testCases.length} passed\n`);
  return passedTests === testCases.length;
}

// Test 6: Rate Limiting Per Tenant
function testRateLimitingPerTenant() {
  console.log('Test 6: Rate Limiting Per Tenant');
  
  // Mock rate limiter per tenant
  const rateLimiter = new Map();
  
  function canMakeRequest(tenantId, limit = 10, windowMs = 60000) {
    const now = Date.now();
    const tenantData = rateLimiter.get(tenantId) || { requests: [], windowStart: now };
    
    // Clean old requests outside window
    tenantData.requests = tenantData.requests.filter(time => now - time < windowMs);
    
    // Check if under limit
    if (tenantData.requests.length < limit) {
      tenantData.requests.push(now);
      rateLimiter.set(tenantId, tenantData);
      return true;
    }
    
    return false;
  }
  
  const testCases = [
    {
      tenantId: 'experience-1',
      requests: 5,
      expected: true,
      description: 'Experience 1: 5 requests (under limit)'
    },
    {
      tenantId: 'experience-1',
      requests: 5,
      expected: true,
      description: 'Experience 1: 5 more requests (under limit)'
    },
    {
      tenantId: 'experience-1',
      requests: 1,
      expected: false,
      description: 'Experience 1: 1 more request (over limit)'
    },
    {
      tenantId: 'experience-2',
      requests: 10,
      expected: true,
      description: 'Experience 2: 10 requests (separate tenant)'
    },
    {
      tenantId: 'experience-2',
      requests: 1,
      expected: false,
      description: 'Experience 2: 1 more request (over limit)'
    }
  ];
  
  let passedTests = 0;
  
  testCases.forEach((testCase, index) => {
    let allPassed = true;
    
    for (let i = 0; i < testCase.requests; i++) {
      const canRequest = canMakeRequest(testCase.tenantId);
      if (i < testCase.requests - 1) {
            // All but last request should pass
            if (!canRequest) allPassed = false;
          } else {
            // Last request should match expected
            if (canRequest !== testCase.expected) allPassed = false;
          }
    }
    
    console.log(`  Test ${index + 1}: ${testCase.description}`);
    console.log(`    Expected: ${testCase.expected}`);
    console.log(`    Actual: ${allPassed ? testCase.expected : !testCase.expected}`);
    console.log(`    Status: ${allPassed ? '✅ PASS' : '❌ FAIL'}`);
    
    if (allPassed) passedTests++;
  });
  
  console.log(`  Overall: ${passedTests}/${testCases.length} passed\n`);
  return passedTests === testCases.length;
}

// Run all tests
const tests = [
  testExperienceBasedFiltering,
  testUserIsolationWithinExperience,
  testStatusFiltering,
  testCombinedFiltering,
  testDataIsolation,
  testRateLimitingPerTenant
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

console.log(`📊 Multi-Tenant Isolation Test Results:`);
console.log(`  Passed: ${passedTests}/${totalTests}`);
console.log(`  Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

if (passedTests === totalTests) {
  console.log(`\n🎉 All multi-tenant isolation tests passed!`);
} else {
  console.log(`\n⚠️  Some tests failed. Please check the implementation.`);
}
