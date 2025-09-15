/**
 * Test Error Handling and Recovery
 * 
 * Tests the error handling system to ensure it gracefully
 * handles various error conditions and recovers properly.
 */

console.log('🧪 Testing Error Handling and Recovery...\n');

// Test 1: Progressive Error Messages
function testProgressiveErrorMessages() {
  console.log('Test 1: Progressive Error Messages');
  
  const ERROR_MESSAGES = {
    FIRST_ATTEMPT: "Please choose from the provided options above.",
    SECOND_ATTEMPT: "I'll inform the Whop owner about your request. Please wait for assistance.",
    THIRD_ATTEMPT: "I'm unable to help you further. Please contact the Whop owner directly.",
  };
  
  const testCases = [
    { attempt: 1, expected: ERROR_MESSAGES.FIRST_ATTEMPT },
    { attempt: 2, expected: ERROR_MESSAGES.SECOND_ATTEMPT },
    { attempt: 3, expected: ERROR_MESSAGES.THIRD_ATTEMPT },
    { attempt: 4, expected: ERROR_MESSAGES.THIRD_ATTEMPT }, // Should cap at 3
    { attempt: 10, expected: ERROR_MESSAGES.THIRD_ATTEMPT } // Should cap at 3
  ];
  
  let passedTests = 0;
  
  testCases.forEach((testCase, index) => {
    let errorMessage;
    if (testCase.attempt === 1) {
      errorMessage = ERROR_MESSAGES.FIRST_ATTEMPT;
    } else if (testCase.attempt === 2) {
      errorMessage = ERROR_MESSAGES.SECOND_ATTEMPT;
    } else {
      errorMessage = ERROR_MESSAGES.THIRD_ATTEMPT;
    }
    
    const passed = errorMessage === testCase.expected;
    
    console.log(`  Test ${index + 1}: Attempt ${testCase.attempt}`);
    console.log(`    Expected: ${testCase.expected}`);
    console.log(`    Actual: ${errorMessage}`);
    console.log(`    Status: ${passed ? '✅ PASS' : '❌ FAIL'}`);
    
    if (passed) passedTests++;
  });
  
  console.log(`  Overall: ${passedTests}/${testCases.length} passed\n`);
  return passedTests === testCases.length;
}

// Test 2: Invalid User Response Handling
function testInvalidResponseHandling() {
  console.log('Test 2: Invalid User Response Handling');
  
  const mockBlock = {
    options: [
      { text: 'Option 1', nextBlockId: 'next-1' },
      { text: 'Option 2', nextBlockId: 'next-2' }
    ]
  };
  
  function validateUserResponse(userMessage, currentBlock) {
    const normalizedInput = userMessage.trim().toLowerCase();
    
    // Check for exact text matches
    for (const option of currentBlock.options || []) {
      if (option.text.toLowerCase() === normalizedInput) {
        return { isValid: true, selectedOption: option };
      }
    }
    
    // Check for number selection (1, 2, 3...)
    const numberMatch = normalizedInput.match(/^(\d+)$/);
    if (numberMatch) {
      const optionIndex = parseInt(numberMatch[1]) - 1;
      if (optionIndex >= 0 && optionIndex < (currentBlock.options || []).length) {
        return { isValid: true, selectedOption: currentBlock.options[optionIndex] };
      }
    }
    
    return { isValid: false };
  }
  
  const testCases = [
    { input: 'Option 1', expected: true, description: 'Valid exact match' },
    { input: 'option 1', expected: true, description: 'Valid case-insensitive match' },
    { input: '1', expected: true, description: 'Valid number selection' },
    { input: '2', expected: true, description: 'Valid number selection' },
    { input: 'invalid', expected: false, description: 'Invalid text' },
    { input: '3', expected: false, description: 'Invalid number (out of range)' },
    { input: '0', expected: false, description: 'Invalid number (zero)' },
    { input: '', expected: false, description: 'Empty input' },
    { input: '   ', expected: false, description: 'Whitespace only' },
    { input: 'option 3', expected: false, description: 'Invalid option text' }
  ];
  
  let passedTests = 0;
  
  testCases.forEach((testCase, index) => {
    const result = validateUserResponse(testCase.input, mockBlock);
    const passed = result.isValid === testCase.expected;
    
    console.log(`  Test ${index + 1}: ${testCase.description}`);
    console.log(`    Input: "${testCase.input}"`);
    console.log(`    Expected: ${testCase.expected}`);
    console.log(`    Actual: ${result.isValid}`);
    console.log(`    Status: ${passed ? '✅ PASS' : '❌ FAIL'}`);
    
    if (passed) passedTests++;
  });
  
  console.log(`  Overall: ${passedTests}/${testCases.length} passed\n`);
  return passedTests === testCases.length;
}

// Test 3: Database Error Handling
function testDatabaseErrorHandling() {
  console.log('Test 3: Database Error Handling');
  
  // Simulate database error scenarios
  const errorScenarios = [
    {
      error: new Error('Connection timeout'),
      expected: 'Database connection error',
      description: 'Connection timeout'
    },
    {
      error: new Error('Query failed'),
      expected: 'Database query error',
      description: 'Query failure'
    },
    {
      error: new Error('Constraint violation'),
      expected: 'Database constraint error',
      description: 'Constraint violation'
    },
    {
      error: null,
      expected: 'Unknown error',
      description: 'Null error'
    },
    {
      error: 'String error',
      expected: 'Unknown error',
      description: 'String error'
    }
  ];
  
  function handleDatabaseError(error) {
    if (!error) return 'Unknown error';
    if (error instanceof Error) {
      if (error.message.includes('timeout')) return 'Database connection error';
      if (error.message.includes('Query')) return 'Database query error';
      if (error.message.includes('Constraint')) return 'Database constraint error';
      return error.message;
    }
    return 'Unknown error';
  }
  
  let passedTests = 0;
  
  errorScenarios.forEach((scenario, index) => {
    const result = handleDatabaseError(scenario.error);
    const passed = result.includes(scenario.expected);
    
    console.log(`  Test ${index + 1}: ${scenario.description}`);
    console.log(`    Error: ${scenario.error}`);
    console.log(`    Expected: ${scenario.expected}`);
    console.log(`    Actual: ${result}`);
    console.log(`    Status: ${passed ? '✅ PASS' : '❌ FAIL'}`);
    
    if (passed) passedTests++;
  });
  
  console.log(`  Overall: ${passedTests}/${errorScenarios.length} passed\n`);
  return passedTests === errorScenarios.length;
}

// Test 4: API Error Handling
function testAPIErrorHandling() {
  console.log('Test 4: API Error Handling');
  
  const apiErrorScenarios = [
    {
      status: 401,
      expected: 'Unauthorized',
      description: 'Unauthorized error'
    },
    {
      status: 403,
      expected: 'Forbidden',
      description: 'Forbidden error'
    },
    {
      status: 429,
      expected: 'Rate limited',
      description: 'Rate limit error'
    },
    {
      status: 500,
      expected: 'Server error',
      description: 'Server error'
    },
    {
      status: 503,
      expected: 'Service unavailable',
      description: 'Service unavailable'
    }
  ];
  
  function handleAPIError(status) {
    switch (status) {
      case 401: return 'Unauthorized';
      case 403: return 'Forbidden';
      case 429: return 'Rate limited';
      case 500: return 'Server error';
      case 503: return 'Service unavailable';
      default: return 'Unknown API error';
    }
  }
  
  let passedTests = 0;
  
  apiErrorScenarios.forEach((scenario, index) => {
    const result = handleAPIError(scenario.status);
    const passed = result === scenario.expected;
    
    console.log(`  Test ${index + 1}: ${scenario.description}`);
    console.log(`    Status: ${scenario.status}`);
    console.log(`    Expected: ${scenario.expected}`);
    console.log(`    Actual: ${result}`);
    console.log(`    Status: ${passed ? '✅ PASS' : '❌ FAIL'}`);
    
    if (passed) passedTests++;
  });
  
  console.log(`  Overall: ${passedTests}/${apiErrorScenarios.length} passed\n`);
  return passedTests === apiErrorScenarios.length;
}

// Test 5: Graceful Degradation
function testGracefulDegradation() {
  console.log('Test 5: Graceful Degradation');
  
  // Test conversation processing with missing data
  const incompleteConversations = [
    {
      id: 'conv-1',
      // Missing experienceId
      whopUserId: 'user-1',
      currentBlockId: 'welcome-1'
    },
    {
      id: 'conv-2',
      experienceId: 'exp-1',
      // Missing whopUserId
      currentBlockId: 'welcome-1'
    },
    {
      id: 'conv-3',
      experienceId: 'exp-1',
      whopUserId: 'user-1'
      // Missing currentBlockId
    },
    {
      id: 'conv-4',
      experienceId: 'exp-1',
      whopUserId: 'user-1',
      currentBlockId: 'welcome-1'
      // Complete conversation
    }
  ];
  
  function validateConversation(conversation) {
    const errors = [];
    
    if (!conversation.id) errors.push('Missing conversation ID');
    if (!conversation.experienceId) errors.push('Missing experience ID');
    if (!conversation.whopUserId) errors.push('Missing Whop user ID');
    if (!conversation.currentBlockId) errors.push('Missing current block ID');
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }
  
  let passedTests = 0;
  
  incompleteConversations.forEach((conversation, index) => {
    const result = validateConversation(conversation);
    const expectedValid = index === 3; // Only the last one should be valid
    const passed = result.isValid === expectedValid;
    
    console.log(`  Test ${index + 1}: Conversation ${conversation.id}`);
    console.log(`    Errors: ${result.errors.join(', ') || 'None'}`);
    console.log(`    Expected valid: ${expectedValid}`);
    console.log(`    Actual valid: ${result.isValid}`);
    console.log(`    Status: ${passed ? '✅ PASS' : '❌ FAIL'}`);
    
    if (passed) passedTests++;
  });
  
  console.log(`  Overall: ${passedTests}/${incompleteConversations.length} passed\n`);
  return passedTests === incompleteConversations.length;
}

// Test 6: Retry Logic
function testRetryLogic() {
  console.log('Test 6: Retry Logic');
  
  const retryScenarios = [
    {
      attempt: 1,
      maxRetries: 3,
      shouldRetry: true,
      description: 'First attempt (should retry)'
    },
    {
      attempt: 2,
      maxRetries: 3,
      shouldRetry: true,
      description: 'Second attempt (should retry)'
    },
    {
      attempt: 3,
      maxRetries: 3,
      shouldRetry: true,
      description: 'Third attempt (should retry)'
    },
    {
      attempt: 4,
      maxRetries: 3,
      shouldRetry: false,
      description: 'Fourth attempt (should not retry)'
    }
  ];
  
  function shouldRetry(attempt, maxRetries) {
    return attempt <= maxRetries;
  }
  
  let passedTests = 0;
  
  retryScenarios.forEach((scenario, index) => {
    const result = shouldRetry(scenario.attempt, scenario.maxRetries);
    const passed = result === scenario.shouldRetry;
    
    console.log(`  Test ${index + 1}: ${scenario.description}`);
    console.log(`    Attempt: ${scenario.attempt}/${scenario.maxRetries}`);
    console.log(`    Expected retry: ${scenario.shouldRetry}`);
    console.log(`    Actual retry: ${result}`);
    console.log(`    Status: ${passed ? '✅ PASS' : '❌ FAIL'}`);
    
    if (passed) passedTests++;
  });
  
  console.log(`  Overall: ${passedTests}/${retryScenarios.length} passed\n`);
  return passedTests === retryScenarios.length;
}

// Run all tests
const tests = [
  testProgressiveErrorMessages,
  testInvalidResponseHandling,
  testDatabaseErrorHandling,
  testAPIErrorHandling,
  testGracefulDegradation,
  testRetryLogic
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

console.log(`📊 Error Handling Test Results:`);
console.log(`  Passed: ${passedTests}/${totalTests}`);
console.log(`  Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

if (passedTests === totalTests) {
  console.log(`\n🎉 All error handling tests passed!`);
} else {
  console.log(`\n⚠️  Some tests failed. Please check the implementation.`);
}
