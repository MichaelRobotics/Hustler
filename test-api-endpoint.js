#!/usr/bin/env node

/**
 * Test script to verify API endpoint returns correct ID structure
 * This script tests the /api/user/context endpoint to ensure it returns the correct ID types
 */

const http = require('http');

function makeRequest(options, postData = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    resolve({ status: res.statusCode, data: jsonData });
                } catch (e) {
                    resolve({ status: res.statusCode, data: data });
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        if (postData) {
            req.write(postData);
        }
        req.end();
    });
}

async function testUserContextAPI() {
    console.log('🧪 Testing User Context API Endpoint\n');
    
    // Test with a mock Whop experience ID
    const testWhopExperienceId = 'exp_test123';
    
    console.log('📋 Test Parameters:');
    console.log(`   Whop Experience ID: ${testWhopExperienceId}\n`);
    
    try {
        console.log('🔍 Calling /api/user/context endpoint...');
        
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: `/api/user/context?experienceId=${testWhopExperienceId}`,
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                // Add mock Whop headers for testing
                'x-whop-user-id': 'user_test456',
                'x-whop-company-id': 'company_test789',
                'authorization': 'Bearer mock_token'
            }
        };
        
        const response = await makeRequest(options);
        
        console.log(`📡 Response Status: ${response.status}`);
        
        if (response.status !== 200) {
            console.log('❌ API call failed');
            console.log('Response:', JSON.stringify(response.data, null, 2));
            return;
        }
        
        console.log('✅ API call successful\n');
        
        const userContext = response.data;
        
        if (!userContext || !userContext.user) {
            console.log('❌ Invalid response structure');
            console.log('Response:', JSON.stringify(userContext, null, 2));
            return;
        }
        
        // Test the user object structure
        const user = userContext.user;
        
        console.log('👤 User Object Analysis:');
        console.log(`   user.id: ${user.id} (should be database UUID)`);
        console.log(`   user.whopUserId: ${user.whopUserId} (should be Whop user ID)`);
        console.log(`   user.experienceId: ${user.experienceId} (should be Whop experience ID)`);
        console.log(`   user.accessLevel: ${user.accessLevel}`);
        console.log(`   user.credits: ${user.credits}\n`);
        
        // Test the experience object structure
        const experience = user.experience;
        
        if (!experience) {
            console.log('❌ Missing experience object');
            return;
        }
        
        console.log('🏢 Experience Object Analysis:');
        console.log(`   experience.id: ${experience.id} (should be database UUID)`);
        console.log(`   experience.whopExperienceId: ${experience.whopExperienceId} (should be Whop experience ID)`);
        console.log(`   experience.whopCompanyId: ${experience.whopCompanyId}`);
        console.log(`   experience.name: ${experience.name}\n`);
        
        // Validate ID types
        console.log('🔬 ID Type Validation:');
        
        // Check if user.experienceId is the Whop experience ID
        const isExperienceIdCorrect = user.experienceId === testWhopExperienceId;
        console.log(`   user.experienceId === testWhopExperienceId: ${isExperienceIdCorrect ? '✅' : '❌'}`);
        
        // Check if experience.id is a UUID (database ID)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const isExperienceIdUuid = uuidRegex.test(experience.id);
        console.log(`   experience.id is UUID format: ${isExperienceIdUuid ? '✅' : '❌'}`);
        
        // Check if experience.whopExperienceId is the Whop experience ID
        const isWhopExperienceIdCorrect = experience.whopExperienceId === testWhopExperienceId;
        console.log(`   experience.whopExperienceId === testWhopExperienceId: ${isWhopExperienceIdCorrect ? '✅' : '❌'}`);
        
        // Check if user.experienceId and experience.whopExperienceId are the same
        const areExperienceIdsSame = user.experienceId === experience.whopExperienceId;
        console.log(`   user.experienceId === experience.whopExperienceId: ${areExperienceIdsSame ? '✅' : '❌'}\n`);
        
        // Summary
        console.log('📊 Test Summary:');
        if (isExperienceIdCorrect && isExperienceIdUuid && isWhopExperienceIdCorrect && areExperienceIdsSame) {
            console.log('✅ ALL TESTS PASSED - ID structure is correct!');
            console.log('   - user.experienceId contains Whop experience ID');
            console.log('   - experience.id contains database UUID');
            console.log('   - experience.whopExperienceId contains Whop experience ID');
        } else {
            console.log('❌ SOME TESTS FAILED - ID structure needs fixing');
            console.log('   - user.experienceId should be Whop experience ID');
            console.log('   - experience.id should be database UUID');
            console.log('   - experience.whopExperienceId should be Whop experience ID');
        }
        
    } catch (error) {
        console.error('❌ Error during test:', error.message);
    }
}

// Check if server is running
async function checkServer() {
    try {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/',
            method: 'GET',
            timeout: 2000
        };
        
        await makeRequest(options);
        return true;
    } catch (error) {
        return false;
    }
}

async function main() {
    console.log('🔍 Checking if development server is running...');
    
    const isServerRunning = await checkServer();
    
    if (!isServerRunning) {
        console.log('❌ Development server is not running on localhost:3000');
        console.log('Please start the development server with: npm run dev');
        return;
    }
    
    console.log('✅ Development server is running\n');
    
    await testUserContextAPI();
}

// Run the test
main().catch(console.error);
