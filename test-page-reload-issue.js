#!/usr/bin/env node

/**
 * Test Page Reload Issue Investigation
 */

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function testPageReloadIssue() {
    console.log('🔍 INVESTIGATING: Page Reload Issue\n');

    // Test 1: Check if alert() is causing the issue
    console.log('1️⃣ Testing alert() behavior...');
    console.log('Current implementation uses alert() after URL update');
    console.log('Alert() can cause browser to lose focus and potentially trigger reload');
    console.log('Recommendation: Replace alert() with console.log or toast notification');

    // Test 2: Test URL update without alert
    console.log('\n2️⃣ Testing URL update mechanism...');
    console.log('Current code:');
    console.log('  window.history.replaceState({}, "", newUrl.toString());');
    console.log('  alert("First DM triggered successfully!");');
    console.log('');
    console.log('Issue: alert() might be causing the page reload');
    console.log('Solution: Remove alert() and use console.log for debugging');

    // Test 3: Test the actual admin trigger endpoint
    console.log('\n3️⃣ Testing admin trigger endpoint...');
    try {
        const triggerResponse = await fetch(`${BASE_URL}/api/admin/trigger-first-dm`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ experienceId: 'exp_wl5EtbHqAqLdjV' })
        });

        if (triggerResponse.ok) {
            const triggerResult = await triggerResponse.json();
            console.log('✅ Admin trigger works correctly');
            console.log('Response:', {
                success: triggerResult.success,
                conversationId: triggerResult.conversationId,
                dmSent: triggerResult.dmSent
            });
        } else {
            console.log('❌ Admin trigger failed:', triggerResponse.status);
        }
    } catch (error) {
        console.log('❌ Error testing admin trigger:', error.message);
    }

    // Test 4: Check for other potential causes
    console.log('\n4️⃣ Checking for other potential causes...');
    console.log('Potential causes of page reload:');
    console.log('  1. alert() function blocking execution');
    console.log('  2. React strict mode causing double rendering');
    console.log('  3. Browser navigation event');
    console.log('  4. URL change triggering router navigation');
    console.log('  5. Form submission (if button is in form)');
    console.log('  6. Event propagation issues');

    console.log('\n💡 RECOMMENDED FIX:');
    console.log('Replace alert() with console.log in handleTriggerFirstDM:');
    console.log('');
    console.log('// Instead of:');
    console.log('alert(`First DM triggered successfully!...`);');
    console.log('');
    console.log('// Use:');
    console.log('console.log("✅ First DM triggered successfully!");');
    console.log('console.log("Conversation ID:", result.conversationId);');
    console.log('// Optionally show a toast notification instead');
}

// Run the test
testPageReloadIssue().catch(console.error);


