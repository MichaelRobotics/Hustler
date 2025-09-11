#!/usr/bin/env node

/**
 * Simple database test using SQL queries
 * This script directly queries the database to verify ID structure
 */

const { execSync } = require('child_process');

async function testDatabaseWithSQL() {
    console.log('🧪 Testing Database ID Structure with SQL\n');
    
    try {
        // Create a simple SQL query script
        const sqlScript = `
-- Check experiences table
SELECT 
    id as database_id,
    whop_experience_id,
    whop_company_id,
    name,
    CASE 
        WHEN whop_experience_id = '' THEN 'EMPTY'
        WHEN whop_experience_id IS NULL THEN 'NULL'
        ELSE 'HAS_VALUE'
    END as whop_experience_id_status
FROM experiences 
ORDER BY created_at DESC 
LIMIT 5;

-- Check users table
SELECT 
    u.id as user_database_id,
    u.whop_user_id,
    u.experience_id as user_experience_id,
    u.access_level,
    u.credits,
    e.id as experience_database_id,
    e.whop_experience_id,
    e.name as experience_name
FROM users u
LEFT JOIN experiences e ON u.experience_id = e.id
ORDER BY u.created_at DESC 
LIMIT 5;

-- Check for empty whop_experience_id
SELECT COUNT(*) as empty_whop_experience_id_count
FROM experiences 
WHERE whop_experience_id = '' OR whop_experience_id IS NULL;
`;

        // Write SQL to file
        const sqlFile = 'test-db-query.sql';
        require('fs').writeFileSync(sqlFile, sqlScript);
        
        console.log('🔍 Running SQL queries...\n');
        
        // Run the SQL queries using psql (assuming PostgreSQL)
        const result = execSync(`psql $DATABASE_URL -f ${sqlFile}`, { 
            encoding: 'utf8',
            cwd: __dirname,
            stdio: 'pipe'
        });
        
        console.log(result);
        
        // Clean up
        require('fs').unlinkSync(sqlFile);
        
    } catch (error) {
        console.error('❌ Error during SQL query:', error.message);
        if (error.stdout) {
            console.log('STDOUT:', error.stdout);
        }
        if (error.stderr) {
            console.log('STDERR:', error.stderr);
        }
        
        console.log('\n💡 Alternative: Check your database directly or use a database client');
        console.log('   The queries to run are:');
        console.log('   1. SELECT id, whop_experience_id, name FROM experiences LIMIT 5;');
        console.log('   2. SELECT u.id, u.whop_user_id, u.experience_id, e.whop_experience_id FROM users u LEFT JOIN experiences e ON u.experience_id = e.id LIMIT 5;');
        console.log('   3. SELECT COUNT(*) FROM experiences WHERE whop_experience_id = \'\' OR whop_experience_id IS NULL;');
    }
}

// Run the test
testDatabaseWithSQL().catch(console.error);
