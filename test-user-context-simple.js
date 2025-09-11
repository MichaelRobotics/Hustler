#!/usr/bin/env node

/**
 * Simple test script to verify user context ID structure
 * This script tests the getUserContext function to ensure it returns the correct ID types
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function testUserContextIds() {
    console.log('🧪 Testing User Context ID Structure\n');
    
    // Test with a mock Whop experience ID
    const testWhopExperienceId = 'exp_test123';
    const testWhopUserId = 'user_test456';
    
    console.log('📋 Test Parameters:');
    console.log(`   Whop User ID: ${testWhopUserId}`);
    console.log(`   Whop Experience ID: ${testWhopExperienceId}\n`);
    
    try {
        // Create a test script that can be run with ts-node
        const testScript = `
import { getUserContext } from './lib/context/user-context';

async function runTest() {
    const testWhopExperienceId = '${testWhopExperienceId}';
    const testWhopUserId = '${testWhopUserId}';
    
    console.log('🔍 Calling getUserContext...');
    const userContext = await getUserContext(
        testWhopUserId,
        '', // whopCompanyId
        testWhopExperienceId,
        true // forceRefresh
    );
    
    if (!userContext) {
        console.log('❌ getUserContext returned null');
        return;
    }
    
    console.log('✅ getUserContext returned successfully');
    
    // Test the user object structure
    const user = userContext.user;
    
    console.log('👤 User Object Analysis:');
    console.log(\`   user.id: \${user.id} (should be database UUID)\`);
    console.log(\`   user.whopUserId: \${user.whopUserId} (should be Whop user ID)\`);
    console.log(\`   user.experienceId: \${user.experienceId} (should be Whop experience ID)\`);
    console.log(\`   user.accessLevel: \${user.accessLevel}\`);
    console.log(\`   user.credits: \${user.credits}\`);
    
    // Test the experience object structure
    const experience = user.experience;
    
    console.log('🏢 Experience Object Analysis:');
    console.log(\`   experience.id: \${experience.id} (should be database UUID)\`);
    console.log(\`   experience.whopExperienceId: \${experience.whopExperienceId} (should be Whop experience ID)\`);
    console.log(\`   experience.whopCompanyId: \${experience.whopCompanyId}\`);
    console.log(\`   experience.name: \${experience.name}\`);
    
    // Validate ID types
    console.log('🔬 ID Type Validation:');
    
    // Check if user.experienceId is the Whop experience ID
    const isExperienceIdCorrect = user.experienceId === testWhopExperienceId;
    console.log(\`   user.experienceId === testWhopExperienceId: \${isExperienceIdCorrect ? '✅' : '❌'}\`);
    
    // Check if experience.id is a UUID (database ID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isExperienceIdUuid = uuidRegex.test(experience.id);
    console.log(\`   experience.id is UUID format: \${isExperienceIdUuid ? '✅' : '❌'}\`);
    
    // Check if experience.whopExperienceId is the Whop experience ID
    const isWhopExperienceIdCorrect = experience.whopExperienceId === testWhopExperienceId;
    console.log(\`   experience.whopExperienceId === testWhopExperienceId: \${isWhopExperienceIdCorrect ? '✅' : '❌'}\`);
    
    // Check if user.experienceId and experience.whopExperienceId are the same
    const areExperienceIdsSame = user.experienceId === experience.whopExperienceId;
    console.log(\`   user.experienceId === experience.whopExperienceId: \${areExperienceIdsSame ? '✅' : '❌'}\`);
    
    // Summary
    console.log('📊 Test Summary:');
    if (isExperienceIdCorrect && isExperienceIdUuid && isWhopExperienceIdCorrect && areExperienceIdsSame) {
        console.log('✅ ALL TESTS PASSED - ID structure is correct!');
        console.log('   - user.experienceId contains Whop experience ID');
        console.log('   - experience.id contains database UUID');
        console.log('   - experience.whopExperienceId contains Whop experience ID');
    } else {
        console.log('❌ SOME TESTS FAILED - ID structure needs fixing');
    }
}

runTest().catch(console.error);
`;

        // Write the test script to a temporary file
        const testFile = path.join(__dirname, 'test-user-context-temp.ts');
        fs.writeFileSync(testFile, testScript);
        
        console.log('🔍 Running test with ts-node...\n');
        
        // Run the test script
        const result = execSync(`npx ts-node ${testFile}`, { 
            encoding: 'utf8',
            cwd: __dirname,
            stdio: 'pipe'
        });
        
        console.log(result);
        
        // Clean up
        fs.unlinkSync(testFile);
        
    } catch (error) {
        console.error('❌ Error during test:', error.message);
        if (error.stdout) {
            console.log('STDOUT:', error.stdout);
        }
        if (error.stderr) {
            console.log('STDERR:', error.stderr);
        }
    }
}

// Run the test
testUserContextIds().catch(console.error);
