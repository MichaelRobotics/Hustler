/**
 * Phase 4 Testing Suite
 * 
 * Comprehensive testing for Phase 4: Transition to Internal Chat
 * Tests all Phase 4 functions and integration points
 */

const { db } = require('../lib/supabase/db');
const { conversations, funnels, messages } = require('../lib/supabase/schema');
const { eq, and } = require('drizzle-orm');

// Import Phase 4 functions
const {
	createInternalChatSession,
	copyDMMessagesToInternalChat,
	initializeFunnel2,
	generateTransitionMessage,
	generateChatLink,
	personalizeTransitionMessage,
	sendTransitionMessage,
	completeDMToInternalTransition,
} = require('../lib/actions/internal-chat-transition-actions');

// Test configuration
const TEST_CONFIG = {
	EXPERIENCE_ID: 'exp_test_phase4',
	FUNNEL_ID: 'funnel_test_phase4',
	WHOP_USER_ID: 'user_test_phase4',
	WHOP_PRODUCT_ID: 'product_test_phase4',
	BASE_URL: 'http://localhost:3000',
};

// Test data
const TEST_FUNNEL_FLOW = {
	startBlockId: 'welcome_block',
	stages: [
		{
			id: 'welcome_stage',
			name: 'WELCOME',
			explanation: 'Welcome stage',
			blockIds: ['welcome_block']
		},
		{
			id: 'value_delivery_stage',
			name: 'VALUE_DELIVERY',
			explanation: 'Value delivery stage',
			blockIds: ['value_block']
		},
		{
			id: 'transition_stage',
			name: 'TRANSITION',
			explanation: 'Transition stage',
			blockIds: ['transition_block']
		},
		{
			id: 'experience_qual_stage',
			name: 'EXPERIENCE_QUALIFICATION',
			explanation: 'Experience qualification stage',
			blockIds: ['experience_qual_block']
		},
		{
			id: 'pain_point_stage',
			name: 'PAIN_POINT_QUALIFICATION',
			explanation: 'Pain point qualification stage',
			blockIds: ['pain_point_block']
		},
		{
			id: 'offer_stage',
			name: 'OFFER',
			explanation: 'Offer stage',
			blockIds: ['offer_block']
		}
	],
	blocks: {
		welcome_block: {
			id: 'welcome_block',
			message: 'Welcome! Let\'s get started.',
			options: [
				{ text: 'Continue', nextBlockId: 'value_block' }
			]
		},
		value_block: {
			id: 'value_block',
			message: 'Here\'s your free value!',
			resourceName: 'Free Guide',
			options: [
				{ text: 'Got it', nextBlockId: 'transition_block' }
			]
		},
		transition_block: {
			id: 'transition_block',
			message: 'Ready for your Personal Strategy Session! Click below: [LINK_TO_PRIVATE_CHAT]',
			options: [
				{ text: 'Continue to Strategy Session', nextBlockId: 'experience_qual_block' }
			]
		},
		experience_qual_block: {
			id: 'experience_qual_block',
			message: 'Welcome, @[Username]! What\'s your experience level?',
			options: [
				{ text: 'Beginner', nextBlockId: 'pain_point_block' }
			]
		},
		pain_point_block: {
			id: 'pain_point_block',
			message: 'What\'s your biggest challenge?',
			options: [
				{ text: 'Learning the basics', nextBlockId: 'offer_block' }
			]
		},
		offer_block: {
			id: 'offer_block',
			message: 'Here\'s our premium course!',
			resourceName: 'Premium Course',
			options: []
		}
	}
};

// Test results tracking
let testResults = {
	passed: 0,
	failed: 0,
	total: 0,
	details: []
};

function logTest(testName, status, details = '') {
	testResults.total++;
	if (status === 'PASS') {
		testResults.passed++;
		console.log(`✅ ${testName}: PASS`);
	} else {
		testResults.failed++;
		console.log(`❌ ${testName}: FAIL - ${details}`);
	}
	testResults.details.push({ testName, status, details });
}

function logSection(title) {
	console.log(`\n🔹 ${title}`);
	console.log('='.repeat(50));
}

// Test helper functions
async function createTestDMConversation() {
	try {
		const [dmConversation] = await db.insert(conversations).values({
			experienceId: TEST_CONFIG.EXPERIENCE_ID,
			funnelId: TEST_CONFIG.FUNNEL_ID,
			status: 'active',
			currentBlockId: 'transition_block',
			userPath: ['welcome_block', 'value_block', 'transition_block'],
			metadata: {
				type: 'dm',
				phase: 'welcome',
				whopUserId: TEST_CONFIG.WHOP_USER_ID,
				whopProductId: TEST_CONFIG.WHOP_PRODUCT_ID,
			},
		}).returning();

		// Add some test messages
		await db.insert(messages).values([
			{
				conversationId: dmConversation.id,
				type: 'bot',
				content: 'Welcome! Let\'s get started.',
			},
			{
				conversationId: dmConversation.id,
				type: 'user',
				content: 'Continue',
			},
			{
				conversationId: dmConversation.id,
				type: 'bot',
				content: 'Here\'s your free value!',
			},
			{
				conversationId: dmConversation.id,
				type: 'user',
				content: 'Got it',
			},
		]);

		return dmConversation;
	} catch (error) {
		console.error('Error creating test DM conversation:', error);
		throw error;
	}
}

async function createTestFunnel() {
	try {
		const [funnel] = await db.insert(funnels).values({
			experienceId: TEST_CONFIG.EXPERIENCE_ID,
			userId: 'test_user_id',
			name: 'Test Phase 4 Funnel',
			description: 'Test funnel for Phase 4',
			flow: TEST_FUNNEL_FLOW,
			isDeployed: true,
			wasEverDeployed: true,
			generationStatus: 'completed',
			sends: 0,
		}).returning();

		return funnel;
	} catch (error) {
		console.error('Error creating test funnel:', error);
		throw error;
	}
}

async function cleanupTestData() {
	try {
		// Clean up test conversations
		await db.delete(conversations).where(
			and(
				eq(conversations.experienceId, TEST_CONFIG.EXPERIENCE_ID),
				eq(conversations.funnelId, TEST_CONFIG.FUNNEL_ID)
			)
		);

		// Clean up test funnel
		await db.delete(funnels).where(
			and(
				eq(funnels.experienceId, TEST_CONFIG.EXPERIENCE_ID),
				eq(funnels.id, TEST_CONFIG.FUNNEL_ID)
			)
		);

		console.log('✅ Test data cleaned up');
	} catch (error) {
		console.error('Error cleaning up test data:', error);
	}
}

// ==================== PHASE 4 FUNCTION TESTS ====================

async function testCreateInternalChatSession() {
	logSection('Testing createInternalChatSession');

	try {
		// Create test data
		const testFunnel = await createTestFunnel();
		const testDMConversation = await createTestDMConversation();

		// Test function
		const internalConversationId = await createInternalChatSession(
			testDMConversation.id,
			TEST_CONFIG.EXPERIENCE_ID,
			testFunnel.id
		);

		// Verify internal conversation was created
		const internalConversation = await db.query.conversations.findFirst({
			where: eq(conversations.id, internalConversationId)
		});

		if (internalConversation && 
			internalConversation.metadata?.type === 'internal' &&
			internalConversation.metadata?.phase === 'strategy_session' &&
			internalConversation.metadata?.dmConversationId === testDMConversation.id) {
			logTest('createInternalChatSession - Creates internal conversation', 'PASS');
		} else {
			logTest('createInternalChatSession - Creates internal conversation', 'FAIL', 'Invalid conversation metadata');
		}

		// Verify DM conversation status updated
		const updatedDMConversation = await db.query.conversations.findFirst({
			where: eq(conversations.id, testDMConversation.id)
		});

		if (updatedDMConversation && 
			updatedDMConversation.status === 'completed' &&
			updatedDMConversation.metadata?.internalConversationId === internalConversationId) {
			logTest('createInternalChatSession - Updates DM conversation status', 'PASS');
		} else {
			logTest('createInternalChatSession - Updates DM conversation status', 'FAIL', 'DM conversation not updated correctly');
		}

		// Verify Funnel 2 initialization
		if (internalConversation && 
			internalConversation.currentBlockId === 'experience_qual_block' &&
			internalConversation.userPath?.includes('experience_qual_block')) {
			logTest('createInternalChatSession - Initializes Funnel 2', 'PASS');
		} else {
			logTest('createInternalChatSession - Initializes Funnel 2', 'FAIL', 'Funnel 2 not initialized correctly');
		}

		return { internalConversationId, testDMConversation, testFunnel };

	} catch (error) {
		logTest('createInternalChatSession - Function execution', 'FAIL', error.message);
		throw error;
	}
}

async function testCopyDMMessagesToInternalChat() {
	logSection('Testing copyDMMessagesToInternalChat');

	try {
		// Create test data
		const testFunnel = await createTestFunnel();
		const testDMConversation = await createTestDMConversation();
		const internalConversationId = await createInternalChatSession(
			testDMConversation.id,
			TEST_CONFIG.EXPERIENCE_ID,
			testFunnel.id
		);

		// Test function
		await copyDMMessagesToInternalChat(testDMConversation.id, internalConversationId);

		// Verify messages were copied
		const copiedMessages = await db.query.messages.findMany({
			where: eq(messages.conversationId, internalConversationId)
		});

		const dmHistoryMessages = copiedMessages.filter(msg => 
			msg.metadata?.dmHistory === true
		);

		if (dmHistoryMessages.length >= 4) { // Should have at least 4 messages from DM
			logTest('copyDMMessagesToInternalChat - Copies DM messages', 'PASS');
		} else {
			logTest('copyDMMessagesToInternalChat - Copies DM messages', 'FAIL', `Expected at least 4 messages, got ${dmHistoryMessages.length}`);
		}

		// Verify message format
		const firstDMMessage = dmHistoryMessages[0];
		if (firstDMMessage && 
			firstDMMessage.type === 'system' &&
			firstDMMessage.content.includes('[DM History]') &&
			firstDMMessage.metadata?.visibleToOwner === true) {
			logTest('copyDMMessagesToInternalChat - Correct message format', 'PASS');
		} else {
			logTest('copyDMMessagesToInternalChat - Correct message format', 'FAIL', 'Message format incorrect');
		}

		return { internalConversationId, testDMConversation, testFunnel };

	} catch (error) {
		logTest('copyDMMessagesToInternalChat - Function execution', 'FAIL', error.message);
		throw error;
	}
}

async function testInitializeFunnel2() {
	logSection('Testing initializeFunnel2');

	try {
		// Create test data
		const testFunnel = await createTestFunnel();
		const testDMConversation = await createTestDMConversation();
		const internalConversationId = await createInternalChatSession(
			testDMConversation.id,
			TEST_CONFIG.EXPERIENCE_ID,
			testFunnel.id
		);

		// Test function
		await initializeFunnel2(internalConversationId, TEST_FUNNEL_FLOW);

		// Verify Funnel 2 initialization
		const updatedConversation = await db.query.conversations.findFirst({
			where: eq(conversations.id, internalConversationId)
		});

		if (updatedConversation && 
			updatedConversation.metadata?.funnel2Initialized === true &&
			updatedConversation.currentBlockId === 'experience_qual_block') {
			logTest('initializeFunnel2 - Sets Funnel 2 metadata', 'PASS');
		} else {
			logTest('initializeFunnel2 - Sets Funnel 2 metadata', 'FAIL', 'Funnel 2 metadata not set correctly');
		}

		// Verify system message created
		const systemMessages = await db.query.messages.findMany({
			where: eq(messages.conversationId, internalConversationId)
		});

		const funnel2StartMessage = systemMessages.find(msg => 
			msg.metadata?.funnel2Start === true
		);

		if (funnel2StartMessage && 
			funnel2StartMessage.type === 'system' &&
			funnel2StartMessage.content.includes('Personal Strategy Session')) {
			logTest('initializeFunnel2 - Creates system message', 'PASS');
		} else {
			logTest('initializeFunnel2 - Creates system message', 'FAIL', 'System message not created correctly');
		}

		return { internalConversationId, testDMConversation, testFunnel };

	} catch (error) {
		logTest('initializeFunnel2 - Function execution', 'FAIL', error.message);
		throw error;
	}
}

async function testGenerateTransitionMessage() {
	logSection('Testing generateTransitionMessage');

	try {
		const testMessage = 'Ready for your Personal Strategy Session! Click below: [LINK_TO_PRIVATE_CHAT]';
		const testChatId = 'test_chat_123';

		// Mock generateChatLink function
		const originalGenerateChatLink = require('../lib/actions/internal-chat-transition-actions').generateChatLink;
		require('../lib/actions/internal-chat-transition-actions').generateChatLink = async () => {
			return `${TEST_CONFIG.BASE_URL}/experiences/chat/${testChatId}`;
		};

		// Test function
		const transitionMessage = await generateTransitionMessage(testMessage, testChatId);

		// Verify link replacement
		if (transitionMessage.includes(`${TEST_CONFIG.BASE_URL}/experiences/chat/${testChatId}`) &&
			!transitionMessage.includes('[LINK_TO_PRIVATE_CHAT]')) {
			logTest('generateTransitionMessage - Replaces link placeholder', 'PASS');
		} else {
			logTest('generateTransitionMessage - Replaces link placeholder', 'FAIL', 'Link placeholder not replaced correctly');
		}

		// Restore original function
		require('../lib/actions/internal-chat-transition-actions').generateChatLink = originalGenerateChatLink;

	} catch (error) {
		logTest('generateTransitionMessage - Function execution', 'FAIL', error.message);
	}
}

async function testGenerateChatLink() {
	logSection('Testing generateChatLink');

	try {
		const testChatId = 'test_chat_456';

		// Test function
		const chatLink = await generateChatLink(testChatId);

		// Verify link format
		if (chatLink.includes(`/experiences/chat/${testChatId}`) &&
			(chatLink.startsWith('http://') || chatLink.startsWith('https://'))) {
			logTest('generateChatLink - Generates valid URL', 'PASS');
		} else {
			logTest('generateChatLink - Generates valid URL', 'FAIL', `Invalid URL format: ${chatLink}`);
		}

		// Verify URL is valid
		try {
			new URL(chatLink);
			logTest('generateChatLink - URL is valid', 'PASS');
		} catch (urlError) {
			logTest('generateChatLink - URL is valid', 'FAIL', 'Generated URL is not valid');
		}

	} catch (error) {
		logTest('generateChatLink - Function execution', 'FAIL', error.message);
	}
}

async function testPersonalizeTransitionMessage() {
	logSection('Testing personalizeTransitionMessage');

	try {
		const baseMessage = 'Welcome, @[Username]! Your experience level is @[ExperienceLevel]. You selected @[SelectedValue].';
		const userData = {
			username: 'TestUser',
			experienceLevel: 'Beginner',
			selectedValue: 'Trading Guide'
		};

		// Test function
		const personalizedMessage = await personalizeTransitionMessage(baseMessage, userData);

		// Verify personalization
		if (personalizedMessage.includes('TestUser') &&
			personalizedMessage.includes('Beginner') &&
			personalizedMessage.includes('Trading Guide') &&
			!personalizedMessage.includes('@[')) {
			logTest('personalizeTransitionMessage - Replaces placeholders', 'PASS');
		} else {
			logTest('personalizeTransitionMessage - Replaces placeholders', 'FAIL', 'Placeholders not replaced correctly');
		}

		// Test with missing data
		const partialMessage = await personalizeTransitionMessage(baseMessage, { username: 'TestUser' });
		if (partialMessage.includes('TestUser') &&
			partialMessage.includes('@[ExperienceLevel]') &&
			partialMessage.includes('@[SelectedValue]')) {
			logTest('personalizeTransitionMessage - Handles missing data', 'PASS');
		} else {
			logTest('personalizeTransitionMessage - Handles missing data', 'FAIL', 'Missing data not handled correctly');
		}

	} catch (error) {
		logTest('personalizeTransitionMessage - Function execution', 'FAIL', error.message);
	}
}

async function testCompleteDMToInternalTransition() {
	logSection('Testing completeDMToInternalTransition');

	try {
		// Create test data
		const testFunnel = await createTestFunnel();
		const testDMConversation = await createTestDMConversation();
		const transitionMessage = 'Ready for your Personal Strategy Session! Click below: [LINK_TO_PRIVATE_CHAT]';

		// Mock sendTransitionMessage to avoid actual DM sending
		const originalSendTransitionMessage = require('../lib/actions/internal-chat-transition-actions').sendTransitionMessage;
		require('../lib/actions/internal-chat-transition-actions').sendTransitionMessage = async () => true;

		// Test function
		const internalConversationId = await completeDMToInternalTransition(
			testDMConversation.id,
			TEST_CONFIG.EXPERIENCE_ID,
			testFunnel.id,
			transitionMessage
		);

		// Verify complete transition
		const internalConversation = await db.query.conversations.findFirst({
			where: eq(conversations.id, internalConversationId)
		});

		if (internalConversation && 
			internalConversation.metadata?.type === 'internal' &&
			internalConversation.metadata?.phase === 'strategy_session') {
			logTest('completeDMToInternalTransition - Creates internal conversation', 'PASS');
		} else {
			logTest('completeDMToInternalTransition - Creates internal conversation', 'FAIL', 'Internal conversation not created correctly');
		}

		// Verify DM messages copied
		const copiedMessages = await db.query.messages.findMany({
			where: eq(messages.conversationId, internalConversationId)
		});

		const dmHistoryMessages = copiedMessages.filter(msg => 
			msg.metadata?.dmHistory === true
		);

		if (dmHistoryMessages.length >= 4) {
			logTest('completeDMToInternalTransition - Copies DM messages', 'PASS');
		} else {
			logTest('completeDMToInternalTransition - Copies DM messages', 'FAIL', 'DM messages not copied');
		}

		// Verify Funnel 2 initialized
		if (internalConversation && 
			internalConversation.metadata?.funnel2Initialized === true) {
			logTest('completeDMToInternalTransition - Initializes Funnel 2', 'PASS');
		} else {
			logTest('completeDMToInternalTransition - Initializes Funnel 2', 'FAIL', 'Funnel 2 not initialized');
		}

		// Restore original function
		require('../lib/actions/internal-chat-transition-actions').sendTransitionMessage = originalSendTransitionMessage;

		return { internalConversationId, testDMConversation, testFunnel };

	} catch (error) {
		logTest('completeDMToInternalTransition - Function execution', 'FAIL', error.message);
		throw error;
	}
}

// ==================== INTEGRATION TESTS ====================

async function testPhase4Integration() {
	logSection('Testing Phase 4 Integration');

	try {
		// Create test data
		const testFunnel = await createTestFunnel();
		const testDMConversation = await createTestDMConversation();

		// Test complete flow
		const internalConversationId = await completeDMToInternalTransition(
			testDMConversation.id,
			TEST_CONFIG.EXPERIENCE_ID,
			testFunnel.id,
			'Ready for your Personal Strategy Session! Click below: [LINK_TO_PRIVATE_CHAT]'
		);

		// Verify complete integration
		const internalConversation = await db.query.conversations.findFirst({
			where: eq(conversations.id, internalConversationId),
			with: {
				messages: true
			}
		});

		if (internalConversation && 
			internalConversation.metadata?.type === 'internal' &&
			internalConversation.metadata?.phase === 'strategy_session' &&
			internalConversation.metadata?.funnel2Initialized === true &&
			internalConversation.messages.length >= 5) { // DM messages + system message
			logTest('Phase 4 Integration - Complete flow', 'PASS');
		} else {
			logTest('Phase 4 Integration - Complete flow', 'FAIL', 'Integration flow not working correctly');
		}

		// Verify conversation linking
		const updatedDMConversation = await db.query.conversations.findFirst({
			where: eq(conversations.id, testDMConversation.id)
		});

		if (updatedDMConversation && 
			updatedDMConversation.metadata?.internalConversationId === internalConversationId &&
			updatedDMConversation.status === 'completed') {
			logTest('Phase 4 Integration - Conversation linking', 'PASS');
		} else {
			logTest('Phase 4 Integration - Conversation linking', 'FAIL', 'Conversation linking not working');
		}

	} catch (error) {
		logTest('Phase 4 Integration - Function execution', 'FAIL', error.message);
	}
}

// ==================== MAIN TEST RUNNER ====================

async function runPhase4Tests() {
	console.log('🚀 Starting Phase 4 Testing Suite');
	console.log('=====================================');

	try {
		// Clean up any existing test data
		await cleanupTestData();

		// Run individual function tests
		await testCreateInternalChatSession();
		await testCopyDMMessagesToInternalChat();
		await testInitializeFunnel2();
		await testGenerateTransitionMessage();
		await testGenerateChatLink();
		await testPersonalizeTransitionMessage();
		await testCompleteDMToInternalTransition();

		// Run integration tests
		await testPhase4Integration();

		// Clean up test data
		await cleanupTestData();

		// Print results
		console.log('\n📊 Phase 4 Test Results');
		console.log('========================');
		console.log(`Total Tests: ${testResults.total}`);
		console.log(`Passed: ${testResults.passed}`);
		console.log(`Failed: ${testResults.failed}`);
		console.log(`Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);

		if (testResults.failed > 0) {
			console.log('\n❌ Failed Tests:');
			testResults.details
				.filter(test => test.status === 'FAIL')
				.forEach(test => {
					console.log(`  - ${test.testName}: ${test.details}`);
				});
		}

		if (testResults.passed === testResults.total) {
			console.log('\n🎉 All Phase 4 tests passed!');
			return true;
		} else {
			console.log('\n⚠️  Some Phase 4 tests failed. Please review the results above.');
			return false;
		}

	} catch (error) {
		console.error('❌ Phase 4 test suite failed:', error);
		return false;
	}
}

// Run tests if this file is executed directly
if (require.main === module) {
	runPhase4Tests()
		.then(success => {
			process.exit(success ? 0 : 1);
		})
		.catch(error => {
			console.error('Test suite crashed:', error);
			process.exit(1);
		});
}

module.exports = {
	runPhase4Tests,
	testResults
};

