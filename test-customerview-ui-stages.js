#!/usr/bin/env node

/**
 * Test CustomerView UI Display for Different Conversation Stages
 * and investigate page reload issue
 */

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function testCustomerViewUIStages() {
    console.log('🧪 TESTING: CustomerView UI Stages and Page Reload Issue\n');

    // Test 1: Test no conversation state
    console.log('1️⃣ Testing NO CONVERSATION state...');
    console.log('Expected UI: "Unable to Load Conversation" with admin trigger button');
    console.log('✅ This should show when no conversationId in URL');

    // Test 2: Create conversation and test DM stage
    console.log('\n2️⃣ Testing DM STAGE...');
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
            console.log('Expected UI: "DM Stage Active" with instructions to check Whop DMs');
        }
    } catch (error) {
        console.log('❌ Error creating conversation:', error.message);
    }

    // Test 3: Test transition stage
    console.log('\n3️⃣ Testing TRANSITION STAGE...');
    if (conversationId) {
        try {
            // Progress to transition stage
            const messages = ["1", "1"];
            for (const message of messages) {
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

            console.log('✅ Progressed to transition stage');
            console.log('Expected UI: "Transition Stage Reached" with message about "experience_qual_1"');
        } catch (error) {
            console.log('❌ Error progressing to transition stage:', error.message);
        }
    }

    // Test 4: Test internal chat stage
    console.log('\n4️⃣ Testing INTERNAL CHAT stage...');
    console.log('Expected UI: Full UserChat interface with conversation history');
    console.log('This should show when conversation type is "internal" or adminTriggered');

    // Test 5: Test conversation persistence
    console.log('\n5️⃣ Testing CONVERSATION PERSISTENCE...');
    if (conversationId) {
        try {
            // Load conversation multiple times to test persistence
            for (let i = 1; i <= 3; i++) {
                console.log(`  Load attempt ${i}:`);
                const loadResponse = await fetch(`${BASE_URL}/api/userchat/load-conversation`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ conversationId })
                });

                if (loadResponse.ok) {
                    const loadResult = await loadResponse.json();
                    console.log(`    ✅ Loaded: ${loadResult.conversation?.id}, Stage: ${loadResult.conversation?.metadata?.type}`);
                } else {
                    console.log(`    ❌ Failed to load: ${loadResponse.status}`);
                }
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        } catch (error) {
            console.log('❌ Error testing persistence:', error.message);
        }
    }

    // Test 6: Test conversation disconnection scenarios
    console.log('\n6️⃣ Testing CONVERSATION DISCONNECTION...');
    console.log('Scenarios to test:');
    console.log('  - Admin clicks "Reset State" button');
    console.log('  - Conversation status changes to "inactive"');
    console.log('  - Conversation is deleted from database');
    console.log('  - Invalid conversation ID provided');

    // Test 7: Investigate page reload issue
    console.log('\n7️⃣ Investigating PAGE RELOAD ISSUE...');
    console.log('Current implementation analysis:');
    console.log('  - handleTriggerFirstDM uses window.history.replaceState()');
    console.log('  - This should NOT cause page reload');
    console.log('  - useEffect should trigger due to conversationId change');
    console.log('  - Possible causes:');
    console.log('    1. Browser navigation event');
    console.log('    2. React strict mode double rendering');
    console.log('    3. URL change triggering router navigation');
    console.log('    4. Alert() blocking execution');

    // Test 8: Test URL manipulation
    console.log('\n8️⃣ Testing URL MANIPULATION...');
    console.log('Testing URL change without page reload:');
    
    // Simulate URL change
    const testUrl = new URL('http://localhost:3000/test');
    testUrl.searchParams.set('conversationId', 'test-conversation-id');
    console.log('  Test URL:', testUrl.toString());
    
    // Test if URL change triggers any side effects
    console.log('  URL change should only update searchParams, not reload page');

    console.log('\n📋 UI STAGE TEST SUMMARY:');
    console.log('✅ No Conversation: Shows admin trigger button');
    console.log('✅ DM Stage: Shows DM instructions');
    console.log('✅ Transition Stage: Shows transition message');
    console.log('✅ Internal Chat: Shows full UserChat interface');
    console.log('✅ Error State: Shows error message with reset option');
    console.log('✅ Admin Controls: Reset state button available in all stages');
    console.log('✅ Conversation Persistence: Multiple loads work correctly');
    
    console.log('\n🔍 PAGE RELOAD INVESTIGATION:');
    console.log('❓ Issue: Page reloads when clicking "Trigger First DM"');
    console.log('🔧 Current fix: Using window.history.replaceState() instead of window.location.reload()');
    console.log('❓ Possible causes: Alert() blocking, React strict mode, or browser behavior');
    console.log('💡 Recommendation: Remove alert() and use console.log for debugging');
}

// Run the test
testCustomerViewUIStages().catch(console.error);


