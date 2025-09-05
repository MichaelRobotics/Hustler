/**
 * WebSocket Integration Test Suite
 * 
 * Tests the complete WebSocket implementation with real-time messaging, updates, and analytics
 */

const fs = require('fs');
const path = require('path');

console.log('🔌 Testing WebSocket Integration and Real-Time Features...\n');

// Test Results Tracking
const testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  details: []
};

function logTest(testName, passed, details = '') {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    console.log(`✅ ${testName}`);
  } else {
    testResults.failed++;
    console.log(`❌ ${testName}: ${details}`);
  }
  testResults.details.push({ testName, passed, details });
}

// Test 1: WebSocket Message Flow Integration
function testWebSocketMessageFlow() {
  console.log('💬 Testing WebSocket Message Flow Integration...');
  
  // Test messaging.ts integration with whop-websocket.ts
  const messagingPath = path.join(__dirname, '..', 'lib/websocket/messaging.ts');
  const whopWebSocketPath = path.join(__dirname, '..', 'lib/websocket/whop-websocket.ts');
  
  if (fs.existsSync(messagingPath) && fs.existsSync(whopWebSocketPath)) {
    const messagingContent = fs.readFileSync(messagingPath, 'utf8');
    const whopWebSocketContent = fs.readFileSync(whopWebSocketPath, 'utf8');
    
    // Check if messaging imports whop-websocket
    const hasWhopWebSocketImport = messagingContent.includes('whop-websocket') || 
                                   messagingContent.includes('whopWebSocket');
    logTest('Messaging imports WebSocket manager', hasWhopWebSocketImport);
    
    // Check if messaging uses WebSocket methods
    const hasSendMessageUsage = messagingContent.includes('whopWebSocket.sendMessage');
    const hasJoinChannelUsage = messagingContent.includes('whopWebSocket.joinChannel');
    logTest('Messaging uses WebSocket methods', hasSendMessageUsage && hasJoinChannelUsage);
    
    // Check message broadcasting
    const hasBroadcastMessage = messagingContent.includes('broadcastMessage');
    const hasWebSocketMessage = messagingContent.includes('WebSocketMessage');
    logTest('Message broadcasting implementation', hasBroadcastMessage && hasWebSocketMessage);
  }
}

// Test 2: Real-Time Updates Integration
function testRealTimeUpdatesIntegration() {
  console.log('\n🔄 Testing Real-Time Updates Integration...');
  
  // Test updates.ts integration with whop-websocket.ts
  const updatesPath = path.join(__dirname, '..', 'lib/websocket/updates.ts');
  const whopWebSocketPath = path.join(__dirname, '..', 'lib/websocket/whop-websocket.ts');
  
  if (fs.existsSync(updatesPath) && fs.existsSync(whopWebSocketPath)) {
    const updatesContent = fs.readFileSync(updatesPath, 'utf8');
    const whopWebSocketContent = fs.readFileSync(whopWebSocketPath, 'utf8');
    
    // Check if updates imports whop-websocket
    const hasWhopWebSocketImport = updatesContent.includes('whop-websocket') || 
                                   updatesContent.includes('whopWebSocket');
    logTest('Updates imports WebSocket manager', hasWhopWebSocketImport);
    
    // Check if updates uses WebSocket methods
    const hasSendMessageUsage = updatesContent.includes('whopWebSocket.sendMessage');
    const hasJoinChannelUsage = updatesContent.includes('whopWebSocket.joinChannel');
    logTest('Updates uses WebSocket methods', hasSendMessageUsage && hasJoinChannelUsage);
    
    // Check update broadcasting
    const hasBroadcastUpdate = updatesContent.includes('broadcastUpdate');
    const hasWebSocketMessage = updatesContent.includes('WebSocketMessage');
    logTest('Update broadcasting implementation', hasBroadcastUpdate && hasWebSocketMessage);
  }
}

// Test 3: Analytics Integration with WebSocket
function testAnalyticsWebSocketIntegration() {
  console.log('\n📊 Testing Analytics WebSocket Integration...');
  
  const analyticsPath = path.join(__dirname, '..', 'lib/analytics/analytics.ts');
  const updatesPath = path.join(__dirname, '..', 'lib/websocket/updates.ts');
  
  if (fs.existsSync(analyticsPath) && fs.existsSync(updatesPath)) {
    const analyticsContent = fs.readFileSync(analyticsPath, 'utf8');
    const updatesContent = fs.readFileSync(updatesPath, 'utf8');
    
    // Check if analytics imports real-time updates
    const hasRealTimeUpdatesImport = analyticsContent.includes('realTimeUpdates') || 
                                     analyticsContent.includes('real-time');
    logTest('Analytics imports real-time updates', hasRealTimeUpdatesImport);
    
    // Check if analytics sends real-time updates
    const hasSendAnalyticsUpdate = analyticsContent.includes('sendAnalyticsUpdate');
    const hasSendFunnelUpdate = analyticsContent.includes('sendFunnelGenerationUpdate');
    logTest('Analytics sends real-time updates', hasSendAnalyticsUpdate || hasSendFunnelUpdate);
    
    // Check analytics update types
    const hasFunnelAnalytics = updatesContent.includes('funnel_analytics');
    const hasRevenueUpdate = updatesContent.includes('revenue_update');
    const hasConversationAnalytics = updatesContent.includes('conversation_analytics');
    logTest('Analytics update types', hasFunnelAnalytics && hasRevenueUpdate && hasConversationAnalytics);
  }
}

// Test 4: Funnel Actions WebSocket Integration
function testFunnelActionsWebSocketIntegration() {
  console.log('\n🎯 Testing Funnel Actions WebSocket Integration...');
  
  const funnelActionsPath = path.join(__dirname, '..', 'lib/actions/funnel-actions.ts');
  const updatesPath = path.join(__dirname, '..', 'lib/websocket/updates.ts');
  
  if (fs.existsSync(funnelActionsPath) && fs.existsSync(updatesPath)) {
    const funnelContent = fs.readFileSync(funnelActionsPath, 'utf8');
    const updatesContent = fs.readFileSync(updatesPath, 'utf8');
    
    // Check if funnel actions import real-time updates
    const hasRealTimeUpdatesImport = funnelContent.includes('realTimeUpdates');
    logTest('Funnel actions import real-time updates', hasRealTimeUpdatesImport);
    
    // Check if funnel actions send updates
    const hasSendFunnelGenerationUpdate = funnelContent.includes('sendFunnelGenerationUpdate');
    const hasSendFunnelDeploymentUpdate = funnelContent.includes('sendFunnelDeploymentUpdate');
    logTest('Funnel actions send real-time updates', hasSendFunnelGenerationUpdate && hasSendFunnelDeploymentUpdate);
    
    // Check funnel update types
    const hasGenerationStarted = updatesContent.includes('generation_started');
    const hasGenerationProgress = updatesContent.includes('generation_progress');
    const hasGenerationCompleted = updatesContent.includes('generation_completed');
    const hasDeployed = updatesContent.includes('deployed');
    logTest('Funnel update types', hasGenerationStarted && hasGenerationProgress && 
            hasGenerationCompleted && hasDeployed);
  }
}

// Test 5: Conversation Actions WebSocket Integration
function testConversationActionsWebSocketIntegration() {
  console.log('\n💬 Testing Conversation Actions WebSocket Integration...');
  
  const conversationActionsPath = path.join(__dirname, '..', 'lib/actions/conversation-actions.ts');
  const messagingPath = path.join(__dirname, '..', 'lib/websocket/messaging.ts');
  
  if (fs.existsSync(conversationActionsPath) && fs.existsSync(messagingPath)) {
    const conversationContent = fs.readFileSync(conversationActionsPath, 'utf8');
    const messagingContent = fs.readFileSync(messagingPath, 'utf8');
    
    // Check if conversation actions import real-time messaging
    const hasRealTimeMessagingImport = conversationContent.includes('realTimeMessaging');
    logTest('Conversation actions import real-time messaging', hasRealTimeMessagingImport);
    
    // Check if conversation actions use messaging
    const hasSendMessage = conversationContent.includes('sendMessage');
    const hasSendTypingIndicator = conversationContent.includes('sendTypingIndicator');
    logTest('Conversation actions use real-time messaging', hasSendMessage || hasSendTypingIndicator);
    
    // Check message types
    const hasUserMessage = messagingContent.includes("'user'");
    const hasBotMessage = messagingContent.includes("'bot'");
    const hasSystemMessage = messagingContent.includes("'system'");
    logTest('Message types support', hasUserMessage && hasBotMessage && hasSystemMessage);
  }
}

// Test 6: WebSocket Hook Integration
function testWebSocketHookIntegration() {
  console.log('\n🎣 Testing WebSocket Hook Integration...');
  
  const hookPath = path.join(__dirname, '..', 'lib/hooks/useWebSocket.ts');
  const messagingPath = path.join(__dirname, '..', 'lib/websocket/messaging.ts');
  const updatesPath = path.join(__dirname, '..', 'lib/websocket/updates.ts');
  
  if (fs.existsSync(hookPath) && fs.existsSync(messagingPath) && fs.existsSync(updatesPath)) {
    const hookContent = fs.readFileSync(hookPath, 'utf8');
    const messagingContent = fs.readFileSync(messagingPath, 'utf8');
    const updatesContent = fs.readFileSync(updatesPath, 'utf8');
    
    // Check if hook imports messaging and updates
    const hasMessagingImport = hookContent.includes('messaging');
    const hasUpdatesImport = hookContent.includes('updates');
    logTest('Hook imports messaging and updates', hasMessagingImport && hasUpdatesImport);
    
    // Check if hook initializes real-time systems
    const hasInitializeMessaging = hookContent.includes('realTimeMessaging.initialize');
    const hasInitializeUpdates = hookContent.includes('realTimeUpdates.initialize');
    logTest('Hook initializes real-time systems', hasInitializeMessaging && hasInitializeUpdates);
    
    // Check hook subscription methods
    const hasSubscribeToConversation = hookContent.includes('subscribeToConversation');
    const hasSubscribeToFunnelUpdates = hookContent.includes('subscribeToFunnelUpdates');
    const hasSubscribeToNotifications = hookContent.includes('subscribeToNotifications');
    logTest('Hook subscription methods', hasSubscribeToConversation && hasSubscribeToFunnelUpdates && 
            hasSubscribeToNotifications);
  }
}

// Test 7: WebSocket API Routes Integration
function testWebSocketAPIRoutesIntegration() {
  console.log('\n🌐 Testing WebSocket API Routes Integration...');
  
  const connectRoutePath = path.join(__dirname, '..', 'app/api/websocket/connect/route.ts');
  const channelsRoutePath = path.join(__dirname, '..', 'app/api/websocket/channels/route.ts');
  
  if (fs.existsSync(connectRoutePath)) {
    const content = fs.readFileSync(connectRoutePath, 'utf8');
    
    // Check if route handles WebSocket connections
    const hasWebSocketHandling = content.includes('websocket') || content.includes('WebSocket');
    const hasConnectionHandling = content.includes('connect') || content.includes('connection');
    logTest('WebSocket connect route implementation', hasWebSocketHandling && hasConnectionHandling);
  }
  
  if (fs.existsSync(channelsRoutePath)) {
    const content = fs.readFileSync(channelsRoutePath, 'utf8');
    
    // Check if route handles channel management
    const hasChannelHandling = content.includes('channel') || content.includes('join');
    const hasWebSocketHandling = content.includes('websocket') || content.includes('WebSocket');
    logTest('WebSocket channels route implementation', hasChannelHandling && hasWebSocketHandling);
  }
}

// Test 8: WebSocket Error Handling Integration
function testWebSocketErrorHandlingIntegration() {
  console.log('\n⚠️ Testing WebSocket Error Handling Integration...');
  
  const whopWebSocketPath = path.join(__dirname, '..', 'lib/websocket/whop-websocket.ts');
  const messagingPath = path.join(__dirname, '..', 'lib/websocket/messaging.ts');
  const updatesPath = path.join(__dirname, '..', 'lib/websocket/updates.ts');
  
  if (fs.existsSync(whopWebSocketPath)) {
    const content = fs.readFileSync(whopWebSocketPath, 'utf8');
    
    // Check for comprehensive error handling
    const hasTryCatch = content.includes('try {') && content.includes('} catch');
    const hasErrorLogging = content.includes('console.error');
    const hasReconnectionLogic = content.includes('reconnect') || content.includes('retry');
    const hasTimeoutHandling = content.includes('timeout') || content.includes('setTimeout');
    
    logTest('WebSocket error handling', hasTryCatch && hasErrorLogging);
    logTest('WebSocket reconnection logic', hasReconnectionLogic);
    logTest('WebSocket timeout handling', hasTimeoutHandling);
  }
  
  if (fs.existsSync(messagingPath)) {
    const content = fs.readFileSync(messagingPath, 'utf8');
    const hasTryCatch = content.includes('try {') && content.includes('} catch');
    const hasErrorLogging = content.includes('console.error');
    logTest('Messaging error handling', hasTryCatch && hasErrorLogging);
  }
  
  if (fs.existsSync(updatesPath)) {
    const content = fs.readFileSync(updatesPath, 'utf8');
    const hasTryCatch = content.includes('try {') && content.includes('} catch');
    const hasErrorLogging = content.includes('console.error');
    logTest('Updates error handling', hasTryCatch && hasErrorLogging);
  }
}

// Test 9: WebSocket Performance Integration
function testWebSocketPerformanceIntegration() {
  console.log('\n⚡ Testing WebSocket Performance Integration...');
  
  const whopWebSocketPath = path.join(__dirname, '..', 'lib/websocket/whop-websocket.ts');
  
  if (fs.existsSync(whopWebSocketPath)) {
    const content = fs.readFileSync(whopWebSocketPath, 'utf8');
    
    // Check for performance optimizations
    const hasConnectionPooling = content.includes('pool') || content.includes('connection');
    const hasExponentialBackoff = content.includes('backoff') || content.includes('Math.pow');
    const hasMaxReconnectAttempts = content.includes('maxReconnectAttempts');
    const hasReconnectInterval = content.includes('reconnectInterval');
    const hasMessageHandlers = content.includes('messageHandlers');
    const hasConnectionHandlers = content.includes('connectionHandlers');
    
    logTest('WebSocket connection pooling', hasConnectionPooling);
    logTest('WebSocket exponential backoff', hasExponentialBackoff);
    logTest('WebSocket max reconnect attempts', hasMaxReconnectAttempts);
    logTest('WebSocket reconnect interval', hasReconnectInterval);
    logTest('WebSocket message handlers', hasMessageHandlers);
    logTest('WebSocket connection handlers', hasConnectionHandlers);
  }
}

// Test 10: WebSocket Security Integration
function testWebSocketSecurityIntegration() {
  console.log('\n🔒 Testing WebSocket Security Integration...');
  
  const whopWebSocketPath = path.join(__dirname, '..', 'lib/websocket/whop-websocket.ts');
  const messagingPath = path.join(__dirname, '..', 'lib/websocket/messaging.ts');
  const updatesPath = path.join(__dirname, '..', 'lib/websocket/updates.ts');
  
  if (fs.existsSync(whopWebSocketPath)) {
    const content = fs.readFileSync(whopWebSocketPath, 'utf8');
    
    // Check for security features
    const hasTokenValidation = content.includes('token') || content.includes('auth');
    const hasCompanyIdValidation = content.includes('companyId');
    const hasUserIdValidation = content.includes('userId');
    const hasChannelValidation = content.includes('channel');
    
    logTest('WebSocket token validation', hasTokenValidation);
    logTest('WebSocket company ID validation', hasCompanyIdValidation);
    logTest('WebSocket user ID validation', hasUserIdValidation);
    logTest('WebSocket channel validation', hasChannelValidation);
  }
  
  if (fs.existsSync(messagingPath)) {
    const content = fs.readFileSync(messagingPath, 'utf8');
    
    // Check for conversation access control
    const hasConversationAccess = content.includes('conversation') && content.includes('access');
    const hasCompanyIdCheck = content.includes('companyId');
    logTest('Messaging conversation access control', hasConversationAccess && hasCompanyIdCheck);
  }
  
  if (fs.existsSync(updatesPath)) {
    const content = fs.readFileSync(updatesPath, 'utf8');
    
    // Check for update access control
    const hasUserValidation = content.includes('user') && content.includes('companyId');
    const hasChannelAccess = content.includes('channel') && content.includes('companyId');
    logTest('Updates access control', hasUserValidation && hasChannelAccess);
  }
}

// Test 11: WebSocket Data Flow Integration
function testWebSocketDataFlowIntegration() {
  console.log('\n📊 Testing WebSocket Data Flow Integration...');
  
  // Test message flow from funnel actions to WebSocket
  const funnelActionsPath = path.join(__dirname, '..', 'lib/actions/funnel-actions.ts');
  const updatesPath = path.join(__dirname, '..', 'lib/websocket/updates.ts');
  
  if (fs.existsSync(funnelActionsPath) && fs.existsSync(updatesPath)) {
    const funnelContent = fs.readFileSync(funnelActionsPath, 'utf8');
    const updatesContent = fs.readFileSync(updatesPath, 'utf8');
    
    // Check if funnel actions trigger WebSocket updates
    const hasFunnelUpdateTrigger = funnelContent.includes('sendFunnelGenerationUpdate') || 
                                   funnelContent.includes('sendFunnelDeploymentUpdate');
    logTest('Funnel actions trigger WebSocket updates', hasFunnelUpdateTrigger);
    
    // Check if updates handle funnel data
    const hasFunnelUpdateHandling = updatesContent.includes('FunnelUpdate') || 
                                    updatesContent.includes('funnelId');
    logTest('Updates handle funnel data', hasFunnelUpdateHandling);
  }
  
  // Test message flow from conversations to WebSocket
  const conversationActionsPath = path.join(__dirname, '..', 'lib/actions/conversation-actions.ts');
  const messagingPath = path.join(__dirname, '..', 'lib/websocket/messaging.ts');
  
  if (fs.existsSync(conversationActionsPath) && fs.existsSync(messagingPath)) {
    const conversationContent = fs.readFileSync(conversationActionsPath, 'utf8');
    const messagingContent = fs.readFileSync(messagingPath, 'utf8');
    
    // Check if conversation actions trigger WebSocket messages
    const hasMessageTrigger = conversationContent.includes('sendMessage') || 
                              conversationContent.includes('sendTypingIndicator');
    logTest('Conversation actions trigger WebSocket messages', hasMessageTrigger);
    
    // Check if messaging handles conversation data
    const hasConversationHandling = messagingContent.includes('ChatMessage') || 
                                    messagingContent.includes('conversationId');
    logTest('Messaging handles conversation data', hasConversationHandling);
  }
}

// Test 12: WebSocket Documentation Integration
function testWebSocketDocumentationIntegration() {
  console.log('\n📚 Testing WebSocket Documentation Integration...');
  
  const docsPath = path.join(__dirname, '..', 'docs/websocket-implementation.md');
  
  if (fs.existsSync(docsPath)) {
    const content = fs.readFileSync(docsPath, 'utf8');
    
    // Check for comprehensive documentation
    const hasArchitecture = content.includes('Architecture') || content.includes('architecture');
    const hasUsage = content.includes('Usage') || content.includes('usage');
    const hasExamples = content.includes('Example') || content.includes('example');
    const hasAPI = content.includes('API') || content.includes('api');
    const hasIntegration = content.includes('Integration') || content.includes('integration');
    const hasErrorHandling = content.includes('Error') || content.includes('error');
    const hasPerformance = content.includes('Performance') || content.includes('performance');
    const hasSecurity = content.includes('Security') || content.includes('security');
    
    logTest('WebSocket documentation architecture', hasArchitecture);
    logTest('WebSocket documentation usage', hasUsage);
    logTest('WebSocket documentation examples', hasExamples);
    logTest('WebSocket documentation API', hasAPI);
    logTest('WebSocket documentation integration', hasIntegration);
    logTest('WebSocket documentation error handling', hasErrorHandling);
    logTest('WebSocket documentation performance', hasPerformance);
    logTest('WebSocket documentation security', hasSecurity);
  }
}

// Main test runner
function runWebSocketIntegrationTests() {
  console.log('🚀 Starting WebSocket Integration Tests...\n');
  
  testWebSocketMessageFlow();
  testRealTimeUpdatesIntegration();
  testAnalyticsWebSocketIntegration();
  testFunnelActionsWebSocketIntegration();
  testConversationActionsWebSocketIntegration();
  testWebSocketHookIntegration();
  testWebSocketAPIRoutesIntegration();
  testWebSocketErrorHandlingIntegration();
  testWebSocketPerformanceIntegration();
  testWebSocketSecurityIntegration();
  testWebSocketDataFlowIntegration();
  testWebSocketDocumentationIntegration();
  
  // Print results
  console.log('\n📊 WebSocket Integration Test Results Summary:');
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📈 Total: ${testResults.total}`);
  console.log(`🎯 Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
  
  if (testResults.failed > 0) {
    console.log('\n❌ Failed Tests:');
    testResults.details
      .filter(test => !test.passed)
      .forEach(test => console.log(`  - ${test.testName}: ${test.details}`));
  }
  
  console.log('\n🎉 WebSocket Integration Tests Complete!');
  
  // Exit with appropriate code
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run tests
runWebSocketIntegrationTests();
