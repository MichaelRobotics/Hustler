#!/usr/bin/env node

/**
 * Run the resource_type enum migration
 * This converts MY_PRODUCTS/AFFILIATE to LINK/FILE
 */

const postgres = require('postgres');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: ['.env.development.local', '.env.local', '.env'] });

async function runMigration() {
    console.log('🔄 Running resource_type enum migration...\n');

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
        const migrationFile = path.join(__dirname, '../drizzle/20250128000001_migrate_resource_type_enum.sql');
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
                        error.message.includes('column') && error.message.includes('does not exist')) {
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
        console.log('  - Converted type column from enum to text');
        console.log('  - Migrated MY_PRODUCTS and AFFILIATE values to LINK');
        console.log('  - Dropped old resource_type enum');
        console.log('  - Created new resource_type enum with LINK and FILE');
        console.log('  - Converted type column back to enum type');
        console.log('  - Made type NOT NULL');
        console.log('  - Re-added indexes');
        console.log('\n💡 You can now run: pnpm drizzle-kit push');

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


