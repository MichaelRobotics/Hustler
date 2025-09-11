#!/usr/bin/env node

/**
 * Test Invalid Conversation ID Handling
 */

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function testInvalidConversation() {
    console.log('🧪 TESTING: Invalid Conversation ID Handling\n');

    try {
        console.log('Testing with invalid conversation ID...');
        const loadResponse = await fetch(`${BASE_URL}/api/userchat/load-conversation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ conversationId: 'invalid-conversation-id' })
        });

        console.log('Response status:', loadResponse.status);
        console.log('Response headers:', Object.fromEntries(loadResponse.headers.entries()));
        
        const responseText = await loadResponse.text();
        console.log('Response body:', responseText);
        
        try {
            const responseJson = JSON.parse(responseText);
            console.log('Parsed JSON:', responseJson);
        } catch (parseError) {
            console.log('Failed to parse JSON:', parseError.message);
        }
        
    } catch (error) {
        console.log('❌ Error testing invalid conversation:', error.message);
    }
}

// Run the test
testInvalidConversation().catch(console.error);


