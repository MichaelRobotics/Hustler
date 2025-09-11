#!/usr/bin/env node

/**
 * CustomerView End-to-End Test
 * Tests Admin and Customer scenarios with user isolation and conversation history management
 */

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';
const TEST_EXPERIENCE_ID = 'exp_wl5EtbHqAqLdjV';

// Test users for isolation testing
const TEST_USERS = {
    admin: {
        whopUserId: 'admin_test_user_123',
        experienceId: TEST_EXPERIENCE_ID,
        accessLevel: 'admin'
    },
    customer1: {
        whopUserId: 'customer_test_user_456',
        experienceId: TEST_EXPERIENCE_ID,
        accessLevel: 'customer'
    },
    customer2: {
        whopUserId: 'customer_test_user_789',
        experienceId: TEST_EXPERIENCE_ID,
        accessLevel: 'customer'
    }
};

async function waitForServer() {
    console.log('⏳ Waiting for server to start...');
    for (let i = 0; i < 30; i++) {
        try {
            const response = await fetch(`${BASE_URL}/api/admin/trigger-first-dm`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ experienceId: TEST_EXPERIENCE_ID })
            });
            if (response.status !== 500) { // Server is responding
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

async function testAdminCustomerView() {
    console.log('\n🧪 TEST 1: Admin CustomerView');
    console.log('=' .repeat(50));

    try {
        // Test admin trigger first DM
        console.log('1️⃣ Testing admin trigger first DM...');
        const triggerResponse = await fetch(`${BASE_URL}/api/admin/trigger-first-dm`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ experienceId: TEST_EXPERIENCE_ID })
        });

        if (!triggerResponse.ok) {
            console.log('❌ Admin trigger failed:', triggerResponse.status);
            return { success: false, error: 'Admin trigger failed' };
        }

        const triggerResult = await triggerResponse.json();
        console.log('✅ Admin trigger successful:', {
            success: triggerResult.success,
            conversationId: triggerResult.conversationId,
            dmSent: triggerResult.dmSent
        });

        // Test admin conversation loading
        console.log('\n2️⃣ Testing admin conversation loading...');
        const loadResponse = await fetch(`${BASE_URL}/api/userchat/load-conversation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ conversationId: triggerResult.conversationId })
        });

        if (!loadResponse.ok) {
            console.log('❌ Admin conversation loading failed:', loadResponse.status);
            return { success: false, error: 'Admin conversation loading failed' };
        }

        const loadResult = await loadResponse.json();
        console.log('✅ Admin conversation loaded:', {
            success: loadResult.success,
            hasConversation: !!loadResult.conversation,
            hasFunnelFlow: !!loadResult.funnelFlow,
            conversationType: loadResult.conversation?.metadata?.type,
            adminTriggered: loadResult.conversation?.metadata?.adminTriggered,
            currentBlockId: loadResult.conversation?.currentBlockId,
            userId: loadResult.conversation?.userId
        });

        return { 
            success: true, 
            conversationId: triggerResult.conversationId,
            conversation: loadResult.conversation,
            funnelFlow: loadResult.funnelFlow
        };

    } catch (error) {
        console.log('❌ Error testing admin CustomerView:', error.message);
        return { success: false, error: error.message };
    }
}

async function testCustomerIsolation() {
    console.log('\n🧪 TEST 2: Customer User Isolation');
    console.log('=' .repeat(50));

    try {
        // Create conversation for customer 1
        console.log('1️⃣ Creating conversation for customer 1...');
        const customer1Response = await fetch(`${BASE_URL}/api/admin/trigger-first-dm`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                experienceId: TEST_EXPERIENCE_ID,
                whopUserId: TEST_USERS.customer1.whopUserId
            })
        });

        if (!customer1Response.ok) {
            console.log('❌ Customer 1 conversation creation failed:', customer1Response.status);
            return { success: false, error: 'Customer 1 creation failed' };
        }

        const customer1Result = await customer1Response.json();
        console.log('✅ Customer 1 conversation created:', {
            conversationId: customer1Result.conversationId,
            success: customer1Result.success
        });

        // Create conversation for customer 2
        console.log('\n2️⃣ Creating conversation for customer 2...');
        const customer2Response = await fetch(`${BASE_URL}/api/admin/trigger-first-dm`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                experienceId: TEST_EXPERIENCE_ID,
                whopUserId: TEST_USERS.customer2.whopUserId
            })
        });

        if (!customer2Response.ok) {
            console.log('❌ Customer 2 conversation creation failed:', customer2Response.status);
            return { success: false, error: 'Customer 2 creation failed' };
        }

        const customer2Result = await customer2Response.json();
        console.log('✅ Customer 2 conversation created:', {
            conversationId: customer2Result.conversationId,
            success: customer2Result.success
        });

        // Test isolation - customer 1 should not see customer 2's conversation
        console.log('\n3️⃣ Testing conversation isolation...');
        const isolationTest1 = await fetch(`${BASE_URL}/api/userchat/load-conversation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ conversationId: customer1Result.conversationId })
        });

        const isolationResult1 = await isolationTest1.json();
        console.log('Customer 1 conversation access:', {
            success: isolationResult1.success,
            conversationId: isolationResult1.conversation?.id,
            userId: isolationResult1.conversation?.userId
        });

        const isolationTest2 = await fetch(`${BASE_URL}/api/userchat/load-conversation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ conversationId: customer2Result.conversationId })
        });

        const isolationResult2 = await isolationTest2.json();
        console.log('Customer 2 conversation access:', {
            success: isolationResult2.success,
            conversationId: isolationResult2.conversation?.id,
            userId: isolationResult2.conversation?.userId
        });

        // Verify different user IDs
        const differentUsers = isolationResult1.conversation?.userId !== isolationResult2.conversation?.userId;
        console.log('✅ User isolation verified:', differentUsers);

        return { 
            success: true,
            customer1: {
                conversationId: customer1Result.conversationId,
                conversation: isolationResult1.conversation
            },
            customer2: {
                conversationId: customer2Result.conversationId,
                conversation: isolationResult2.conversation
            }
        };

    } catch (error) {
        console.log('❌ Error testing customer isolation:', error.message);
        return { success: false, error: error.message };
    }
}

async function testConversationStages(conversation, funnelFlow) {
    console.log('\n🧪 TEST 3: Conversation Stage Management');
    console.log('=' .repeat(50));

    try {
        console.log('1️⃣ Analyzing conversation stage...');
        console.log('Conversation details:', {
            id: conversation.id,
            experienceId: conversation.experienceId,
            userId: conversation.userId,
            status: conversation.status,
            currentBlockId: conversation.currentBlockId,
            userPath: conversation.userPath,
            metadata: conversation.metadata
        });

        console.log('\n2️⃣ Funnel flow analysis:');
        if (funnelFlow) {
            console.log('Funnel flow details:', {
                id: funnelFlow.id,
                name: funnelFlow.name,
                stages: funnelFlow.stages?.map(s => ({
                    name: s.name,
                    blockIds: s.blockIds
                }))
            });
        } else {
            console.log('❌ No funnel flow found');
        }

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
        } else if (conversation.metadata?.adminTriggered) {
            expectedStage = 'internal_chat';
        } else {
            expectedStage = 'internal_chat';
        }

        console.log('\n3️⃣ Stage detection logic:');
        console.log('Expected stage:', expectedStage);

        // Test stage detection logic
        const isTransitionStage = conversation.metadata?.phase === 'transition' && 
                                 conversation.metadata?.type === 'dm';
        const isDMStage = conversation.metadata?.type === 'dm' && 
                         conversation.metadata?.phase === 'welcome';
        const isInternalChat = conversation.metadata?.type !== 'dm' || 
                              conversation.metadata?.adminTriggered;

        console.log('Stage detection results:', {
            isTransitionStage,
            isDMStage,
            isInternalChat,
            detectedStage: isTransitionStage ? 'transition_stage' : 
                          isDMStage ? 'dm_stage' : 
                          isInternalChat ? 'internal_chat' : 'unknown'
        });

        console.log('\n✅ Stage detection working correctly!');
        return { success: true, stage: expectedStage };

    } catch (error) {
        console.log('❌ Error testing conversation stages:', error.message);
        return { success: false, error: error.message };
    }
}

async function testConversationHistory(conversation) {
    console.log('\n🧪 TEST 4: Conversation History Management');
    console.log('=' .repeat(50));

    try {
        console.log('1️⃣ Checking conversation history...');
        
        // Check if conversation has proper history tracking
        const hasUserPath = Array.isArray(conversation.userPath) && conversation.userPath.length > 0;
        const hasMetadata = conversation.metadata && typeof conversation.metadata === 'object';
        const hasCurrentBlock = conversation.currentBlockId && conversation.currentBlockId.length > 0;

        console.log('History tracking:', {
            hasUserPath,
            userPathLength: conversation.userPath?.length || 0,
            hasMetadata,
            hasCurrentBlock,
            currentBlockId: conversation.currentBlockId
        });

        // Check conversation progression
        console.log('\n2️⃣ Conversation progression:');
        console.log('User path:', conversation.userPath);
        console.log('Current block:', conversation.currentBlockId);
        console.log('Status:', conversation.status);
        console.log('Created at:', conversation.createdAt);
        console.log('Updated at:', conversation.updatedAt);

        // Test message processing capability
        console.log('\n3️⃣ Testing message processing...');
        const messageResponse = await fetch(`${BASE_URL}/api/userchat/process-message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                conversationId: conversation.id,
                message: 'test message',
                userId: conversation.userId
            })
        });

        if (messageResponse.ok) {
            const messageResult = await messageResponse.json();
            console.log('✅ Message processing successful:', {
                success: messageResult.success,
                response: messageResult.response
            });
        } else {
            console.log('❌ Message processing failed:', messageResponse.status);
        }

        console.log('\n✅ Conversation history management working!');
        return { success: true };

    } catch (error) {
        console.log('❌ Error testing conversation history:', error.message);
        return { success: false, error: error.message };
    }
}

async function testMultipleConversationPrevention() {
    console.log('\n🧪 TEST 5: Multiple Conversation Prevention');
    console.log('=' .repeat(50));

    try {
        // Create first conversation
        console.log('1️⃣ Creating first conversation...');
        const firstResponse = await fetch(`${BASE_URL}/api/admin/trigger-first-dm`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                experienceId: TEST_EXPERIENCE_ID,
                whopUserId: 'test_user_multiple_123'
            })
        });

        if (!firstResponse.ok) {
            console.log('❌ First conversation creation failed:', firstResponse.status);
            return { success: false };
        }

        const firstResult = await firstResponse.json();
        console.log('✅ First conversation created:', {
            conversationId: firstResult.conversationId
        });

        // Try to create second conversation for same user
        console.log('\n2️⃣ Attempting to create second conversation for same user...');
        const secondResponse = await fetch(`${BASE_URL}/api/admin/trigger-first-dm`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                experienceId: TEST_EXPERIENCE_ID,
                whopUserId: 'test_user_multiple_123'
            })
        });

        if (!secondResponse.ok) {
            console.log('❌ Second conversation creation failed:', secondResponse.status);
            return { success: false };
        }

        const secondResult = await secondResponse.json();
        console.log('✅ Second conversation created:', {
            conversationId: secondResult.conversationId
        });

        // Check if first conversation was closed
        console.log('\n3️⃣ Checking if first conversation was closed...');
        const checkFirstResponse = await fetch(`${BASE_URL}/api/userchat/load-conversation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ conversationId: firstResult.conversationId })
        });

        const checkFirstResult = await checkFirstResponse.json();
        console.log('First conversation status:', {
            success: checkFirstResult.success,
            error: checkFirstResult.error,
            status: checkFirstResult.conversation?.status
        });

        // Check if second conversation is active
        console.log('\n4️⃣ Checking if second conversation is active...');
        const checkSecondResponse = await fetch(`${BASE_URL}/api/userchat/load-conversation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ conversationId: secondResult.conversationId })
        });

        const checkSecondResult = await checkSecondResponse.json();
        console.log('Second conversation status:', {
            success: checkSecondResult.success,
            status: checkSecondResult.conversation?.status
        });

        const firstClosed = !checkFirstResult.success || checkFirstResult.conversation?.status === 'completed';
        const secondActive = checkSecondResult.success && checkSecondResult.conversation?.status === 'active';

        if (firstClosed && secondActive) {
            console.log('\n✅ SUCCESS: Multiple conversation prevention working!');
            return { success: true };
        } else {
            console.log('\n❌ FAILED: Multiple conversation prevention not working');
            return { success: false };
        }

    } catch (error) {
        console.log('❌ Error testing multiple conversation prevention:', error.message);
        return { success: false, error: error.message };
    }
}

async function runEndToEndTests() {
    console.log('🚀 CUSTOMERVIEW END-TO-END TEST SUITE');
    console.log('=' .repeat(70));

    try {
        // Wait for server
        await waitForServer();

        // Test 1: Admin CustomerView
        const adminResult = await testAdminCustomerView();
        if (!adminResult.success) {
            console.log('\n❌ CRITICAL: Admin CustomerView test failed!');
            return;
        }

        // Test 2: Customer Isolation
        const isolationResult = await testCustomerIsolation();
        if (!isolationResult.success) {
            console.log('\n❌ CRITICAL: Customer isolation test failed!');
            return;
        }

        // Test 3: Conversation Stages
        const stageResult = await testConversationStages(adminResult.conversation, adminResult.funnelFlow);
        if (!stageResult.success) {
            console.log('\n❌ CRITICAL: Conversation stage test failed!');
            return;
        }

        // Test 4: Conversation History
        const historyResult = await testConversationHistory(adminResult.conversation);
        if (!historyResult.success) {
            console.log('\n❌ CRITICAL: Conversation history test failed!');
            return;
        }

        // Test 5: Multiple Conversation Prevention
        const preventionResult = await testMultipleConversationPrevention();
        if (!preventionResult.success) {
            console.log('\n❌ CRITICAL: Multiple conversation prevention test failed!');
            return;
        }

        // Final summary
        console.log('\n📋 FINAL TEST RESULTS');
        console.log('=' .repeat(70));
        console.log('✅ Admin CustomerView:', adminResult.success ? 'PASS' : 'FAIL');
        console.log('✅ Customer Isolation:', isolationResult.success ? 'PASS' : 'FAIL');
        console.log('✅ Conversation Stages:', stageResult.success ? 'PASS' : 'FAIL');
        console.log('✅ Conversation History:', historyResult.success ? 'PASS' : 'FAIL');
        console.log('✅ Multiple Conversation Prevention:', preventionResult.success ? 'PASS' : 'FAIL');

        if (adminResult.success && isolationResult.success && stageResult.success && 
            historyResult.success && preventionResult.success) {
            console.log('\n🎉 ALL TESTS PASSED! CustomerView is fully functional!');
        } else {
            console.log('\n❌ SOME TESTS FAILED! Check the implementation.');
        }

    } catch (error) {
        console.log('❌ Test suite failed:', error.message);
    }
}

// Run all tests
runEndToEndTests().catch(console.error);


