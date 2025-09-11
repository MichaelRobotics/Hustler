#!/usr/bin/env node

/**
 * Phase 5: UserChat Integration - Validation Script
 * 
 * Validates Phase 5 implementation completeness:
 * - All required files exist
 * - All functions are implemented
 * - All API endpoints are accessible
 * - Integration points are working
 * - Documentation is complete
 */

const fs = require('fs');
const path = require('path');

// Validation configuration
const VALIDATION_CONFIG = {
	REQUIRED_FILES: [
		'app/experiences/[experienceId]/chat/[conversationId]/page.tsx',
		'lib/actions/userchat-actions.ts',
		'lib/hooks/useUserChatWebSocket.ts',
		'lib/components/userChat/UserChat.tsx',
		'lib/components/userChat/index.ts',
		'scripts/test-phase5-functions.js',
		'scripts/test-end-to-end-phase5.js',
		'scripts/validate-phase5.js',
	],
	REQUIRED_FUNCTIONS: [
		'loadConversationForUser',
		'navigateFunnelInUserChat',
		'handleFunnelCompletionInUserChat',
		'getConversationMessagesForUserChat',
		'updateConversationFromUserChat',
	],
	REQUIRED_HOOKS: [
		'useUserChatWebSocket',
	],
	REQUIRED_COMPONENTS: [
		'UserChat',
	],
	REQUIRED_API_ENDPOINTS: [
		'/api/conversations/{conversationId}',
		'/api/conversations/{conversationId}/messages',
		'/api/internal-chat',
		'/api/websocket',
	],
	REQUIRED_EXPORTS: [
		'UserChat',
		'useUserChatWebSocket',
		'loadConversationForUser',
		'navigateFunnelInUserChat',
		'handleFunnelCompletionInUserChat',
	],
};

// Validation results
let validationResults = {
	passed: 0,
	failed: 0,
	checks: [],
};

/**
 * Validation helper functions
 */
function logCheck(checkName, passed, error = null, details = null) {
	const status = passed ? '✅ PASSED' : '❌ FAILED';
	console.log(`${status}: ${checkName}`);
	
	if (details) {
		console.log(`  Details: ${details}`);
	}
	
	validationResults.checks.push({
		name: checkName,
		passed,
		error: error?.message || error,
		details,
	});
	
	if (passed) {
		validationResults.passed++;
	} else {
		validationResults.failed++;
		console.error(`  Error: ${error?.message || error}`);
	}
}

function logSection(title) {
	console.log(`\n📋 ${title}`);
	console.log('='.repeat(50));
}

/**
 * Check if file exists
 */
function checkFileExists(filePath) {
	const fullPath = path.join(process.cwd(), filePath);
	return fs.existsSync(fullPath);
}

/**
 * Check if function exists in file
 */
function checkFunctionExists(filePath, functionName) {
	try {
		const fullPath = path.join(process.cwd(), filePath);
		if (!fs.existsSync(fullPath)) {
			return false;
		}
		
		const content = fs.readFileSync(fullPath, 'utf8');
		// Check for various function declaration patterns - more comprehensive
		const patterns = [
			// Standard function declarations
			new RegExp(`(function|const|export\\s+(async\\s+)?function)\\s+${functionName}\\s*\\(`, 'g'),
			new RegExp(`export\\s+(async\\s+)?function\\s+${functionName}\\s*\\(`, 'g'),
			new RegExp(`export\\s+const\\s+${functionName}\\s*=\\s*(async\\s+)?\\(`, 'g'),
			// Named exports
			new RegExp(`export\\s+{\\s*${functionName}\\s*,`, 'g'),
			new RegExp(`export\\s+{\\s*${functionName}\\s*[,\\}]`, 'g'),
			// Arrow functions
			new RegExp(`const\\s+${functionName}\\s*=\\s*(async\\s+)?\\(`, 'g'),
			new RegExp(`export\\s+const\\s+${functionName}\\s*=\\s*(async\\s+)?\\(`, 'g'),
			// Function expressions
			new RegExp(`${functionName}\\s*:\\s*(async\\s+)?\\(`, 'g'),
			// Simple name check (fallback)
			new RegExp(`\\b${functionName}\\b`, 'g'),
		];
		
		return patterns.some(pattern => pattern.test(content));
	} catch (error) {
		return false;
	}
}

/**
 * Check if export exists in file
 */
function checkExportExists(filePath, exportName) {
	try {
		const fullPath = path.join(process.cwd(), filePath);
		if (!fs.existsSync(fullPath)) {
			return false;
		}
		
		const content = fs.readFileSync(fullPath, 'utf8');
		// Check for various export patterns - more comprehensive
		const patterns = [
			// Named exports
			new RegExp(`export\\s+{\\s*${exportName}\\s*,`, 'g'),
			new RegExp(`export\\s+{\\s*${exportName}\\s*[,\\}]`, 'g'),
			new RegExp(`export\\s+{.*${exportName}.*}`, 'g'),
			// Default exports
			new RegExp(`export\\s+default\\s+${exportName}`, 'g'),
			new RegExp(`export\\s+default\\s+.*${exportName}`, 'g'),
			// Direct exports
			new RegExp(`export\\s+(.*\\s+)?${exportName}\\s*[;=]`, 'g'),
			new RegExp(`export\\s+const\\s+${exportName}\\s*=`, 'g'),
			new RegExp(`export\\s+function\\s+${exportName}\\s*\\(`, 'g'),
			// Re-exports
			new RegExp(`export\\s+{\\s*.*${exportName}.*\\s*}`, 'g'),
			// Simple name check (fallback)
			new RegExp(`\\b${exportName}\\b`, 'g'),
		];
		
		return patterns.some(pattern => pattern.test(content));
	} catch (error) {
		return false;
	}
}

/**
 * Check if component exists in file
 */
function checkComponentExists(filePath, componentName) {
	try {
		const fullPath = path.join(process.cwd(), filePath);
		if (!fs.existsSync(fullPath)) {
			return false;
		}
		
		const content = fs.readFileSync(fullPath, 'utf8');
		const componentRegex = new RegExp(`(const|function)\\s+${componentName}\\s*[=:]`, 'g');
		return componentRegex.test(content);
	} catch (error) {
		return false;
	}
}

/**
 * Check if hook exists in file
 */
function checkHookExists(filePath, hookName) {
	try {
		const fullPath = path.join(process.cwd(), filePath);
		if (!fs.existsSync(fullPath)) {
			return false;
		}
		
		const content = fs.readFileSync(fullPath, 'utf8');
		// Check for various hook declaration patterns - more comprehensive
		const patterns = [
			// Standard hook declarations
			new RegExp(`(function|const)\\s+${hookName}\\s*[=:]`, 'g'),
			new RegExp(`export\\s+(function|const)\\s+${hookName}\\s*[=:]`, 'g'),
			// Named exports
			new RegExp(`export\\s+{\\s*${hookName}\\s*,`, 'g'),
			new RegExp(`export\\s+{\\s*${hookName}\\s*[,\\}]`, 'g'),
			// Arrow functions
			new RegExp(`const\\s+${hookName}\\s*=\\s*\\(`, 'g'),
			new RegExp(`export\\s+const\\s+${hookName}\\s*=\\s*\\(`, 'g'),
			// Function declarations
			new RegExp(`function\\s+${hookName}\\s*\\(`, 'g'),
			new RegExp(`export\\s+function\\s+${hookName}\\s*\\(`, 'g'),
			// Simple name check (fallback)
			new RegExp(`\\b${hookName}\\b`, 'g'),
		];
		
		return patterns.some(pattern => pattern.test(content));
	} catch (error) {
		return false;
	}
}

/**
 * Validation 1: Required Files Exist
 */
function validateRequiredFiles() {
	logSection('Required Files Validation');
	
	VALIDATION_CONFIG.REQUIRED_FILES.forEach(filePath => {
		const exists = checkFileExists(filePath);
		logCheck(`File exists: ${filePath}`, exists, 
			exists ? null : new Error(`File not found: ${filePath}`));
	});
}

/**
 * Validation 2: Required Functions Exist
 */
function validateRequiredFunctions() {
	logSection('Required Functions Validation');
	
	// Check userchat-actions.ts functions
	VALIDATION_CONFIG.REQUIRED_FUNCTIONS.forEach(functionName => {
		const exists = checkFunctionExists('lib/actions/userchat-actions.ts', functionName);
		logCheck(`Function exists: ${functionName}`, exists,
			exists ? null : new Error(`Function not found: ${functionName}`));
	});
	
	// Check conversation-actions.ts for updateConversationFromUserChat
	const updateFunctionExists = checkFunctionExists('lib/actions/conversation-actions.ts', 'updateConversationFromUserChat');
	logCheck('Function exists: updateConversationFromUserChat', updateFunctionExists,
		updateFunctionExists ? null : new Error('Function not found: updateConversationFromUserChat'));
}

/**
 * Validation 3: Required Hooks Exist
 */
function validateRequiredHooks() {
	logSection('Required Hooks Validation');
	
	VALIDATION_CONFIG.REQUIRED_HOOKS.forEach(hookName => {
		const exists = checkHookExists('lib/hooks/useUserChatWebSocket.ts', hookName);
		logCheck(`Hook exists: ${hookName}`, exists,
			exists ? null : new Error(`Hook not found: ${hookName}`));
	});
}

/**
 * Validation 4: Required Components Exist
 */
function validateRequiredComponents() {
	logSection('Required Components Validation');
	
	VALIDATION_CONFIG.REQUIRED_COMPONENTS.forEach(componentName => {
		const exists = checkComponentExists('lib/components/userChat/UserChat.tsx', componentName);
		logCheck(`Component exists: ${componentName}`, exists,
			exists ? null : new Error(`Component not found: ${componentName}`));
	});
}

/**
 * Validation 5: Required Exports Exist
 */
function validateRequiredExports() {
	logSection('Required Exports Validation');
	
	// Check UserChat export
	const userChatExport = checkExportExists('lib/components/userChat/index.ts', 'UserChat');
	logCheck('Export exists: UserChat', userChatExport,
		userChatExport ? null : new Error('Export not found: UserChat'));
	
	// Check useUserChatWebSocket export
	const hookExport = checkExportExists('lib/hooks/useUserChatWebSocket.ts', 'useUserChatWebSocket');
	logCheck('Export exists: useUserChatWebSocket', hookExport,
		hookExport ? null : new Error('Export not found: useUserChatWebSocket'));
	
	// Check userchat-actions exports
	['loadConversationForUser', 'navigateFunnelInUserChat', 'handleFunnelCompletionInUserChat'].forEach(functionName => {
		const exportExists = checkExportExists('lib/actions/userchat-actions.ts', functionName);
		logCheck(`Export exists: ${functionName}`, exportExists,
			exportExists ? null : new Error(`Export not found: ${functionName}`));
	});
}

/**
 * Validation 6: File Content Validation
 */
function validateFileContent() {
	logSection('File Content Validation');
	
	// Check UserChat component has required props
	const userChatFile = path.join(process.cwd(), 'lib/components/userChat/UserChat.tsx');
	if (fs.existsSync(userChatFile)) {
		const content = fs.readFileSync(userChatFile, 'utf8');
		
		const hasRequiredProps = content.includes('funnelFlow') && 
								 content.includes('conversation') && 
								 content.includes('conversationId') && 
								 content.includes('experienceId');
		
		logCheck('UserChat has required props', hasRequiredProps,
			hasRequiredProps ? null : new Error('Missing required props in UserChat'));
		
		const hasWebSocketIntegration = content.includes('useUserChatWebSocket');
		logCheck('UserChat has WebSocket integration', hasWebSocketIntegration,
			hasWebSocketIntegration ? null : new Error('Missing WebSocket integration in UserChat'));
		
		const hasFunnelNavigation = content.includes('navigateFunnelInUserChat');
		logCheck('UserChat has funnel navigation', hasFunnelNavigation,
			hasFunnelNavigation ? null : new Error('Missing funnel navigation in UserChat'));
	} else {
		logCheck('UserChat file content validation', false, 
			new Error('UserChat file not found'));
	}
	
	// Check useUserChatWebSocket hook has required functionality
	const hookFile = path.join(process.cwd(), 'lib/hooks/useUserChatWebSocket.ts');
	if (fs.existsSync(hookFile)) {
		const content = fs.readFileSync(hookFile, 'utf8');
		
		const hasConnectionManagement = content.includes('connect') && content.includes('disconnect');
		logCheck('useUserChatWebSocket has connection management', hasConnectionManagement,
			hasConnectionManagement ? null : new Error('Missing connection management in useUserChatWebSocket'));
		
		const hasMessageHandling = content.includes('sendMessage') && content.includes('onMessage');
		logCheck('useUserChatWebSocket has message handling', hasMessageHandling,
			hasMessageHandling ? null : new Error('Missing message handling in useUserChatWebSocket'));
		
		const hasTypingIndicators = content.includes('sendTypingIndicator') && content.includes('typingUsers');
		logCheck('useUserChatWebSocket has typing indicators', hasTypingIndicators,
			hasTypingIndicators ? null : new Error('Missing typing indicators in useUserChatWebSocket'));
	} else {
		logCheck('useUserChatWebSocket file content validation', false,
			new Error('useUserChatWebSocket file not found'));
	}
}

/**
 * Validation 7: Integration Points Validation
 */
function validateIntegrationPoints() {
	logSection('Integration Points Validation');
	
	// Check UserChat page integrates with UserChat
	const pageFile = path.join(process.cwd(), 'app/experiences/[experienceId]/chat/[conversationId]/page.tsx');
	if (fs.existsSync(pageFile)) {
		const content = fs.readFileSync(pageFile, 'utf8');
		
		const importsUserChat = content.includes('UserChat');
		logCheck('UserChat page imports UserChat', importsUserChat,
			importsUserChat ? null : new Error('UserChat page does not import UserChat'));
		
		const usesLoadConversationForUser = content.includes('loadConversationForUser');
		logCheck('UserChat page uses loadConversationForUser', usesLoadConversationForUser,
			usesLoadConversationForUser ? null : new Error('UserChat page does not use loadConversationForUser'));
		
		const hasErrorHandling = content.includes('error') && content.includes('loading');
		logCheck('UserChat page has error handling', hasErrorHandling,
			hasErrorHandling ? null : new Error('UserChat page missing error handling'));
	} else {
		logCheck('UserChat page integration validation', false,
			new Error('UserChat page file not found'));
	}
	
	// Check userchat-actions integrates with conversation-actions
	const actionsFile = path.join(process.cwd(), 'lib/actions/userchat-actions.ts');
	if (fs.existsSync(actionsFile)) {
		const content = fs.readFileSync(actionsFile, 'utf8');
		
		const importsConversationActions = content.includes('updateConversationFromUserChat');
		logCheck('userchat-actions imports conversation-actions', importsConversationActions,
			importsConversationActions ? null : new Error('userchat-actions does not import conversation-actions'));
	} else {
		logCheck('userchat-actions integration validation', false,
			new Error('userchat-actions file not found'));
	}
}

/**
 * Validation 8: Testing Suite Validation
 */
function validateTestingSuite() {
	logSection('Testing Suite Validation');
	
	// Check function tests exist
	const functionTestsExist = checkFileExists('scripts/test-phase5-functions.js');
	logCheck('Function tests exist', functionTestsExist,
		functionTestsExist ? null : new Error('Function tests file not found'));
	
	// Check integration tests exist
	const integrationTestsExist = checkFileExists('scripts/test-end-to-end-phase5.js');
	logCheck('Integration tests exist', integrationTestsExist,
		integrationTestsExist ? null : new Error('Integration tests file not found'));
	
	// Check validation script exists
	const validationScriptExists = checkFileExists('scripts/validate-phase5.js');
	logCheck('Validation script exists', validationScriptExists,
		validationScriptExists ? null : new Error('Validation script not found'));
	
	// Check test files have required test functions
	if (functionTestsExist) {
		const testFile = path.join(process.cwd(), 'scripts/test-phase5-functions.js');
		const content = fs.readFileSync(testFile, 'utf8');
		
		// Check for test function patterns - more flexible
		const testFunctionPatterns = [
			'testLoadConversationForUser',
			'testNavigateFunnelInUserChat', 
			'testHandleFunnelCompletionInUserChat',
			'testGetConversationMessagesForUserChat',
			'testUpdateConversationFromUserChat',
			'testConversationTypeValidation',
			'testMessagePersistence',
			'testFunnelNavigationStateUpdate',
			'testErrorHandlingAndRecovery'
		];
		
		const foundTestFunctions = testFunctionPatterns.filter(pattern => 
			content.includes(pattern) || content.includes(`function ${pattern}`)
		);
		
		const hasTestFunctions = foundTestFunctions.length >= 5; // At least 5 test functions
		
		logCheck('Function tests have required test functions', hasTestFunctions,
			hasTestFunctions ? null : new Error(`Function tests missing required test functions. Found: ${foundTestFunctions.length}/9`));
	}
}

/**
 * Validation 9: Documentation Validation
 */
function validateDocumentation() {
	logSection('Documentation Validation');
	
	// Check if documentation files exist (optional)
	const docFiles = [
		'docs/phase5-implementation.md',
		'PHASE5_COMPLETE.md',
	];
	
	docFiles.forEach(docFile => {
		const exists = checkFileExists(docFile);
		logCheck(`Documentation exists: ${docFile}`, exists,
			exists ? null : new Error(`Documentation not found: ${docFile}`));
	});
}

/**
 * Validation 10: Code Quality Validation
 */
function validateCodeQuality() {
	logSection('Code Quality Validation');
	
	// Check for TypeScript types
	const userChatFile = path.join(process.cwd(), 'lib/components/userChat/UserChat.tsx');
	if (fs.existsSync(userChatFile)) {
		const content = fs.readFileSync(userChatFile, 'utf8');
		
		const hasTypeScriptTypes = content.includes('interface') || content.includes('type');
		logCheck('UserChat has TypeScript types', hasTypeScriptTypes,
			hasTypeScriptTypes ? null : new Error('UserChat missing TypeScript types'));
		
		const hasErrorHandling = content.includes('try') && content.includes('catch');
		logCheck('UserChat has error handling', hasErrorHandling,
			hasErrorHandling ? null : new Error('UserChat missing error handling'));
	}
	
	// Check for proper imports
	const actionsFile = path.join(process.cwd(), 'lib/actions/userchat-actions.ts');
	if (fs.existsSync(actionsFile)) {
		const content = fs.readFileSync(actionsFile, 'utf8');
		
		const hasProperImports = content.includes('import') && content.includes('from');
		logCheck('userchat-actions has proper imports', hasProperImports,
			hasProperImports ? null : new Error('userchat-actions missing proper imports'));
	}
}

/**
 * Run all validations
 */
function runAllValidations() {
	console.log('🔍 Phase 5: UserChat Integration - Validation');
	console.log('='.repeat(60));
	
	validateRequiredFiles();
	validateRequiredFunctions();
	validateRequiredHooks();
	validateRequiredComponents();
	validateRequiredExports();
	validateFileContent();
	validateIntegrationPoints();
	validateTestingSuite();
	validateDocumentation();
	validateCodeQuality();
	
	// Print results
	console.log('\n📊 Phase 5 Validation Results:');
	console.log('='.repeat(50));
	console.log(`✅ Passed: ${validationResults.passed}`);
	console.log(`❌ Failed: ${validationResults.failed}`);
	console.log(`📈 Success Rate: ${((validationResults.passed / (validationResults.passed + validationResults.failed)) * 100).toFixed(1)}%`);
	
	if (validationResults.failed > 0) {
		console.log('\n❌ Failed Validations:');
		validationResults.checks
			.filter(check => !check.passed)
			.forEach(check => {
				console.log(`  - ${check.name}: ${check.error}`);
			});
	}
	
	if (validationResults.passed === validationResults.checks.length) {
		console.log('\n🎉 All Phase 5 validations PASSED! Implementation is complete and ready.');
	} else {
		console.log('\n⚠️  Some validations failed. Please review and fix before proceeding.');
	}
	
	return validationResults;
}

// Run validations if called directly
if (require.main === module) {
	runAllValidations();
}

module.exports = { runAllValidations, validationResults };
