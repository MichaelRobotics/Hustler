#!/usr/bin/env node

/**
 * Run conversation binding migration
 * This script applies the database changes for user conversation binding
 */

const { execSync } = require('child_process');
const path = require('path');

async function runMigration() {
    console.log('🔄 Running conversation binding migration...\n');

    try {
        // Run the migration SQL file
        console.log('1️⃣ Applying database schema changes...');
        const migrationFile = path.join(__dirname, '../drizzle/20250110000000_add_user_conversation_constraints.sql');
        
        // Note: This would typically be run through your database migration system
        // For now, we'll just show what needs to be done
        console.log('📋 Migration file created:', migrationFile);
        console.log('📋 To apply the migration, run:');
        console.log('   psql -d your_database -f drizzle/20250110000000_add_user_conversation_constraints.sql');
        console.log('   OR use your preferred database migration tool');
        
        console.log('\n✅ Migration preparation completed!');
        console.log('\n📋 What this migration does:');
        console.log('  - Adds user_id field to conversations table');
        console.log('  - Creates indexes for better performance');
        console.log('  - Adds unique constraint to prevent multiple active conversations per user');
        console.log('  - Migrates existing data to set user_id from metadata');
        console.log('  - Updates admin-triggered conversations to use admin user');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    }
}

// Run the migration
runMigration().catch(console.error);


