#!/usr/bin/env node

/**
 * Test script to debug the transition issue
 * - Check if EXPERIENCE_QUALIFICATION message is created
 * - Check if conversation stage is properly set
 * - Check if UserChat displays the message correctly
 */

const BASE_URL = 'http://localhost:3000';

async function testTransitionIssue() {
    console.log('🧪 TESTING: Transition Issue Debug\n');
    
    try {
        // Test 1: Check if we can find a conversation in TRANSITION stage
        console.log('1️⃣ Looking for conversations in TRANSITION stage...');
        
        const findResponse = await fetch(`${BASE_URL}/api/userchat/find-user-conversation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                whopUserId: 'user_2xQ8K9vJ4wX7mN3p',
                experienceId: 'exp_2xQ8K9vJ4wX7mN3p'
            })
        });
        
        if (!findResponse.ok) {
            throw new Error(`Find conversation failed: ${findResponse.status}`);
        }
        
        const findResult = await findResponse.json();
        console.log('Find result:', {
            success: findResult.success,
            hasConversation: !!findResult.conversation,
            conversationType: findResult.conversation?.metadata?.type,
            currentBlockId: findResult.conversation?.currentBlockId,
            status: findResult.conversation?.status
        });
        
        if (!findResult.conversation) {
            console.log('❌ No conversation found. Creating a test conversation...');
            return;
        }
        
        const conversation = findResult.conversation;
        const funnelFlow = findResult.funnelFlow;
        
        // Test 2: Check if conversation is in TRANSITION stage
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
        
        // Test 3: Check messages in conversation
        console.log('\n3️⃣ Checking conversation messages...');
        if (conversation.messages && conversation.messages.length > 0) {
            console.log(`Found ${conversation.messages.length} messages:`);
            conversation.messages.forEach((msg, index) => {
                console.log(`  ${index + 1}. [${msg.type}] ${msg.content.substring(0, 100)}...`);
                if (msg.metadata?.blockId) {
                    console.log(`      Block ID: ${msg.metadata.blockId}`);
                }
            });
        } else {
            console.log('❌ No messages found in conversation');
        }
        
        // Test 4: Check if conversation should be internal_chat
        console.log('\n4️⃣ Checking if conversation should be internal_chat...');
        if (isTransitionStage || conversation.metadata?.type === "internal") {
            console.log('✅ Conversation should be internal_chat stage');
            
            // Test 5: Check if EXPERIENCE_QUALIFICATION message exists
            console.log('\n5️⃣ Checking for EXPERIENCE_QUALIFICATION message...');
            const expQualMessage = conversation.messages?.find(msg => 
                msg.metadata?.blockId && 
                funnelFlow?.stages.some(stage => 
                    stage.name === "EXPERIENCE_QUALIFICATION" && 
                    stage.blockIds.includes(msg.metadata.blockId)
                )
            );
            
            if (expQualMessage) {
                console.log('✅ Found EXPERIENCE_QUALIFICATION message:', expQualMessage.content);
            } else {
                console.log('❌ No EXPERIENCE_QUALIFICATION message found');
                
                // Check if we need to initialize Funnel 2
                console.log('\n6️⃣ Checking if Funnel 2 needs initialization...');
                const experienceQualStage = funnelFlow?.stages.find(
                    stage => stage.name === "EXPERIENCE_QUALIFICATION"
                );
                
                if (experienceQualStage && experienceQualStage.blockIds.length > 0) {
                    const firstBlockId = experienceQualStage.blockIds[0];
                    const firstBlock = funnelFlow?.blocks[firstBlockId];
                    
                    console.log('EXPERIENCE_QUALIFICATION stage found:', {
                        stageName: experienceQualStage.name,
                        firstBlockId,
                        firstBlockMessage: firstBlock?.message,
                        hasOptions: !!firstBlock?.options
                    });
                    
                    if (firstBlock) {
                        console.log('Expected message:', firstBlock.message);
                        if (firstBlock.options) {
                            console.log('Expected options:', firstBlock.options.map(opt => opt.text));
                        }
                    }
                }
            }
        } else {
            console.log('❌ Conversation should not be internal_chat stage');
        }
        
        // Test 6: Test UserChat page loading
        console.log('\n6️⃣ Testing UserChat page loading...');
        const userChatUrl = `${BASE_URL}/experiences/${conversation.experienceId}/chat/${conversation.id}`;
        console.log('UserChat URL:', userChatUrl);
        
        const loadResponse = await fetch(`${BASE_URL}/api/userchat/load-conversation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                conversationId: conversation.id
            })
        });
        
        if (loadResponse.ok) {
            const loadResult = await loadResponse.json();
            console.log('UserChat load result:', {
                success: loadResult.success,
                hasConversation: !!loadResult.conversation,
                hasFunnelFlow: !!loadResult.funnelFlow,
                messageCount: loadResult.conversation?.messages?.length || 0
            });
        } else {
            console.log('❌ UserChat load failed:', loadResponse.status);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Run the test
testTransitionIssue().catch(console.error);

