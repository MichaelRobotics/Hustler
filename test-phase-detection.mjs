/**
 * Test Phase Detection Logic
 * 
 * Tests the phase detection system to ensure it correctly identifies
 * conversation phases based on currentBlockId and funnelFlow.
 */

// Mock funnel flow for testing
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
      name: 'EXPERIENCE_QUALIFICATION',
      blockIds: ['exp-1', 'exp-2']
    },
    {
      name: 'PAIN_POINT_QUALIFICATION',
      blockIds: ['pain-1', 'pain-2']
    },
    {
      name: 'OFFER',
      blockIds: ['offer-1', 'offer-2']
    },
    {
      name: 'TRANSITION',
      blockIds: ['transition-1']
    }
  ]
};

// Replicate the detectConversationPhase function for testing
function detectConversationPhase(currentBlockId, funnelFlow) {
  if (!currentBlockId || !funnelFlow) {
    return 'COMPLETED';
  }

  // Find which stage this block belongs to
  for (const stage of funnelFlow.stages) {
    if (stage.blockIds.includes(currentBlockId)) {
      switch (stage.name) {
        case 'WELCOME':
          return 'PHASE1';
        case 'VALUE_DELIVERY':
        case 'EXPERIENCE_QUALIFICATION':
        case 'PAIN_POINT_QUALIFICATION':
        case 'OFFER':
          return 'PHASE2';
        case 'TRANSITION':
          return 'TRANSITION';
        default:
          return 'COMPLETED';
      }
    }
  }

  return 'COMPLETED';
}

console.log('🧪 Testing Phase Detection Logic...\n');

// Test cases
const testCases = [
  { blockId: 'welcome-1', expected: 'PHASE1', description: 'WELCOME stage block' },
  { blockId: 'welcome-2', expected: 'PHASE1', description: 'WELCOME stage block' },
  { blockId: 'value-1', expected: 'PHASE2', description: 'VALUE_DELIVERY stage block' },
  { blockId: 'value-2', expected: 'PHASE2', description: 'VALUE_DELIVERY stage block' },
  { blockId: 'exp-1', expected: 'PHASE2', description: 'EXPERIENCE_QUALIFICATION stage block' },
  { blockId: 'exp-2', expected: 'PHASE2', description: 'EXPERIENCE_QUALIFICATION stage block' },
  { blockId: 'pain-1', expected: 'PHASE2', description: 'PAIN_POINT_QUALIFICATION stage block' },
  { blockId: 'pain-2', expected: 'PHASE2', description: 'PAIN_POINT_QUALIFICATION stage block' },
  { blockId: 'offer-1', expected: 'PHASE2', description: 'OFFER stage block' },
  { blockId: 'offer-2', expected: 'PHASE2', description: 'OFFER stage block' },
  { blockId: 'transition-1', expected: 'TRANSITION', description: 'TRANSITION stage block' },
  { blockId: 'unknown-block', expected: 'COMPLETED', description: 'Unknown block' },
  { blockId: null, expected: 'COMPLETED', description: 'Null block ID' },
  { blockId: undefined, expected: 'COMPLETED', description: 'Undefined block ID' }
];

let passedTests = 0;
let totalTests = testCases.length;

testCases.forEach((testCase, index) => {
  try {
    const result = detectConversationPhase(testCase.blockId, mockFunnelFlow);
    const passed = result === testCase.expected;
    
    console.log(`Test ${index + 1}: ${testCase.description}`);
    console.log(`  Block ID: ${testCase.blockId}`);
    console.log(`  Expected: ${testCase.expected}`);
    console.log(`  Actual: ${result}`);
    console.log(`  Status: ${passed ? '✅ PASS' : '❌ FAIL'}\n`);
    
    if (passed) passedTests++;
  } catch (error) {
    console.log(`Test ${index + 1}: ${testCase.description}`);
    console.log(`  Block ID: ${testCase.blockId}`);
    console.log(`  Error: ${error.message}`);
    console.log(`  Status: ❌ FAIL\n`);
  }
});

console.log(`📊 Phase Detection Test Results:`);
console.log(`  Passed: ${passedTests}/${totalTests}`);
console.log(`  Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

if (passedTests === totalTests) {
  console.log(`\n🎉 All phase detection tests passed!`);
} else {
  console.log(`\n⚠️  Some tests failed. Please check the implementation.`);
}
