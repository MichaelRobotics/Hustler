#!/usr/bin/env node

/**
 * Test script to create a conversation in TRANSITION stage and test the issue
 */

const BASE_URL = 'http://localhost:3000';

async function testCreateTransitionConversation() {
    console.log('🧪 TESTING: Create Transition Conversation\n');
    
    try {
        // Step 1: Create a DM conversation first
        console.log('1️⃣ Creating DM conversation...');
        
        const dmResponse = await fetch(`${BASE_URL}/api/admin/trigger-first-dm`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'x-whop-user-id': 'user_2xQ8K9vJ4wX7mN3p'
            },
            body: JSON.stringify({
                experienceId: 'exp_2xQ8K9vJ4wX7mN3p'
            })
        });
        
        if (!dmResponse.ok) {
            throw new Error(`DM creation failed: ${dmResponse.status}`);
        }
        
        const dmResult = await dmResponse.json();
        console.log('DM creation result:', {
            success: dmResult.success,
            conversationId: dmResult.conversationId
        });
        
        if (!dmResult.success) {
            throw new Error('Failed to create DM conversation');
        }
        
        const dmConversationId = dmResult.conversationId;
        
        // Step 2: Simulate reaching TRANSITION stage
        console.log('\n2️⃣ Simulating TRANSITION stage...');
        
        // First, let's check what the current conversation looks like
        const checkResponse = await fetch(`${BASE_URL}/api/userchat/find-user-conversation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                whopUserId: 'user_2xQ8K9vJ4wX7mN3p',
                experienceId: 'exp_2xQ8K9vJ4wX7mN3p'
            })
        });
        
        const checkResult = await checkResponse.json();
        console.log('Current conversation:', {
            success: checkResult.success,
            hasConversation: !!checkResult.conversation,
            type: checkResult.conversation?.metadata?.type,
            currentBlockId: checkResult.conversation?.currentBlockId,
            status: checkResult.conversation?.status
        });
        
        if (!checkResult.conversation) {
            throw new Error('No conversation found after DM creation');
        }
        
        const conversation = checkResult.conversation;
        const funnelFlow = checkResult.funnelFlow;
        
        // Step 3: Find TRANSITION block and simulate reaching it
        console.log('\n3️⃣ Finding TRANSITION block...');
        const transitionStage = funnelFlow?.stages.find(stage => stage.name === "TRANSITION");
        
        if (!transitionStage || transitionStage.blockIds.length === 0) {
            throw new Error('No TRANSITION stage found in funnel');
        }
        
        const transitionBlockId = transitionStage.blockIds[0];
        console.log('TRANSITION block found:', {
            stageName: transitionStage.name,
            blockId: transitionBlockId
        });
        
        // Step 4: Update conversation to TRANSITION stage
        console.log('\n4️⃣ Updating conversation to TRANSITION stage...');
        
        const updateResponse = await fetch(`${BASE_URL}/api/conversations/${dmConversationId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                currentBlockId: transitionBlockId,
                status: 'active',
                metadata: {
                    ...conversation.metadata,
                    type: 'dm',
                    phase: 'transition'
                }
            })
        });
        
        if (!updateResponse.ok) {
            throw new Error(`Update failed: ${updateResponse.status}`);
        }
        
        console.log('✅ Conversation updated to TRANSITION stage');
        
        // Step 5: Test CustomerView stage detection
        console.log('\n5️⃣ Testing CustomerView stage detection...');
        
        const customerViewResponse = await fetch(`${BASE_URL}/api/userchat/find-user-conversation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                whopUserId: 'user_2xQ8K9vJ4wX7mN3p',
                experienceId: 'exp_2xQ8K9vJ4wX7mN3p'
            })
        });
        
        const customerViewResult = await customerViewResponse.json();
        const updatedConversation = customerViewResult.conversation;
        
        console.log('Updated conversation:', {
            type: updatedConversation?.metadata?.type,
            currentBlockId: updatedConversation?.currentBlockId,
            status: updatedConversation?.status
        });
        
        // Check if it should be detected as internal_chat
        const isTransitionStage = updatedConversation?.currentBlockId && 
            funnelFlow?.stages.some(stage => 
                stage.name === "TRANSITION" && 
                stage.blockIds.includes(updatedConversation.currentBlockId)
            );
        
        console.log('Stage detection:', {
            isTransitionStage,
            shouldBeInternalChat: isTransitionStage || updatedConversation?.metadata?.type === "internal"
        });
        
        // Step 6: Test transition to internal chat
        console.log('\n6️⃣ Testing transition to internal chat...');
        
        // Simulate the transition by calling the complete transition function
        const transitionResponse = await fetch(`${BASE_URL}/api/internal-chat`, {
            method: 'PATCH',
            headers: { 
                'Content-Type': 'application/json',
                'x-whop-user-id': 'user_2xQ8K9vJ4wX7mN3p'
            },
            body: JSON.stringify({
                action: 'transition',
                dmConversationId: dmConversationId,
                funnelId: conversation.funnelId,
                transitionMessage: 'Ready for your Personal Strategy Session! Click below: [LINK_TO_PRIVATE_CHAT]'
            })
        });
        
        if (!transitionResponse.ok) {
            const errorText = await transitionResponse.text();
            console.log('❌ Transition failed:', transitionResponse.status, errorText);
        } else {
            const transitionResult = await transitionResponse.json();
            console.log('✅ Transition successful:', {
                success: transitionResult.success,
                internalConversationId: transitionResult.data?.internalConversationId
            });
            
            const internalConversationId = transitionResult.data?.internalConversationId;
            
            if (internalConversationId) {
                // Step 7: Test loading the internal conversation
                console.log('\n7️⃣ Testing internal conversation loading...');
                
                const internalResponse = await fetch(`${BASE_URL}/api/userchat/load-conversation`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        conversationId: internalConversationId
                    })
                });
                
                if (internalResponse.ok) {
                    const internalResult = await internalResponse.json();
                    console.log('Internal conversation loaded:', {
                        success: internalResult.success,
                        hasConversation: !!internalResult.conversation,
                        type: internalResult.conversation?.metadata?.type,
                        currentBlockId: internalResult.conversation?.currentBlockId,
                        messageCount: internalResult.conversation?.messages?.length || 0
                    });
                    
                    // Check for EXPERIENCE_QUALIFICATION message
                    const expQualMessage = internalResult.conversation?.messages?.find(msg => 
                        msg.metadata?.blockId && 
                        internalResult.funnelFlow?.stages.some(stage => 
                            stage.name === "EXPERIENCE_QUALIFICATION" && 
                            stage.blockIds.includes(msg.metadata.blockId)
                        )
                    );
                    
                    if (expQualMessage) {
                        console.log('✅ EXPERIENCE_QUALIFICATION message found:', expQualMessage.content);
                    } else {
                        console.log('❌ No EXPERIENCE_QUALIFICATION message found');
                    }
                } else {
                    console.log('❌ Failed to load internal conversation:', internalResponse.status);
                }
            }
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Run the test
testCreateTransitionConversation().catch(console.error);

