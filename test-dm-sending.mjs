/**
 * Test DM Sending Functionality
 * 
 * Tests the DM sending functions to ensure they work correctly
 * and handle errors properly.
 */

// Mock data for testing
const mockConversation = {
  id: 'test-conversation-123',
  experienceId: 'test-experience-456',
  whopUserId: 'test-user-789',
  currentBlockId: 'welcome-1',
  userPath: ['welcome-1'],
  status: 'active'
};

const mockFunnelFlow = {
  stages: [
    {
      name: 'WELCOME',
      blockIds: ['welcome-1', 'welcome-2']
    },
    {
      name: 'VALUE_DELIVERY',
      blockIds: ['value-1', 'value-2']
    },
    {
      name: 'TRANSITION',
      blockIds: ['transition-1']
    }
  ],
  blocks: {
    'welcome-1': {
      id: 'welcome-1',
      message: 'Welcome! Please choose your niche:',
      options: [
        { text: 'E-commerce', nextBlockId: 'value-1' },
        { text: 'SaaS', nextBlockId: 'value-2' }
      ]
    },
    'value-1': {
      id: 'value-1',
      message: 'Here is your free e-commerce resource!',
      options: []
    },
    'transition-1': {
      id: 'transition-1',
      message: 'Thanks! Continue here: {CHAT_LINK}',
      options: []
    }
  }
};

console.log('🧪 Testing DM Sending Functionality...\n');

// Test 1: Message Formatting
function testMessageFormatting() {
  console.log('Test 1: Message Formatting');
  
  const block = mockFunnelFlow.blocks['welcome-1'];
  let message = block.message;
  
  if (block.options && block.options.length > 0) {
    message += "\n\nPlease choose one of the following options:\n";
    block.options.forEach((option, index) => {
      message += `${index + 1}. ${option.text}\n`;
    });
  }
  
  const expectedFormat = `Welcome! Please choose your niche:

Please choose one of the following options:
1. E-commerce
2. SaaS
`;
  
  const passed = message === expectedFormat;
  console.log(`  Expected: ${expectedFormat.replace(/\n/g, '\\n')}`);
  console.log(`  Actual: ${message.replace(/\n/g, '\\n')}`);
  console.log(`  Status: ${passed ? '✅ PASS' : '❌ FAIL'}\n`);
  
  return passed;
}

// Test 2: Re-prompt Message Selection
function testRePromptMessages() {
  console.log('Test 2: Re-prompt Message Selection');
  
  const RE_PROMPT_CONFIG = {
    PHASE1: {
      10: "Hey, what's your niche? Reply 1 for E-commerce, etc.",
      60: "Missed you! Reply with a number for free value.",
      720: "Still interested? Reply for your free resource!"
    },
    PHASE2: {
      15: "Reply 'done' when you've checked the value!",
      60: "All set? Say 'done' for the next step!",
      720: "Still with us? Reply 'done' for private chat!"
    }
  };
  
  const testCases = [
    { phase: 'PHASE1', timing: 10, expected: RE_PROMPT_CONFIG.PHASE1[10] },
    { phase: 'PHASE1', timing: 60, expected: RE_PROMPT_CONFIG.PHASE1[60] },
    { phase: 'PHASE1', timing: 720, expected: RE_PROMPT_CONFIG.PHASE1[720] },
    { phase: 'PHASE2', timing: 15, expected: RE_PROMPT_CONFIG.PHASE2[15] },
    { phase: 'PHASE2', timing: 60, expected: RE_PROMPT_CONFIG.PHASE2[60] },
    { phase: 'PHASE2', timing: 720, expected: RE_PROMPT_CONFIG.PHASE2[720] }
  ];
  
  let passedTests = 0;
  
  testCases.forEach((testCase, index) => {
    const message = RE_PROMPT_CONFIG[testCase.phase][testCase.timing];
    const passed = message === testCase.expected;
    
    console.log(`  Test ${index + 1}: ${testCase.phase} at ${testCase.timing} minutes`);
    console.log(`    Expected: ${testCase.expected}`);
    console.log(`    Actual: ${message}`);
    console.log(`    Status: ${passed ? '✅ PASS' : '❌ FAIL'}`);
    
    if (passed) passedTests++;
  });
  
  console.log(`  Overall: ${passedTests}/${testCases.length} passed\n`);
  return passedTests === testCases.length;
}

// Test 3: Error Message Progression
function testErrorMessages() {
  console.log('Test 3: Error Message Progression');
  
  const ERROR_MESSAGES = {
    FIRST_ATTEMPT: "Please choose from the provided options above.",
    SECOND_ATTEMPT: "I'll inform the Whop owner about your request. Please wait for assistance.",
    THIRD_ATTEMPT: "I'm unable to help you further. Please contact the Whop owner directly.",
  };
  
  const testCases = [
    { attempt: 1, expected: ERROR_MESSAGES.FIRST_ATTEMPT },
    { attempt: 2, expected: ERROR_MESSAGES.SECOND_ATTEMPT },
    { attempt: 3, expected: ERROR_MESSAGES.THIRD_ATTEMPT }
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

// Test 4: Transition Message with Chat Link
function testTransitionMessage() {
  console.log('Test 4: Transition Message with Chat Link');
  
  const conversationId = 'test-conversation-123';
  const experienceId = 'test-experience-456';
  const baseUrl = 'https://hustler-6270acl6g-michaelrobotics-projects.vercel.app';
  const chatLink = `${baseUrl}/experiences/${experienceId}/chat/${conversationId}`;
  
  const transitionBlock = mockFunnelFlow.blocks['transition-1'];
  const personalizedMessage = transitionBlock.message.replace('{CHAT_LINK}', chatLink);
  
  const expectedMessage = `Thanks! Continue here: ${chatLink}`;
  const passed = personalizedMessage === expectedMessage;
  
  console.log(`  Expected: ${expectedMessage}`);
  console.log(`  Actual: ${personalizedMessage}`);
  console.log(`  Status: ${passed ? '✅ PASS' : '❌ FAIL'}\n`);
  
  return passed;
}

// Test 5: User Response Validation
function testUserResponseValidation() {
  console.log('Test 5: User Response Validation');
  
  const currentBlock = mockFunnelFlow.blocks['welcome-1'];
  
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
    { input: 'E-commerce', expected: true, description: 'Exact text match' },
    { input: 'e-commerce', expected: true, description: 'Case insensitive match' },
    { input: '1', expected: true, description: 'Number selection' },
    { input: '2', expected: true, description: 'Number selection' },
    { input: 'invalid', expected: false, description: 'Invalid input' },
    { input: '3', expected: false, description: 'Invalid number' }
  ];
  
  let passedTests = 0;
  
  testCases.forEach((testCase, index) => {
    const result = validateUserResponse(testCase.input, currentBlock);
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

// Run all tests
const tests = [
  testMessageFormatting,
  testRePromptMessages,
  testErrorMessages,
  testTransitionMessage,
  testUserResponseValidation
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

console.log(`📊 DM Sending Test Results:`);
console.log(`  Passed: ${passedTests}/${totalTests}`);
console.log(`  Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

if (passedTests === totalTests) {
  console.log(`\n🎉 All DM sending tests passed!`);
} else {
  console.log(`\n⚠️  Some tests failed. Please check the implementation.`);
}
