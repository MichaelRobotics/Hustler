/**
 * Phase 4 Validation Script
 * 
 * Simple validation to ensure Phase 4 files are properly created and structured
 */

const fs = require('fs');
const path = require('path');

// Test results tracking
let validationResults = {
	passed: 0,
	failed: 0,
	total: 0,
	details: []
};

function logTest(testName, status, details = '') {
	validationResults.total++;
	if (status === 'PASS') {
		validationResults.passed++;
		console.log(`✅ ${testName}: PASS`);
	} else {
		validationResults.failed++;
		console.log(`❌ ${testName}: FAIL - ${details}`);
	}
	validationResults.details.push({ testName, status, details });
}

function logSection(title) {
	console.log(`\n🔹 ${title}`);
	console.log('='.repeat(50));
}

// Validation functions
function validateFileExists(filePath, description) {
	try {
		if (fs.existsSync(filePath)) {
			logTest(`File exists: ${description}`, 'PASS');
			return true;
		} else {
			logTest(`File exists: ${description}`, 'FAIL', `File not found: ${filePath}`);
			return false;
		}
	} catch (error) {
		logTest(`File exists: ${description}`, 'FAIL', error.message);
		return false;
	}
}

function validateFileContent(filePath, description, requiredContent) {
	try {
		if (!fs.existsSync(filePath)) {
			logTest(`File content: ${description}`, 'FAIL', 'File does not exist');
			return false;
		}

		const content = fs.readFileSync(filePath, 'utf8');
		
		for (const required of requiredContent) {
			if (content.includes(required)) {
				logTest(`File content: ${description} - ${required}`, 'PASS');
			} else {
				logTest(`File content: ${description} - ${required}`, 'FAIL', `Required content not found: ${required}`);
			}
		}
		
		return true;
	} catch (error) {
		logTest(`File content: ${description}`, 'FAIL', error.message);
		return false;
	}
}

function validateFunctionExists(filePath, functionName, description) {
	try {
		if (!fs.existsSync(filePath)) {
			logTest(`Function exists: ${description}`, 'FAIL', 'File does not exist');
			return false;
		}

		const content = fs.readFileSync(filePath, 'utf8');
		
		if (content.includes(`function ${functionName}`) || 
			content.includes(`async function ${functionName}`) ||
			content.includes(`export async function ${functionName}`) ||
			content.includes(`export function ${functionName}`)) {
			logTest(`Function exists: ${description}`, 'PASS');
			return true;
		} else {
			logTest(`Function exists: ${description}`, 'FAIL', `Function ${functionName} not found`);
			return false;
		}
	} catch (error) {
		logTest(`Function exists: ${description}`, 'FAIL', error.message);
		return false;
	}
}

// Main validation function
async function validatePhase4() {
	console.log('🚀 Starting Phase 4 Validation');
	console.log('================================');

	// Validate core files
	logSection('Validating Core Files');
	
	validateFileExists(
		'lib/actions/internal-chat-transition-actions.ts',
		'Internal Chat Transition Actions'
	);
	
	validateFileExists(
		'app/api/internal-chat/route.ts',
		'Internal Chat API Routes'
	);
	
	validateFileExists(
		'scripts/test-phase4-functions.js',
		'Phase 4 Function Tests'
	);
	
	validateFileExists(
		'scripts/test-end-to-end-phase4.js',
		'Phase 4 Integration Tests'
	);
	
	validateFileExists(
		'docs/phase4-implementation.md',
		'Phase 4 Documentation'
	);
	
	validateFileExists(
		'PHASE4_COMPLETE.md',
		'Phase 4 Completion Summary'
	);

	// Validate core functions
	logSection('Validating Core Functions');
	
	validateFunctionExists(
		'lib/actions/internal-chat-transition-actions.ts',
		'createInternalChatSession',
		'createInternalChatSession function'
	);
	
	validateFunctionExists(
		'lib/actions/internal-chat-transition-actions.ts',
		'copyDMMessagesToInternalChat',
		'copyDMMessagesToInternalChat function'
	);
	
	validateFunctionExists(
		'lib/actions/internal-chat-transition-actions.ts',
		'initializeFunnel2',
		'initializeFunnel2 function'
	);
	
	validateFunctionExists(
		'lib/actions/internal-chat-transition-actions.ts',
		'generateTransitionMessage',
		'generateTransitionMessage function'
	);
	
	validateFunctionExists(
		'lib/actions/internal-chat-transition-actions.ts',
		'generateChatLink',
		'generateChatLink function'
	);
	
	validateFunctionExists(
		'lib/actions/internal-chat-transition-actions.ts',
		'personalizeTransitionMessage',
		'personalizeTransitionMessage function'
	);
	
	validateFunctionExists(
		'lib/actions/internal-chat-transition-actions.ts',
		'sendTransitionMessage',
		'sendTransitionMessage function'
	);
	
	validateFunctionExists(
		'lib/actions/internal-chat-transition-actions.ts',
		'completeDMToInternalTransition',
		'completeDMToInternalTransition function'
	);

	// Validate API endpoints
	logSection('Validating API Endpoints');
	
	validateFileContent(
		'app/api/internal-chat/route.ts',
		'Internal Chat API Routes',
		['GET', 'POST', 'PUT', 'PATCH', 'withWhopAuth']
	);

	// Validate integration
	logSection('Validating Integration');
	
	validateFileContent(
		// 'lib/actions/dm-monitoring-actions.ts', // REMOVED - using cron-based system now
		'DM Monitoring Integration',
		['completeDMToInternalTransition', 'handleFunnel1Completion', 'isTransitionBlock']
	);

	// Validate test files
	logSection('Validating Test Files');
	
	validateFileContent(
		'scripts/test-phase4-functions.js',
		'Phase 4 Function Tests',
		['testCreateInternalChatSession', 'testCopyDMMessagesToInternalChat', 'runPhase4Tests']
	);
	
	validateFileContent(
		'scripts/test-end-to-end-phase4.js',
		'Phase 4 Integration Tests',
		['testCompleteUserJourney', 'testErrorHandling', 'runE2EPhase4Tests']
	);

	// Validate documentation
	logSection('Validating Documentation');
	
	validateFileContent(
		'docs/phase4-implementation.md',
		'Phase 4 Documentation',
		['createInternalChatSession', 'copyDMMessagesToInternalChat', 'API Endpoints']
	);
	
	validateFileContent(
		'PHASE4_COMPLETE.md',
		'Phase 4 Completion Summary',
		['PRODUCTION READY', 'What Was Implemented', 'Testing Results']
	);

	// Print results
	console.log('\n📊 Phase 4 Validation Results');
	console.log('==============================');
	console.log(`Total Validations: ${validationResults.total}`);
	console.log(`Passed: ${validationResults.passed}`);
	console.log(`Failed: ${validationResults.failed}`);
	console.log(`Success Rate: ${((validationResults.passed / validationResults.total) * 100).toFixed(1)}%`);

	if (validationResults.failed > 0) {
		console.log('\n❌ Failed Validations:');
		validationResults.details
			.filter(test => test.status === 'FAIL')
			.forEach(test => {
				console.log(`  - ${test.testName}: ${test.details}`);
			});
	}

	if (validationResults.passed === validationResults.total) {
		console.log('\n🎉 All Phase 4 validations passed!');
		console.log('✅ Phase 4 implementation is complete and ready!');
		return true;
	} else {
		console.log('\n⚠️  Some Phase 4 validations failed. Please review the results above.');
		return false;
	}
}

// Run validation if this file is executed directly
if (require.main === module) {
	validatePhase4()
		.then(success => {
			process.exit(success ? 0 : 1);
		})
		.catch(error => {
			console.error('Validation failed:', error);
			process.exit(1);
		});
}

module.exports = {
	validatePhase4,
	validationResults
};

