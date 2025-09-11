#!/usr/bin/env node

/**
 * Code analysis test to verify ID structure implementation
 * This script analyzes the code to ensure correct ID usage
 */

const fs = require('fs');
const path = require('path');

function analyzeUserContextCode() {
    console.log('🧪 Analyzing User Context Code Implementation\n');
    
    try {
        // Read the user-context.ts file
        const userContextPath = path.join(__dirname, 'lib/context/user-context.ts');
        const userContextCode = fs.readFileSync(userContextPath, 'utf8');
        
        console.log('📋 User Context Analysis:');
        
        // Check if experienceId is set to whopExperienceId
        const experienceIdAssignment = userContextCode.includes('experienceId: experience.whopExperienceId');
        console.log(`   ✅ experienceId set to experience.whopExperienceId: ${experienceIdAssignment ? 'YES' : 'NO'}`);
        
        // Check if experience.id is set to database ID
        const experienceIdDbAssignment = userContextCode.includes('id: experience.id');
        console.log(`   ✅ experience.id set to experience.id: ${experienceIdDbAssignment ? 'YES' : 'NO'}`);
        
        // Check if experience.whopExperienceId is set correctly
        const whopExperienceIdAssignment = userContextCode.includes('whopExperienceId: experience.whopExperienceId');
        console.log(`   ✅ experience.whopExperienceId set correctly: ${whopExperienceIdAssignment ? 'YES' : 'NO'}`);
        
        console.log('\n📋 Database Query Analysis:');
        
        // Read funnel-actions.ts file
        const funnelActionsPath = path.join(__dirname, 'lib/actions/funnel-actions.ts');
        const funnelActionsCode = fs.readFileSync(funnelActionsPath, 'utf8');
        
        // Check if database queries use user.experience.id
        const dbQueriesUseCorrectId = funnelActionsCode.includes('user.experience.id');
        console.log(`   ✅ Database queries use user.experience.id: ${dbQueriesUseCorrectId ? 'YES' : 'NO'}`);
        
        // Check if there are any remaining user.experienceId in database queries
        const remainingIncorrectUsage = (funnelActionsCode.match(/eq\([^)]*\.experienceId, user\.experienceId\)/g) || []).length;
        console.log(`   ⚠️  Remaining user.experienceId in database queries: ${remainingIncorrectUsage}`);
        
        console.log('\n📋 API Call Analysis:');
        
        // Check if API calls use user.experience.whopExperienceId
        const apiCallsUseCorrectId = funnelActionsCode.includes('user.experience.whopExperienceId');
        console.log(`   ✅ API calls use user.experience.whopExperienceId: ${apiCallsUseCorrectId ? 'YES' : 'NO'}`);
        
        // Check generate-funnel API
        const generateFunnelPath = path.join(__dirname, 'app/api/generate-funnel/route.ts');
        const generateFunnelCode = fs.readFileSync(generateFunnelPath, 'utf8');
        
        const generateFunnelUsesCorrectId = generateFunnelCode.includes('userContext.user.experience.id');
        console.log(`   ✅ Generate-funnel API uses userContext.user.experience.id: ${generateFunnelUsesCorrectId ? 'YES' : 'NO'}`);
        
        console.log('\n📊 Implementation Summary:');
        
        if (experienceIdAssignment && experienceIdDbAssignment && whopExperienceIdAssignment && 
            dbQueriesUseCorrectId && apiCallsUseCorrectId && generateFunnelUsesCorrectId && 
            remainingIncorrectUsage === 0) {
            console.log('✅ ALL CHECKS PASSED - Implementation is correct!');
            console.log('   - user.experienceId contains Whop experience ID');
            console.log('   - user.experience.id contains database UUID');
            console.log('   - Database queries use correct database UUIDs');
            console.log('   - API calls use correct Whop experience IDs');
        } else {
            console.log('❌ SOME CHECKS FAILED - Implementation needs fixing');
            if (!experienceIdAssignment) {
                console.log('   - Fix: user.experienceId should be set to experience.whopExperienceId');
            }
            if (!experienceIdDbAssignment) {
                console.log('   - Fix: experience.id should be set to experience.id');
            }
            if (!whopExperienceIdAssignment) {
                console.log('   - Fix: experience.whopExperienceId should be set to experience.whopExperienceId');
            }
            if (!dbQueriesUseCorrectId) {
                console.log('   - Fix: Database queries should use user.experience.id');
            }
            if (!apiCallsUseCorrectId) {
                console.log('   - Fix: API calls should use user.experience.whopExperienceId');
            }
            if (!generateFunnelUsesCorrectId) {
                console.log('   - Fix: Generate-funnel API should use userContext.user.experience.id');
            }
            if (remainingIncorrectUsage > 0) {
                console.log(`   - Fix: Remove ${remainingIncorrectUsage} remaining user.experienceId usage in database queries`);
            }
        }
        
    } catch (error) {
        console.error('❌ Error during code analysis:', error.message);
    }
}

// Run the analysis
analyzeUserContextCode();
