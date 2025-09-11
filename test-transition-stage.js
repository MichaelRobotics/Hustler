#!/usr/bin/env node

/**
 * Test Transition Stage Detection
 */

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function testTransitionStage() {
    console.log('🧪 TESTING: Transition Stage Detection\n');

    // Test 1: Create conversation and progress to transition stage
    console.log('1️⃣ Creating conversation and progressing to transition...');
    let conversationId = null;
    try {
        // Create conversation
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

        // Progress to transition stage (send "1" twice to get to transition)
        console.log('📤 Progressing to transition stage...');
        const messages = ["1", "1"];
        for (let i = 0; i < messages.length; i++) {
            const message = messages[i];
            console.log(`  Step ${i + 1}: Sending "${message}"`);
            
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
                console.log(`    ✅ Processed: ${processResult.funnelResponse?.nextBlockId || 'no next block'}`);
            }
            
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

    } catch (error) {
        console.log('❌ Error setting up conversation:', error.message);
        return;
    }

    // Test 2: Check final state and stage detection
    console.log('\n2️⃣ Checking final state and stage detection...');
    try {
        const loadResponse = await fetch(`${BASE_URL}/api/userchat/load-conversation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ conversationId })
        });

        if (loadResponse.ok) {
            const loadResult = await loadResponse.json();
            const conversation = loadResult.conversation;
            const funnelFlow = loadResult.funnelFlow;

            console.log('📊 Final Conversation State:', {
                id: conversation.id,
                type: conversation.metadata?.type,
                currentBlockId: conversation.currentBlockId,
                userPath: conversation.userPath,
                messageCount: conversation.messages?.length || 0
            });

            // Test stage detection
            let detectedStage = 'unknown';
            
            if (conversation.metadata?.type === "dm") {
                const isTransitionStage = conversation.currentBlockId && 
                    funnelFlow.stages.some(stage => 
                        stage.name === "TRANSITION" && 
                        stage.blockIds && 
                        stage.blockIds.includes(conversation.currentBlockId)
                    );
                
                if (isTransitionStage) {
                    detectedStage = "transition_stage";
                } else {
                    detectedStage = "dm_stage";
                }
            }

            console.log('🎭 Stage Detection Result:', {
                currentBlockId: conversation.currentBlockId,
                detectedStage,
                isTransitionBlock: conversation.currentBlockId && 
                    funnelFlow.stages.some(stage => 
                        stage.name === "TRANSITION" && 
                        stage.blockIds && 
                        stage.blockIds.includes(conversation.currentBlockId)
                    )
            });

            // Test 3: Check what CustomerView would show
            console.log('\n3️⃣ CustomerView UI Test:');
            switch (detectedStage) {
                case "dm_stage":
                    console.log('🖥️  CustomerView would show: "DM Stage Active"');
                    console.log('    - Instructions to check Whop DMs');
                    console.log('    - Reset state button for admin');
                    break;
                case "transition_stage":
                    console.log('🖥️  CustomerView would show: "Transition Stage Reached"');
                    console.log('    - Message about "experience_qual_1"');
                    console.log('    - Reset state button for admin');
                    break;
                case "internal_chat":
                    console.log('🖥️  CustomerView would show: Full UserChat interface');
                    console.log('    - Complete conversation history');
                    console.log('    - Real-time WebSocket communication');
                    break;
                default:
                    console.log('🖥️  CustomerView would show: Error state');
            }

            // Test 4: Check message history
            console.log('\n4️⃣ Message History Check:');
            if (conversation.messages && conversation.messages.length > 0) {
                console.log(`📝 Found ${conversation.messages.length} messages:`);
                conversation.messages.forEach((msg, index) => {
                    const timestamp = new Date(msg.createdAt).toISOString();
                    console.log(`  ${index + 1}. [${msg.type}] ${msg.content.substring(0, 100)}... (${timestamp})`);
                });
            } else {
                console.log('❌ No message history found');
            }

        } else {
            console.log('❌ Failed to load conversation for stage detection');
        }
    } catch (error) {
        console.log('❌ Error checking final state:', error.message);
    }

    console.log('\n✅ Transition stage test completed');
}

// Run the test
testTransitionStage().catch(console.error);


