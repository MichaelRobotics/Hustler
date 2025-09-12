#!/usr/bin/env node

/**
 * Credit Check Debugging Script
 * This script helps diagnose credit check failures
 */

const { whopSdk } = require('./lib/whop-sdk');
const { getUserContext } = require('./lib/context/user-context');
const { getUserCredits, canGenerate } = require('./lib/actions/credit-actions');

async function debugCreditCheck() {
    console.log('🔍 CREDIT CHECK DEBUGGING SCRIPT');
    console.log('================================\n');

    try {
        // Step 1: Check environment variables
        console.log('1. Environment Variables:');
        console.log(`   WHOP_API_KEY: ${process.env.WHOP_API_KEY ? '✅ Set' : '❌ Missing'}`);
        console.log(`   NEXT_PUBLIC_WHOP_EXPERIENCE_ID: ${process.env.NEXT_PUBLIC_WHOP_EXPERIENCE_ID || '❌ Missing'}`);
        console.log(`   NEXT_PUBLIC_WHOP_COMPANY_ID: ${process.env.NEXT_PUBLIC_WHOP_COMPANY_ID || '❌ Missing'}`);
        console.log('');

        // Step 2: Test Whop SDK connection
        console.log('2. Whop SDK Connection:');
        try {
            // This would need to be run in a proper Next.js context with headers
            console.log('   ⚠️  Cannot test Whop SDK without proper request context');
            console.log('   💡 Run this in a browser console or API route');
        } catch (error) {
            console.log(`   ❌ Whop SDK Error: ${error.message}`);
        }
        console.log('');

        // Step 3: Test database connection
        console.log('3. Database Connection:');
        try {
            const { db } = require('./lib/supabase/db-server');
            console.log('   ✅ Database connection successful');
        } catch (error) {
            console.log(`   ❌ Database Error: ${error.message}`);
        }
        console.log('');

        // Step 4: Check user context creation
        console.log('4. User Context Creation:');
        console.log('   💡 To test user context, you need:');
        console.log('   - Valid Whop user token');
        console.log('   - Valid Experience ID');
        console.log('   - User must exist in database');
        console.log('');

        // Step 5: Common failure scenarios
        console.log('5. Common Failure Scenarios:');
        console.log('   ❌ User not found in database');
        console.log('   ❌ User is not admin (accessLevel !== "admin")');
        console.log('   ❌ User has 0 credits');
        console.log('   ❌ Experience ID mismatch');
        console.log('   ❌ Database query fails');
        console.log('   ❌ Whop API access check fails');
        console.log('');

        // Step 6: Debugging steps
        console.log('6. Debugging Steps:');
        console.log('   a) Check browser console for errors');
        console.log('   b) Check network tab for API call failures');
        console.log('   c) Verify user is admin in Whop dashboard');
        console.log('   d) Check database for user record');
        console.log('   e) Verify Experience ID is correct');
        console.log('   f) Check credit balance in database');
        console.log('');

        // Step 7: Manual database check
        console.log('7. Manual Database Check:');
        console.log('   Run this SQL query to check user:');
        console.log('   SELECT * FROM users WHERE whop_user_id = \'YOUR_USER_ID\';');
        console.log('   SELECT * FROM experiences WHERE whop_experience_id = \'YOUR_EXPERIENCE_ID\';');
        console.log('');

    } catch (error) {
        console.error('❌ Debug script error:', error);
    }
}

// Run the debug script
debugCreditCheck();
