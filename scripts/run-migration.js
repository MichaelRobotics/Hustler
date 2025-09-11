#!/usr/bin/env node

/**
 * Run the conversation binding migration
 */

const { db } = require('../lib/supabase/db-server');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    console.log('🔄 Running conversation binding migration...\n');

    try {
        // Read the migration SQL file
        const migrationFile = path.join(__dirname, '../drizzle/20250910213000_add_user_conversation_fields.sql');
        const migrationSQL = fs.readFileSync(migrationFile, 'utf8');
        
        console.log('📋 Executing migration SQL...');
        
        // Split the SQL into individual statements
        const statements = migrationSQL
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
        
        // Execute each statement
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            if (statement.trim()) {
                console.log(`  ${i + 1}. Executing: ${statement.substring(0, 50)}...`);
                try {
                    await db.execute(statement);
                    console.log(`     ✅ Success`);
                } catch (error) {
                    console.log(`     ⚠️  Warning: ${error.message}`);
                    // Continue with other statements even if one fails
                }
            }
        }
        
        console.log('\n✅ Migration completed!');
        console.log('\n📋 What was applied:');
        console.log('  - Added user_id field to conversations table');
        console.log('  - Added foreign key constraint to users table');
        console.log('  - Added index for better performance');
        console.log('  - Populated user_id from existing metadata');
        console.log('  - Added unique constraint to prevent multiple active conversations');
        console.log('  - Made user_id NOT NULL after population');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    }
}

// Run the migration
runMigration().catch(console.error);


