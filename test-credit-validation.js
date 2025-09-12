#!/usr/bin/env node

/**
 * Test script for credit validation endpoint
 * This script tests the new /api/validate-credits endpoint
 */

const https = require('https');
const http = require('http');

// Configuration
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const TEST_EXPERIENCE_ID = process.env.TEST_EXPERIENCE_ID || 'your-experience-id-here';

// Test data
const testCases = [
    {
        name: "Valid credit validation request",
        data: {
            experienceId: TEST_EXPERIENCE_ID
        },
        expectedStatus: 200
    },
    {
        name: "Missing experience ID",
        data: {},
        expectedStatus: 400
    },
    {
        name: "Invalid experience ID",
        data: {
            experienceId: "invalid-id"
        },
        expectedStatus: 400
    }
];

async function makeRequest(url, data) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify(data);
        
        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = http.request(url, options, (res) => {
            let responseData = '';
            
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            
            res.on('end', () => {
                try {
                    const parsedData = JSON.parse(responseData);
                    resolve({
                        status: res.statusCode,
                        data: parsedData
                    });
                } catch (error) {
                    resolve({
                        status: res.statusCode,
                        data: responseData
                    });
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.write(postData);
        req.end();
    });
}

async function runTests() {
    console.log('🧪 Testing Credit Validation Endpoint');
    console.log('=====================================\n');

    const results = [];

    for (const testCase of testCases) {
        console.log(`Testing: ${testCase.name}`);
        
        try {
            const response = await makeRequest(
                `${BASE_URL}/api/validate-credits`,
                testCase.data
            );

            const passed = response.status === testCase.expectedStatus;
            results.push({
                name: testCase.name,
                passed,
                expectedStatus: testCase.expectedStatus,
                actualStatus: response.status,
                response: response.data
            });

            if (passed) {
                console.log(`✅ PASSED - Status: ${response.status}`);
            } else {
                console.log(`❌ FAILED - Expected: ${testCase.expectedStatus}, Got: ${response.status}`);
            }

            if (response.data) {
                console.log(`   Response: ${JSON.stringify(response.data, null, 2)}`);
            }

        } catch (error) {
            console.log(`❌ ERROR - ${error.message}`);
            results.push({
                name: testCase.name,
                passed: false,
                error: error.message
            });
        }

        console.log('');
    }

    // Summary
    console.log('Test Results Summary');
    console.log('===================');
    
    const passed = results.filter(r => r.passed).length;
    const total = results.length;
    
    console.log(`Passed: ${passed}/${total}`);
    
    if (passed === total) {
        console.log('🎉 All tests passed!');
    } else {
        console.log('⚠️  Some tests failed. Check the details above.');
    }

    // Detailed results
    console.log('\nDetailed Results:');
    results.forEach(result => {
        const status = result.passed ? '✅' : '❌';
        console.log(`${status} ${result.name}`);
        if (!result.passed && result.error) {
            console.log(`   Error: ${result.error}`);
        } else if (!result.passed) {
            console.log(`   Expected: ${result.expectedStatus}, Got: ${result.actualStatus}`);
        }
    });
}

// Run tests if this script is executed directly
if (require.main === module) {
    runTests().catch(console.error);
}

module.exports = { runTests, makeRequest };
