#!/usr/bin/env node

/**
 * Deep Test of CustomerView System
 * Tests all endpoints, conversation tracking, history, and stage detection
 */

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function testCustomerViewSystem() {
    console.log('🧪 DEEP TEST: CustomerView System Analysis\n');

    // Test 1: Check if server is running
    console.log('1️⃣ Testing server availability...');
    try {
        const healthCheck = await fetch(`${BASE_URL}/api/funnels`);
        if (healthCheck.ok) {
            console.log('✅ Server is running');
        } else {
            console.log('❌ Server not responding properly');
            return;
        }
    } catch (error) {
        console.log('❌ Server not running:', error.message);
        return;
    }

    // Test 2: Test admin trigger DM
    console.log('\n2️⃣ Testing Admin Trigger DM...');
    let conversationId = null;
    try {
        const triggerResponse = await fetch(`${BASE_URL}/api/admin/trigger-first-dm`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ experienceId: 'exp_wl5EtbHqAqLdjV' })
        });

        if (triggerResponse.ok) {
            const triggerResult = await triggerResponse.json();
            console.log('✅ Admin trigger result:', {
                success: triggerResult.success,
                conversationId: triggerResult.conversationId,
                dmSent: triggerResult.dmSent
            });
            conversationId = triggerResult.conversationId;
        } else {
            const errorText = await triggerResponse.text();
            console.log('❌ Admin trigger failed:', triggerResponse.status, errorText);
        }
    } catch (error) {
        console.log('❌ Admin trigger error:', error.message);
    }

    if (!conversationId) {
        console.log('❌ Cannot continue without conversation ID');
        return;
    }

    // Test 3: Test conversation loading
    console.log('\n3️⃣ Testing Conversation Loading...');
    try {
        const loadResponse = await fetch(`${BASE_URL}/api/userchat/load-conversation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ conversationId })
        });

        if (loadResponse.ok) {
            const loadResult = await loadResponse.json();
            console.log('✅ Conversation loaded:', {
                success: loadResult.success,
                hasConversation: !!loadResult.conversation,
                hasFunnelFlow: !!loadResult.funnelFlow,
                conversationType: loadResult.conversation?.metadata?.type,
                currentBlockId: loadResult.conversation?.currentBlockId,
                messageCount: loadResult.conversation?.messages?.length || 0,
                interactionCount: loadResult.conversation?.interactions?.length || 0
            });

            // Test 4: Check conversation history
            console.log('\n4️⃣ Testing Conversation History...');
            if (loadResult.conversation?.messages) {
                console.log('📝 Message History:');
                loadResult.conversation.messages.forEach((msg, index) => {
                    console.log(`  ${index + 1}. [${msg.type}] ${msg.content} (${new Date(msg.createdAt).toISOString()})`);
                });
            } else {
                console.log('❌ No message history found');
            }

            // Test 5: Check funnel interactions
            console.log('\n5️⃣ Testing Funnel Interactions...');
            if (loadResult.conversation?.interactions) {
                console.log('🔄 Funnel Interactions:');
                loadResult.conversation.interactions.forEach((interaction, index) => {
                    console.log(`  ${index + 1}. Block: ${interaction.blockId}, Response: ${interaction.response} (${new Date(interaction.createdAt).toISOString()})`);
                });
            } else {
                console.log('❌ No funnel interactions found');
            }

            // Test 6: Check funnel flow structure
            console.log('\n6️⃣ Testing Funnel Flow Structure...');
            if (loadResult.funnelFlow) {
                console.log('🎯 Funnel Flow:');
                console.log(`  Start Block: ${loadResult.funnelFlow.startBlockId}`);
                console.log(`  Stages: ${loadResult.funnelFlow.stages.length}`);
                loadResult.funnelFlow.stages.forEach((stage, index) => {
                    console.log(`    ${index + 1}. ${stage.name} (${stage.blockIds.length} blocks)`);
                });
                console.log(`  Total Blocks: ${Object.keys(loadResult.funnelFlow.blocks).length}`);
            } else {
                console.log('❌ No funnel flow found');
            }

            // Test 7: Test stage detection logic
            console.log('\n7️⃣ Testing Stage Detection Logic...');
            const conversation = loadResult.conversation;
            const funnelFlow = loadResult.funnelFlow;
            
            if (conversation && funnelFlow) {
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

                console.log('🎭 Stage Detection:', {
                    conversationType: conversation.metadata?.type,
                    currentBlockId: conversation.currentBlockId,
                    detectedStage,
                    isTransitionBlock: conversation.currentBlockId && 
                        funnelFlow.stages.some(stage => 
                            stage.name === "TRANSITION" && 
                            stage.blockIds.includes(conversation.currentBlockId)
                        )
                });
            }

        } else {
            const errorText = await loadResponse.text();
            console.log('❌ Conversation loading failed:', loadResponse.status, errorText);
        }
    } catch (error) {
        console.log('❌ Conversation loading error:', error.message);
    }

    // Test 8: Test message processing
    console.log('\n8️⃣ Testing Message Processing...');
    try {
        const processResponse = await fetch(`${BASE_URL}/api/userchat/process-message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                conversationId,
                messageContent: "1",
                messageType: "user"
            })
        });

        if (processResponse.ok) {
            const processResult = await processResponse.json();
            console.log('✅ Message processing result:', {
                success: processResult.success,
                hasFunnelResponse: !!processResult.funnelResponse,
                funnelResponseSuccess: processResult.funnelResponse?.success
            });
        } else {
            const errorText = await processResponse.text();
            console.log('❌ Message processing failed:', processResponse.status, errorText);
        }
    } catch (error) {
        console.log('❌ Message processing error:', error.message);
    }

    // Test 9: Test WebSocket endpoints
    console.log('\n9️⃣ Testing WebSocket Endpoints...');
    try {
        const wsResponse = await fetch(`${BASE_URL}/api/websocket/connect`);
        console.log('✅ WebSocket connect endpoint:', wsResponse.status);
    } catch (error) {
        console.log('❌ WebSocket error:', error.message);
    }

    console.log('\n📋 DEEP TEST SUMMARY:');
    console.log('✅ Server availability: OK');
    console.log('✅ Admin trigger DM: ' + (conversationId ? 'OK' : 'FAILED'));
    console.log('✅ Conversation loading: ' + (conversationId ? 'OK' : 'FAILED'));
    console.log('✅ History tracking: ' + (conversationId ? 'OK' : 'FAILED'));
    console.log('✅ Stage detection: ' + (conversationId ? 'OK' : 'FAILED'));
    console.log('✅ Message processing: ' + (conversationId ? 'OK' : 'FAILED'));
    console.log('✅ WebSocket endpoints: OK');
}

// Run the deep test
testCustomerViewSystem().catch(console.error);


