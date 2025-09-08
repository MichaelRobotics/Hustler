/**
 * Phase 5 Implementation Test Suite
 *
 * Tests WHOP Product Sync, Analytics, Reporting, Performance Monitoring, and Caching
 */

const fs = require("fs");
const path = require("path");

console.log(
	"📊 Testing Phase 5 Implementation (WHOP Product Sync & Analytics)...\n",
);

// Test Results Tracking
const testResults = {
	passed: 0,
	failed: 0,
	total: 0,
	details: [],
};

function logTest(testName, passed, details = "") {
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

// Test 1: Check Phase 5 Files Exist
function testPhase5FilesExist() {
	console.log("📁 Testing Phase 5 Files Existence...");

	const phase5Files = [
		"lib/sync/whop-product-sync.ts",
		"lib/analytics/analytics.ts",
		"lib/reporting/reports.ts",
		"lib/monitoring/performance.ts",
		"lib/cache/redis-cache.ts",
		"lib/optimization/query-optimizer.ts",
		"app/api/webhooks/whop-products/route.ts",
		"app/api/resources/sync/route.ts",
		"app/api/analytics/route.ts",
		"app/api/reports/business-insights/route.ts",
		"app/api/reports/funnel-performance/route.ts",
		"app/api/reports/user-engagement/route.ts",
		"app/api/monitoring/performance/route.ts",
	];

	phase5Files.forEach((file) => {
		const filePath = path.join(__dirname, "..", file);
		const exists = fs.existsSync(filePath);
		logTest(`File exists: ${file}`, exists);
	});
}

// Test 2: Check WHOP Product Sync Implementation
function testWhopProductSyncImplementation() {
	console.log("\n🔄 Testing WHOP Product Sync Implementation...");

	const syncPath = path.join(__dirname, "..", "lib/sync/whop-product-sync.ts");
	if (fs.existsSync(syncPath)) {
		const content = fs.readFileSync(syncPath, "utf8");

		// Check for key classes and methods
		const hasWhopProductSync = content.includes("class WhopProductSync");
		const hasSyncCompanyProducts = content.includes(
			"async syncCompanyProducts(",
		);
		const hasSyncProduct = content.includes("async syncProduct(");
		const hasHandleWebhookUpdate = content.includes(
			"async handleWebhookUpdate(",
		);
		const hasGetSyncStatus = content.includes("async getSyncStatus(");
		const hasBulkImportProducts = content.includes("async bulkImportProducts(");
		const hasExport = content.includes("export const whopProductSync");

		logTest("WhopProductSync class structure", hasWhopProductSync);
		logTest("Company products sync method", hasSyncCompanyProducts);
		logTest("Single product sync method", hasSyncProduct);
		logTest("Webhook update handling", hasHandleWebhookUpdate);
		logTest("Sync status retrieval", hasGetSyncStatus);
		logTest("Bulk import functionality", hasBulkImportProducts);
		logTest("Product sync export", hasExport);

		// Check for interfaces and types
		const hasWhopProduct = content.includes("interface WhopProduct");
		const hasSyncResult = content.includes("interface SyncResult");
		const hasSyncOptions = content.includes("interface SyncOptions");

		logTest("WhopProduct interface", hasWhopProduct);
		logTest("SyncResult interface", hasSyncResult);
		logTest("SyncOptions interface", hasSyncOptions);

		// Check for webhook handling
		const hasProductCreated = content.includes("'product.created'");
		const hasProductUpdated = content.includes("'product.updated'");
		const hasProductDeleted = content.includes("'product.deleted'");

		logTest("Product created webhook", hasProductCreated);
		logTest("Product updated webhook", hasProductUpdated);
		logTest("Product deleted webhook", hasProductDeleted);
	}
}

// Test 3: Check Analytics System Implementation
function testAnalyticsSystemImplementation() {
	console.log("\n📊 Testing Analytics System Implementation...");

	const analyticsPath = path.join(
		__dirname,
		"..",
		"lib/analytics/analytics.ts",
	);
	if (fs.existsSync(analyticsPath)) {
		const content = fs.readFileSync(analyticsPath, "utf8");

		// Check for key classes and methods
		const hasAnalyticsSystem = content.includes("class AnalyticsSystem");
		const hasTrackFunnelView = content.includes("async trackFunnelView(");
		const hasTrackFunnelStart = content.includes("async trackFunnelStart(");
		const hasTrackFunnelCompletion = content.includes(
			"async trackFunnelCompletion(",
		);
		const hasTrackConversion = content.includes("async trackConversion(");
		const hasExport = content.includes("export const analyticsSystem");

		logTest("AnalyticsSystem class structure", hasAnalyticsSystem);
		logTest("Funnel view tracking", hasTrackFunnelView);
		logTest("Funnel start tracking", hasTrackFunnelStart);
		logTest("Funnel completion tracking", hasTrackFunnelCompletion);
		logTest("Conversion tracking", hasTrackConversion);
		logTest("Analytics system export", hasExport);

		// Check for analytics retrieval methods
		const hasGetFunnelPerformanceMetrics = content.includes(
			"async getFunnelPerformanceMetrics(",
		);
		const hasGetUserInteractionAnalytics = content.includes(
			"async getUserInteractionAnalytics(",
		);
		const hasGetCompanyAnalytics = content.includes(
			"async getCompanyAnalytics(",
		);

		logTest("Funnel performance metrics", hasGetFunnelPerformanceMetrics);
		logTest("User interaction analytics", hasGetUserInteractionAnalytics);
		logTest("Company analytics", hasGetCompanyAnalytics);

		// Check for interfaces
		const hasFunnelPerformanceMetrics = content.includes(
			"interface FunnelPerformanceMetrics",
		);
		const hasUserInteractionAnalytics = content.includes(
			"interface UserInteractionAnalytics",
		);
		const hasCompanyAnalytics = content.includes("interface CompanyAnalytics");
		const hasConversionAnalytics = content.includes(
			"interface ConversionAnalytics",
		);
		const hasAnalyticsFilters = content.includes("interface AnalyticsFilters");

		logTest("FunnelPerformanceMetrics interface", hasFunnelPerformanceMetrics);
		logTest("UserInteractionAnalytics interface", hasUserInteractionAnalytics);
		logTest("CompanyAnalytics interface", hasCompanyAnalytics);
		logTest("ConversionAnalytics interface", hasConversionAnalytics);
		logTest("AnalyticsFilters interface", hasAnalyticsFilters);

		// Check for caching
		const hasAnalyticsCache = content.includes("analyticsCache");
		const hasCacheDuration = content.includes("CACHE_DURATION");
		const hasClearCache = content.includes("clearCache");

		logTest("Analytics caching system", hasAnalyticsCache);
		logTest("Cache duration configuration", hasCacheDuration);
		logTest("Cache clearing functionality", hasClearCache);
	}
}

// Test 4: Check Reporting System Implementation
function testReportingSystemImplementation() {
	console.log("\n📈 Testing Reporting System Implementation...");

	const reportingPath = path.join(__dirname, "..", "lib/reporting/reports.ts");
	if (fs.existsSync(reportingPath)) {
		const content = fs.readFileSync(reportingPath, "utf8");

		// Check for key classes and methods
		const hasReportingSystem = content.includes("class ReportingSystem");
		const hasGenerateFunnelPerformanceReport = content.includes(
			"async generateFunnelPerformanceReport(",
		);
		const hasGenerateUserEngagementReport = content.includes(
			"async generateUserEngagementReport(",
		);
		const hasGenerateBusinessInsightsReport = content.includes(
			"async generateBusinessInsightsReport(",
		);
		const hasExportReport = content.includes("async exportReport(");
		const hasExport = content.includes("export const reportingSystem");

		logTest("ReportingSystem class structure", hasReportingSystem);
		logTest(
			"Funnel performance report generation",
			hasGenerateFunnelPerformanceReport,
		);
		logTest(
			"User engagement report generation",
			hasGenerateUserEngagementReport,
		);
		logTest(
			"Business insights report generation",
			hasGenerateBusinessInsightsReport,
		);
		logTest("Report export functionality", hasExportReport);
		logTest("Reporting system export", hasExport);

		// Check for interfaces
		const hasReportFilters = content.includes("interface ReportFilters");
		const hasFunnelPerformanceReport = content.includes(
			"interface FunnelPerformanceReport",
		);
		const hasUserEngagementReport = content.includes(
			"interface UserEngagementReport",
		);
		const hasBusinessInsightsReport = content.includes(
			"interface BusinessInsightsReport",
		);

		logTest("ReportFilters interface", hasReportFilters);
		logTest("FunnelPerformanceReport interface", hasFunnelPerformanceReport);
		logTest("UserEngagementReport interface", hasUserEngagementReport);
		logTest("BusinessInsightsReport interface", hasBusinessInsightsReport);

		// Check for export formats
		const hasJsonExport = content.includes("'json'");
		const hasCsvExport = content.includes("'csv'");
		const hasPdfExport = content.includes("'pdf'");

		logTest("JSON export format", hasJsonExport);
		logTest("CSV export format", hasCsvExport);
		logTest("PDF export format", hasPdfExport);

		// Check for recommendations
		const hasGenerateRecommendations = content.includes(
			"generateRecommendations",
		);
		const hasRecommendations = content.includes("recommendations");

		logTest("Recommendations generation", hasGenerateRecommendations);
		logTest("Recommendations in reports", hasRecommendations);
	}
}

// Test 5: Check Performance Monitoring Implementation
function testPerformanceMonitoringImplementation() {
	console.log("\n⚡ Testing Performance Monitoring Implementation...");

	const monitoringPath = path.join(
		__dirname,
		"..",
		"lib/monitoring/performance.ts",
	);
	if (fs.existsSync(monitoringPath)) {
		const content = fs.readFileSync(monitoringPath, "utf8");

		// Check for key classes and methods
		const hasPerformanceMonitoring = content.includes(
			"class PerformanceMonitoring",
		);
		const hasStartAPIMonitoring = content.includes("startAPIMonitoring(");
		const hasStartDatabaseMonitoring = content.includes(
			"startDatabaseMonitoring(",
		);
		const hasRecordSystemMetrics = content.includes(
			"async recordSystemMetrics(",
		);
		const hasGetSystemHealthStatus = content.includes(
			"async getSystemHealthStatus(",
		);
		const hasExport = content.includes("export const performanceMonitoring");

		logTest("PerformanceMonitoring class structure", hasPerformanceMonitoring);
		logTest("API monitoring", hasStartAPIMonitoring);
		logTest("Database monitoring", hasStartDatabaseMonitoring);
		logTest("System metrics recording", hasRecordSystemMetrics);
		logTest("System health status", hasGetSystemHealthStatus);
		logTest("Performance monitoring export", hasExport);

		// Check for reporting methods
		const hasGetPerformanceSummary = content.includes("getPerformanceSummary(");
		const hasGetSlowQueriesReport = content.includes("getSlowQueriesReport(");
		const hasGetErrorReport = content.includes("getErrorReport(");

		logTest("Performance summary reporting", hasGetPerformanceSummary);
		logTest("Slow queries reporting", hasGetSlowQueriesReport);
		logTest("Error reporting", hasGetErrorReport);

		// Check for interfaces
		const hasPerformanceMetrics = content.includes(
			"interface PerformanceMetrics",
		);
		const hasDatabasePerformanceMetrics = content.includes(
			"interface DatabasePerformanceMetrics",
		);
		const hasAPIPerformanceMetrics = content.includes(
			"interface APIPerformanceMetrics",
		);
		const hasSystemHealthStatus = content.includes(
			"interface SystemHealthStatus",
		);

		logTest("PerformanceMetrics interface", hasPerformanceMetrics);
		logTest(
			"DatabasePerformanceMetrics interface",
			hasDatabasePerformanceMetrics,
		);
		logTest("APIPerformanceMetrics interface", hasAPIPerformanceMetrics);
		logTest("SystemHealthStatus interface", hasSystemHealthStatus);

		// Check for alerting
		const hasAlertThresholds = content.includes("alertThresholds");
		const hasSendAlert = content.includes("sendAlert");
		const hasCheckAlerts =
			content.includes("check") && content.includes("Alert");

		logTest("Alert thresholds configuration", hasAlertThresholds);
		logTest("Alert sending functionality", hasSendAlert);
		logTest("Alert checking logic", hasCheckAlerts);
	}
}

// Test 6: Check Caching System Implementation
function testCachingSystemImplementation() {
	console.log("\n💾 Testing Caching System Implementation...");

	const cachePath = path.join(__dirname, "..", "lib/cache/redis-cache.ts");
	if (fs.existsSync(cachePath)) {
		const content = fs.readFileSync(cachePath, "utf8");

		// Check for key classes and methods
		const hasRedisCache = content.includes("class RedisCache");
		const hasGet = content.includes("async get<");
		const hasSet = content.includes("async set(");
		const hasDelete = content.includes("async delete(");
		const hasDeleteByTags = content.includes("async deleteByTags(");
		const hasClear = content.includes("async clear(");
		const hasExport = content.includes("export const redisCache");

		logTest("RedisCache class structure", hasRedisCache);
		logTest("Cache get method", hasGet);
		logTest("Cache set method", hasSet);
		logTest("Cache delete method", hasDelete);
		logTest("Cache delete by tags method", hasDeleteByTags);
		logTest("Cache clear method", hasClear);
		logTest("Cache system export", hasExport);

		// Check for interfaces
		const hasCacheOptions = content.includes("interface CacheOptions");
		const hasCacheStats = content.includes("interface CacheStats");

		logTest("CacheOptions interface", hasCacheOptions);
		logTest("CacheStats interface", hasCacheStats);

		// Check for cache management
		const hasGetStats = content.includes("getStats(");
		const hasSize = content.includes("size(");
		const hasCleanup = content.includes("cleanup(");
		const hasMemoryCache = content.includes("memoryCache");

		logTest("Cache statistics", hasGetStats);
		logTest("Cache size method", hasSize);
		logTest("Cache cleanup method", hasCleanup);
		logTest("Memory cache fallback", hasMemoryCache);

		// Check for Redis fallback
		const hasIsRedisAvailable = content.includes("isRedisAvailable");
		const hasInitializeRedis = content.includes("initializeRedis");

		logTest("Redis availability check", hasIsRedisAvailable);
		logTest("Redis initialization", hasInitializeRedis);
	}
}

// Test 7: Check API Routes Implementation
function testAPIRoutesImplementation() {
	console.log("\n🌐 Testing Phase 5 API Routes Implementation...");

	// Test webhook route
	const webhookPath = path.join(
		__dirname,
		"..",
		"app/api/webhooks/whop-products/route.ts",
	);
	if (fs.existsSync(webhookPath)) {
		const content = fs.readFileSync(webhookPath, "utf8");
		const hasPOST = content.includes("export async function POST");
		const hasWebhookHandling = content.includes(
			"whopProductSync.handleWebhookUpdate",
		);
		logTest("WHOP products webhook route", hasPOST && hasWebhookHandling);
	}

	// Test sync route
	const syncPath = path.join(
		__dirname,
		"..",
		"app/api/resources/sync/route.ts",
	);
	if (fs.existsSync(syncPath)) {
		const content = fs.readFileSync(syncPath, "utf8");
		const hasGET = content.includes("export const GET");
		const hasPOST = content.includes("export const POST");
		const hasSyncHandling = content.includes("whopProductSync");
		logTest("Resources sync API route", (hasGET || hasPOST) && hasSyncHandling);
	}

	// Test analytics route
	const analyticsPath = path.join(
		__dirname,
		"..",
		"app/api/analytics/route.ts",
	);
	if (fs.existsSync(analyticsPath)) {
		const content = fs.readFileSync(analyticsPath, "utf8");
		const hasGET = content.includes("export const GET");
		const hasAnalyticsHandling = content.includes("getFunnelAnalytics");
		logTest("Analytics API route", hasGET && hasAnalyticsHandling);
	}

	// Test business insights route
	const businessInsightsPath = path.join(
		__dirname,
		"..",
		"app/api/reports/business-insights/route.ts",
	);
	if (fs.existsSync(businessInsightsPath)) {
		const content = fs.readFileSync(businessInsightsPath, "utf8");
		const hasGET = content.includes("export const GET");
		const hasReportHandling =
			content.includes("report") || content.includes("Report");
		logTest("Business insights API route", hasGET && hasReportHandling);
	}

	// Test funnel performance route
	const funnelPerformancePath = path.join(
		__dirname,
		"..",
		"app/api/reports/funnel-performance/route.ts",
	);
	if (fs.existsSync(funnelPerformancePath)) {
		const content = fs.readFileSync(funnelPerformancePath, "utf8");
		const hasGET = content.includes("export const GET");
		const hasReportHandling =
			content.includes("report") || content.includes("Report");
		logTest("Funnel performance API route", hasGET && hasReportHandling);
	}

	// Test user engagement route
	const userEngagementPath = path.join(
		__dirname,
		"..",
		"app/api/reports/user-engagement/route.ts",
	);
	if (fs.existsSync(userEngagementPath)) {
		const content = fs.readFileSync(userEngagementPath, "utf8");
		const hasGET = content.includes("export const GET");
		const hasReportHandling =
			content.includes("report") || content.includes("Report");
		logTest("User engagement API route", hasGET && hasReportHandling);
	}

	// Test performance monitoring route
	const performancePath = path.join(
		__dirname,
		"..",
		"app/api/monitoring/performance/route.ts",
	);
	if (fs.existsSync(performancePath)) {
		const content = fs.readFileSync(performancePath, "utf8");
		const hasGET = content.includes("export const GET");
		const hasMonitoringHandling =
			content.includes("performance") || content.includes("monitoring");
		logTest(
			"Performance monitoring API route",
			hasGET && hasMonitoringHandling,
		);
	}
}

// Test 8: Check Integration Points
function testIntegrationPoints() {
	console.log("\n🔗 Testing Phase 5 Integration Points...");

	// Check if analytics is integrated with other systems
	const funnelActionsPath = path.join(
		__dirname,
		"..",
		"lib/actions/funnel-actions.ts",
	);
	if (fs.existsSync(funnelActionsPath)) {
		const content = fs.readFileSync(funnelActionsPath, "utf8");
		const hasAnalyticsIntegration =
			content.includes("analytics") || content.includes("track");
		logTest("Funnel actions analytics integration", hasAnalyticsIntegration);
	}

	// Check if sync is integrated with resources
	const resourceActionsPath = path.join(
		__dirname,
		"..",
		"lib/actions/resource-actions.ts",
	);
	if (fs.existsSync(resourceActionsPath)) {
		const content = fs.readFileSync(resourceActionsPath, "utf8");
		const hasSyncIntegration =
			content.includes("sync") || content.includes("whop");
		logTest("Resource actions sync integration", hasSyncIntegration);
	}

	// Check if monitoring is integrated with middleware
	const middlewarePath = path.join(
		__dirname,
		"..",
		"lib/middleware/route-protection.ts",
	);
	if (fs.existsSync(middlewarePath)) {
		const content = fs.readFileSync(middlewarePath, "utf8");
		const hasMonitoringIntegration =
			content.includes("monitoring") || content.includes("performance");
		logTest("Middleware monitoring integration", hasMonitoringIntegration);
	}
}

// Test 9: Check Data Flow and Types
function testDataFlowAndTypes() {
	console.log("\n📊 Testing Data Flow and Types...");

	// Test analytics data flow
	const analyticsPath = path.join(
		__dirname,
		"..",
		"lib/analytics/analytics.ts",
	);
	if (fs.existsSync(analyticsPath)) {
		const content = fs.readFileSync(analyticsPath, "utf8");

		const hasViewsTracking = content.includes("views");
		const hasStartsTracking = content.includes("starts");
		const hasCompletionsTracking = content.includes("completions");
		const hasConversionsTracking = content.includes("conversions");
		const hasRevenueTracking = content.includes("revenue");

		logTest("Analytics views tracking", hasViewsTracking);
		logTest("Analytics starts tracking", hasStartsTracking);
		logTest("Analytics completions tracking", hasCompletionsTracking);
		logTest("Analytics conversions tracking", hasConversionsTracking);
		logTest("Analytics revenue tracking", hasRevenueTracking);
	}

	// Test sync data flow
	const syncPath = path.join(__dirname, "..", "lib/sync/whop-product-sync.ts");
	if (fs.existsSync(syncPath)) {
		const content = fs.readFileSync(syncPath, "utf8");

		const hasProductId = content.includes("whopProductId");
		const hasProductName = content.includes("name");
		const hasProductDescription = content.includes("description");
		const hasProductPrice = content.includes("price");
		const hasProductStatus = content.includes("status");

		logTest("Product ID sync", hasProductId);
		logTest("Product name sync", hasProductName);
		logTest("Product description sync", hasProductDescription);
		logTest("Product price sync", hasProductPrice);
		logTest("Product status sync", hasProductStatus);
	}
}

// Test 10: Check Error Handling and Resilience
function testErrorHandlingAndResilience() {
	console.log("\n⚠️ Testing Error Handling and Resilience...");

	// Test analytics error handling
	const analyticsPath = path.join(
		__dirname,
		"..",
		"lib/analytics/analytics.ts",
	);
	if (fs.existsSync(analyticsPath)) {
		const content = fs.readFileSync(analyticsPath, "utf8");
		const hasTryCatch =
			content.includes("try {") && content.includes("} catch");
		const hasErrorLogging = content.includes("console.error");
		logTest("Analytics error handling", hasTryCatch && hasErrorLogging);
	}

	// Test sync error handling
	const syncPath = path.join(__dirname, "..", "lib/sync/whop-product-sync.ts");
	if (fs.existsSync(syncPath)) {
		const content = fs.readFileSync(syncPath, "utf8");
		const hasTryCatch =
			content.includes("try {") && content.includes("} catch");
		const hasErrorLogging = content.includes("console.error");
		const hasRetryLogic =
			content.includes("retry") || content.includes("attempt");
		logTest("Sync error handling", hasTryCatch && hasErrorLogging);
		logTest("Sync retry logic", hasRetryLogic);
	}

	// Test monitoring error handling
	const monitoringPath = path.join(
		__dirname,
		"..",
		"lib/monitoring/performance.ts",
	);
	if (fs.existsSync(monitoringPath)) {
		const content = fs.readFileSync(monitoringPath, "utf8");
		const hasTryCatch =
			content.includes("try {") && content.includes("} catch");
		const hasErrorLogging = content.includes("console.error");
		logTest("Monitoring error handling", hasTryCatch && hasErrorLogging);
	}

	// Test cache error handling
	const cachePath = path.join(__dirname, "..", "lib/cache/redis-cache.ts");
	if (fs.existsSync(cachePath)) {
		const content = fs.readFileSync(cachePath, "utf8");
		const hasTryCatch =
			content.includes("try {") && content.includes("} catch");
		const hasErrorLogging = content.includes("console.error");
		const hasFallback =
			content.includes("fallback") || content.includes("memory");
		logTest("Cache error handling", hasTryCatch && hasErrorLogging);
		logTest("Cache fallback mechanism", hasFallback);
	}
}

// Main test runner
function runPhase5Tests() {
	console.log("🚀 Starting Phase 5 Implementation Tests...\n");

	testPhase5FilesExist();
	testWhopProductSyncImplementation();
	testAnalyticsSystemImplementation();
	testReportingSystemImplementation();
	testPerformanceMonitoringImplementation();
	testCachingSystemImplementation();
	testAPIRoutesImplementation();
	testIntegrationPoints();
	testDataFlowAndTypes();
	testErrorHandlingAndResilience();

	// Print results
	console.log("\n📊 Phase 5 Test Results Summary:");
	console.log(`✅ Passed: ${testResults.passed}`);
	console.log(`❌ Failed: ${testResults.failed}`);
	console.log(`📈 Total: ${testResults.total}`);
	console.log(
		`🎯 Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`,
	);

	if (testResults.failed > 0) {
		console.log("\n❌ Failed Tests:");
		testResults.details
			.filter((test) => !test.passed)
			.forEach((test) => console.log(`  - ${test.testName}: ${test.details}`));
	}

	console.log("\n🎉 Phase 5 Implementation Tests Complete!");

	// Exit with appropriate code
	process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run tests
runPhase5Tests();
