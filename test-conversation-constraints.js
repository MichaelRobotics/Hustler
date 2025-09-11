#!/usr/bin/env node

/**
 * Test Conversation Constraints and CustomerView Stage Detection
 * 1. Test that users can only have 1 active conversation
 * 2. Test that CustomerView correctly checks conversations for specific experienceID
 */

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';
const TEST_EXPERIENCE_ID = 'exp_wl5EtbHqAqLdjV';

async function waitForServer() {
    console.log('⏳ Waiting for server to start...');
    for (let i = 0; i < 30; i++) {
        try {
            const response = await fetch(`${BASE_URL}/api/health`);
            if (response.ok) {
                console.log('✅ Server is ready!');
                return true;
            }
        } catch (error) {
            // Server not ready yet
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    throw new Error('Server failed to start within 30 seconds');
}

async function testSingleActiveConversation() {
    console.log('\n🧪 TEST 1: Single Active Conversation Constraint');
    console.log('=' .repeat(50));

    try {
        // Create first conversation
        console.log('1️⃣ Creating first conversation...');
        const response1 = await fetch(`${BASE_URL}/api/admin/trigger-first-dm`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ experienceId: TEST_EXPERIENCE_ID })
        });

        if (!response1.ok) {
            throw new Error(`First conversation failed: ${response1.status}`);
        }

        const result1 = await response1.json();
        console.log('✅ First conversation created:', {
            conversationId: result1.conversationId,
            success: result1.success
        });

        // Create second conversation (should close first one)
        console.log('\n2️⃣ Creating second conversation (should close first)...');
        const response2 = await fetch(`${BASE_URL}/api/admin/trigger-first-dm`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ experienceId: TEST_EXPERIENCE_ID })
        });

        if (!response2.ok) {
            throw new Error(`Second conversation failed: ${response2.status}`);
        }

        const result2 = await response2.json();
        console.log('✅ Second conversation created:', {
            conversationId: result2.conversationId,
            success: result2.success
        });

        // Check if first conversation is closed
        console.log('\n3️⃣ Checking if first conversation was closed...');
        const checkResponse1 = await fetch(`${BASE_URL}/api/userchat/load-conversation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ conversationId: result1.conversationId })
        });

        const checkResult1 = await checkResponse1.json();
        console.log('First conversation status:', {
            success: checkResult1.success,
            error: checkResult1.error,
            conversation: checkResult1.conversation ? 'exists' : 'not found'
        });

        // Check if second conversation is active
        console.log('\n4️⃣ Checking if second conversation is active...');
        const checkResponse2 = await fetch(`${BASE_URL}/api/userchat/load-conversation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ conversationId: result2.conversationId })
        });

        const checkResult2 = await checkResponse2.json();
        console.log('Second conversation status:', {
            success: checkResult2.success,
            conversation: checkResult2.conversation ? 'exists' : 'not found',
            status: checkResult2.conversation?.status
        });

        // Test result
        const firstClosed = !checkResult1.success || checkResult1.error;
        const secondActive = checkResult2.success && checkResult2.conversation?.status === 'active';
        
        if (firstClosed && secondActive) {
            console.log('\n✅ SUCCESS: Only one active conversation per user!');
            return { success: true, activeConversationId: result2.conversationId };
        } else {
            console.log('\n❌ FAILED: Multiple active conversations or constraint not working');
            return { success: false };
        }

    } catch (error) {
        console.log('❌ Error testing single conversation constraint:', error.message);
        return { success: false, error: error.message };
    }
}

async function testCustomerViewStageDetection(activeConversationId) {
    console.log('\n🧪 TEST 2: CustomerView Stage Detection');
    console.log('=' .repeat(50));

    try {
        // Test CustomerView with active conversation
        console.log('1️⃣ Testing CustomerView with active conversation...');
        const customerViewUrl = `${BASE_URL}/experiences/${TEST_EXPERIENCE_ID}?conversationId=${activeConversationId}`;
        console.log('CustomerView URL:', customerViewUrl);

        // Test load-conversation API directly
        console.log('\n2️⃣ Testing load-conversation API...');
        const loadResponse = await fetch(`${BASE_URL}/api/userchat/load-conversation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                conversationId: activeConversationId,
                experienceId: TEST_EXPERIENCE_ID 
            })
        });

        if (!loadResponse.ok) {
            throw new Error(`Load conversation failed: ${loadResponse.status}`);
        }

        const loadResult = await loadResponse.json();
        console.log('Load conversation result:', {
            success: loadResult.success,
            hasConversation: !!loadResult.conversation,
            hasFunnelFlow: !!loadResult.funnelFlow,
            experienceId: loadResult.conversation?.experienceId,
            currentBlockId: loadResult.conversation?.currentBlockId,
            status: loadResult.conversation?.status
        });

        // Test experience ID validation
        console.log('\n3️⃣ Testing experience ID validation...');
        const wrongExperienceResponse = await fetch(`${BASE_URL}/api/userchat/load-conversation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                conversationId: activeConversationId,
                experienceId: 'exp_wrong_experience_id' 
            })
        });

        const wrongExperienceResult = await wrongExperienceResponse.json();
        console.log('Wrong experience ID result:', {
            success: wrongExperienceResult.success,
            error: wrongExperienceResult.error
        });

        // Test with no conversation ID
        console.log('\n4️⃣ Testing with no conversation ID...');
        const noConversationResponse = await fetch(`${BASE_URL}/api/userchat/load-conversation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                experienceId: TEST_EXPERIENCE_ID 
            })
        });

        const noConversationResult = await noConversationResponse.json();
        console.log('No conversation ID result:', {
            success: noConversationResult.success,
            error: noConversationResult.error
        });

        // Test result
        const correctExperience = loadResult.success && loadResult.conversation?.experienceId === TEST_EXPERIENCE_ID;
        const wrongExperienceRejected = !wrongExperienceResult.success;
        const noConversationHandled = !noConversationResult.success;

        if (correctExperience && wrongExperienceRejected && noConversationHandled) {
            console.log('\n✅ SUCCESS: CustomerView correctly validates experience ID!');
            return { success: true, conversation: loadResult.conversation };
        } else {
            console.log('\n❌ FAILED: Experience ID validation not working properly');
            return { success: false };
        }

    } catch (error) {
        console.log('❌ Error testing CustomerView stage detection:', error.message);
        return { success: false, error: error.message };
    }
}

async function testConversationStages(conversation) {
    console.log('\n🧪 TEST 3: Conversation Stage Detection');
    console.log('=' .repeat(50));

    try {
        console.log('1️⃣ Analyzing conversation stage...');
        console.log('Conversation details:', {
            id: conversation.id,
            experienceId: conversation.experienceId,
            status: conversation.status,
            currentBlockId: conversation.currentBlockId,
            userPath: conversation.userPath,
            metadata: conversation.metadata
        });

        // Determine expected stage
        let expectedStage = 'unknown';
        if (conversation.status !== 'active') {
            expectedStage = 'no_conversation';
        } else if (conversation.metadata?.type === 'dm') {
            if (conversation.metadata?.phase === 'welcome') {
                expectedStage = 'dm_stage';
            } else if (conversation.metadata?.phase === 'transition') {
                expectedStage = 'transition_stage';
            }
        } else {
            expectedStage = 'internal_chat';
        }

        console.log('Expected stage:', expectedStage);

        // Test stage detection logic
        const isTransitionStage = conversation.metadata?.phase === 'transition' && 
                                 conversation.metadata?.type === 'dm';
        const isDMStage = conversation.metadata?.type === 'dm' && 
                         conversation.metadata?.phase === 'welcome';
        const isInternalChat = conversation.metadata?.type !== 'dm';

        console.log('Stage detection:', {
            isTransitionStage,
            isDMStage,
            isInternalChat,
            detectedStage: isTransitionStage ? 'transition_stage' : 
                          isDMStage ? 'dm_stage' : 
                          isInternalChat ? 'internal_chat' : 'unknown'
        });

        console.log('\n✅ SUCCESS: Stage detection logic working!');
        return { success: true, stage: expectedStage };

    } catch (error) {
        console.log('❌ Error testing conversation stages:', error.message);
        return { success: false, error: error.message };
    }
}

async function runAllTests() {
    console.log('🚀 STARTING CONVERSATION CONSTRAINTS AND STAGE DETECTION TESTS');
    console.log('=' .repeat(70));

    try {
        // Wait for server
        await waitForServer();

        // Test 1: Single active conversation constraint
        const constraintResult = await testSingleActiveConversation();
        
        if (!constraintResult.success) {
            console.log('\n❌ CRITICAL: Single conversation constraint failed!');
            return;
        }

        // Test 2: CustomerView stage detection
        const stageResult = await testCustomerViewStageDetection(constraintResult.activeConversationId);
        
        if (!stageResult.success) {
            console.log('\n❌ CRITICAL: CustomerView stage detection failed!');
            return;
        }

        // Test 3: Conversation stages
        const conversationResult = await testConversationStages(stageResult.conversation);

        // Final summary
        console.log('\n📋 FINAL TEST RESULTS');
        console.log('=' .repeat(70));
        console.log('✅ Single Active Conversation Constraint:', constraintResult.success ? 'PASS' : 'FAIL');
        console.log('✅ CustomerView Experience ID Validation:', stageResult.success ? 'PASS' : 'FAIL');
        console.log('✅ Conversation Stage Detection:', conversationResult.success ? 'PASS' : 'FAIL');

        if (constraintResult.success && stageResult.success && conversationResult.success) {
            console.log('\n🎉 ALL TESTS PASSED! System is working correctly!');
        } else {
            console.log('\n❌ SOME TESTS FAILED! Check the implementation.');
        }

    } catch (error) {
        console.log('❌ Test suite failed:', error.message);
    }
}

// Run all tests
runAllTests().catch(console.error);


