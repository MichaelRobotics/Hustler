#!/usr/bin/env node

/**
 * Test Stage Detection for Different Conversation States
 */

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function testStageDetection() {
    console.log('🧪 TESTING: Stage Detection Logic\n');

    // Test 1: Create a conversation and progress it to transition stage
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

        // Progress to transition stage
        const messages = ["1", "1"]; // This should get us to transition stage
        for (const message of messages) {
            console.log(`📤 Sending: "${message}"`);
            await fetch(`${BASE_URL}/api/userchat/process-message`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    conversationId,
                    messageContent: message,
                    messageType: "user"
                })
            });
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

    } catch (error) {
        console.log('❌ Error setting up conversation:', error.message);
        return;
    }

    // Test 2: Test stage detection logic
    console.log('\n2️⃣ Testing stage detection logic...');
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

            console.log('📊 Conversation Data:', {
                id: conversation.id,
                type: conversation.metadata?.type,
                currentBlockId: conversation.currentBlockId,
                userPath: conversation.userPath,
                messageCount: conversation.messages?.length || 0
            });

            console.log('🎯 Funnel Flow Data:', {
                startBlockId: funnelFlow.startBlockId,
                stages: funnelFlow.stages.map(s => ({ name: s.name, blockIds: s.blocks.length })),
                totalBlocks: Object.keys(funnelFlow.blocks).length
            });

            // Test stage detection logic
            console.log('\n3️⃣ Testing stage detection logic...');
            let detectedStage = 'unknown';
            
            if (conversation.metadata?.type === "dm") {
                const isTransitionStage = conversation.currentBlockId && 
                    funnelFlow.stages.some(stage => 
                        stage.name === "TRANSITION" && 
                        stage.blockIds.includes(conversation.currentBlockId)
                    );
                
                if (isTransitionStage) {
                    detectedStage = "transition_stage";
                } else {
                    detectedStage = "dm_stage";
                }
            } else if (conversation.metadata?.type === "internal") {
                detectedStage = "internal_chat";
            } else if (conversation.metadata?.adminTriggered) {
                detectedStage = "internal_chat";
            }

            console.log('🎭 Stage Detection Result:', {
                conversationType: conversation.metadata?.type,
                currentBlockId: conversation.currentBlockId,
                detectedStage,
                isTransitionBlock: conversation.currentBlockId && 
                    funnelFlow.stages.some(stage => 
                        stage.name === "TRANSITION" && 
                        stage.blockIds.includes(conversation.currentBlockId)
                    ),
                transitionStages: funnelFlow.stages.filter(s => s.name === "TRANSITION")
            });

            // Test 4: Check what CustomerView would show
            console.log('\n4️⃣ Testing CustomerView UI logic...');
            switch (detectedStage) {
                case "no_conversation":
                    console.log('🖥️  CustomerView would show: "Unable to Load Conversation" with admin trigger button');
                    break;
                case "dm_stage":
                    console.log('🖥️  CustomerView would show: "DM Stage Active" with instructions to check Whop DMs');
                    break;
                case "transition_stage":
                    console.log('🖥️  CustomerView would show: "Transition Stage Reached" with message about "experience_qual_1"');
                    break;
                case "internal_chat":
                    console.log('🖥️  CustomerView would show: Full UserChat interface with conversation history');
                    break;
                default:
                    console.log('🖥️  CustomerView would show: Error state');
            }

        } else {
            console.log('❌ Failed to load conversation for stage detection');
        }
    } catch (error) {
        console.log('❌ Error testing stage detection:', error.message);
    }

    console.log('\n✅ Stage detection test completed');
}

// Run the test
testStageDetection().catch(console.error);


