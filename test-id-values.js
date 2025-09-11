#!/usr/bin/env node

/**
 * Test script to show actual ID values from user context
 * This will demonstrate what each ID reference contains
 */

const fs = require('fs');
const path = require('path');

function testIdValues() {
    console.log('🔍 Testing Actual ID Values from User Context\n');
    
    // Mock data to simulate what comes from database
    const mockExperience = {
        id: '547ee6b1-8a10-4ab4-915c-cfbf7b297173', // Database UUID
        whopExperienceId: 'exp_abc123def456', // Whop experience ID
        whopCompanyId: 'company_xyz789',
        name: 'Test Experience'
    };
    
    const mockUser = {
        id: 'user_db_uuid_123',
        whopUserId: 'whop_user_456',
        experienceId: '547ee6b1-8a10-4ab4-915c-cfbf7b297173', // Database UUID (foreign key)
        email: 'test@example.com',
        name: 'Test User',
        credits: 5,
        accessLevel: 'admin'
    };
    
    console.log('📋 Raw Database Data:');
    console.log(`   Experience Table:`);
    console.log(`     id: ${mockExperience.id} (database UUID)`);
    console.log(`     whopExperienceId: ${mockExperience.whopExperienceId} (Whop experience ID)`);
    console.log(`   User Table:`);
    console.log(`     id: ${mockUser.id} (database UUID)`);
    console.log(`     whopUserId: ${mockUser.whopUserId} (Whop user ID)`);
    console.log(`     experienceId: ${mockUser.experienceId} (foreign key to experience.id)\n`);
    
    // Simulate the user context creation (as per our implementation)
    const userContext = {
        user: {
            id: mockUser.id,
            whopUserId: mockUser.whopUserId,
            experienceId: mockExperience.whopExperienceId, // ✅ Whop experience ID for API calls
            email: mockUser.email,
            name: mockUser.name,
            credits: mockUser.credits,
            accessLevel: mockUser.accessLevel,
            experience: {
                id: mockExperience.id, // ✅ Database UUID for foreign key relationships
                whopExperienceId: mockExperience.whopExperienceId, // ✅ Whop experience ID for API calls
                whopCompanyId: mockExperience.whopCompanyId,
                name: mockExperience.name
            }
        }
    };
    
    console.log('🎯 What Each ID Reference Contains:');
    console.log('─'.repeat(60));
    
    console.log('1. user.experienceId:');
    console.log(`   Value: "${userContext.user.experienceId}"`);
    console.log(`   Type: Whop Experience ID`);
    console.log(`   Used for: API calls, client-side operations`);
    console.log(`   Example: updateUserCredits(user.whopUserId, user.experienceId, 1, "subtract")`);
    console.log('');
    
    console.log('2. user.experience.id:');
    console.log(`   Value: "${userContext.user.experience.id}"`);
    console.log(`   Type: Database UUID`);
    console.log(`   Used for: Foreign key relationships in database queries`);
    console.log(`   Example: eq(funnels.experienceId, user.experience.id)`);
    console.log('');
    
    console.log('3. user.experience.whopExperienceId:');
    console.log(`   Value: "${userContext.user.experience.whopExperienceId}"`);
    console.log(`   Type: Whop Experience ID`);
    console.log(`   Used for: API calls, Whop SDK operations`);
    console.log(`   Example: updateUserCredits(user.whopUserId, user.experience.whopExperienceId, 1, "subtract")`);
    console.log('');
    
    console.log('4. user.experienceId === user.experience.whopExperienceId:');
    console.log(`   Result: ${userContext.user.experienceId === userContext.user.experience.whopExperienceId ? 'TRUE' : 'FALSE'}`);
    console.log(`   Both contain the same Whop Experience ID`);
    console.log('');
    
    console.log('5. user.experience.id !== user.experienceId:');
    console.log(`   Result: ${userContext.user.experience.id !== userContext.user.experienceId ? 'TRUE' : 'FALSE'}`);
    console.log(`   Different types: Database UUID vs Whop Experience ID`);
    console.log('');
    
    console.log('📊 Summary:');
    console.log('─'.repeat(60));
    console.log('✅ user.experienceId = Whop Experience ID (for API calls)');
    console.log('✅ user.experience.id = Database UUID (for database queries)');
    console.log('✅ user.experience.whopExperienceId = Whop Experience ID (for API calls)');
    console.log('✅ user.experienceId === user.experience.whopExperienceId (same value)');
    console.log('✅ user.experience.id !== user.experienceId (different types)');
    
    console.log('\n🎯 Usage Examples:');
    console.log('─'.repeat(60));
    console.log('Database Query:');
    console.log('  eq(funnels.experienceId, user.experience.id)');
    console.log('  → Uses database UUID for foreign key relationship');
    console.log('');
    console.log('API Call:');
    console.log('  updateUserCredits(user.whopUserId, user.experience.whopExperienceId, 1, "subtract")');
    console.log('  → Uses Whop Experience ID for Whop API');
    console.log('');
    console.log('Client-side:');
    console.log('  user.experienceId');
    console.log('  → Uses Whop Experience ID for client operations');
}

// Run the test
testIdValues();
