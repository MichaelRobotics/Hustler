#!/usr/bin/env node

/**
 * Phase 5: UserChat Integration - Function Tests
 * 
 * Tests all Phase 5 core functions:
 * - loadConversationForUser
 * - navigateFunnelInUserChat
 * - handleFunnelCompletionInUserChat
 * - getConversationMessagesForUserChat
 * - updateConversationFromUserChat
 */

const { loadConversationForUser, navigateFunnelInUserChat, handleFunnelCompletionInUserChat, getConversationMessagesForUserChat } = require('../lib/actions/userchat-actions');
const { updateConversationFromUserChat } = require('../lib/actions/conversation-actions');

// Test configuration
const TEST_CONFIG = {
	EXPERIENCE_ID: 'test-experience-123',
	CONVERSATION_ID: 'test-conversation-456',
	FUNNEL_ID: 'test-funnel-789',
	USER_ID: 'test-user-101',
};

// Mock funnel flow for testing
const MOCK_FUNNEL_FLOW = {
	id: TEST_CONFIG.FUNNEL_ID,
	name: 'Test Funnel',
	stages: [
		{
			name: 'EXPERIENCE_QUALIFICATION',
			blockIds: ['block-1', 'block-2'],
			blocks: [
				{
					id: 'block-1',
					type: 'MULTIPLE_CHOICE',
					content: 'Welcome! How can we help you today?',
					options: [
						{ text: 'Option 1', value: 'option1', nextBlockId: 'block-2' },
						{ text: 'Option 2', value: 'option2', nextBlockId: 'block-2' },
					],
				},
				{
					id: 'block-2',
					type: 'MULTIPLE_CHOICE',
					content: 'Great choice! What would you like to do next?',
					options: [
						{ text: 'Continue', value: 'continue', nextBlockId: 'COMPLETED' },
						{ text: 'Go Back', value: 'back', nextBlockId: 'block-1' },
					],
				},
			],
		},
	],
};

// Test results tracking
let testResults = {
	passed: 0,
	failed: 0,
	tests: [],
};

/**
 * Test helper functions
 */
function logTest(testName, passed, error = null) {
	const status = passed ? '✅ PASSED' : '❌ FAILED';
	console.log(`${status}: ${testName}`);
	
	testResults.tests.push({
		name: testName,
		passed,
		error: error?.message || error,
	});
	
	if (passed) {
		testResults.passed++;
	} else {
		testResults.failed++;
		console.error(`  Error: ${error?.message || error}`);
	}
}

function logSection(title) {
	console.log(`\n📋 ${title}`);
	console.log('='.repeat(50));
}

/**
 * Test 1: loadConversationForUser - Valid Conversation
 */
async function testLoadConversationForUserValid() {
	try {
		const result = await loadConversationForUser(
			TEST_CONFIG.CONVERSATION_ID,
			TEST_CONFIG.EXPERIENCE_ID
		);
		
		const passed = result.success && 
			result.conversation && 
			result.funnelFlow &&
			result.conversation.metadata?.type === 'internal';
		
		logTest('loadConversationForUser - Valid Conversation', passed, 
			passed ? null : new Error(`Expected success=true, got success=${result.success}`));
	} catch (error) {
		logTest('loadConversationForUser - Valid Conversation', false, error);
	}
}

/**
 * Test 2: loadConversationForUser - Invalid Conversation ID
 */
async function testLoadConversationForUserInvalid() {
	try {
		const result = await loadConversationForUser(
			'invalid-conversation-id',
			TEST_CONFIG.EXPERIENCE_ID
		);
		
		const passed = !result.success && result.error;
		
		logTest('loadConversationForUser - Invalid Conversation ID', passed,
			passed ? null : new Error(`Expected success=false, got success=${result.success}`));
	} catch (error) {
		logTest('loadConversationForUser - Invalid Conversation ID', false, error);
	}
}

/**
 * Test 3: loadConversationForUser - Wrong Experience ID
 */
async function testLoadConversationForUserWrongExperience() {
	try {
		const result = await loadConversationForUser(
			TEST_CONFIG.CONVERSATION_ID,
			'wrong-experience-id'
		);
		
		const passed = !result.success && result.error;
		
		logTest('loadConversationForUser - Wrong Experience ID', passed,
			passed ? null : new Error(`Expected success=false, got success=${result.success}`));
	} catch (error) {
		logTest('loadConversationForUser - Wrong Experience ID', false, error);
	}
}

/**
 * Test 4: navigateFunnelInUserChat - Valid Navigation
 */
async function testNavigateFunnelInUserChatValid() {
	try {
		const selectedOption = {
			text: 'Option 1',
			value: 'option1',
			blockId: 'block-2',
		};
		
		const result = await navigateFunnelInUserChat(
			TEST_CONFIG.CONVERSATION_ID,
			selectedOption
		);
		
		const passed = result.success && result.conversation;
		
		logTest('navigateFunnelInUserChat - Valid Navigation', passed,
			passed ? null : new Error(`Expected success=true, got success=${result.success}`));
	} catch (error) {
		logTest('navigateFunnelInUserChat - Valid Navigation', false, error);
	}
}

/**
 * Test 5: navigateFunnelInUserChat - Invalid Conversation
 */
async function testNavigateFunnelInUserChatInvalid() {
	try {
		const selectedOption = {
			text: 'Option 1',
			value: 'option1',
			blockId: 'block-2',
		};
		
		const result = await navigateFunnelInUserChat(
			'invalid-conversation-id',
			selectedOption
		);
		
		const passed = !result.success && result.error;
		
		logTest('navigateFunnelInUserChat - Invalid Conversation', passed,
			passed ? null : new Error(`Expected success=false, got success=${result.success}`));
	} catch (error) {
		logTest('navigateFunnelInUserChat - Invalid Conversation', false, error);
	}
}

/**
 * Test 6: handleFunnelCompletionInUserChat - Valid Completion
 */
async function testHandleFunnelCompletionValid() {
	try {
		const result = await handleFunnelCompletionInUserChat(
			TEST_CONFIG.CONVERSATION_ID
		);
		
		const passed = result.success && result.conversation;
		
		logTest('handleFunnelCompletionInUserChat - Valid Completion', passed,
			passed ? null : new Error(`Expected success=true, got success=${result.success}`));
	} catch (error) {
		logTest('handleFunnelCompletionInUserChat - Valid Completion', false, error);
	}
}

/**
 * Test 7: handleFunnelCompletionInUserChat - Invalid Conversation
 */
async function testHandleFunnelCompletionInvalid() {
	try {
		const result = await handleFunnelCompletionInUserChat(
			'invalid-conversation-id'
		);
		
		const passed = !result.success && result.error;
		
		logTest('handleFunnelCompletionInUserChat - Invalid Conversation', passed,
			passed ? null : new Error(`Expected success=false, got success=${result.success}`));
	} catch (error) {
		logTest('handleFunnelCompletionInUserChat - Invalid Conversation', false, error);
	}
}

/**
 * Test 8: getConversationMessagesForUserChat - Valid Messages
 */
async function testGetConversationMessagesValid() {
	try {
		const messages = await getConversationMessagesForUserChat(
			TEST_CONFIG.CONVERSATION_ID
		);
		
		const passed = Array.isArray(messages);
		
		logTest('getConversationMessagesForUserChat - Valid Messages', passed,
			passed ? null : new Error(`Expected array, got ${typeof messages}`));
	} catch (error) {
		logTest('getConversationMessagesForUserChat - Valid Messages', false, error);
	}
}

/**
 * Test 9: getConversationMessagesForUserChat - Invalid Conversation
 */
async function testGetConversationMessagesInvalid() {
	try {
		const messages = await getConversationMessagesForUserChat(
			'invalid-conversation-id'
		);
		
		const passed = Array.isArray(messages) && messages.length === 0;
		
		logTest('getConversationMessagesForUserChat - Invalid Conversation', passed,
			passed ? null : new Error(`Expected empty array, got ${messages.length} messages`));
	} catch (error) {
		logTest('getConversationMessagesForUserChat - Invalid Conversation', false, error);
	}
}

/**
 * Test 10: updateConversationFromUserChat - Valid Update
 */
async function testUpdateConversationFromUserChatValid() {
	try {
		const result = await updateConversationFromUserChat(
			TEST_CONFIG.CONVERSATION_ID,
			'Test message',
			'user',
			{ test: true }
		);
		
		const passed = result.success && result.conversation;
		
		logTest('updateConversationFromUserChat - Valid Update', passed,
			passed ? null : new Error(`Expected success=true, got success=${result.success}`));
	} catch (error) {
		logTest('updateConversationFromUserChat - Valid Update', false, error);
	}
}

/**
 * Test 11: updateConversationFromUserChat - Invalid Conversation
 */
async function testUpdateConversationFromUserChatInvalid() {
	try {
		const result = await updateConversationFromUserChat(
			'invalid-conversation-id',
			'Test message',
			'user'
		);
		
		const passed = !result.success && result.error;
		
		logTest('updateConversationFromUserChat - Invalid Conversation', passed,
			passed ? null : new Error(`Expected success=false, got success=${result.success}`));
	} catch (error) {
		logTest('updateConversationFromUserChat - Invalid Conversation', false, error);
	}
}

/**
 * Test 12: Conversation Type Validation
 */
async function testConversationTypeValidation() {
	try {
		// This test would require a non-internal conversation in the database
		// For now, we'll test the validation logic
		const result = await loadConversationForUser(
			TEST_CONFIG.CONVERSATION_ID,
			TEST_CONFIG.EXPERIENCE_ID
		);
		
		if (result.success && result.conversation) {
			const passed = result.conversation.metadata?.type === 'internal';
			logTest('Conversation Type Validation', passed,
				passed ? null : new Error(`Expected type=internal, got type=${result.conversation.metadata?.type}`));
		} else {
			logTest('Conversation Type Validation', false, new Error('Could not load conversation for validation'));
		}
	} catch (error) {
		logTest('Conversation Type Validation', false, error);
	}
}

/**
 * Test 13: Message Persistence
 */
async function testMessagePersistence() {
	try {
		const testMessage = `Test message ${Date.now()}`;
		
		// Add message
		const addResult = await updateConversationFromUserChat(
			TEST_CONFIG.CONVERSATION_ID,
			testMessage,
			'user',
			{ test: true, timestamp: Date.now() }
		);
		
		if (!addResult.success) {
			logTest('Message Persistence', false, new Error('Failed to add message'));
			return;
		}
		
		// Retrieve messages
		const messages = await getConversationMessagesForUserChat(
			TEST_CONFIG.CONVERSATION_ID
		);
		
		const messageExists = messages.some(msg => msg.content === testMessage);
		const passed = messageExists;
		
		logTest('Message Persistence', passed,
			passed ? null : new Error('Message not found in retrieved messages'));
	} catch (error) {
		logTest('Message Persistence', false, error);
	}
}

/**
 * Test 14: Funnel Navigation State Update
 */
async function testFunnelNavigationStateUpdate() {
	try {
		const selectedOption = {
			text: 'Test Option',
			value: 'test-option',
			blockId: 'block-2',
		};
		
		const result = await navigateFunnelInUserChat(
			TEST_CONFIG.CONVERSATION_ID,
			selectedOption
		);
		
		if (!result.success) {
			logTest('Funnel Navigation State Update', false, new Error('Navigation failed'));
			return;
		}
		
		// Check if conversation state was updated
		const conversation = result.conversation;
		const passed = conversation && 
			conversation.currentBlockId === selectedOption.blockId;
		
		logTest('Funnel Navigation State Update', passed,
			passed ? null : new Error(`Expected currentBlockId=${selectedOption.blockId}, got ${conversation?.currentBlockId}`));
	} catch (error) {
		logTest('Funnel Navigation State Update', false, error);
	}
}

/**
 * Test 15: Error Handling and Recovery
 */
async function testErrorHandlingAndRecovery() {
	try {
		// Test with invalid parameters
		const invalidResults = await Promise.all([
			loadConversationForUser('', ''),
			navigateFunnelInUserChat('', { text: '', value: '', blockId: '' }),
			handleFunnelCompletionInUserChat(''),
			getConversationMessagesForUserChat(''),
			updateConversationFromUserChat('', '', 'user'),
		]);
		
		// All should fail gracefully
		const allFailed = invalidResults.every(result => !result.success);
		const passed = allFailed;
		
		logTest('Error Handling and Recovery', passed,
			passed ? null : new Error('Some invalid operations succeeded when they should have failed'));
	} catch (error) {
		logTest('Error Handling and Recovery', false, error);
	}
}

/**
 * Run all tests
 */
async function runAllTests() {
	console.log('🚀 Phase 5: UserChat Integration - Function Tests');
	console.log('='.repeat(60));
	
	// Test 1: Conversation Loading
	logSection('Conversation Loading Tests');
	await testLoadConversationForUserValid();
	await testLoadConversationForUserInvalid();
	await testLoadConversationForUserWrongExperience();
	
	// Test 2: Funnel Navigation
	logSection('Funnel Navigation Tests');
	await testNavigateFunnelInUserChatValid();
	await testNavigateFunnelInUserChatInvalid();
	
	// Test 3: Funnel Completion
	logSection('Funnel Completion Tests');
	await testHandleFunnelCompletionValid();
	await testHandleFunnelCompletionInvalid();
	
	// Test 4: Message Management
	logSection('Message Management Tests');
	await testGetConversationMessagesValid();
	await testGetConversationMessagesInvalid();
	await testUpdateConversationFromUserChatValid();
	await testUpdateConversationFromUserChatInvalid();
	
	// Test 5: Validation and State Management
	logSection('Validation and State Management Tests');
	await testConversationTypeValidation();
	await testMessagePersistence();
	await testFunnelNavigationStateUpdate();
	await testErrorHandlingAndRecovery();
	
	// Print results
	console.log('\n📊 Phase 5 Test Results:');
	console.log('='.repeat(50));
	console.log(`✅ Passed: ${testResults.passed}`);
	console.log(`❌ Failed: ${testResults.failed}`);
	console.log(`📈 Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);
	
	if (testResults.failed > 0) {
		console.log('\n❌ Failed Tests:');
		testResults.tests
			.filter(test => !test.passed)
			.forEach(test => {
				console.log(`  - ${test.name}: ${test.error}`);
			});
	}
	
	if (testResults.passed === testResults.tests.length) {
		console.log('\n🎉 All Phase 5 function tests PASSED! Ready for integration testing.');
	} else {
		console.log('\n⚠️  Some tests failed. Please review and fix before proceeding.');
	}
	
	return testResults;
}

// Run tests if called directly
if (require.main === module) {
	runAllTests().catch(console.error);
}

module.exports = { runAllTests, testResults };

