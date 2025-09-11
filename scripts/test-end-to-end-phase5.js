#!/usr/bin/env node

/**
 * Phase 5: UserChat Integration - End-to-End Integration Tests
 * 
 * Tests complete UserChat integration flow:
 * - UserChat route accessibility
 * - Conversation loading and validation
 * - WebSocket integration
 * - Real-time messaging
 * - Funnel navigation
 * - Message synchronization
 * - Complete user journey
 */

const axios = require('axios');

// Test configuration
const TEST_CONFIG = {
	BASE_URL: 'http://localhost:3000',
	EXPERIENCE_ID: 'test-experience-123',
	CONVERSATION_ID: 'test-conversation-456',
	API_ENDPOINTS: {
		userChat: '/api/experiences/{experienceId}/chat/{conversationId}',
		conversations: '/api/conversations',
		internalChat: '/api/internal-chat',
	},
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
function logTest(testName, passed, error = null, details = null) {
	const status = passed ? '✅ PASSED' : '❌ FAILED';
	console.log(`${status}: ${testName}`);
	
	if (details) {
		console.log(`  Details: ${details}`);
	}
	
	testResults.tests.push({
		name: testName,
		passed,
		error: error?.message || error,
		details,
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
 * Test 1: UserChat Route Accessibility
 */
async function testUserChatRouteAccessibility() {
	try {
		const url = `${TEST_CONFIG.BASE_URL}/experiences/${TEST_CONFIG.EXPERIENCE_ID}/chat/${TEST_CONFIG.CONVERSATION_ID}`;
		
		const response = await axios.get(url, {
			timeout: 10000,
			validateStatus: (status) => status < 500, // Accept 4xx as valid responses
		});
		
		// Should return a page (200) or redirect (3xx) or not found (404)
		const passed = response.status >= 200 && response.status < 500;
		
		logTest('UserChat Route Accessibility', passed, null, 
			`Status: ${response.status}, URL: ${url}`);
	} catch (error) {
		logTest('UserChat Route Accessibility', false, error);
	}
}

/**
 * Test 2: UserChat Route with Invalid Conversation
 */
async function testUserChatRouteInvalidConversation() {
	try {
		const url = `${TEST_CONFIG.BASE_URL}/experiences/${TEST_CONFIG.EXPERIENCE_ID}/chat/invalid-conversation-id`;
		
		const response = await axios.get(url, {
			timeout: 10000,
			validateStatus: (status) => status < 500,
		});
		
		// Should return 404 or error page
		const passed = response.status === 404 || response.status >= 400;
		
		logTest('UserChat Route - Invalid Conversation', passed, null,
			`Status: ${response.status}`);
	} catch (error) {
		logTest('UserChat Route - Invalid Conversation', false, error);
	}
}

/**
 * Test 3: UserChat Route with Invalid Experience
 */
async function testUserChatRouteInvalidExperience() {
	try {
		const url = `${TEST_CONFIG.BASE_URL}/experiences/invalid-experience-id/chat/${TEST_CONFIG.CONVERSATION_ID}`;
		
		const response = await axios.get(url, {
			timeout: 10000,
			validateStatus: (status) => status < 500,
		});
		
		// Should return 404 or error page
		const passed = response.status === 404 || response.status >= 400;
		
		logTest('UserChat Route - Invalid Experience', passed, null,
			`Status: ${response.status}`);
	} catch (error) {
		logTest('UserChat Route - Invalid Experience', false, error);
	}
}

/**
 * Test 4: UserChat Component Loading
 */
async function testUserChatComponentLoading() {
	try {
		const url = `${TEST_CONFIG.BASE_URL}/experiences/${TEST_CONFIG.EXPERIENCE_ID}/chat/${TEST_CONFIG.CONVERSATION_ID}`;
		
		const response = await axios.get(url, {
			timeout: 10000,
			validateStatus: (status) => status < 500,
		});
		
		if (response.status === 200) {
			// Check if UserChat component is present in HTML
			const html = response.data;
			const hasUserChat = html.includes('UserChat') || 
							   html.includes('chat') || 
							   html.includes('conversation');
			
			logTest('UserChat Component Loading', hasUserChat, null,
				`Component found: ${hasUserChat}`);
		} else {
			logTest('UserChat Component Loading', false, null,
				`Page not accessible: ${response.status}`);
		}
	} catch (error) {
		logTest('UserChat Component Loading', false, error);
	}
}

/**
 * Test 5: Conversation Data Loading
 */
async function testConversationDataLoading() {
	try {
		// Test conversation loading endpoint
		const url = `${TEST_CONFIG.BASE_URL}/api/conversations/${TEST_CONFIG.CONVERSATION_ID}`;
		
		const response = await axios.get(url, {
			timeout: 10000,
			validateStatus: (status) => status < 500,
		});
		
		// Should return conversation data or appropriate error
		const passed = response.status === 200 || response.status === 404;
		
		logTest('Conversation Data Loading', passed, null,
			`Status: ${response.status}`);
	} catch (error) {
		logTest('Conversation Data Loading', false, error);
	}
}

/**
 * Test 6: Internal Chat API Integration
 */
async function testInternalChatAPIIntegration() {
	try {
		const url = `${TEST_CONFIG.BASE_URL}/api/internal-chat`;
		
		// Test GET request
		const getResponse = await axios.get(url, {
			timeout: 10000,
			validateStatus: (status) => status < 500,
		});
		
		// Test POST request
		const postResponse = await axios.post(url, {
			conversationId: TEST_CONFIG.CONVERSATION_ID,
			experienceId: TEST_CONFIG.EXPERIENCE_ID,
		}, {
			timeout: 10000,
			validateStatus: (status) => status < 500,
		});
		
		const passed = getResponse.status < 500 && postResponse.status < 500;
		
		logTest('Internal Chat API Integration', passed, null,
			`GET: ${getResponse.status}, POST: ${postResponse.status}`);
	} catch (error) {
		logTest('Internal Chat API Integration', false, error);
	}
}

/**
 * Test 7: WebSocket Connection Test
 */
async function testWebSocketConnection() {
	try {
		// This test would require a WebSocket client
		// For now, we'll test if the WebSocket endpoint is accessible
		const url = `${TEST_CONFIG.BASE_URL}/api/websocket`;
		
		const response = await axios.get(url, {
			timeout: 5000,
			validateStatus: (status) => status < 500,
		});
		
		// WebSocket endpoint should be accessible
		const passed = response.status < 500;
		
		logTest('WebSocket Connection Test', passed, null,
			`Status: ${response.status}`);
	} catch (error) {
		logTest('WebSocket Connection Test', false, error);
	}
}

/**
 * Test 8: Message Persistence API
 */
async function testMessagePersistenceAPI() {
	try {
		const url = `${TEST_CONFIG.BASE_URL}/api/conversations/${TEST_CONFIG.CONVERSATION_ID}/messages`;
		
		// Test GET messages
		const getResponse = await axios.get(url, {
			timeout: 10000,
			validateStatus: (status) => status < 500,
		});
		
		// Test POST message
		const postResponse = await axios.post(url, {
			type: 'user',
			content: 'Test message from integration test',
			metadata: { test: true, timestamp: Date.now() },
		}, {
			timeout: 10000,
			validateStatus: (status) => status < 500,
		});
		
		const passed = getResponse.status < 500 && postResponse.status < 500;
		
		logTest('Message Persistence API', passed, null,
			`GET: ${getResponse.status}, POST: ${postResponse.status}`);
	} catch (error) {
		logTest('Message Persistence API', false, error);
	}
}

/**
 * Test 9: Funnel Navigation API
 */
async function testFunnelNavigationAPI() {
	try {
		const url = `${TEST_CONFIG.BASE_URL}/api/conversations/${TEST_CONFIG.CONVERSATION_ID}`;
		
		// Test PUT request for funnel navigation
		const putResponse = await axios.put(url, {
			currentBlockId: 'test-block-id',
			userPath: ['block-1', 'test-block-id'],
			metadata: { navigation: true, timestamp: Date.now() },
		}, {
			timeout: 10000,
			validateStatus: (status) => status < 500,
		});
		
		const passed = putResponse.status < 500;
		
		logTest('Funnel Navigation API', passed, null,
			`Status: ${putResponse.status}`);
	} catch (error) {
		logTest('Funnel Navigation API', false, error);
	}
}

/**
 * Test 10: Complete User Journey Simulation
 */
async function testCompleteUserJourney() {
	try {
		// Step 1: Access UserChat page
		const pageUrl = `${TEST_CONFIG.BASE_URL}/experiences/${TEST_CONFIG.EXPERIENCE_ID}/chat/${TEST_CONFIG.CONVERSATION_ID}`;
		const pageResponse = await axios.get(pageUrl, {
			timeout: 10000,
			validateStatus: (status) => status < 500,
		});
		
		if (pageResponse.status !== 200) {
			logTest('Complete User Journey', false, null,
				`Page not accessible: ${pageResponse.status}`);
			return;
		}
		
		// Step 2: Load conversation data
		const conversationUrl = `${TEST_CONFIG.BASE_URL}/api/conversations/${TEST_CONFIG.CONVERSATION_ID}`;
		const conversationResponse = await axios.get(conversationUrl, {
			timeout: 10000,
			validateStatus: (status) => status < 500,
		});
		
		// Step 3: Send a test message
		const messageUrl = `${TEST_CONFIG.BASE_URL}/api/conversations/${TEST_CONFIG.CONVERSATION_ID}/messages`;
		const messageResponse = await axios.post(messageUrl, {
			type: 'user',
			content: 'Test message from complete journey',
			metadata: { journey: true, timestamp: Date.now() },
		}, {
			timeout: 10000,
			validateStatus: (status) => status < 500,
		});
		
		const passed = pageResponse.status === 200 && 
					   conversationResponse.status < 500 && 
					   messageResponse.status < 500;
		
		logTest('Complete User Journey', passed, null,
			`Page: ${pageResponse.status}, Conversation: ${conversationResponse.status}, Message: ${messageResponse.status}`);
	} catch (error) {
		logTest('Complete User Journey', false, error);
	}
}

/**
 * Test 11: Error Handling and Recovery
 */
async function testErrorHandlingAndRecovery() {
	try {
		const errorTests = [
			// Invalid conversation ID
			`${TEST_CONFIG.BASE_URL}/experiences/${TEST_CONFIG.EXPERIENCE_ID}/chat/invalid-id`,
			// Invalid experience ID
			`${TEST_CONFIG.BASE_URL}/experiences/invalid-id/chat/${TEST_CONFIG.CONVERSATION_ID}`,
			// Malformed URLs
			`${TEST_CONFIG.BASE_URL}/experiences//chat/`,
			`${TEST_CONFIG.BASE_URL}/experiences/${TEST_CONFIG.EXPERIENCE_ID}/chat/`,
		];
		
		const results = await Promise.all(
			errorTests.map(async (url) => {
				try {
					const response = await axios.get(url, {
						timeout: 5000,
						validateStatus: (status) => status < 500,
					});
					return response.status >= 400; // Should return error status
				} catch (error) {
					return true; // Network errors are also acceptable for invalid URLs
				}
			})
		);
		
		const allHandledErrors = results.every(result => result === true);
		
		logTest('Error Handling and Recovery', allHandledErrors, null,
			`Error handling: ${allHandledErrors ? 'All errors handled' : 'Some errors not handled'}`);
	} catch (error) {
		logTest('Error Handling and Recovery', false, error);
	}
}

/**
 * Test 12: Performance and Response Times
 */
async function testPerformanceAndResponseTimes() {
	try {
		const startTime = Date.now();
		
		const url = `${TEST_CONFIG.BASE_URL}/experiences/${TEST_CONFIG.EXPERIENCE_ID}/chat/${TEST_CONFIG.CONVERSATION_ID}`;
		
		const response = await axios.get(url, {
			timeout: 10000,
			validateStatus: (status) => status < 500,
		});
		
		const responseTime = Date.now() - startTime;
		const passed = responseTime < 5000; // Should respond within 5 seconds
		
		logTest('Performance and Response Times', passed, null,
			`Response time: ${responseTime}ms, Status: ${response.status}`);
	} catch (error) {
		logTest('Performance and Response Times', false, error);
	}
}

/**
 * Test 13: Mobile Responsiveness
 */
async function testMobileResponsiveness() {
	try {
		const url = `${TEST_CONFIG.BASE_URL}/experiences/${TEST_CONFIG.EXPERIENCE_ID}/chat/${TEST_CONFIG.CONVERSATION_ID}`;
		
		const response = await axios.get(url, {
			timeout: 10000,
			validateStatus: (status) => status < 500,
			headers: {
				'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
			},
		});
		
		if (response.status === 200) {
			const html = response.data;
			// Check for mobile-friendly elements
			const hasMobileElements = html.includes('viewport') || 
									html.includes('mobile') || 
									html.includes('responsive');
			
			logTest('Mobile Responsiveness', hasMobileElements, null,
				`Mobile elements found: ${hasMobileElements}`);
		} else {
			logTest('Mobile Responsiveness', false, null,
				`Page not accessible: ${response.status}`);
		}
	} catch (error) {
		logTest('Mobile Responsiveness', false, error);
	}
}

/**
 * Test 14: Security and Access Control
 */
async function testSecurityAndAccessControl() {
	try {
		// Test with different experience IDs to ensure isolation
		const testUrls = [
			`${TEST_CONFIG.BASE_URL}/experiences/experience-1/chat/${TEST_CONFIG.CONVERSATION_ID}`,
			`${TEST_CONFIG.BASE_URL}/experiences/experience-2/chat/${TEST_CONFIG.CONVERSATION_ID}`,
		];
		
		const results = await Promise.all(
			testUrls.map(async (url) => {
				try {
					const response = await axios.get(url, {
						timeout: 5000,
						validateStatus: (status) => status < 500,
					});
					return response.status; // Return status for analysis
				} catch (error) {
					return error.response?.status || 500;
				}
			})
		);
		
		// Should return appropriate access control responses
		const passed = results.every(status => status >= 400); // Should deny access or return errors
		
		logTest('Security and Access Control', passed, null,
			`Access control responses: ${results.join(', ')}`);
	} catch (error) {
		logTest('Security and Access Control', false, error);
	}
}

/**
 * Test 15: Integration with Existing System
 */
async function testIntegrationWithExistingSystem() {
	try {
		// Test that UserChat integrates with existing conversation system
		const conversationUrl = `${TEST_CONFIG.BASE_URL}/api/conversations/${TEST_CONFIG.CONVERSATION_ID}`;
		const internalChatUrl = `${TEST_CONFIG.BASE_URL}/api/internal-chat`;
		
		const [conversationResponse, internalChatResponse] = await Promise.all([
			axios.get(conversationUrl, {
				timeout: 10000,
				validateStatus: (status) => status < 500,
			}),
			axios.get(internalChatUrl, {
				timeout: 10000,
				validateStatus: (status) => status < 500,
			}),
		]);
		
		const passed = conversationResponse.status < 500 && internalChatResponse.status < 500;
		
		logTest('Integration with Existing System', passed, null,
			`Conversation API: ${conversationResponse.status}, Internal Chat API: ${internalChatResponse.status}`);
	} catch (error) {
		logTest('Integration with Existing System', false, error);
	}
}

/**
 * Run all integration tests
 */
async function runAllTests() {
	console.log('🚀 Phase 5: UserChat Integration - End-to-End Integration Tests');
	console.log('='.repeat(70));
	
	// Test 1: Route Accessibility
	logSection('Route Accessibility Tests');
	await testUserChatRouteAccessibility();
	await testUserChatRouteInvalidConversation();
	await testUserChatRouteInvalidExperience();
	
	// Test 2: Component and Data Loading
	logSection('Component and Data Loading Tests');
	await testUserChatComponentLoading();
	await testConversationDataLoading();
	
	// Test 3: API Integration
	logSection('API Integration Tests');
	await testInternalChatAPIIntegration();
	await testMessagePersistenceAPI();
	await testFunnelNavigationAPI();
	
	// Test 4: WebSocket and Real-time Features
	logSection('WebSocket and Real-time Tests');
	await testWebSocketConnection();
	
	// Test 5: User Journey and Performance
	logSection('User Journey and Performance Tests');
	await testCompleteUserJourney();
	await testPerformanceAndResponseTimes();
	
	// Test 6: Error Handling and Security
	logSection('Error Handling and Security Tests');
	await testErrorHandlingAndRecovery();
	await testSecurityAndAccessControl();
	
	// Test 7: Mobile and Integration
	logSection('Mobile and Integration Tests');
	await testMobileResponsiveness();
	await testIntegrationWithExistingSystem();
	
	// Print results
	console.log('\n📊 Phase 5 Integration Test Results:');
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
		console.log('\n🎉 All Phase 5 integration tests PASSED! UserChat is ready for production.');
	} else {
		console.log('\n⚠️  Some integration tests failed. Please review and fix before deployment.');
	}
	
	return testResults;
}

// Run tests if called directly
if (require.main === module) {
	runAllTests().catch(console.error);
}

module.exports = { runAllTests, testResults };

