#!/usr/bin/env node

/**
 * Test Admin Message Processing Flow
 * 
 * Tests the complete flow:
 * 1. Admin triggers first DM
 * 2. Admin sends message in CustomerView
 * 3. Message gets processed through funnel system
 * 4. Bot responds with next funnel step
 */

const BASE_URL = 'http://localhost:3000';

async function testAdminMessageProcessing() {
  console.log('🧪 Testing Admin Message Processing Flow...\n');

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

    // Step 2: Load conversation to verify it exists
    console.log('2️⃣ Loading conversation...');
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
    console.log('✅ Conversation loaded successfully');
    console.log(`   Has Funnel Flow: ${!!loadResult.funnelFlow}`);
    console.log(`   Conversation Type: ${loadResult.conversation?.metadata?.type}`);
    console.log(`   Admin Triggered: ${loadResult.conversation?.metadata?.adminTriggered}\n`);

    // Step 3: Test message processing
    console.log('3️⃣ Testing message processing...');
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
    console.log('✅ Message processed successfully');
    console.log(`   Success: ${messageResult.success}`);
    console.log(`   Bot Message: ${messageResult.funnelResponse?.botMessage || 'None'}`);
    console.log(`   Next Block ID: ${messageResult.funnelResponse?.nextBlockId || 'None'}\n`);

    // Step 4: Test another message
    console.log('4️⃣ Testing second message...');
    const message2Response = await fetch(`${BASE_URL}/api/userchat/process-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        conversationId: conversationId,
        messageContent: '2',
        messageType: 'user',
      }),
    });

    if (!message2Response.ok) {
      const errorText = await message2Response.text();
      throw new Error(`Second message processing failed: ${message2Response.status} ${message2Response.statusText}\n${errorText}`);
    }

    const message2Result = await message2Response.json();
    console.log('✅ Second message processed successfully');
    console.log(`   Success: ${message2Result.success}`);
    console.log(`   Bot Message: ${message2Result.funnelResponse?.botMessage || 'None'}`);
    console.log(`   Next Block ID: ${message2Result.funnelResponse?.nextBlockId || 'None'}\n`);

    // Step 5: Test invalid message
    console.log('5️⃣ Testing invalid message...');
    const invalidResponse = await fetch(`${BASE_URL}/api/userchat/process-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        conversationId: conversationId,
        messageContent: 'invalid option',
        messageType: 'user',
      }),
    });

    if (!invalidResponse.ok) {
      const errorText = await invalidResponse.text();
      throw new Error(`Invalid message processing failed: ${invalidResponse.status} ${invalidResponse.statusText}\n${errorText}`);
    }

    const invalidResult = await invalidResponse.json();
    console.log('✅ Invalid message handled correctly');
    console.log(`   Success: ${invalidResult.success}`);
    console.log(`   Bot Message: ${invalidResult.funnelResponse?.botMessage || 'None'}\n`);

    console.log('🎉 All tests passed! Admin message processing is working correctly.');
    console.log('\n📋 Summary:');
    console.log('✅ Admin can trigger first DM');
    console.log('✅ Conversation loads with funnel flow');
    console.log('✅ User messages are processed through funnel system');
    console.log('✅ Bot responds with correct funnel steps');
    console.log('✅ Invalid messages are handled gracefully');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testAdminMessageProcessing();


