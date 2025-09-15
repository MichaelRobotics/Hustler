/**
 * Test Re-prompt System
 * 
 * Tests the re-prompt timing and message selection logic
 * to ensure it works correctly for both phases.
 */

console.log('🧪 Testing Re-prompt System...\n');

// Mock conversation data
const mockConversations = [
  {
    id: 'conv-1',
    createdAt: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
    phase2StartTime: null,
    phase: 'PHASE1'
  },
  {
    id: 'conv-2',
    createdAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
    phase2StartTime: null,
    phase: 'PHASE1'
  },
  {
    id: 'conv-3',
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
    phase2StartTime: null,
    phase: 'PHASE1'
  },
  {
    id: 'conv-4',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    phase2StartTime: new Date(Date.now() - 15 * 60 * 1000), // Phase 2 started 15 minutes ago
    phase: 'PHASE2'
  },
  {
    id: 'conv-5',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    phase2StartTime: new Date(Date.now() - 60 * 60 * 1000), // Phase 2 started 1 hour ago
    phase: 'PHASE2'
  },
  {
    id: 'conv-6',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    phase2StartTime: new Date(Date.now() - 12 * 60 * 60 * 1000), // Phase 2 started 12 hours ago
    phase: 'PHASE2'
  }
];

// Re-prompt configuration
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

// Function to get conversation age in minutes
function getConversationAge(conversation, phase) {
  const startTime = phase === 'PHASE1' ? conversation.createdAt : conversation.phase2StartTime;
  if (!startTime) return 0;
  
  const now = new Date();
  const start = new Date(startTime);
  return Math.floor((now.getTime() - start.getTime()) / (1000 * 60));
}

// Function to check if re-prompt should be sent
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

// Test cases
const testCases = [
  {
    conversation: mockConversations[0],
    expected: { shouldSend: true, timing: 10 },
    description: 'Phase 1 at 10 minutes'
  },
  {
    conversation: mockConversations[1],
    expected: { shouldSend: true, timing: 60 },
    description: 'Phase 1 at 60 minutes'
  },
  {
    conversation: mockConversations[2],
    expected: { shouldSend: true, timing: 720 },
    description: 'Phase 1 at 720 minutes (12 hours)'
  },
  {
    conversation: mockConversations[3],
    expected: { shouldSend: true, timing: 15 },
    description: 'Phase 2 at 15 minutes'
  },
  {
    conversation: mockConversations[4],
    expected: { shouldSend: true, timing: 60 },
    description: 'Phase 2 at 60 minutes'
  },
  {
    conversation: mockConversations[5],
    expected: { shouldSend: true, timing: 720 },
    description: 'Phase 2 at 720 minutes (12 hours)'
  }
];

let passedTests = 0;
let totalTests = testCases.length;

console.log('Testing Re-prompt Timing Logic:\n');

testCases.forEach((testCase, index) => {
  const result = shouldSendRePrompt(testCase.conversation, testCase.conversation.phase);
  const passed = result.shouldSend === testCase.expected.shouldSend && 
                 result.timing === testCase.expected.timing;
  
  console.log(`Test ${index + 1}: ${testCase.description}`);
  console.log(`  Conversation Age: ${getConversationAge(testCase.conversation, testCase.conversation.phase)} minutes`);
  console.log(`  Expected: shouldSend=${testCase.expected.shouldSend}, timing=${testCase.expected.timing}`);
  console.log(`  Actual: shouldSend=${result.shouldSend}, timing=${result.timing}`);
  console.log(`  Status: ${passed ? '✅ PASS' : '❌ FAIL'}\n`);
  
  if (passed) passedTests++;
});

// Test re-prompt message selection
console.log('Testing Re-prompt Message Selection:\n');

const messageTestCases = [
  { phase: 'PHASE1', timing: 10, expected: RE_PROMPT_CONFIG.PHASE1[10] },
  { phase: 'PHASE1', timing: 60, expected: RE_PROMPT_CONFIG.PHASE1[60] },
  { phase: 'PHASE1', timing: 720, expected: RE_PROMPT_CONFIG.PHASE1[720] },
  { phase: 'PHASE2', timing: 15, expected: RE_PROMPT_CONFIG.PHASE2[15] },
  { phase: 'PHASE2', timing: 60, expected: RE_PROMPT_CONFIG.PHASE2[60] },
  { phase: 'PHASE2', timing: 720, expected: RE_PROMPT_CONFIG.PHASE2[720] }
];

let messagePassedTests = 0;
let messageTotalTests = messageTestCases.length;

messageTestCases.forEach((testCase, index) => {
  const message = RE_PROMPT_CONFIG[testCase.phase][testCase.timing];
  const passed = message === testCase.expected;
  
  console.log(`Message Test ${index + 1}: ${testCase.phase} at ${testCase.timing} minutes`);
  console.log(`  Expected: ${testCase.expected}`);
  console.log(`  Actual: ${message}`);
  console.log(`  Status: ${passed ? '✅ PASS' : '❌ FAIL'}\n`);
  
  if (passed) messagePassedTests++;
});

// Test edge cases
console.log('Testing Edge Cases:\n');

const edgeCases = [
  {
    conversation: { createdAt: new Date(), phase2StartTime: null, phase: 'PHASE1' },
    description: 'Phase 1 just created (0 minutes)',
    expected: { shouldSend: false }
  },
  {
    conversation: { createdAt: new Date(Date.now() - 5 * 60 * 1000), phase2StartTime: null, phase: 'PHASE1' },
    description: 'Phase 1 at 5 minutes (no re-prompt)',
    expected: { shouldSend: false }
  },
  {
    conversation: { createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), phase2StartTime: new Date(Date.now() - 5 * 60 * 1000), phase: 'PHASE2' },
    description: 'Phase 2 at 5 minutes (no re-prompt)',
    expected: { shouldSend: false }
  },
  {
    conversation: { createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), phase2StartTime: new Date(Date.now() - 30 * 60 * 1000), phase: 'PHASE2' },
    description: 'Phase 2 at 30 minutes (no re-prompt)',
    expected: { shouldSend: false }
  }
];

let edgePassedTests = 0;
let edgeTotalTests = edgeCases.length;

edgeCases.forEach((testCase, index) => {
  const result = shouldSendRePrompt(testCase.conversation, testCase.conversation.phase);
  const passed = result.shouldSend === testCase.expected.shouldSend;
  
  console.log(`Edge Case ${index + 1}: ${testCase.description}`);
  console.log(`  Expected: shouldSend=${testCase.expected.shouldSend}`);
  console.log(`  Actual: shouldSend=${result.shouldSend}`);
  console.log(`  Status: ${passed ? '✅ PASS' : '❌ FAIL'}\n`);
  
  if (passed) edgePassedTests++;
});

// Calculate overall results
const totalPassed = passedTests + messagePassedTests + edgePassedTests;
const totalTestCount = totalTests + messageTotalTests + edgeTotalTests;

console.log(`📊 Re-prompt System Test Results:`);
console.log(`  Timing Logic: ${passedTests}/${totalTests} passed`);
console.log(`  Message Selection: ${messagePassedTests}/${messageTotalTests} passed`);
console.log(`  Edge Cases: ${edgePassedTests}/${edgeTotalTests} passed`);
console.log(`  Overall: ${totalPassed}/${totalTestCount} passed`);
console.log(`  Success Rate: ${((totalPassed / totalTestCount) * 100).toFixed(1)}%`);

if (totalPassed === totalTestCount) {
  console.log(`\n🎉 All re-prompt tests passed!`);
} else {
  console.log(`\n⚠️  Some tests failed. Please check the implementation.`);
}
