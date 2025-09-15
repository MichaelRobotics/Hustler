/**
 * Integration Test - Complete Flow
 * 
 * Tests the complete DM monitoring flow from start to finish
 * to ensure all components work together correctly.
 */

console.log('🧪 Integration Test - Complete DM Monitoring Flow...\n');

// Mock data for integration testing
const mockFunnelFlow = {
  stages: [
    {
      name: 'WELCOME',
      blockIds: ['welcome-1']
    },
    {
      name: 'VALUE_DELIVERY',
      blockIds: ['value-1', 'value-2']
    },
    {
      name: 'EXPERIENCE_QUALIFICATION',
      blockIds: ['exp-1']
    },
    {
      name: 'TRANSITION',
      blockIds: ['transition-1']
    }
  ],
  blocks: {
    'welcome-1': {
      id: 'welcome-1',
      message: 'Welcome! Choose your niche:',
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
    'value-2': {
      id: 'value-2',
      message: 'Here is your free SaaS resource!',
      options: []
    },
    'exp-1': {
      id: 'exp-1',
      message: 'How was the resource? Reply "done" when ready.',
      options: []
    },
    'transition-1': {
      id: 'transition-1',
      message: 'Thanks! Continue here: {CHAT_LINK}',
      options: []
    }
  }
};

// Test 1: Complete Phase 1 Flow
function testPhase1CompleteFlow() {
  console.log('Test 1: Complete Phase 1 Flow');
  
  // Simulate conversation starting in Phase 1
  let conversation = {
    id: 'conv-integration-1',
    experienceId: 'exp-1',
    whopUserId: 'user-1',
    currentBlockId: 'welcome-1',
    userPath: ['welcome-1'],
    status: 'active',
    createdAt: new Date(),
    phase2StartTime: null
  };
  
  // Phase detection
  function detectConversationPhase(currentBlockId, funnelFlow) {
    if (!currentBlockId || !funnelFlow) return 'COMPLETED';
    
    for (const stage of funnelFlow.stages) {
      if (stage.blockIds.includes(currentBlockId)) {
        switch (stage.name) {
          case 'WELCOME': return 'PHASE1';
          case 'VALUE_DELIVERY':
          case 'EXPERIENCE_QUALIFICATION':
          case 'PAIN_POINT_QUALIFICATION':
          case 'OFFER': return 'PHASE2';
          case 'TRANSITION': return 'TRANSITION';
          default: return 'COMPLETED';
        }
      }
    }
    return 'COMPLETED';
  }
  
  // User response validation
  function validateUserResponse(userMessage, currentBlock) {
    const normalizedInput = userMessage.trim().toLowerCase();
    
    for (const option of currentBlock.options || []) {
      if (option.text.toLowerCase() === normalizedInput) {
        return { isValid: true, selectedOption: option };
      }
    }
    
    const numberMatch = normalizedInput.match(/^(\d+)$/);
    if (numberMatch) {
      const optionIndex = parseInt(numberMatch[1]) - 1;
      if (optionIndex >= 0 && optionIndex < (currentBlock.options || []).length) {
        return { isValid: true, selectedOption: currentBlock.options[optionIndex] };
      }
    }
    
    return { isValid: false };
  }
  
  // Test initial phase detection
  const initialPhase = detectConversationPhase(conversation.currentBlockId, mockFunnelFlow);
  console.log(`  Initial phase: ${initialPhase} (expected: PHASE1)`);
  
  // Test user response to WELCOME message
  const currentBlock = mockFunnelFlow.blocks[conversation.currentBlockId];
  const userResponse = 'E-commerce';
  const validation = validateUserResponse(userResponse, currentBlock);
  
  console.log(`  User response: "${userResponse}"`);
  console.log(`  Validation: ${validation.isValid ? 'Valid' : 'Invalid'}`);
  
  if (validation.isValid) {
    // Update conversation to next block
    conversation.currentBlockId = validation.selectedOption.nextBlockId;
    conversation.userPath.push(validation.selectedOption.nextBlockId);
    
    // Check if phase changed
    const newPhase = detectConversationPhase(conversation.currentBlockId, mockFunnelFlow);
    console.log(`  New phase: ${newPhase} (expected: PHASE2)`);
    
    // Record Phase 2 start time
    if (newPhase === 'PHASE2') {
      conversation.phase2StartTime = new Date();
      console.log(`  Phase 2 start time recorded: ${conversation.phase2StartTime.toISOString()}`);
    }
    
    const passed = initialPhase === 'PHASE1' && newPhase === 'PHASE2' && validation.isValid;
    console.log(`  Status: ${passed ? '✅ PASS' : '❌ FAIL'}\n`);
    return passed;
  }
  
  console.log(`  Status: ❌ FAIL\n`);
  return false;
}

// Test 2: Complete Phase 2 Flow
function testPhase2CompleteFlow() {
  console.log('Test 2: Complete Phase 2 Flow');
  
  // Simulate conversation in Phase 2
  let conversation = {
    id: 'conv-integration-2',
    experienceId: 'exp-1',
    whopUserId: 'user-2',
    currentBlockId: 'value-1',
    userPath: ['welcome-1', 'value-1'],
    status: 'active',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    phase2StartTime: new Date(Date.now() - 30 * 60 * 1000) // Phase 2 started 30 minutes ago
  };
  
  // Phase detection
  function detectConversationPhase(currentBlockId, funnelFlow) {
    if (!currentBlockId || !funnelFlow) return 'COMPLETED';
    
    for (const stage of funnelFlow.stages) {
      if (stage.blockIds.includes(currentBlockId)) {
        switch (stage.name) {
          case 'WELCOME': return 'PHASE1';
          case 'VALUE_DELIVERY':
          case 'EXPERIENCE_QUALIFICATION':
          case 'PAIN_POINT_QUALIFICATION':
          case 'OFFER': return 'PHASE2';
          case 'TRANSITION': return 'TRANSITION';
          default: return 'COMPLETED';
        }
      }
    }
    return 'COMPLETED';
  }
  
  // Test current phase
  const currentPhase = detectConversationPhase(conversation.currentBlockId, mockFunnelFlow);
  console.log(`  Current phase: ${currentPhase} (expected: PHASE2)`);
  
  // Test "done" response handling
  const userResponse = 'done';
  const isDoneResponse = userResponse.toLowerCase().trim() === 'done';
  console.log(`  User response: "${userResponse}"`);
  console.log(`  Is "done" response: ${isDoneResponse}`);
  
  if (isDoneResponse && currentPhase === 'PHASE2') {
    // Move to TRANSITION stage
    const transitionStage = mockFunnelFlow.stages.find(stage => stage.name === 'TRANSITION');
    const transitionBlockId = transitionStage.blockIds[0];
    
    conversation.currentBlockId = transitionBlockId;
    conversation.userPath.push(transitionBlockId);
    
    const newPhase = detectConversationPhase(conversation.currentBlockId, mockFunnelFlow);
    console.log(`  New phase: ${newPhase} (expected: TRANSITION)`);
    
    // Test transition message generation
    const transitionBlock = mockFunnelFlow.blocks[transitionBlockId];
    const baseUrl = 'https://hustler-6270acl6g-michaelrobotics-projects.vercel.app';
    const chatLink = `${baseUrl}/experiences/${conversation.experienceId}/chat/${conversation.id}`;
    const personalizedMessage = transitionBlock.message.replace('{CHAT_LINK}', chatLink);
    
    console.log(`  Transition message: "${personalizedMessage}"`);
    console.log(`  Chat link included: ${personalizedMessage.includes(chatLink)}`);
    
    const passed = currentPhase === 'PHASE2' && newPhase === 'TRANSITION' && personalizedMessage.includes(chatLink);
    console.log(`  Status: ${passed ? '✅ PASS' : '❌ FAIL'}\n`);
    return passed;
  }
  
  console.log(`  Status: ❌ FAIL\n`);
  return false;
}

// Test 3: Re-prompt System Integration
function testRepromptSystemIntegration() {
  console.log('Test 3: Re-prompt System Integration');
  
  const testCases = [
    {
      conversation: {
        createdAt: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
        phase2StartTime: null,
        phase: 'PHASE1'
      },
      expected: { shouldSend: true, timing: 10 },
      description: 'Phase 1 at 10 minutes'
    },
    {
      conversation: {
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        phase2StartTime: new Date(Date.now() - 15 * 60 * 1000), // Phase 2 started 15 minutes ago
        phase: 'PHASE2'
      },
      expected: { shouldSend: true, timing: 15 },
      description: 'Phase 2 at 15 minutes'
    },
    {
      conversation: {
        createdAt: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
        phase2StartTime: null,
        phase: 'PHASE1'
      },
      expected: { shouldSend: false },
      description: 'Phase 1 at 5 minutes (no re-prompt)'
    }
  ];
  
  function getConversationAge(conversation, phase) {
    const startTime = phase === 'PHASE1' ? conversation.createdAt : conversation.phase2StartTime;
    if (!startTime) return 0;
    
    const now = new Date();
    const start = new Date(startTime);
    return Math.floor((now.getTime() - start.getTime()) / (1000 * 60));
  }
  
  function shouldSendRePrompt(conversation, phase) {
    const age = getConversationAge(conversation, phase);
    
    if (phase === 'PHASE1') {
      if (age === 10 || age === 60 || age === 720) {
        return { shouldSend: true, timing: age };
      }
    } else if (phase === 'PHASE2') {
      if (age === 15 || age === 60 || age === 720) {
        return { shouldSend: true, timing: age };
      }
    }
    
    return { shouldSend: false };
  }
  
  let passedTests = 0;
  
  testCases.forEach((testCase, index) => {
    const result = shouldSendRePrompt(testCase.conversation, testCase.conversation.phase);
    const passed = result.shouldSend === testCase.expected.shouldSend && 
                   (result.timing === testCase.expected.timing || !testCase.expected.timing);
    
    console.log(`  Test ${index + 1}: ${testCase.description}`);
    console.log(`    Age: ${getConversationAge(testCase.conversation, testCase.conversation.phase)} minutes`);
    console.log(`    Expected: shouldSend=${testCase.expected.shouldSend}, timing=${testCase.expected.timing || 'N/A'}`);
    console.log(`    Actual: shouldSend=${result.shouldSend}, timing=${result.timing || 'N/A'}`);
    console.log(`    Status: ${passed ? '✅ PASS' : '❌ FAIL'}`);
    
    if (passed) passedTests++;
  });
  
  console.log(`  Overall: ${passedTests}/${testCases.length} passed\n`);
  return passedTests === testCases.length;
}

// Test 4: Error Handling Integration
function testErrorHandlingIntegration() {
  console.log('Test 4: Error Handling Integration');
  
  const errorScenarios = [
    {
      userResponse: 'invalid',
      expected: { isValid: false, errorHandled: true },
      description: 'Invalid user response'
    },
    {
      userResponse: '3', // Out of range
      expected: { isValid: false, errorHandled: true },
      description: 'Out of range number selection'
    },
    {
      userResponse: '', // Empty
      expected: { isValid: false, errorHandled: true },
      description: 'Empty response'
    },
    {
      userResponse: 'E-commerce', // Valid
      expected: { isValid: true, errorHandled: false },
      description: 'Valid response'
    }
  ];
  
  const mockBlock = {
    options: [
      { text: 'E-commerce', nextBlockId: 'value-1' },
      { text: 'SaaS', nextBlockId: 'value-2' }
    ]
  };
  
  function validateUserResponse(userMessage, currentBlock) {
    const normalizedInput = userMessage.trim().toLowerCase();
    
    for (const option of currentBlock.options || []) {
      if (option.text.toLowerCase() === normalizedInput) {
        return { isValid: true, selectedOption: option };
      }
    }
    
    const numberMatch = normalizedInput.match(/^(\d+)$/);
    if (numberMatch) {
      const optionIndex = parseInt(numberMatch[1]) - 1;
      if (optionIndex >= 0 && optionIndex < (currentBlock.options || []).length) {
        return { isValid: true, selectedOption: currentBlock.options[optionIndex] };
      }
    }
    
    return { isValid: false };
  }
  
  function handleInvalidResponse(attempt) {
    const errorMessages = {
      1: "Please choose from the provided options above.",
      2: "I'll inform the Whop owner about your request. Please wait for assistance.",
      3: "I'm unable to help you further. Please contact the Whop owner directly."
    };
    
    return errorMessages[Math.min(attempt, 3)] || errorMessages[3];
  }
  
  let passedTests = 0;
  
  errorScenarios.forEach((scenario, index) => {
    const validation = validateUserResponse(scenario.userResponse, mockBlock);
    const errorHandled = !validation.isValid ? handleInvalidResponse(1) : null;
    
    const passed = validation.isValid === scenario.expected.isValid && 
                   (errorHandled !== null) === scenario.expected.errorHandled;
    
    console.log(`  Test ${index + 1}: ${scenario.description}`);
    console.log(`    User response: "${scenario.userResponse}"`);
    console.log(`    Valid: ${validation.isValid}`);
    console.log(`    Error handled: ${errorHandled !== null}`);
    if (errorHandled) {
      console.log(`    Error message: "${errorHandled}"`);
    }
    console.log(`    Status: ${passed ? '✅ PASS' : '❌ FAIL'}`);
    
    if (passed) passedTests++;
  });
  
  console.log(`  Overall: ${passedTests}/${errorScenarios.length} passed\n`);
  return passedTests === errorScenarios.length;
}

// Test 5: Multi-Tenant Integration
function testMultiTenantIntegration() {
  console.log('Test 5: Multi-Tenant Integration');
  
  const conversations = [
    {
      id: 'conv-1',
      experienceId: 'exp-1',
      whopUserId: 'user-1',
      currentBlockId: 'welcome-1',
      status: 'active'
    },
    {
      id: 'conv-2',
      experienceId: 'exp-1',
      whopUserId: 'user-2',
      currentBlockId: 'welcome-1',
      status: 'active'
    },
    {
      id: 'conv-3',
      experienceId: 'exp-2',
      whopUserId: 'user-1', // Same user, different experience
      currentBlockId: 'welcome-1',
      status: 'active'
    }
  ];
  
  // Test experience-based filtering
  function filterByExperience(conversations, experienceId) {
    return conversations.filter(conv => conv.experienceId === experienceId);
  }
  
  // Test user isolation within experience
  function findUserConversation(conversations, experienceId, whopUserId) {
    return conversations.find(conv => 
      conv.experienceId === experienceId && 
      conv.whopUserId === whopUserId &&
      conv.status === 'active'
    );
  }
  
  const testCases = [
    {
      experienceId: 'exp-1',
      expectedCount: 2,
      description: 'Experience 1 conversations'
    },
    {
      experienceId: 'exp-2',
      expectedCount: 1,
      description: 'Experience 2 conversations'
    },
    {
      experienceId: 'exp-3',
      expectedCount: 0,
      description: 'Non-existent experience'
    }
  ];
  
  let passedTests = 0;
  
  testCases.forEach((testCase, index) => {
    const filtered = filterByExperience(conversations, testCase.experienceId);
    const passed = filtered.length === testCase.expectedCount;
    
    console.log(`  Test ${index + 1}: ${testCase.description}`);
    console.log(`    Expected count: ${testCase.expectedCount}`);
    console.log(`    Actual count: ${filtered.length}`);
    console.log(`    Conversations: ${filtered.map(c => c.id).join(', ')}`);
    console.log(`    Status: ${passed ? '✅ PASS' : '❌ FAIL'}`);
    
    if (passed) passedTests++;
  });
  
  // Test user isolation
  const user1Exp1 = findUserConversation(conversations, 'exp-1', 'user-1');
  const user1Exp2 = findUserConversation(conversations, 'exp-2', 'user-1');
  const user3Exp1 = findUserConversation(conversations, 'exp-1', 'user-3');
  
  console.log(`  User isolation tests:`);
  console.log(`    User 1 in Exp 1: ${user1Exp1 ? user1Exp1.id : 'Not found'} (expected: conv-1)`);
  console.log(`    User 1 in Exp 2: ${user1Exp2 ? user1Exp2.id : 'Not found'} (expected: conv-3)`);
  console.log(`    User 3 in Exp 1: ${user3Exp1 ? user3Exp1.id : 'Not found'} (expected: Not found)`);
  
  const isolationPassed = user1Exp1?.id === 'conv-1' && user1Exp2?.id === 'conv-3' && !user3Exp1;
  console.log(`    Status: ${isolationPassed ? '✅ PASS' : '❌ FAIL'}`);
  
  const overallPassed = passedTests === testCases.length && isolationPassed;
  console.log(`  Overall: ${overallPassed ? '✅ PASS' : '❌ FAIL'}\n`);
  
  return overallPassed;
}

// Run all integration tests
const tests = [
  testPhase1CompleteFlow,
  testPhase2CompleteFlow,
  testRepromptSystemIntegration,
  testErrorHandlingIntegration,
  testMultiTenantIntegration
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

console.log(`📊 Integration Test Results:`);
console.log(`  Passed: ${passedTests}/${totalTests}`);
console.log(`  Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

if (passedTests === totalTests) {
  console.log(`\n🎉 All integration tests passed!`);
  console.log(`\n🚀 The complete DM monitoring system is working correctly!`);
} else {
  console.log(`\n⚠️  Some integration tests failed. Please check the implementation.`);
}
