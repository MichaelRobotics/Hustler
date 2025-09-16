#!/usr/bin/env node

/**
 * Test script for message processing functionality
 * This script tests the database connection and message saving
 */

const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
const { eq } = require('drizzle-orm');

// Database connection
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const sql = postgres(connectionString);
const db = drizzle(sql);

// Test database connection
async function testDatabaseConnection() {
  try {
    console.log('Testing database connection...');
    const result = await sql`SELECT NOW() as current_time`;
    console.log('✅ Database connection successful:', result[0].current_time);
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

// Test message insertion
async function testMessageInsertion() {
  try {
    console.log('Testing message insertion...');
    
    // First, get a conversation ID to test with
    const conversations = await sql`
      SELECT id, experience_id 
      FROM conversations 
      WHERE status = 'active' 
      LIMIT 1
    `;
    
    if (conversations.length === 0) {
      console.log('⚠️  No active conversations found, creating test conversation...');
      
      // Get an experience ID
      const experiences = await sql`
        SELECT id FROM experiences LIMIT 1
      `;
      
      if (experiences.length === 0) {
        console.error('❌ No experiences found in database');
        return false;
      }
      
      // Create a test conversation
      const newConversation = await sql`
        INSERT INTO conversations (experience_id, funnel_id, whop_user_id, status, current_block_id, user_path)
        VALUES (${experiences[0].id}, 'test-funnel', 'test-user', 'active', 'test-block', ARRAY['test-block'])
        RETURNING id
      `;
      
      conversations.push(newConversation[0]);
    }
    
    const conversationId = conversations[0].id;
    console.log(`Using conversation ID: ${conversationId}`);
    
    // Test message insertion
    const testMessage = await sql`
      INSERT INTO messages (conversation_id, type, content)
      VALUES (${conversationId}, 'user', 'Test message from script')
      RETURNING id, created_at
    `;
    
    console.log('✅ Message inserted successfully:', {
      id: testMessage[0].id,
      createdAt: testMessage[0].created_at
    });
    
    // Test message retrieval
    const messages = await sql`
      SELECT id, type, content, created_at
      FROM messages
      WHERE conversation_id = ${conversationId}
      ORDER BY created_at DESC
      LIMIT 5
    `;
    
    console.log('✅ Messages retrieved successfully:', messages.length, 'messages found');
    console.log('Sample messages:', messages.map(m => ({
      id: m.id,
      type: m.type,
      content: m.content.substring(0, 50) + (m.content.length > 50 ? '...' : ''),
      createdAt: m.created_at
    })));
    
    return true;
  } catch (error) {
    console.error('❌ Message insertion test failed:', error.message);
    console.error('Stack trace:', error.stack);
    return false;
  }
}

// Test conversation loading
async function testConversationLoading() {
  try {
    console.log('Testing conversation loading...');
    
    const conversations = await sql`
      SELECT c.id, c.experience_id, c.status, c.current_block_id,
             COUNT(m.id) as message_count
      FROM conversations c
      LEFT JOIN messages m ON c.id = m.conversation_id
      WHERE c.status = 'active'
      GROUP BY c.id, c.experience_id, c.status, c.current_block_id
      LIMIT 5
    `;
    
    console.log('✅ Conversations loaded successfully:', conversations.length, 'conversations found');
    console.log('Sample conversations:', conversations.map(c => ({
      id: c.id,
      experienceId: c.experience_id,
      status: c.status,
      currentBlockId: c.current_block_id,
      messageCount: c.message_count
    })));
    
    return true;
  } catch (error) {
    console.error('❌ Conversation loading test failed:', error.message);
    return false;
  }
}

// Main test function
async function runTests() {
  console.log('🚀 Starting message processing tests...\n');
  
  const tests = [
    { name: 'Database Connection', fn: testDatabaseConnection },
    { name: 'Message Insertion', fn: testMessageInsertion },
    { name: 'Conversation Loading', fn: testConversationLoading },
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    console.log(`\n--- ${test.name} ---`);
    try {
      const result = await test.fn();
      if (result) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      console.error(`❌ ${test.name} failed with error:`, error.message);
      failed++;
    }
  }
  
  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
  
  if (failed === 0) {
    console.log('🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log('💥 Some tests failed!');
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('💥 Test runner failed:', error);
  process.exit(1);
});
