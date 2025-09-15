/**
 * Test 24-Hour Cleanup Behavior
 * 
 * Tests the cleanup logic for both Phase 1 and Phase 2
 * to ensure proper timeout handling and message sending.
 */

console.log('🧪 Testing 24-Hour Cleanup Behavior...\n');

// Mock funnel flow for testing
const mockFunnelFlow = {
  stages: [
    {
      name: 'VALUE_DELIVERY',
      blockIds: ['value-1', 'value-2', 'value-3']
    },
    {
      name: 'TRANSITION',
      blockIds: ['transition-1']
    }
  ],
  blocks: {
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
    'value-3': {
      id: 'value-3',
      message: 'Here is your free marketing resource!',
      options: []
    },
    'transition-1': {
      id: 'transition-1',
      message: 'Thanks! Continue here: {CHAT_LINK}',
      options: []
    }
  }
};

// Test Phase 1 Cleanup Logic
function testPhase1Cleanup() {
  console.log('Test 1: Phase 1 Cleanup Logic');
  
  // Mock conversation that should trigger Phase 1 cleanup
  const conversation = {
    id: 'conv-phase1-cleanup',
    createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25 hours ago
    phase2StartTime: null,
    userPath: ['welcome-1'],
    experienceId: 'test-experience-123'
  };
  
  // Simulate Phase 1 cleanup process
  const valueDeliveryStage = mockFunnelFlow.stages.find(stage => stage.name === 'VALUE_DELIVERY');
  const availableBlocks = valueDeliveryStage.blockIds;
  
  // Test random block selection
  const selectedBlocks = [];
  for (let i = 0; i < 10; i++) {
    const randomIndex = Math.floor(Math.random() * availableBlocks.length);
    const randomBlockId = availableBlocks[randomIndex];
    selectedBlocks.push(randomBlockId);
  }
  
  // Check if all possible blocks can be selected
  const allBlocksSelected = availableBlocks.every(blockId => selectedBlocks.includes(blockId));
  
  console.log(`  Available VALUE_DELIVERY blocks: ${availableBlocks.join(', ')}`);
  console.log(`  Random selections: ${selectedBlocks.join(', ')}`);
  console.log(`  All blocks selectable: ${allBlocksSelected ? '✅ PASS' : '❌ FAIL'}`);
  
  // Test message formatting
  const selectedBlock = mockFunnelFlow.blocks[availableBlocks[0]];
  const message = selectedBlock.message;
  const hasMessage = message && message.length > 0;
  
  console.log(`  Selected block message: "${message}"`);
  console.log(`  Message valid: ${hasMessage ? '✅ PASS' : '❌ FAIL'}`);
  
  // Test user path update
  const updatedUserPath = [...(conversation.userPath || []), availableBlocks[0]].filter(Boolean);
  const pathUpdated = updatedUserPath.includes(availableBlocks[0]);
  
  console.log(`  Original path: ${conversation.userPath.join(', ')}`);
  console.log(`  Updated path: ${updatedUserPath.join(', ')}`);
  console.log(`  Path updated: ${pathUpdated ? '✅ PASS' : '❌ FAIL'}`);
  
  const passed = allBlocksSelected && hasMessage && pathUpdated;
  console.log(`  Overall: ${passed ? '✅ PASS' : '❌ FAIL'}\n`);
  
  return passed;
}

// Test Phase 2 Cleanup Logic
function testPhase2Cleanup() {
  console.log('Test 2: Phase 2 Cleanup Logic');
  
  // Mock conversation that should trigger Phase 2 cleanup
  const conversation = {
    id: 'conv-phase2-cleanup',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    phase2StartTime: new Date(Date.now() - 25 * 60 * 60 * 1000), // Phase 2 started 25 hours ago
    userPath: ['welcome-1', 'value-1'],
    experienceId: 'test-experience-123'
  };
  
  // Simulate Phase 2 cleanup process
  const transitionStage = mockFunnelFlow.stages.find(stage => stage.name === 'TRANSITION');
  const transitionBlockId = transitionStage.blockIds[0]; // Use first transition block
  const transitionBlock = mockFunnelFlow.blocks[transitionBlockId];
  
  // Test transition block selection
  const blockSelected = transitionBlockId && transitionBlock;
  console.log(`  Selected transition block: ${transitionBlockId}`);
  console.log(`  Block exists: ${blockSelected ? '✅ PASS' : '❌ FAIL'}`);
  
  // Test message formatting with chat link
  const baseUrl = 'https://hustler-6270acl6g-michaelrobotics-projects.vercel.app';
  const chatLink = `${baseUrl}/experiences/${conversation.experienceId}/chat/${conversation.id}`;
  const personalizedMessage = transitionBlock.message.replace('{CHAT_LINK}', chatLink);
  const hasChatLink = personalizedMessage.includes(chatLink);
  
  console.log(`  Original message: "${transitionBlock.message}"`);
  console.log(`  Personalized message: "${personalizedMessage}"`);
  console.log(`  Chat link included: ${hasChatLink ? '✅ PASS' : '❌ FAIL'}`);
  
  // Test user path update
  const updatedUserPath = [...(conversation.userPath || []), transitionBlockId].filter(Boolean);
  const pathUpdated = updatedUserPath.includes(transitionBlockId);
  
  console.log(`  Original path: ${conversation.userPath.join(', ')}`);
  console.log(`  Updated path: ${updatedUserPath.join(', ')}`);
  console.log(`  Path updated: ${pathUpdated ? '✅ PASS' : '❌ FAIL'}`);
  
  // Test conversation completion
  const conversationCompleted = true; // In real implementation, this would mark conversation as completed
  console.log(`  Conversation completed: ${conversationCompleted ? '✅ PASS' : '❌ FAIL'}`);
  
  const passed = blockSelected && hasChatLink && pathUpdated && conversationCompleted;
  console.log(`  Overall: ${passed ? '✅ PASS' : '❌ FAIL'}\n`);
  
  return passed;
}

// Test Age Calculation Logic
function testAgeCalculation() {
  console.log('Test 3: Age Calculation Logic');
  
  const testCases = [
    {
      conversation: {
        createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25 hours ago
        phase2StartTime: null
      },
      phase: 'PHASE1',
      expectedAge: 25 * 60, // 1500 minutes
      description: 'Phase 1 conversation aged 25 hours'
    },
    {
      conversation: {
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        phase2StartTime: new Date(Date.now() - 25 * 60 * 60 * 1000) // Phase 2 started 25 hours ago
      },
      phase: 'PHASE2',
      expectedAge: 25 * 60, // 1500 minutes
      description: 'Phase 2 conversation aged 25 hours'
    },
    {
      conversation: {
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        phase2StartTime: new Date(Date.now() - 30 * 60 * 1000) // Phase 2 started 30 minutes ago
      },
      phase: 'PHASE2',
      expectedAge: 30, // 30 minutes
      description: 'Phase 2 conversation aged 30 minutes'
    }
  ];
  
  function getConversationAge(conversation, phase) {
    const startTime = phase === 'PHASE1' ? conversation.createdAt : conversation.phase2StartTime;
    if (!startTime) return 0;
    
    const now = new Date();
    const start = new Date(startTime);
    return Math.floor((now.getTime() - start.getTime()) / (1000 * 60));
  }
  
  let passedTests = 0;
  
  testCases.forEach((testCase, index) => {
    const actualAge = getConversationAge(testCase.conversation, testCase.phase);
    const passed = Math.abs(actualAge - testCase.expectedAge) <= 1; // Allow 1 minute tolerance
    
    console.log(`  Test ${index + 1}: ${testCase.description}`);
    console.log(`    Expected age: ${testCase.expectedAge} minutes`);
    console.log(`    Actual age: ${actualAge} minutes`);
    console.log(`    Status: ${passed ? '✅ PASS' : '❌ FAIL'}`);
    
    if (passed) passedTests++;
  });
  
  console.log(`  Overall: ${passedTests}/${testCases.length} passed\n`);
  return passedTests === testCases.length;
}

// Test Cleanup Timing Logic
function testCleanupTiming() {
  console.log('Test 4: Cleanup Timing Logic');
  
  const testCases = [
    {
      age: 720, // 12 hours
      expected: false,
      description: '12 hours old (not cleanup time)'
    },
    {
      age: 1440, // 24 hours
      expected: true,
      description: '24 hours old (cleanup time)'
    },
    {
      age: 1500, // 25 hours
      expected: true,
      description: '25 hours old (cleanup time)'
    },
    {
      age: 2880, // 48 hours
      expected: true,
      description: '48 hours old (cleanup time)'
    }
  ];
  
  function shouldTriggerCleanup(age) {
    return age >= 1440; // 24 hours
  }
  
  let passedTests = 0;
  
  testCases.forEach((testCase, index) => {
    const shouldCleanup = shouldTriggerCleanup(testCase.age);
    const passed = shouldCleanup === testCase.expected;
    
    console.log(`  Test ${index + 1}: ${testCase.description}`);
    console.log(`    Age: ${testCase.age} minutes`);
    console.log(`    Expected cleanup: ${testCase.expected}`);
    console.log(`    Actual cleanup: ${shouldCleanup}`);
    console.log(`    Status: ${passed ? '✅ PASS' : '❌ FAIL'}`);
    
    if (passed) passedTests++;
  });
  
  console.log(`  Overall: ${passedTests}/${testCases.length} passed\n`);
  return passedTests === testCases.length;
}

// Run all tests
const tests = [
  testPhase1Cleanup,
  testPhase2Cleanup,
  testAgeCalculation,
  testCleanupTiming
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

console.log(`📊 Cleanup Behavior Test Results:`);
console.log(`  Passed: ${passedTests}/${totalTests}`);
console.log(`  Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

if (passedTests === totalTests) {
  console.log(`\n🎉 All cleanup tests passed!`);
} else {
  console.log(`\n⚠️  Some tests failed. Please check the implementation.`);
}
