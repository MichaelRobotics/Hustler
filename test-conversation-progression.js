#!/usr/bin/env node

/**
 * Test Conversation Progression and History
 */

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function testConversationProgression() {
    console.log('🧪 TESTING: Conversation Progression and History\n');

    // Step 1: Create a conversation
    console.log('1️⃣ Creating conversation...');
    let conversationId = null;
    try {
        const triggerResponse = await fetch(`${BASE_URL}/api/admin/trigger-first-dm`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ experienceId: 'exp_wl5EtbHqAqLdjV' })
        });

        const triggerResult = await triggerResponse.json();
        if (triggerResult.success) {
            conversationId = triggerResult.conversationId;
            console.log('✅ Conversation created:', conversationId);
        } else {
            console.log('❌ Failed to create conversation');
            return;
        }
    } catch (error) {
        console.log('❌ Error creating conversation:', error.message);
        return;
    }

    // Step 2: Check initial state
    console.log('\n2️⃣ Checking initial conversation state...');
    let conversation = await loadConversation(conversationId);
    if (!conversation) return;

    console.log('📊 Initial State:', {
        type: conversation.metadata?.type,
        currentBlockId: conversation.currentBlockId,
        messageCount: conversation.messages?.length || 0,
        interactionCount: conversation.interactions?.length || 0
    });

    // Step 3: Send messages and track progression
    console.log('\n3️⃣ Testing message progression...');
    const messages = ["1", "2", "1", "2"];
    
    for (let i = 0; i < messages.length; i++) {
        const message = messages[i];
        console.log(`\n📤 Sending message ${i + 1}: "${message}"`);
        
        try {
            const processResponse = await fetch(`${BASE_URL}/api/userchat/process-message`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    conversationId,
                    messageContent: message,
                    messageType: "user"
                })
            });

            if (processResponse.ok) {
                const processResult = await processResponse.json();
                console.log('✅ Message processed:', {
                    success: processResult.success,
                    funnelResponseSuccess: processResult.funnelResponse?.success,
                    nextBlockId: processResult.funnelResponse?.nextBlockId,
                    botMessage: processResult.funnelResponse?.botMessage
                });

                // Wait a moment for database updates
                await new Promise(resolve => setTimeout(resolve, 1000));

                // Reload conversation to see changes
                conversation = await loadConversation(conversationId);
                if (conversation) {
                    console.log('📊 Updated State:', {
                        currentBlockId: conversation.currentBlockId,
                        messageCount: conversation.messages?.length || 0,
                        interactionCount: conversation.interactions?.length || 0,
                        userPath: conversation.userPath
                    });
                }
            } else {
                const errorText = await processResponse.text();
                console.log('❌ Message processing failed:', processResponse.status, errorText);
            }
        } catch (error) {
            console.log('❌ Error processing message:', error.message);
        }
    }

    // Step 4: Check final state and history
    console.log('\n4️⃣ Checking final conversation state...');
    conversation = await loadConversation(conversationId);
    if (conversation) {
        console.log('📊 Final State:', {
            type: conversation.metadata?.type,
            currentBlockId: conversation.currentBlockId,
            messageCount: conversation.messages?.length || 0,
            interactionCount: conversation.interactions?.length || 0,
            userPath: conversation.userPath
        });

        console.log('\n📝 Final Message History:');
        if (conversation.messages && conversation.messages.length > 0) {
            conversation.messages.forEach((msg, index) => {
                console.log(`  ${index + 1}. [${msg.type}] ${msg.content} (${new Date(msg.createdAt).toISOString()})`);
            });
        } else {
            console.log('  No messages found');
        }

        console.log('\n🔄 Final Funnel Interactions:');
        if (conversation.interactions && conversation.interactions.length > 0) {
            conversation.interactions.forEach((interaction, index) => {
                console.log(`  ${index + 1}. Block: ${interaction.blockId}, Response: ${interaction.response} (${new Date(interaction.createdAt).toISOString()})`);
            });
        } else {
            console.log('  No interactions found');
        }
    }

    console.log('\n✅ Conversation progression test completed');
}

async function loadConversation(conversationId) {
    try {
        const response = await fetch(`${BASE_URL}/api/userchat/load-conversation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ conversationId })
        });

        if (response.ok) {
            const result = await response.json();
            return result.conversation;
        } else {
            console.log('❌ Failed to load conversation:', response.status);
            return null;
        }
    } catch (error) {
        console.log('❌ Error loading conversation:', error.message);
        return null;
    }
}

// Run the test
testConversationProgression().catch(console.error);


