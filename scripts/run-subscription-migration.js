#!/usr/bin/env node

/**
 * Run the subscription migration - remove logo and add subscription field
 */

const postgres = require('postgres');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: ['.env.development.local', '.env.local', '.env'] });

async function runMigration() {
    console.log('🔄 Running subscription migration...\n');

    const connectionString = process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING;
    if (!connectionString) {
        console.error('❌ Missing POSTGRES_URL or POSTGRES_URL_NON_POOLING environment variable');
        process.exit(1);
    }

    const sql = postgres(connectionString, {
        max: 1,
        idle_timeout: 10,
        connect_timeout: 30,
        prepare: false,
        ssl: false,
    });

    try {
        // Read the migration SQL file
        const migrationFile = path.join(__dirname, '../drizzle/20250129000000_remove_logo_add_subscription_to_experiences.sql');
        const migrationSQL = fs.readFileSync(migrationFile, 'utf8');
        
        console.log('📋 Executing migration SQL...');
        
        // Split the SQL into individual statements (separated by semicolons)
        const statements = migrationSQL
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
        
        // Execute each statement
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            if (statement.trim()) {
                const preview = statement.substring(0, 80).replace(/\n/g, ' ');
                console.log(`  ${i + 1}. Executing: ${preview}...`);
                try {
                    await sql.unsafe(statement);
                    console.log(`     ✅ Success`);
                } catch (error) {
                    // Some errors are expected (like "IF EXISTS" checks)
                    if (error.message.includes('does not exist') || 
                        error.message.includes('already exists') ||
                        error.message.includes('duplicate_object')) {
                        console.log(`     ⚠️  Warning (expected): ${error.message}`);
                    } else {
                        console.log(`     ❌ Error: ${error.message}`);
                        throw error;
                    }
                }
            }
        }
        
        console.log('\n✅ Migration completed!');
        console.log('\n📋 What was applied:');
        console.log('  - Dropped logo column from experiences table');
        console.log('  - Created subscription_type enum (Basic, Pro, Vip)');
        console.log('  - Added subscription column to experiences table');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error(error);
        process.exit(1);
    } finally {
        await sql.end();
    }
}

// Run the migration
runMigration().catch(console.error);
