/**
 * End-to-End Phase 4 Integration Test
 * 
 * Tests the complete flow from user join to internal chat transition
 * Integrates with existing Phases 1-3 and tests Phase 4 functionality
 */

// Database connection not needed for testing
// Schema imports not needed for testing

// Import all phase functions
const { handleUserJoinEvent } = require('../lib/actions/user-join-actions');
const { dmMonitoringService } = require('../lib/actions/dm-monitoring-actions');
const { completeDMToInternalTransition } = require('../lib/actions/internal-chat-transition-actions');

// Test configuration
const TEST_CONFIG = {
	EXPERIENCE_ID: 'exp_e2e_phase4',
	FUNNEL_ID: 'funnel_e2e_phase4',
	WHOP_USER_ID: 'user_e2e_phase4',
	WHOP_PRODUCT_ID: 'product_e2e_phase4',
	BASE_URL: 'http://localhost:3000',
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
async function createTestFunnel() {
	try {
		const testFunnelFlow = {
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
					message: 'Welcome! Let\'s get started with your free guide.',
					options: [
						{ text: 'Continue', nextBlockId: 'value_block' }
					]
				},
				value_block: {
					id: 'value_block',
					message: 'Here\'s your free trading guide: https://example.com/guide\n\nPlease review it and reply with "done" when ready.',
					resourceName: 'Free Trading Guide',
					options: [
						{ text: 'done', nextBlockId: 'transition_block' }
					]
				},
				transition_block: {
					id: 'transition_block',
					message: 'Excellent! You\'ve completed the first step. ✅\n\nNow it\'s time to build your personal strategy plan. To do that, I\'ve prepared a private, unlimited chat session just for you.\n\nClick below to begin your Personal Strategy Session now.\n\n➡️ [LINK_TO_PRIVATE_CHAT] ⬅️',
					options: [
						{ text: 'Continue to Strategy Session', nextBlockId: 'experience_qual_block' }
					]
				},
				experience_qual_block: {
					id: 'experience_qual_block',
					message: 'Welcome, @[Username]! Glad you made it. Let\'s get started.\n\nBased on the trading guide you just saw, where would you place your current skill level?',
					options: [
						{ text: 'This was mostly new information (Beginner)', nextBlockId: 'pain_point_block' }
					]
				},
				pain_point_block: {
					id: 'pain_point_block',
					message: 'Got it. That\'s the perfect place to start.\n\nFor beginners, what feels like the biggest hurdle for you right now?',
					options: [
						{ text: 'Managing the risk of losing money.', nextBlockId: 'offer_block' }
					]
				},
				offer_block: {
					id: 'offer_block',
					message: 'That makes perfect sense. Managing risk is the #1 skill that separates successful traders from gamblers.\n\nBased on everything you\'ve told me, the clear next step is our "Crypto Risk Management" video workshop.\n\nYou can get instant access here:\nhttps://example.com/risk-workshop',
					resourceName: 'Crypto Risk Management Workshop',
					options: []
				}
			}
		};

		const [funnel] = await db.insert(funnels).values({
			experienceId: TEST_CONFIG.EXPERIENCE_ID,
			userId: 'test_user_id',
			name: 'E2E Phase 4 Test Funnel',
			description: 'End-to-end test funnel for Phase 4',
			flow: testFunnelFlow,
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

// ==================== E2E TEST SCENARIOS ====================

async function testCompleteUserJourney() {
	logSection('Testing Complete User Journey (Phases 1-4)');

	try {
		// Step 1: Create test funnel
		const testFunnel = await createTestFunnel();
		logTest('E2E - Test funnel created', 'PASS');

		// Step 2: Simulate user join event (Phase 1)
		// Note: This would normally be triggered by webhook
		// For testing, we'll simulate the DM conversation creation
		const [dmConversation] = await db.insert(conversations).values({
			experienceId: TEST_CONFIG.EXPERIENCE_ID,
			funnelId: testFunnel.id,
			status: 'active',
			currentBlockId: 'welcome_block',
			userPath: ['welcome_block'],
			metadata: {
				type: 'dm',
				phase: 'welcome',
				whopUserId: TEST_CONFIG.WHOP_USER_ID,
				whopProductId: TEST_CONFIG.WHOP_PRODUCT_ID,
			},
		}).returning();

		logTest('E2E - DM conversation created', 'PASS');

		// Step 3: Simulate user interactions through Funnel 1 (Phase 2)
		// Add messages to simulate user going through the funnel
		await db.insert(messages).values([
			{
				conversationId: dmConversation.id,
				type: 'bot',
				content: 'Welcome! Let\'s get started with your free guide.',
			},
			{
				conversationId: dmConversation.id,
				type: 'user',
				content: 'Continue',
			},
			{
				conversationId: dmConversation.id,
				type: 'bot',
				content: 'Here\'s your free trading guide: https://example.com/guide\n\nPlease review it and reply with "done" when ready.',
			},
			{
				conversationId: dmConversation.id,
				type: 'user',
				content: 'done',
			},
		]);

		// Update conversation to transition block
		await db.update(conversations)
			.set({
				currentBlockId: 'transition_block',
				userPath: ['welcome_block', 'value_block', 'transition_block'],
				updatedAt: new Date(),
			})
			.where(eq(conversations.id, dmConversation.id));

		logTest('E2E - User completed Funnel 1', 'PASS');

		// Step 4: Test Phase 4 transition to internal chat
		const internalConversationId = await completeDMToInternalTransition(
			dmConversation.id,
			TEST_CONFIG.EXPERIENCE_ID,
			testFunnel.id,
			'Excellent! You\'ve completed the first step. ✅\n\nNow it\'s time to build your personal strategy plan. To do that, I\'ve prepared a private, unlimited chat session just for you.\n\nClick below to begin your Personal Strategy Session now.\n\n➡️ [LINK_TO_PRIVATE_CHAT] ⬅️'
		);

		logTest('E2E - Phase 4 transition completed', 'PASS');

		// Step 5: Verify internal chat session
		const internalConversation = await db.query.conversations.findFirst({
			where: eq(conversations.id, internalConversationId),
			with: {
				messages: {
					orderBy: [conversations.createdAt],
				},
			},
		});

		if (internalConversation && 
			internalConversation.metadata?.type === 'internal' &&
			internalConversation.metadata?.phase === 'strategy_session' &&
			internalConversation.metadata?.funnel2Initialized === true) {
			logTest('E2E - Internal chat session created correctly', 'PASS');
		} else {
			logTest('E2E - Internal chat session created correctly', 'FAIL', 'Internal chat metadata incorrect');
		}

		// Step 6: Verify DM messages copied
		const dmHistoryMessages = internalConversation.messages.filter(msg => 
			msg.metadata?.dmHistory === true
		);

		if (dmHistoryMessages.length >= 4) {
			logTest('E2E - DM messages copied to internal chat', 'PASS');
		} else {
			logTest('E2E - DM messages copied to internal chat', 'FAIL', `Expected at least 4 DM messages, got ${dmHistoryMessages.length}`);
		}

		// Step 7: Verify Funnel 2 initialization
		if (internalConversation.currentBlockId === 'experience_qual_block' &&
			internalConversation.userPath?.includes('experience_qual_block')) {
			logTest('E2E - Funnel 2 initialized correctly', 'PASS');
		} else {
			logTest('E2E - Funnel 2 initialized correctly', 'FAIL', 'Funnel 2 not initialized correctly');
		}

		// Step 8: Verify conversation linking
		const updatedDMConversation = await db.query.conversations.findFirst({
			where: eq(conversations.id, dmConversation.id)
		});

		if (updatedDMConversation && 
			updatedDMConversation.status === 'completed' &&
			updatedDMConversation.metadata?.internalConversationId === internalConversationId) {
			logTest('E2E - Conversation linking working', 'PASS');
		} else {
			logTest('E2E - Conversation linking working', 'FAIL', 'Conversation linking not working');
		}

		// Step 9: Verify system message for Funnel 2
		const funnel2StartMessage = internalConversation.messages.find(msg => 
			msg.metadata?.funnel2Start === true
		);

		if (funnel2StartMessage && 
			funnel2StartMessage.type === 'system' &&
			funnel2StartMessage.content.includes('Personal Strategy Session')) {
			logTest('E2E - Funnel 2 system message created', 'PASS');
		} else {
			logTest('E2E - Funnel 2 system message created', 'FAIL', 'Funnel 2 system message not created');
		}

		return { dmConversation, internalConversation, testFunnel };

	} catch (error) {
		logTest('E2E - Complete user journey', 'FAIL', error.message);
		throw error;
	}
}

async function testErrorHandling() {
	logSection('Testing Error Handling');

	try {
		// Test with invalid DM conversation ID
		try {
			await completeDMToInternalTransition(
				'invalid_dm_id',
				TEST_CONFIG.EXPERIENCE_ID,
				TEST_CONFIG.FUNNEL_ID,
				'Test message'
			);
			logTest('Error Handling - Invalid DM conversation ID', 'FAIL', 'Should have thrown error');
		} catch (error) {
			if (error.message.includes('not found')) {
				logTest('Error Handling - Invalid DM conversation ID', 'PASS');
			} else {
				logTest('Error Handling - Invalid DM conversation ID', 'FAIL', `Unexpected error: ${error.message}`);
			}
		}

		// Test with invalid funnel ID
		try {
			const testFunnel = await createTestFunnel();
			const [dmConversation] = await db.insert(conversations).values({
				experienceId: TEST_CONFIG.EXPERIENCE_ID,
				funnelId: testFunnel.id,
				status: 'active',
				currentBlockId: 'welcome_block',
				userPath: ['welcome_block'],
				metadata: {
					type: 'dm',
					phase: 'welcome',
					whopUserId: TEST_CONFIG.WHOP_USER_ID,
					whopProductId: TEST_CONFIG.WHOP_PRODUCT_ID,
				},
			}).returning();

			await completeDMToInternalTransition(
				dmConversation.id,
				TEST_CONFIG.EXPERIENCE_ID,
				'invalid_funnel_id',
				'Test message'
			);
			logTest('Error Handling - Invalid funnel ID', 'FAIL', 'Should have thrown error');
		} catch (error) {
			if (error.message.includes('not found')) {
				logTest('Error Handling - Invalid funnel ID', 'PASS');
			} else {
				logTest('Error Handling - Invalid funnel ID', 'FAIL', `Unexpected error: ${error.message}`);
			}
		}

	} catch (error) {
		logTest('Error Handling - Function execution', 'FAIL', error.message);
	}
}

async function testMultiUserScenario() {
	logSection('Testing Multi-User Scenario');

	try {
		const testFunnel = await createTestFunnel();

		// Create multiple DM conversations
		const dmConversations = [];
		for (let i = 1; i <= 3; i++) {
			const [dmConversation] = await db.insert(conversations).values({
				experienceId: TEST_CONFIG.EXPERIENCE_ID,
				funnelId: testFunnel.id,
				status: 'active',
				currentBlockId: 'transition_block',
				userPath: ['welcome_block', 'value_block', 'transition_block'],
				metadata: {
					type: 'dm',
					phase: 'welcome',
					whopUserId: `${TEST_CONFIG.WHOP_USER_ID}_${i}`,
					whopProductId: TEST_CONFIG.WHOP_PRODUCT_ID,
				},
			}).returning();

			dmConversations.push(dmConversation);
		}

		logTest('Multi-User - Created multiple DM conversations', 'PASS');

		// Transition all to internal chat
		const internalConversationIds = [];
		for (const dmConversation of dmConversations) {
			const internalConversationId = await completeDMToInternalTransition(
				dmConversation.id,
				TEST_CONFIG.EXPERIENCE_ID,
				testFunnel.id,
				'Ready for your Personal Strategy Session! Click below: [LINK_TO_PRIVATE_CHAT]'
			);
			internalConversationIds.push(internalConversationId);
		}

		logTest('Multi-User - All transitions completed', 'PASS');

		// Verify all internal conversations are unique
		const uniqueIds = new Set(internalConversationIds);
		if (uniqueIds.size === internalConversationIds.length) {
			logTest('Multi-User - All internal conversations are unique', 'PASS');
		} else {
			logTest('Multi-User - All internal conversations are unique', 'FAIL', 'Duplicate internal conversation IDs');
		}

		// Verify all DM conversations are completed
		const completedDMConversations = await db.query.conversations.findMany({
			where: and(
				eq(conversations.experienceId, TEST_CONFIG.EXPERIENCE_ID),
				eq(conversations.funnelId, testFunnel.id),
				eq(conversations.metadata.type, 'dm')
			)
		});

		const allCompleted = completedDMConversations.every(conv => conv.status === 'completed');
		if (allCompleted) {
			logTest('Multi-User - All DM conversations completed', 'PASS');
		} else {
			logTest('Multi-User - All DM conversations completed', 'FAIL', 'Some DM conversations not completed');
		}

	} catch (error) {
		logTest('Multi-User - Function execution', 'FAIL', error.message);
	}
}

// ==================== MAIN TEST RUNNER ====================

async function runE2EPhase4Tests() {
	console.log('🚀 Starting End-to-End Phase 4 Integration Tests');
	console.log('================================================');

	try {
		// Clean up any existing test data
		await cleanupTestData();

		// Run test scenarios
		await testCompleteUserJourney();
		await testErrorHandling();
		await testMultiUserScenario();

		// Clean up test data
		await cleanupTestData();

		// Print results
		console.log('\n📊 End-to-End Phase 4 Test Results');
		console.log('===================================');
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
			console.log('\n🎉 All End-to-End Phase 4 tests passed!');
			console.log('✅ Phase 4 is ready for production!');
			return true;
		} else {
			console.log('\n⚠️  Some End-to-End Phase 4 tests failed. Please review the results above.');
			return false;
		}

	} catch (error) {
		console.error('❌ End-to-End Phase 4 test suite failed:', error);
		return false;
	}
}

// Run tests if this file is executed directly
if (require.main === module) {
	runE2EPhase4Tests()
		.then(success => {
			process.exit(success ? 0 : 1);
		})
		.catch(error => {
			console.error('Test suite crashed:', error);
			process.exit(1);
		});
}

module.exports = {
	runE2EPhase4Tests,
	testResults
};
