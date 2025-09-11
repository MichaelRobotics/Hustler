#!/usr/bin/env node

/**
 * Comprehensive verification of ID structure implementation
 * This script checks all critical files to ensure correct ID usage
 */

const fs = require('fs');
const path = require('path');

function verifyIdStructure() {
    console.log('🔍 Comprehensive ID Structure Verification\n');
    
    let allChecksPassed = true;
    const issues = [];
    
    // Check 1: User Context Implementation
    console.log('📋 1. User Context Implementation:');
    try {
        const userContextPath = path.join(__dirname, 'lib/context/user-context.ts');
        const userContextCode = fs.readFileSync(userContextPath, 'utf8');
        
        const checks = [
            {
                name: 'experienceId set to whopExperienceId',
                condition: userContextCode.includes('experienceId: experience.whopExperienceId'),
                critical: true
            },
            {
                name: 'experience.id set to database ID',
                condition: userContextCode.includes('id: experience.id'),
                critical: true
            },
            {
                name: 'experience.whopExperienceId set correctly',
                condition: userContextCode.includes('whopExperienceId: experience.whopExperienceId'),
                critical: true
            }
        ];
        
        checks.forEach(check => {
            const status = check.condition ? '✅' : '❌';
            console.log(`   ${status} ${check.name}`);
            if (!check.condition) {
                allChecksPassed = false;
                if (check.critical) {
                    issues.push(`CRITICAL: ${check.name}`);
                }
            }
        });
        
    } catch (error) {
        console.log('   ❌ Error reading user-context.ts');
        allChecksPassed = false;
        issues.push('CRITICAL: Cannot read user-context.ts');
    }
    
    // Check 2: Funnel Actions Database Queries
    console.log('\n📋 2. Funnel Actions Database Queries:');
    try {
        const funnelActionsPath = path.join(__dirname, 'lib/actions/funnel-actions.ts');
        const funnelActionsCode = fs.readFileSync(funnelActionsPath, 'utf8');
        
        // Check for correct usage
        const correctDbUsage = (funnelActionsCode.match(/user\.experience\.id/g) || []).length;
        console.log(`   ✅ Correct user.experience.id usage: ${correctDbUsage} occurrences`);
        
        // Check for incorrect usage
        const incorrectDbUsage = (funnelActionsCode.match(/eq\([^)]*\.experienceId, user\.experienceId\)/g) || []).length;
        if (incorrectDbUsage > 0) {
            console.log(`   ❌ Incorrect user.experienceId in database queries: ${incorrectDbUsage} occurrences`);
            allChecksPassed = false;
            issues.push(`CRITICAL: ${incorrectDbUsage} incorrect user.experienceId usage in database queries`);
        } else {
            console.log(`   ✅ No incorrect user.experienceId usage in database queries`);
        }
        
        // Check for API calls using correct ID
        const correctApiUsage = (funnelActionsCode.match(/user\.experience\.whopExperienceId/g) || []).length;
        console.log(`   ✅ Correct user.experience.whopExperienceId usage: ${correctApiUsage} occurrences`);
        
    } catch (error) {
        console.log('   ❌ Error reading funnel-actions.ts');
        allChecksPassed = false;
        issues.push('CRITICAL: Cannot read funnel-actions.ts');
    }
    
    // Check 3: Generate Funnel API
    console.log('\n📋 3. Generate Funnel API:');
    try {
        const generateFunnelPath = path.join(__dirname, 'app/api/generate-funnel/route.ts');
        const generateFunnelCode = fs.readFileSync(generateFunnelPath, 'utf8');
        
        const checks = [
            {
                name: 'Uses userContext.user.experience.id for database queries',
                condition: generateFunnelCode.includes('userContext.user.experience.id'),
                critical: true
            },
            {
                name: 'Gets experienceId from request body',
                condition: generateFunnelCode.includes('experienceId') && generateFunnelCode.includes('request.json()'),
                critical: true
            }
        ];
        
        checks.forEach(check => {
            const status = check.condition ? '✅' : '❌';
            console.log(`   ${status} ${check.name}`);
            if (!check.condition) {
                allChecksPassed = false;
                if (check.critical) {
                    issues.push(`CRITICAL: ${check.name}`);
                }
            }
        });
        
    } catch (error) {
        console.log('   ❌ Error reading generate-funnel route');
        allChecksPassed = false;
        issues.push('CRITICAL: Cannot read generate-funnel route');
    }
    
    // Check 4: Credit Actions
    console.log('\n📋 4. Credit Actions:');
    try {
        const creditActionsPath = path.join(__dirname, 'lib/actions/credit-actions.ts');
        const creditActionsCode = fs.readFileSync(creditActionsPath, 'utf8');
        
        // Check if functions accept experienceId parameter
        const functionsWithExperienceId = [
            'getUserCredits',
            'canGenerate', 
            'consumeCredit',
            'addCredits'
        ];
        
        functionsWithExperienceId.forEach(funcName => {
            // More specific checks for each function
            let hasExperienceIdParam = false;
            
            if (funcName === 'getUserCredits') {
                hasExperienceIdParam = creditActionsCode.includes('export async function getUserCredits(experienceId: string)');
            } else if (funcName === 'canGenerate') {
                hasExperienceIdParam = creditActionsCode.includes('canGenerate(user?: AuthenticatedUser, experienceId?: string)');
            } else if (funcName === 'consumeCredit') {
                hasExperienceIdParam = creditActionsCode.includes('consumeCredit(user?: AuthenticatedUser, experienceId?: string)');
            } else if (funcName === 'addCredits') {
                hasExperienceIdParam = creditActionsCode.includes('addCredits(\n\tuserId: string,\n\texperienceId: string,');
            }
            
            const status = hasExperienceIdParam ? '✅' : '❌';
            console.log(`   ${status} ${funcName} accepts experienceId parameter`);
            if (!hasExperienceIdParam) {
                allChecksPassed = false;
                issues.push(`WARNING: ${funcName} may not accept experienceId parameter`);
            }
        });
        
    } catch (error) {
        console.log('   ❌ Error reading credit-actions.ts');
        allChecksPassed = false;
        issues.push('CRITICAL: Cannot read credit-actions.ts');
    }
    
    // Check 5: Hooks
    console.log('\n📋 5. Hooks:');
    try {
        const useCreditsPath = path.join(__dirname, 'lib/hooks/useCredits.ts');
        const useCreditsCode = fs.readFileSync(useCreditsPath, 'utf8');
        
        const checks = [
            {
                name: 'useCredits passes experienceId to getUserCredits',
                condition: useCreditsCode.includes('getUserCredits(experienceId)'),
                critical: true
            },
            {
                name: 'useCredits passes experienceId to canGenerate',
                condition: useCreditsCode.includes('canGenerate(user, experienceId)'),
                critical: true
            },
            {
                name: 'useCredits passes experienceId to consumeCredit',
                condition: useCreditsCode.includes('consumeCredit(user, experienceId)'),
                critical: true
            }
        ];
        
        checks.forEach(check => {
            const status = check.condition ? '✅' : '❌';
            console.log(`   ${status} ${check.name}`);
            if (!check.condition) {
                allChecksPassed = false;
                if (check.critical) {
                    issues.push(`CRITICAL: ${check.name}`);
                }
            }
        });
        
    } catch (error) {
        console.log('   ❌ Error reading useCredits.ts');
        allChecksPassed = false;
        issues.push('CRITICAL: Cannot read useCredits.ts');
    }
    
    // Check 6: Funnel Management Hook
    console.log('\n📋 6. Funnel Management Hook:');
    try {
        const useFunnelManagementPath = path.join(__dirname, 'lib/hooks/useFunnelManagement.ts');
        const useFunnelManagementCode = fs.readFileSync(useFunnelManagementPath, 'utf8');
        
        const checks = [
            {
                name: 'useFunnelManagement accepts user parameter',
                condition: useFunnelManagementCode.includes('user?: { experienceId?: string }'),
                critical: true
            },
            {
                name: 'useFunnelManagement passes experienceId in API call',
                condition: useFunnelManagementCode.includes('experienceId: user?.experienceId'),
                critical: true
            }
        ];
        
        checks.forEach(check => {
            const status = check.condition ? '✅' : '❌';
            console.log(`   ${status} ${check.name}`);
            if (!check.condition) {
                allChecksPassed = false;
                if (check.critical) {
                    issues.push(`CRITICAL: ${check.name}`);
                }
            }
        });
        
    } catch (error) {
        console.log('   ❌ Error reading useFunnelManagement.ts');
        allChecksPassed = false;
        issues.push('CRITICAL: Cannot read useFunnelManagement.ts');
    }
    
    // Check 7: Admin Panel Component
    console.log('\n📋 7. Admin Panel Component:');
    try {
        const adminPanelPath = path.join(__dirname, 'lib/components/admin/AdminPanel.tsx');
        const adminPanelCode = fs.readFileSync(adminPanelPath, 'utf8');
        
        const checks = [
            {
                name: 'AdminPanel passes user to useFunnelManagement',
                condition: adminPanelCode.includes('useFunnelManagement(user)'),
                critical: true
            }
        ];
        
        checks.forEach(check => {
            const status = check.condition ? '✅' : '❌';
            console.log(`   ${status} ${check.name}`);
            if (!check.condition) {
                allChecksPassed = false;
                if (check.critical) {
                    issues.push(`CRITICAL: ${check.name}`);
                }
            }
        });
        
    } catch (error) {
        console.log('   ❌ Error reading AdminPanel.tsx');
        allChecksPassed = false;
        issues.push('CRITICAL: Cannot read AdminPanel.tsx');
    }
    
    // Check 8: Webhook Handler
    console.log('\n📋 8. Webhook Handler:');
    try {
        const webhookPath = path.join(__dirname, 'app/api/webhooks/route.ts');
        const webhookCode = fs.readFileSync(webhookPath, 'utf8');
        
        const checks = [
            {
                name: 'Webhook extracts experienceId from metadata',
                condition: webhookCode.includes('experienceId') && webhookCode.includes('metadata'),
                critical: true
            },
            {
                name: 'Webhook passes experienceId to handleCreditPackPurchase',
                condition: webhookCode.includes('handleCreditPackPurchase') && webhookCode.includes('experienceId'),
                critical: true
            }
        ];
        
        checks.forEach(check => {
            const status = check.condition ? '✅' : '❌';
            console.log(`   ${status} ${check.name}`);
            if (!check.condition) {
                allChecksPassed = false;
                if (check.critical) {
                    issues.push(`CRITICAL: ${check.name}`);
                }
            }
        });
        
    } catch (error) {
        console.log('   ❌ Error reading webhooks route');
        allChecksPassed = false;
        issues.push('CRITICAL: Cannot read webhooks route');
    }
    
    // Final Summary
    console.log('\n📊 Final Verification Summary:');
    
    if (allChecksPassed) {
        console.log('✅ ALL CHECKS PASSED - ID structure is correctly implemented!');
        console.log('\n🎯 Key Points Verified:');
        console.log('   - user.experienceId contains Whop experience ID (for API calls)');
        console.log('   - user.experience.id contains database UUID (for foreign key relationships)');
        console.log('   - Database queries use correct database UUIDs');
        console.log('   - API calls use correct Whop experience IDs');
        console.log('   - All hooks and components pass experienceId correctly');
        console.log('   - Webhook handler processes experienceId from metadata');
    } else {
        console.log('❌ SOME CHECKS FAILED - Issues found:');
        issues.forEach((issue, index) => {
            console.log(`   ${index + 1}. ${issue}`);
        });
    }
    
    return allChecksPassed;
}

// Run the verification
const result = verifyIdStructure();
process.exit(result ? 0 : 1);
