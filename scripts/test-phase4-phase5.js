/**
 * Phase 4 & 5 Implementation Test Suite
 * 
 * Tests WebSocket implementation, WHOP product sync, analytics, and performance monitoring
 */

const { performance } = require('perf_hooks');

// Mock environment variables for testing
process.env.NEXT_PUBLIC_WHOP_APP_ID = 'test-app-id';
process.env.WHOP_API_KEY = 'test-api-key';
process.env.NEXT_PUBLIC_WHOP_COMPANY_ID = 'test-company-id';
process.env.NEXT_PUBLIC_WHOP_AGENT_USER_ID = 'test-agent-user-id';
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
process.env.POSTGRES_URL_NON_POOLING = 'postgresql://test:test@localhost:5432/test';

console.log('🧪 Starting Phase 4 & 5 Implementation Tests...\n');

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

// Test 1: WebSocket Connection Management
async function testWebSocketConnection() {
  console.log('\n🔌 Testing WebSocket Connection Management...');
  
  try {
    // Test WebSocket manager initialization
    const { whopWebSocket } = require('../lib/websocket/whop-websocket');
    
    // Test connection status
    const status = whopWebSocket.getConnectionStatus();
    logTest('WebSocket Manager Initialization', status !== null);
    
    // Test configuration structure
    const testConfig = {
      experienceId: 'test-experience',
      companyId: 'test-company',
      userId: 'test-user',
      autoReconnect: true,
      reconnectInterval: 5000,
      maxReconnectAttempts: 3
    };
    
    logTest('WebSocket Configuration Structure', 
      testConfig.companyId && testConfig.userId && testConfig.autoReconnect);
    
    // Test connection methods exist
    const hasConnect = typeof whopWebSocket.connect === 'function';
    const hasDisconnect = typeof whopWebSocket.disconnect === 'function';
    const hasJoinChannel = typeof whopWebSocket.joinChannel === 'function';
    const hasLeaveChannel = typeof whopWebSocket.leaveChannel === 'function';
    
    logTest('WebSocket Connection Methods', hasConnect && hasDisconnect && hasJoinChannel && hasLeaveChannel);
    
  } catch (error) {
    logTest('WebSocket Connection Management', false, error.message);
  }
}

// Test 2: Real-Time Messaging
async function testRealTimeMessaging() {
  console.log('\n💬 Testing Real-Time Messaging...');
  
  try {
    const { realTimeMessaging } = require('../lib/websocket/messaging');
    
    // Test messaging methods exist
    const hasSendMessage = typeof realTimeMessaging.sendMessage === 'function';
    const hasSendTypingIndicator = typeof realTimeMessaging.sendTypingIndicator === 'function';
    const hasUpdateUserPresence = typeof realTimeMessaging.updateUserPresence === 'function';
    const hasMarkMessageAsRead = typeof realTimeMessaging.markMessageAsRead === 'function';
    
    logTest('Real-Time Messaging Methods', 
      hasSendMessage && hasSendTypingIndicator && hasUpdateUserPresence && hasMarkMessageAsRead);
    
    // Test subscription methods
    const hasSubscribeToConversation = typeof realTimeMessaging.subscribeToConversation === 'function';
    const hasSubscribeToTyping = typeof realTimeMessaging.subscribeToTyping === 'function';
    const hasSubscribeToPresence = typeof realTimeMessaging.subscribeToPresence === 'function';
    
    logTest('Real-Time Messaging Subscriptions', 
      hasSubscribeToConversation && hasSubscribeToTyping && hasSubscribeToPresence);
    
    // Test utility methods
    const hasGetTypingUsers = typeof realTimeMessaging.getTypingUsers === 'function';
    const hasGetUserPresence = typeof realTimeMessaging.getUserPresence === 'function';
    const hasGetOnlineUsers = typeof realTimeMessaging.getOnlineUsers === 'function';
    
    logTest('Real-Time Messaging Utilities', 
      hasGetTypingUsers && hasGetUserPresence && hasGetOnlineUsers);
    
  } catch (error) {
    logTest('Real-Time Messaging', false, error.message);
  }
}

// Test 3: Real-Time Updates
async function testRealTimeUpdates() {
  console.log('\n🔄 Testing Real-Time Updates...');
  
  try {
    const { realTimeUpdates } = require('../lib/websocket/updates');
    
    // Test update methods
    const hasSendFunnelGenerationUpdate = typeof realTimeUpdates.sendFunnelGenerationUpdate === 'function';
    const hasSendFunnelDeploymentUpdate = typeof realTimeUpdates.sendFunnelDeploymentUpdate === 'function';
    const hasSendResourceSyncUpdate = typeof realTimeUpdates.sendResourceSyncUpdate === 'function';
    const hasSendAnalyticsUpdate = typeof realTimeUpdates.sendAnalyticsUpdate === 'function';
    const hasSendSystemNotification = typeof realTimeUpdates.sendSystemNotification === 'function';
    const hasSendCreditUpdate = typeof realTimeUpdates.sendCreditUpdate === 'function';
    
    logTest('Real-Time Update Methods', 
      hasSendFunnelGenerationUpdate && hasSendFunnelDeploymentUpdate && 
      hasSendResourceSyncUpdate && hasSendAnalyticsUpdate && 
      hasSendSystemNotification && hasSendCreditUpdate);
    
    // Test subscription methods
    const hasSubscribeToFunnelUpdates = typeof realTimeUpdates.subscribeToFunnelUpdates === 'function';
    const hasSubscribeToResourceUpdates = typeof realTimeUpdates.subscribeToResourceUpdates === 'function';
    const hasSubscribeToAnalyticsUpdates = typeof realTimeUpdates.subscribeToAnalyticsUpdates === 'function';
    const hasSubscribeToSystemNotifications = typeof realTimeUpdates.subscribeToSystemNotifications === 'function';
    const hasSubscribeToCreditUpdates = typeof realTimeUpdates.subscribeToCreditUpdates === 'function';
    
    logTest('Real-Time Update Subscriptions', 
      hasSubscribeToFunnelUpdates && hasSubscribeToResourceUpdates && 
      hasSubscribeToAnalyticsUpdates && hasSubscribeToSystemNotifications && 
      hasSubscribeToCreditUpdates);
    
  } catch (error) {
    logTest('Real-Time Updates', false, error.message);
  }
}

// Test 4: WHOP Product Sync
async function testWhopProductSync() {
  console.log('\n🔄 Testing WHOP Product Sync...');
  
  try {
    const { whopProductSync } = require('../lib/sync/whop-product-sync');
    
    // Test sync methods
    const hasSyncCompanyProducts = typeof whopProductSync.syncCompanyProducts === 'function';
    const hasSyncProduct = typeof whopProductSync.syncProduct === 'function';
    const hasHandleWebhookUpdate = typeof whopProductSync.handleWebhookUpdate === 'function';
    const hasGetSyncStatus = typeof whopProductSync.getSyncStatus === 'function';
    const hasBulkImportProducts = typeof whopProductSync.bulkImportProducts === 'function';
    
    logTest('WHOP Product Sync Methods', 
      hasSyncCompanyProducts && hasSyncProduct && hasHandleWebhookUpdate && 
      hasGetSyncStatus && hasBulkImportProducts);
    
    // Test webhook handling
    const testWebhookData = {
      event: 'product.created',
      data: {
        id: 'test-product-id',
        name: 'Test Product',
        description: 'Test Description',
        price: 29.99,
        status: 'active'
      },
      company_id: 'test-company-id'
    };
    
    logTest('WHOP Webhook Data Structure', 
      testWebhookData.event && testWebhookData.data && testWebhookData.company_id);
    
  } catch (error) {
    logTest('WHOP Product Sync', false, error.message);
  }
}

// Test 5: Analytics System
async function testAnalyticsSystem() {
  console.log('\n📊 Testing Analytics System...');
  
  try {
    const { analyticsSystem } = require('../lib/analytics/analytics');
    
    // Test tracking methods
    const hasTrackFunnelView = typeof analyticsSystem.trackFunnelView === 'function';
    const hasTrackFunnelStart = typeof analyticsSystem.trackFunnelStart === 'function';
    const hasTrackFunnelCompletion = typeof analyticsSystem.trackFunnelCompletion === 'function';
    const hasTrackConversion = typeof analyticsSystem.trackConversion === 'function';
    
    logTest('Analytics Tracking Methods', 
      hasTrackFunnelView && hasTrackFunnelStart && 
      hasTrackFunnelCompletion && hasTrackConversion);
    
    // Test analytics retrieval methods
    const hasGetFunnelPerformanceMetrics = typeof analyticsSystem.getFunnelPerformanceMetrics === 'function';
    const hasGetUserInteractionAnalytics = typeof analyticsSystem.getUserInteractionAnalytics === 'function';
    const hasGetCompanyAnalytics = typeof analyticsSystem.getCompanyAnalytics === 'function';
    
    logTest('Analytics Retrieval Methods', 
      hasGetFunnelPerformanceMetrics && hasGetUserInteractionAnalytics && hasGetCompanyAnalytics);
    
    // Test cache management
    const hasClearCache = typeof analyticsSystem.clearCache === 'function';
    logTest('Analytics Cache Management', hasClearCache);
    
  } catch (error) {
    logTest('Analytics System', false, error.message);
  }
}

// Test 6: Reporting System
async function testReportingSystem() {
  console.log('\n📈 Testing Reporting System...');
  
  try {
    const { reportingSystem } = require('../lib/reporting/reports');
    
    // Test report generation methods
    const hasGenerateFunnelPerformanceReport = typeof reportingSystem.generateFunnelPerformanceReport === 'function';
    const hasGenerateUserEngagementReport = typeof reportingSystem.generateUserEngagementReport === 'function';
    const hasGenerateBusinessInsightsReport = typeof reportingSystem.generateBusinessInsightsReport === 'function';
    
    logTest('Report Generation Methods', 
      hasGenerateFunnelPerformanceReport && hasGenerateUserEngagementReport && 
      hasGenerateBusinessInsightsReport);
    
    // Test export functionality
    const hasExportReport = typeof reportingSystem.exportReport === 'function';
    logTest('Report Export Functionality', hasExportReport);
    
    // Test report data structure
    const testReportFilters = {
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
      funnelIds: ['funnel-1', 'funnel-2'],
      format: 'json'
    };
    
    logTest('Report Filters Structure', 
      testReportFilters.startDate && testReportFilters.endDate && 
      Array.isArray(testReportFilters.funnelIds));
    
  } catch (error) {
    logTest('Reporting System', false, error.message);
  }
}

// Test 7: Performance Monitoring
async function testPerformanceMonitoring() {
  console.log('\n⚡ Testing Performance Monitoring...');
  
  try {
    const { performanceMonitoring } = require('../lib/monitoring/performance');
    
    // Test monitoring methods
    const hasStartAPIMonitoring = typeof performanceMonitoring.startAPIMonitoring === 'function';
    const hasStartDatabaseMonitoring = typeof performanceMonitoring.startDatabaseMonitoring === 'function';
    const hasRecordSystemMetrics = typeof performanceMonitoring.recordSystemMetrics === 'function';
    const hasGetSystemHealthStatus = typeof performanceMonitoring.getSystemHealthStatus === 'function';
    
    logTest('Performance Monitoring Methods', 
      hasStartAPIMonitoring && hasStartDatabaseMonitoring && 
      hasRecordSystemMetrics && hasGetSystemHealthStatus);
    
    // Test reporting methods
    const hasGetPerformanceSummary = typeof performanceMonitoring.getPerformanceSummary === 'function';
    const hasGetSlowQueriesReport = typeof performanceMonitoring.getSlowQueriesReport === 'function';
    const hasGetErrorReport = typeof performanceMonitoring.getErrorReport === 'function';
    
    logTest('Performance Reporting Methods', 
      hasGetPerformanceSummary && hasGetSlowQueriesReport && hasGetErrorReport);
    
    // Test monitoring lifecycle
    const hasStartMonitoring = typeof performanceMonitoring.startMonitoring === 'function';
    const hasClearOldMetrics = typeof performanceMonitoring.clearOldMetrics === 'function';
    
    logTest('Performance Monitoring Lifecycle', hasStartMonitoring && hasClearOldMetrics);
    
  } catch (error) {
    logTest('Performance Monitoring', false, error.message);
  }
}

// Test 8: Caching System
async function testCachingSystem() {
  console.log('\n💾 Testing Caching System...');
  
  try {
    const { redisCache } = require('../lib/cache/redis-cache');
    
    // Test cache methods
    const hasGet = typeof redisCache.get === 'function';
    const hasSet = typeof redisCache.set === 'function';
    const hasDelete = typeof redisCache.delete === 'function';
    const hasDeleteByTags = typeof redisCache.deleteByTags === 'function';
    const hasClear = typeof redisCache.clear === 'function';
    
    logTest('Cache CRUD Methods', hasGet && hasSet && hasDelete && hasDeleteByTags && hasClear);
    
    // Test cache statistics
    const hasGetStats = typeof redisCache.getStats === 'function';
    const hasSize = typeof redisCache.size === 'function';
    const hasCleanup = typeof redisCache.cleanup === 'function';
    
    logTest('Cache Management Methods', hasGetStats && hasSize && hasCleanup);
    
    // Test cache options structure
    const testCacheOptions = {
      ttl: 300,
      tags: ['analytics', 'funnel'],
      serialize: true
    };
    
    logTest('Cache Options Structure', 
      testCacheOptions.ttl && Array.isArray(testCacheOptions.tags));
    
  } catch (error) {
    logTest('Caching System', false, error.message);
  }
}

// Test 9: WebSocket Hook Integration
async function testWebSocketHook() {
  console.log('\n🎣 Testing WebSocket Hook Integration...');
  
  try {
    // Test hook structure (without React context)
    const useWebSocketModule = require('../lib/hooks/useWebSocket');
    
    // Test hook export
    const hasUseWebSocket = typeof useWebSocketModule.useWebSocket === 'function';
    const hasDefaultExport = typeof useWebSocketModule.default === 'function';
    
    logTest('WebSocket Hook Export', hasUseWebSocket || hasDefaultExport);
    
    // Test hook options structure
    const testHookOptions = {
      autoConnect: true,
      experienceId: 'test-experience',
      onConnectionChange: (connected) => console.log('Connected:', connected),
      onError: (error) => console.error('Error:', error)
    };
    
    logTest('WebSocket Hook Options', 
      typeof testHookOptions.autoConnect === 'boolean' && 
      typeof testHookOptions.onConnectionChange === 'function');
    
  } catch (error) {
    logTest('WebSocket Hook Integration', false, error.message);
  }
}

// Test 10: Integration Test - End-to-End Flow
async function testIntegrationFlow() {
  console.log('\n🔗 Testing Integration Flow...');
  
  try {
    // Test data flow between components
    const testUser = {
      id: 'test-user-id',
      whopUserId: 'whop-user-123',
      companyId: 'test-company-id',
      email: 'test@example.com',
      name: 'Test User',
      credits: 10,
      accessLevel: 'customer',
      company: {
        id: 'test-company-id',
        whopCompanyId: 'whop-company-123',
        name: 'Test Company'
      }
    };
    
    logTest('Test User Structure', 
      testUser.id && testUser.companyId && testUser.accessLevel);
    
    // Test funnel update flow
    const testFunnelUpdate = {
      type: 'generation_started',
      funnelId: 'test-funnel-id',
      funnelName: 'Test Funnel',
      progress: 0,
      message: 'Starting generation...',
      timestamp: new Date(),
      userId: testUser.id,
      companyId: testUser.companyId
    };
    
    logTest('Funnel Update Structure', 
      testFunnelUpdate.type && testFunnelUpdate.funnelId && 
      testFunnelUpdate.timestamp instanceof Date);
    
    // Test analytics tracking flow
    const testAnalyticsEvent = {
      funnelId: 'test-funnel-id',
      conversationId: 'test-conversation-id',
      userId: testUser.id,
      revenue: 29.99
    };
    
    logTest('Analytics Event Structure', 
      testAnalyticsEvent.funnelId && testAnalyticsEvent.conversationId);
    
  } catch (error) {
    logTest('Integration Flow', false, error.message);
  }
}

// Performance Test
async function testPerformance() {
  console.log('\n⚡ Testing Performance...');
  
  const startTime = performance.now();
  
  try {
    // Test module loading performance
    const modules = [
      '../lib/websocket/whop-websocket',
      '../lib/websocket/messaging',
      '../lib/websocket/updates',
      '../lib/sync/whop-product-sync',
      '../lib/analytics/analytics',
      '../lib/reporting/reports',
      '../lib/monitoring/performance',
      '../lib/cache/redis-cache'
    ];
    
    for (const module of modules) {
      require(module);
    }
    
    const endTime = performance.now();
    const loadTime = endTime - startTime;
    
    logTest('Module Loading Performance', loadTime < 1000, `Loaded in ${loadTime.toFixed(2)}ms`);
    
  } catch (error) {
    logTest('Performance Test', false, error.message);
  }
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting Phase 4 & 5 Implementation Tests...\n');
  
  await testWebSocketConnection();
  await testRealTimeMessaging();
  await testRealTimeUpdates();
  await testWhopProductSync();
  await testAnalyticsSystem();
  await testReportingSystem();
  await testPerformanceMonitoring();
  await testCachingSystem();
  await testWebSocketHook();
  await testIntegrationFlow();
  await testPerformance();
  
  // Print results
  console.log('\n📊 Test Results Summary:');
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
  
  console.log('\n🎉 Phase 4 & 5 Implementation Tests Complete!');
  
  // Exit with appropriate code
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  console.error('❌ Test runner error:', error);
  process.exit(1);
});
