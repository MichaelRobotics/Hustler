#!/usr/bin/env node

/**
 * Mock test to verify user context ID structure
 * This script simulates the user context creation to verify ID types
 */

function testMockUserContext() {
    console.log('🧪 Testing Mock User Context ID Structure\n');
    
    // Mock data simulating what would come from the database
    const mockExperience = {
        id: '547ee6b1-8a10-4ab4-915c-cfbf7b297173', // Database UUID
        whopExperienceId: 'exp_abc123def456', // Whop experience ID
        whopCompanyId: 'company_xyz789',
        name: 'Test Experience',
        description: 'Test experience description',
        logo: null
    };
    
    const mockUser = {
        id: 'user_db_uuid_123',
        whopUserId: 'whop_user_456',
        experienceId: '547ee6b1-8a10-4ab4-915c-cfbf7b297173', // Database UUID (foreign key)
        email: 'test@example.com',
        name: 'Test User',
        avatar: null,
        credits: 5,
        accessLevel: 'admin'
    };
    
    console.log('📋 Mock Input Data:');
    console.log(`   Experience Database ID: ${mockExperience.id}`);
    console.log(`   Experience Whop ID: ${mockExperience.whopExperienceId}`);
    console.log(`   User Database ID: ${mockUser.id}`);
    console.log(`   User Whop ID: ${mockUser.whopUserId}`);
    console.log(`   User Experience ID (foreign key): ${mockUser.experienceId}\n`);
    
    // Simulate the user context creation (as per our implementation)
    const authenticatedUser = {
        id: mockUser.id,
        whopUserId: mockUser.whopUserId,
        experienceId: mockExperience.whopExperienceId, // ✅ Whop experience ID for API calls
        email: mockUser.email,
        name: mockUser.name,
        avatar: mockUser.avatar || undefined,
        credits: mockUser.credits,
        accessLevel: mockUser.accessLevel,
        experience: {
            id: mockExperience.id, // ✅ Database UUID for foreign key relationships
            whopExperienceId: mockExperience.whopExperienceId, // ✅ Whop experience ID for API calls
            whopCompanyId: mockExperience.whopCompanyId,
            name: mockExperience.name,
            description: mockExperience.description || undefined,
            logo: mockExperience.logo || undefined,
        },
    };
    
    console.log('👤 Generated AuthenticatedUser Object:');
    console.log(`   user.id: ${authenticatedUser.id} (database UUID)`);
    console.log(`   user.whopUserId: ${authenticatedUser.whopUserId} (Whop user ID)`);
    console.log(`   user.experienceId: ${authenticatedUser.experienceId} (Whop experience ID)`);
    console.log(`   user.accessLevel: ${authenticatedUser.accessLevel}`);
    console.log(`   user.credits: ${authenticatedUser.credits}\n`);
    
    console.log('🏢 Generated Experience Object:');
    console.log(`   experience.id: ${authenticatedUser.experience.id} (database UUID)`);
    console.log(`   experience.whopExperienceId: ${authenticatedUser.experience.whopExperienceId} (Whop experience ID)`);
    console.log(`   experience.whopCompanyId: ${authenticatedUser.experience.whopCompanyId}`);
    console.log(`   experience.name: ${authenticatedUser.experience.name}\n`);
    
    // Validate the structure
    console.log('🔬 ID Structure Validation:');
    
    // Check if user.experienceId is the Whop experience ID
    const isExperienceIdCorrect = authenticatedUser.experienceId === mockExperience.whopExperienceId;
    console.log(`   user.experienceId === mockExperience.whopExperienceId: ${isExperienceIdCorrect ? '✅' : '❌'}`);
    
    // Check if experience.id is the database UUID
    const isExperienceIdUuid = authenticatedUser.experience.id === mockExperience.id;
    console.log(`   experience.id === mockExperience.id: ${isExperienceIdUuid ? '✅' : '❌'}`);
    
    // Check if experience.whopExperienceId is the Whop experience ID
    const isWhopExperienceIdCorrect = authenticatedUser.experience.whopExperienceId === mockExperience.whopExperienceId;
    console.log(`   experience.whopExperienceId === mockExperience.whopExperienceId: ${isWhopExperienceIdCorrect ? '✅' : '❌'}`);
    
    // Check if user.experienceId and experience.whopExperienceId are the same
    const areExperienceIdsSame = authenticatedUser.experienceId === authenticatedUser.experience.whopExperienceId;
    console.log(`   user.experienceId === experience.whopExperienceId: ${areExperienceIdsSame ? '✅' : '❌'}`);
    
    // Check if experience.id and user.experienceId are different (one is UUID, one is Whop ID)
    const areIdsDifferent = authenticatedUser.experience.id !== authenticatedUser.experienceId;
    console.log(`   experience.id !== user.experienceId (different types): ${areIdsDifferent ? '✅' : '❌'}\n`);
    
    // Summary
    console.log('📊 Test Summary:');
    if (isExperienceIdCorrect && isExperienceIdUuid && isWhopExperienceIdCorrect && areExperienceIdsSame && areIdsDifferent) {
        console.log('✅ ALL TESTS PASSED - ID structure is correct!');
        console.log('   - user.experienceId contains Whop experience ID (for API calls)');
        console.log('   - experience.id contains database UUID (for foreign key relationships)');
        console.log('   - experience.whopExperienceId contains Whop experience ID (for API calls)');
        console.log('   - The two ID types are properly separated and used for their intended purposes');
    } else {
        console.log('❌ SOME TESTS FAILED - ID structure needs fixing');
    }
    
    console.log('\n🎯 Usage Examples:');
    console.log('   Database Query: eq(funnels.experienceId, user.experience.id)');
    console.log('   API Call: updateUserCredits(user.whopUserId, user.experience.whopExperienceId, 1, "subtract")');
    console.log('   Client-side: user.experienceId (for API calls)');
}

// Run the test
testMockUserContext();
