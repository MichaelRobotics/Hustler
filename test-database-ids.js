#!/usr/bin/env node

/**
 * Database inspection script to check ID structure
 * This script directly queries the database to verify ID types
 */

const { execSync } = require('child_process');
const fs = require('fs');

async function testDatabaseIds() {
    console.log('🧪 Testing Database ID Structure\n');
    
    try {
        // Create a database query script
        const queryScript = `
import { db } from './lib/supabase/db-server';
import { experiences, users } from './lib/supabase/schema';
import { eq, and } from 'drizzle-orm';

async function inspectDatabase() {
    console.log('🔍 Inspecting database records...\\n');
    
    try {
        // Get all experiences
        const allExperiences = await db.query.experiences.findMany({
            limit: 5
        });
        
        console.log('🏢 Experience Records:');
        allExperiences.forEach((exp, index) => {
            console.log(\`   Experience \${index + 1}:\`);
            console.log(\`     id (database UUID): \${exp.id}\`);
            console.log(\`     whopExperienceId: \${exp.whopExperienceId}\`);
            console.log(\`     whopCompanyId: \${exp.whopCompanyId}\`);
            console.log(\`     name: \${exp.name}\\n\`);
        });
        
        // Get all users
        const allUsers = await db.query.users.findMany({
            with: {
                experience: true
            },
            limit: 5
        });
        
        console.log('👤 User Records:');
        allUsers.forEach((user, index) => {
            console.log(\`   User \${index + 1}:\`);
            console.log(\`     id (database UUID): \${user.id}\`);
            console.log(\`     whopUserId: \${user.whopUserId}\`);
            console.log(\`     experienceId (foreign key): \${user.experienceId}\`);
            console.log(\`     accessLevel: \${user.accessLevel}\`);
            console.log(\`     credits: \${user.credits}\`);
            if (user.experience) {
                console.log(\`     experience.id: \${user.experience.id}\`);
                console.log(\`     experience.whopExperienceId: \${user.experience.whopExperienceId}\`);
            }
            console.log('');
        });
        
        // Check for empty whopExperienceId
        const emptyExperiences = await db.query.experiences.findMany({
            where: eq(experiences.whopExperienceId, '')
        });
        
        console.log('⚠️  Empty whopExperienceId records:');
        if (emptyExperiences.length > 0) {
            console.log(\`   Found \${emptyExperiences.length} records with empty whopExperienceId:\`);
            emptyExperiences.forEach((exp, index) => {
                console.log(\`     \${index + 1}. id: \${exp.id}, whopExperienceId: '\${exp.whopExperienceId}'\`);
            });
        } else {
            console.log('   ✅ No empty whopExperienceId records found');
        }
        
        console.log('\\n📊 Database Structure Summary:');
        console.log('   - experiences.id: Database UUID (primary key)');
        console.log('   - experiences.whopExperienceId: Whop experience ID (unique)');
        console.log('   - users.experienceId: Foreign key to experiences.id');
        console.log('   - users.whopUserId: Whop user ID');
        
    } catch (error) {
        console.error('❌ Database query error:', error.message);
    }
}

inspectDatabase().catch(console.error);
`;

        // Write the query script to a temporary file
        const queryFile = 'test-database-query.ts';
        fs.writeFileSync(queryFile, queryScript);
        
        console.log('🔍 Running database inspection...\n');
        
        // Run the query script
        const result = execSync(`npx ts-node ${queryFile}`, { 
            encoding: 'utf8',
            cwd: __dirname,
            stdio: 'pipe'
        });
        
        console.log(result);
        
        // Clean up
        fs.unlinkSync(queryFile);
        
    } catch (error) {
        console.error('❌ Error during database inspection:', error.message);
        if (error.stdout) {
            console.log('STDOUT:', error.stdout);
        }
        if (error.stderr) {
            console.log('STDERR:', error.stderr);
        }
    }
}

// Run the test
testDatabaseIds().catch(console.error);
