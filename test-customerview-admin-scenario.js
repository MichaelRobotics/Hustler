#!/usr/bin/env node

/**
 * Test CustomerView Admin Scenario
 * 
 * Tests the complete admin scenario in CustomerView:
 * 1. Admin triggers first DM
 * 2. Admin enters CustomerView with conversation ID
 * 3. CustomerView loads conversation and funnel flow
 * 4. Admin can send messages and get responses
 */

const BASE_URL = 'http://localhost:3000';

async function testCustomerViewAdminScenario() {
  console.log('🧪 Testing CustomerView Admin Scenario...\n');

  try {
    // Step 1: Trigger first DM as admin
    console.log('1️⃣ Triggering first DM as admin...');
    const triggerResponse = await fetch(`${BASE_URL}/api/admin/trigger-first-dm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-whop-user-id': 'fake_user_id',
      },
      body: JSON.stringify({
        experienceId: 'exp_wl5EtbHqAqLdjV',
        userId: 'fake_user_id',
      }),
    });

    if (!triggerResponse.ok) {
      throw new Error(`Trigger DM failed: ${triggerResponse.status} ${triggerResponse.statusText}`);
    }

    const triggerResult = await triggerResponse.json();
    console.log('✅ First DM triggered successfully');
    console.log(`   Conversation ID: ${triggerResult.conversationId}`);
    console.log(`   DM Sent: ${triggerResult.dmSent}`);
    console.log(`   Welcome Message: ${triggerResult.welcomeMessage}\n`);

    const conversationId = triggerResult.conversationId;

    // Step 2: Test CustomerView conversation loading
    console.log('2️⃣ Testing CustomerView conversation loading...');
    const loadResponse = await fetch(`${BASE_URL}/api/userchat/load-conversation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        conversationId: conversationId,
      }),
    });

    if (!loadResponse.ok) {
      throw new Error(`Load conversation failed: ${loadResponse.status} ${loadResponse.statusText}`);
    }

    const loadResult = await loadResponse.json();
    console.log('✅ Conversation loaded for CustomerView');
    console.log(`   Success: ${loadResult.success}`);
    console.log(`   Has Conversation: ${!!loadResult.conversation}`);
    console.log(`   Has Funnel Flow: ${!!loadResult.funnelFlow}`);
    console.log(`   Conversation Type: ${loadResult.conversation?.metadata?.type}`);
    console.log(`   Admin Triggered: ${loadResult.conversation?.metadata?.adminTriggered}`);
    
    if (loadResult.funnelFlow) {
      console.log(`   Funnel Flow Details:`);
      console.log(`     Start Block ID: ${loadResult.funnelFlow.startBlockId}`);
      console.log(`     Stages Count: ${loadResult.funnelFlow.stages?.length || 0}`);
      console.log(`     Blocks Count: ${Object.keys(loadResult.funnelFlow.blocks || {}).length}`);
      
      // Check if the start block has options
      const startBlock = loadResult.funnelFlow.blocks?.[loadResult.funnelFlow.startBlockId];
      if (startBlock) {
        console.log(`     Start Block Options: ${startBlock.options?.length || 0}`);
        if (startBlock.options && startBlock.options.length > 0) {
          console.log(`     First Option: ${startBlock.options[0].text}`);
        }
      }
    } else {
      console.log('   ❌ No funnel flow loaded - this will cause issues in CustomerView!');
    }
    console.log('');

    // Step 3: Test message processing (simulating what happens in CustomerView)
    console.log('3️⃣ Testing message processing (CustomerView simulation)...');
    const messageResponse = await fetch(`${BASE_URL}/api/userchat/process-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        conversationId: conversationId,
        messageContent: '1',
        messageType: 'user',
      }),
    });

    if (!messageResponse.ok) {
      const errorText = await messageResponse.text();
      throw new Error(`Message processing failed: ${messageResponse.status} ${messageResponse.statusText}\n${errorText}`);
    }

    const messageResult = await messageResponse.json();
    console.log('✅ Message processing works in CustomerView context');
    console.log(`   Success: ${messageResult.success}`);
    console.log(`   Bot Message: ${messageResult.funnelResponse?.botMessage || 'None'}`);
    console.log(`   Next Block ID: ${messageResult.funnelResponse?.nextBlockId || 'None'}\n`);

    // Step 4: Test CustomerView URL simulation
    console.log('4️⃣ Testing CustomerView URL simulation...');
    const customerViewUrl = `/experiences/exp_wl5EtbHqAqLdjV?conversationId=${conversationId}`;
    console.log(`   CustomerView URL: ${customerViewUrl}`);
    console.log('   This is the URL the admin would use to test in CustomerView\n');

    // Step 5: Summary
    console.log('📋 CustomerView Admin Scenario Summary:');
    if (loadResult.funnelFlow) {
      console.log('✅ Admin can trigger first DM');
      console.log('✅ CustomerView loads conversation with real funnel flow');
      console.log('✅ Admin can send messages and get funnel responses');
      console.log('✅ Complete admin testing scenario works');
      console.log('\n🎯 Admin Testing Instructions:');
      console.log('1. Go to CustomerView as admin');
      console.log('2. Click "Trigger First DM" button');
      console.log('3. You will be redirected to CustomerView with conversation');
      console.log('4. Send messages and see real funnel responses');
      console.log('5. Test the complete customer experience!');
    } else {
      console.log('❌ CustomerView will use mock funnel flow (no real testing)');
      console.log('❌ Admin cannot test real funnel navigation');
      console.log('❌ Issue: Real funnel flow not loading in CustomerView');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testCustomerViewAdminScenario();


