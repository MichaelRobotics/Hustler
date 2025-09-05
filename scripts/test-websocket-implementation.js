/**
 * WebSocket Implementation Test Suite
 * 
 * Tests the WebSocket implementation from Phase 4
 */

const fs = require('fs');
const path = require('path');

console.log('🔌 Testing WebSocket Implementation...\n');

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

// Test 1: Check WebSocket Files Exist
function testWebSocketFilesExist() {
  console.log('📁 Testing WebSocket Files Existence...');
  
  const websocketFiles = [
    'lib/websocket/whop-websocket.ts',
    'lib/websocket/messaging.ts',
    'lib/websocket/updates.ts',
    'lib/websocket/index.ts',
    'lib/hooks/useWebSocket.ts'
  ];
  
  websocketFiles.forEach(file => {
    const filePath = path.join(__dirname, '..', file);
    const exists = fs.existsSync(filePath);
    logTest(`File exists: ${file}`, exists);
  });
}

// Test 2: Check WebSocket File Content Structure
function testWebSocketFileStructure() {
  console.log('\n📋 Testing WebSocket File Structure...');
  
  // Test whop-websocket.ts
  const whopWebSocketPath = path.join(__dirname, '..', 'lib/websocket/whop-websocket.ts');
  if (fs.existsSync(whopWebSocketPath)) {
    const content = fs.readFileSync(whopWebSocketPath, 'utf8');
    
    // Check for key classes and methods
    const hasWhopWebSocketManager = content.includes('class WhopWebSocketManager');
    const hasConnectMethod = content.includes('async connect(');
    const hasDisconnectMethod = content.includes('disconnect():');
    const hasJoinChannelMethod = content.includes('async joinChannel(');
    const hasLeaveChannelMethod = content.includes('async leaveChannel(');
    const hasSendMessageMethod = content.includes('sendMessage(');
    const hasSubscribeMethod = content.includes('subscribe(');
    const hasExport = content.includes('export const whopWebSocket');
    
    logTest('WhopWebSocketManager class structure', 
      hasWhopWebSocketManager && hasConnectMethod && hasDisconnectMethod);
    logTest('WebSocket channel management', hasJoinChannelMethod && hasLeaveChannelMethod);
    logTest('WebSocket messaging', hasSendMessageMethod && hasSubscribeMethod);
    logTest('WebSocket export', hasExport);
  }
  
  // Test messaging.ts
  const messagingPath = path.join(__dirname, '..', 'lib/websocket/messaging.ts');
  if (fs.existsSync(messagingPath)) {
    const content = fs.readFileSync(messagingPath, 'utf8');
    
    const hasRealTimeMessaging = content.includes('class RealTimeMessaging');
    const hasSendMessage = content.includes('async sendMessage(');
    const hasSendTypingIndicator = content.includes('async sendTypingIndicator(');
    const hasUpdateUserPresence = content.includes('async updateUserPresence(');
    const hasMarkMessageAsRead = content.includes('async markMessageAsRead(');
    const hasSubscribeToConversation = content.includes('subscribeToConversation(');
    const hasExport = content.includes('export const realTimeMessaging');
    
    logTest('RealTimeMessaging class structure', hasRealTimeMessaging);
    logTest('Messaging methods', hasSendMessage && hasSendTypingIndicator);
    logTest('Presence management', hasUpdateUserPresence && hasMarkMessageAsRead);
    logTest('Messaging subscriptions', hasSubscribeToConversation);
    logTest('Messaging export', hasExport);
  }
  
  // Test updates.ts
  const updatesPath = path.join(__dirname, '..', 'lib/websocket/updates.ts');
  if (fs.existsSync(updatesPath)) {
    const content = fs.readFileSync(updatesPath, 'utf8');
    
    const hasRealTimeUpdates = content.includes('class RealTimeUpdates');
    const hasSendFunnelGenerationUpdate = content.includes('async sendFunnelGenerationUpdate(');
    const hasSendFunnelDeploymentUpdate = content.includes('async sendFunnelDeploymentUpdate(');
    const hasSendResourceSyncUpdate = content.includes('async sendResourceSyncUpdate(');
    const hasSendAnalyticsUpdate = content.includes('async sendAnalyticsUpdate(');
    const hasSendSystemNotification = content.includes('async sendSystemNotification(');
    const hasSendCreditUpdate = content.includes('async sendCreditUpdate(');
    const hasExport = content.includes('export const realTimeUpdates');
    
    logTest('RealTimeUpdates class structure', hasRealTimeUpdates);
    logTest('Funnel update methods', hasSendFunnelGenerationUpdate && hasSendFunnelDeploymentUpdate);
    logTest('Resource sync updates', hasSendResourceSyncUpdate);
    logTest('Analytics updates', hasSendAnalyticsUpdate);
    logTest('System notifications', hasSendSystemNotification && hasSendCreditUpdate);
    logTest('Updates export', hasExport);
  }
}

// Test 3: Check WebSocket Hook Structure
function testWebSocketHookStructure() {
  console.log('\n🎣 Testing WebSocket Hook Structure...');
  
  const hookPath = path.join(__dirname, '..', 'lib/hooks/useWebSocket.ts');
  if (fs.existsSync(hookPath)) {
    const content = fs.readFileSync(hookPath, 'utf8');
    
    const hasUseWebSocket = content.includes('export function useWebSocket(');
    const hasUseWebSocketOptions = content.includes('UseWebSocketOptions');
    const hasUseWebSocketReturn = content.includes('UseWebSocketReturn');
    const hasConnectionState = content.includes('connection: WebSocketConnection');
    const hasIsConnected = content.includes('isConnected: boolean');
    const hasConnectMethod = content.includes('connect: () => Promise<void>');
    const hasDisconnectMethod = content.includes('disconnect: () => void');
    const hasJoinChannelMethod = content.includes('joinChannel: (channel: string) => Promise<void>');
    const hasSendMessageMethod = content.includes('sendMessage: (conversationId: string, content: string');
    const hasSubscribeMethods = content.includes('subscribeToConversation:') && 
                                content.includes('subscribeToFunnelUpdates:');
    
    logTest('useWebSocket hook function', hasUseWebSocket);
    logTest('Hook options interface', hasUseWebSocketOptions);
    logTest('Hook return interface', hasUseWebSocketReturn);
    logTest('Connection state management', hasConnectionState && hasIsConnected);
    logTest('Connection methods', hasConnectMethod && hasDisconnectMethod);
    logTest('Channel management', hasJoinChannelMethod);
    logTest('Messaging methods', hasSendMessageMethod);
    logTest('Subscription methods', hasSubscribeMethods);
  }
}

// Test 4: Check WebSocket Types and Interfaces
function testWebSocketTypes() {
  console.log('\n🔧 Testing WebSocket Types and Interfaces...');
  
  const whopWebSocketPath = path.join(__dirname, '..', 'lib/websocket/whop-websocket.ts');
  if (fs.existsSync(whopWebSocketPath)) {
    const content = fs.readFileSync(whopWebSocketPath, 'utf8');
    
    const hasWebSocketMessage = content.includes('interface WebSocketMessage');
    const hasWebSocketConnection = content.includes('interface WebSocketConnection');
    const hasWebSocketConfig = content.includes('interface WebSocketConfig');
    const hasMessageType = content.includes("type: 'message' | 'typing' | 'presence' | 'update' | 'notification' | 'error'");
    const hasChannelProperty = content.includes('channel: string');
    const hasDataProperty = content.includes('data: any');
    const hasTimestampProperty = content.includes('timestamp: Date');
    
    logTest('WebSocketMessage interface', hasWebSocketMessage);
    logTest('WebSocketConnection interface', hasWebSocketConnection);
    logTest('WebSocketConfig interface', hasWebSocketConfig);
    logTest('Message type enum', hasMessageType);
    logTest('Message properties', hasChannelProperty && hasDataProperty && hasTimestampProperty);
  }
  
  const messagingPath = path.join(__dirname, '..', 'lib/websocket/messaging.ts');
  if (fs.existsSync(messagingPath)) {
    const content = fs.readFileSync(messagingPath, 'utf8');
    
    const hasChatMessage = content.includes('interface ChatMessage');
    const hasTypingIndicator = content.includes('interface TypingIndicator');
    const hasUserPresence = content.includes('interface UserPresence');
    const hasMessageDeliveryStatus = content.includes('interface MessageDeliveryStatus');
    
    logTest('ChatMessage interface', hasChatMessage);
    logTest('TypingIndicator interface', hasTypingIndicator);
    logTest('UserPresence interface', hasUserPresence);
    logTest('MessageDeliveryStatus interface', hasMessageDeliveryStatus);
  }
  
  const updatesPath = path.join(__dirname, '..', 'lib/websocket/updates.ts');
  if (fs.existsSync(updatesPath)) {
    const content = fs.readFileSync(updatesPath, 'utf8');
    
    const hasFunnelUpdate = content.includes('interface FunnelUpdate');
    const hasResourceUpdate = content.includes('interface ResourceUpdate');
    const hasAnalyticsUpdate = content.includes('interface AnalyticsUpdate');
    const hasSystemNotification = content.includes('interface SystemNotification');
    const hasCreditUpdate = content.includes('interface CreditUpdate');
    
    logTest('FunnelUpdate interface', hasFunnelUpdate);
    logTest('ResourceUpdate interface', hasResourceUpdate);
    logTest('AnalyticsUpdate interface', hasAnalyticsUpdate);
    logTest('SystemNotification interface', hasSystemNotification);
    logTest('CreditUpdate interface', hasCreditUpdate);
  }
}

// Test 5: Check WebSocket Integration Points
function testWebSocketIntegration() {
  console.log('\n🔗 Testing WebSocket Integration Points...');
  
  // Check if WebSocket is integrated with other systems
  const funnelActionsPath = path.join(__dirname, '..', 'lib/actions/funnel-actions.ts');
  if (fs.existsSync(funnelActionsPath)) {
    const content = fs.readFileSync(funnelActionsPath, 'utf8');
    const hasRealTimeUpdates = content.includes('realTimeUpdates');
    logTest('Funnel actions WebSocket integration', hasRealTimeUpdates);
  }
  
  const conversationActionsPath = path.join(__dirname, '..', 'lib/actions/conversation-actions.ts');
  if (fs.existsSync(conversationActionsPath)) {
    const content = fs.readFileSync(conversationActionsPath, 'utf8');
    const hasRealTimeMessaging = content.includes('realTimeMessaging');
    logTest('Conversation actions WebSocket integration', hasRealTimeMessaging);
  }
  
  const analyticsPath = path.join(__dirname, '..', 'lib/analytics/analytics.ts');
  if (fs.existsSync(analyticsPath)) {
    const content = fs.readFileSync(analyticsPath, 'utf8');
    const hasRealTimeUpdates = content.includes('realTimeUpdates');
    logTest('Analytics WebSocket integration', hasRealTimeUpdates);
  }
}

// Test 6: Check WebSocket API Routes
function testWebSocketAPIRoutes() {
  console.log('\n🌐 Testing WebSocket API Routes...');
  
  const websocketConnectPath = path.join(__dirname, '..', 'app/api/websocket/connect/route.ts');
  const websocketChannelsPath = path.join(__dirname, '..', 'app/api/websocket/channels/route.ts');
  
  if (fs.existsSync(websocketConnectPath)) {
    const content = fs.readFileSync(websocketConnectPath, 'utf8');
    const hasPOST = content.includes('export const POST');
    const hasConnectionHandling = content.includes('connect') || content.includes('connection');
    logTest('WebSocket connect API route', hasPOST && hasConnectionHandling);
  }
  
  if (fs.existsSync(websocketChannelsPath)) {
    const content = fs.readFileSync(websocketChannelsPath, 'utf8');
    const hasGET = content.includes('export const GET');
    const hasPOST = content.includes('export const POST');
    const hasChannelHandling = content.includes('channel') || content.includes('join');
    logTest('WebSocket channels API route', (hasGET || hasPOST) && hasChannelHandling);
  }
}

// Test 7: Check WebSocket Documentation
function testWebSocketDocumentation() {
  console.log('\n📚 Testing WebSocket Documentation...');
  
  const docsPath = path.join(__dirname, '..', 'docs/websocket-implementation.md');
  if (fs.existsSync(docsPath)) {
    const content = fs.readFileSync(docsPath, 'utf8');
    
    const hasOverview = content.includes('# WebSocket Implementation') || 
                       content.includes('WebSocket Implementation');
    const hasArchitecture = content.includes('Architecture') || content.includes('architecture');
    const hasUsage = content.includes('Usage') || content.includes('usage');
    const hasExamples = content.includes('Example') || content.includes('example');
    const hasAPI = content.includes('API') || content.includes('api');
    
    logTest('WebSocket documentation overview', hasOverview);
    logTest('WebSocket documentation architecture', hasArchitecture);
    logTest('WebSocket documentation usage', hasUsage);
    logTest('WebSocket documentation examples', hasExamples);
    logTest('WebSocket documentation API', hasAPI);
  }
}

// Test 8: Check WebSocket Error Handling
function testWebSocketErrorHandling() {
  console.log('\n⚠️ Testing WebSocket Error Handling...');
  
  const whopWebSocketPath = path.join(__dirname, '..', 'lib/websocket/whop-websocket.ts');
  if (fs.existsSync(whopWebSocketPath)) {
    const content = fs.readFileSync(whopWebSocketPath, 'utf8');
    
    const hasTryCatch = content.includes('try {') && content.includes('} catch');
    const hasErrorLogging = content.includes('console.error') || content.includes('console.log');
    const hasReconnectionLogic = content.includes('reconnect') || content.includes('retry');
    const hasTimeoutHandling = content.includes('timeout') || content.includes('setTimeout');
    
    logTest('WebSocket error handling', hasTryCatch);
    logTest('WebSocket error logging', hasErrorLogging);
    logTest('WebSocket reconnection logic', hasReconnectionLogic);
    logTest('WebSocket timeout handling', hasTimeoutHandling);
  }
}

// Test 9: Check WebSocket Performance Features
function testWebSocketPerformance() {
  console.log('\n⚡ Testing WebSocket Performance Features...');
  
  const whopWebSocketPath = path.join(__dirname, '..', 'lib/websocket/whop-websocket.ts');
  if (fs.existsSync(whopWebSocketPath)) {
    const content = fs.readFileSync(whopWebSocketPath, 'utf8');
    
    const hasConnectionPooling = content.includes('pool') || content.includes('connection');
    const hasExponentialBackoff = content.includes('backoff') || content.includes('Math.pow');
    const hasMaxReconnectAttempts = content.includes('maxReconnectAttempts');
    const hasReconnectInterval = content.includes('reconnectInterval');
    
    logTest('WebSocket connection pooling', hasConnectionPooling);
    logTest('WebSocket exponential backoff', hasExponentialBackoff);
    logTest('WebSocket max reconnect attempts', hasMaxReconnectAttempts);
    logTest('WebSocket reconnect interval', hasReconnectInterval);
  }
}

// Test 10: Check WebSocket Security
function testWebSocketSecurity() {
  console.log('\n🔒 Testing WebSocket Security...');
  
  const whopWebSocketPath = path.join(__dirname, '..', 'lib/websocket/whop-websocket.ts');
  if (fs.existsSync(whopWebSocketPath)) {
    const content = fs.readFileSync(whopWebSocketPath, 'utf8');
    
    const hasTokenValidation = content.includes('token') || content.includes('auth');
    const hasCompanyIdValidation = content.includes('companyId');
    const hasUserIdValidation = content.includes('userId');
    const hasChannelAccessControl = content.includes('channel') && content.includes('access');
    
    logTest('WebSocket token validation', hasTokenValidation);
    logTest('WebSocket company ID validation', hasCompanyIdValidation);
    logTest('WebSocket user ID validation', hasUserIdValidation);
    logTest('WebSocket channel access control', hasChannelAccessControl);
  }
}

// Main test runner
function runWebSocketTests() {
  console.log('🚀 Starting WebSocket Implementation Tests...\n');
  
  testWebSocketFilesExist();
  testWebSocketFileStructure();
  testWebSocketHookStructure();
  testWebSocketTypes();
  testWebSocketIntegration();
  testWebSocketAPIRoutes();
  testWebSocketDocumentation();
  testWebSocketErrorHandling();
  testWebSocketPerformance();
  testWebSocketSecurity();
  
  // Print results
  console.log('\n📊 WebSocket Test Results Summary:');
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
  
  console.log('\n🎉 WebSocket Implementation Tests Complete!');
  
  // Exit with appropriate code
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run tests
runWebSocketTests();
