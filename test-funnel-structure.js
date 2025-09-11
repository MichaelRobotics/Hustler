#!/usr/bin/env node

/**
 * Test Funnel Structure and Stage Detection
 */

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function testFunnelStructure() {
    console.log('🧪 TESTING: Funnel Structure and Stage Detection\n');

    // Test 1: Create a conversation
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

    // Test 2: Load conversation and analyze funnel structure
    console.log('\n2️⃣ Analyzing funnel structure...');
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

            console.log('📊 Conversation:', {
                id: conversation.id,
                type: conversation.metadata?.type,
                currentBlockId: conversation.currentBlockId,
                userPath: conversation.userPath
            });

            console.log('🎯 Funnel Flow Structure:');
            console.log(`  Start Block: ${funnelFlow.startBlockId}`);
            console.log(`  Total Stages: ${funnelFlow.stages.length}`);
            
            funnelFlow.stages.forEach((stage, index) => {
                console.log(`  ${index + 1}. ${stage.name}:`);
                console.log(`     Block IDs: ${JSON.stringify(stage.blockIds)}`);
                console.log(`     Block Count: ${stage.blockIds ? stage.blockIds.length : 'undefined'}`);
            });

            console.log(`  Total Blocks: ${Object.keys(funnelFlow.blocks).length}`);
            console.log('  Block Details:');
            Object.keys(funnelFlow.blocks).forEach(blockId => {
                const block = funnelFlow.blocks[blockId];
                console.log(`    ${blockId}: "${block.message.substring(0, 50)}..."`);
            });

            // Test 3: Test stage detection with proper error handling
            console.log('\n3️⃣ Testing stage detection...');
            let detectedStage = 'unknown';
            
            try {
                if (conversation.metadata?.type === "dm") {
                    const isTransitionStage = conversation.currentBlockId && 
                        funnelFlow.stages.some(stage => {
                            console.log(`Checking stage: ${stage.name}, blockIds:`, stage.blockIds);
                            return stage.name === "TRANSITION" && 
                                stage.blockIds && 
                                stage.blockIds.includes(conversation.currentBlockId);
                        });
                    
                    console.log('Transition check result:', isTransitionStage);
                    
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
                            stage.blockIds && 
                            stage.blockIds.includes(conversation.currentBlockId)
                        )
                });

            } catch (stageError) {
                console.log('❌ Error in stage detection:', stageError.message);
            }

        } else {
            console.log('❌ Failed to load conversation');
        }
    } catch (error) {
        console.log('❌ Error analyzing funnel structure:', error.message);
    }

    console.log('\n✅ Funnel structure test completed');
}

// Run the test
testFunnelStructure().catch(console.error);


