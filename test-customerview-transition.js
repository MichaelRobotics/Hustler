#!/usr/bin/env node

/**
 * Test script to verify CustomerView transition behavior
 * - Create a DM conversation
 * - Set it to TRANSITION stage
 * - Test CustomerView behavior
 */

const BASE_URL = 'http://localhost:3000';

async function testCustomerViewTransition() {
    console.log('🧪 TESTING: CustomerView Transition Behavior\n');
    
    try {
        // Step 1: Create a test conversation in TRANSITION stage
        console.log('1️⃣ Creating test conversation in TRANSITION stage...');
        
        // First, let's check if there are any existing conversations
        const findResponse = await fetch(`${BASE_URL}/api/userchat/find-user-conversation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                whopUserId: 'user_test_transition',
                experienceId: 'exp_test_transition'
            })
        });
        
        const findResult = await findResponse.json();
        console.log('Existing conversation check:', {
            success: findResult.success,
            hasConversation: !!findResult.conversation
        });
        
        if (findResult.conversation) {
            console.log('Using existing conversation:', findResult.conversation.id);
            var conversation = findResult.conversation;
            var funnelFlow = findResult.funnelFlow;
        } else {
            console.log('No existing conversation found. This test requires a conversation in TRANSITION stage.');
            console.log('Please create a conversation and set it to TRANSITION stage first.');
            return;
        }
        
        // Step 2: Check if conversation is in TRANSITION stage
        console.log('\n2️⃣ Checking conversation stage...');
        const isTransitionStage = conversation.currentBlockId && 
            funnelFlow?.stages.some(stage => 
                stage.name === "TRANSITION" && 
                stage.blockIds.includes(conversation.currentBlockId)
            );
        
        console.log('Stage analysis:', {
            currentBlockId: conversation.currentBlockId,
            isTransitionStage,
            conversationType: conversation.metadata?.type,
            status: conversation.status
        });
        
        if (!isTransitionStage) {
            console.log('❌ Conversation is not in TRANSITION stage. Please set it to TRANSITION stage first.');
            return;
        }
        
        // Step 3: Test CustomerView behavior
        console.log('\n3️⃣ Testing CustomerView behavior...');
        
        // Simulate what CustomerView would do
        const transitionResponse = await fetch(`${BASE_URL}/api/userchat/complete-transition`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                dmConversationId: conversation.id,
                funnelId: conversation.funnelId,
                whopUserId: 'user_test_transition',
                transitionMessage: 'Ready for your Personal Strategy Session! Click below: [LINK_TO_PRIVATE_CHAT]'
            })
        });
        
        if (!transitionResponse.ok) {
            const errorText = await transitionResponse.text();
            console.log('❌ Transition failed:', transitionResponse.status, errorText);
            return;
        }
        
        const transitionResult = await transitionResponse.json();
        console.log('✅ Transition successful:', {
            success: transitionResult.success,
            internalConversationId: transitionResult.internalConversationId,
            experienceId: transitionResult.experienceId
        });
        
        const internalConversationId = transitionResult.internalConversationId;
        
        // Step 4: Test loading internal conversation
        console.log('\n4️⃣ Testing internal conversation loading...');
        
        const internalResponse = await fetch(`${BASE_URL}/api/userchat/load-conversation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                conversationId: internalConversationId
            })
        });
        
        if (!internalResponse.ok) {
            console.log('❌ Failed to load internal conversation:', internalResponse.status);
            return;
        }
        
        const internalResult = await internalResponse.json();
        console.log('Internal conversation loaded:', {
            success: internalResult.success,
            hasConversation: !!internalResult.conversation,
            type: internalResult.conversation?.metadata?.type,
            currentBlockId: internalResult.conversation?.currentBlockId,
            messageCount: internalResult.conversation?.messages?.length || 0
        });
        
        // Step 5: Check for EXPERIENCE_QUALIFICATION message
        console.log('\n5️⃣ Checking for EXPERIENCE_QUALIFICATION message...');
        
        const expQualMessage = internalResult.conversation?.messages?.find(msg => 
            msg.metadata?.blockId && 
            internalResult.funnelFlow?.stages.some(stage => 
                stage.name === "EXPERIENCE_QUALIFICATION" && 
                stage.blockIds.includes(msg.metadata.blockId)
            )
        );
        
        if (expQualMessage) {
            console.log('✅ EXPERIENCE_QUALIFICATION message found:');
            console.log('Content:', expQualMessage.content);
            console.log('Block ID:', expQualMessage.metadata.blockId);
            console.log('Type:', expQualMessage.type);
        } else {
            console.log('❌ No EXPERIENCE_QUALIFICATION message found');
            
            // Check what messages exist
            if (internalResult.conversation?.messages) {
                console.log('Available messages:');
                internalResult.conversation.messages.forEach((msg, index) => {
                    console.log(`  ${index + 1}. [${msg.type}] ${msg.content.substring(0, 100)}...`);
                    if (msg.metadata?.blockId) {
                        console.log(`      Block ID: ${msg.metadata.blockId}`);
                    }
                });
            }
        }
        
        // Step 6: Check current block and options
        console.log('\n6️⃣ Checking current block and options...');
        
        const currentBlockId = internalResult.conversation?.currentBlockId;
        const currentBlock = currentBlockId ? internalResult.funnelFlow?.blocks[currentBlockId] : null;
        
        if (currentBlock) {
            console.log('Current block:', {
                id: currentBlock.id,
                message: currentBlock.message,
                hasOptions: !!currentBlock.options,
                optionCount: currentBlock.options?.length || 0
            });
            
            if (currentBlock.options) {
                console.log('Options:');
                currentBlock.options.forEach((opt, index) => {
                    console.log(`  ${index + 1}. ${opt.text} -> ${opt.nextBlockId}`);
                });
            }
        } else {
            console.log('❌ No current block found');
        }
        
        console.log('\n✅ Test completed successfully!');
        console.log('CustomerView should now show the EXPERIENCE_QUALIFICATION stage with the bot message and options.');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Run the test
testCustomerViewTransition().catch(console.error);

