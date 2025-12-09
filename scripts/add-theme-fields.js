#!/usr/bin/env node

/**
 * Add card, text, and welcomeColor fields to themes table
 */

const postgres = require('postgres');
require('dotenv').config({ path: ['.env.development.local', '.env.local', '.env'] });

const POSTGRES_URL = process.env.POSTGRES_URL;

if (!POSTGRES_URL) {
    console.error('❌ Missing POSTGRES_URL environment variable');
    process.exit(1);
}

async function runMigration() {
    console.log('🔄 Adding theme style fields to themes table...\n');

    const sql = postgres(POSTGRES_URL, {
        ssl: 'allow',
        max: 1,
    });

    try {
        const migrationSQL = `
            ALTER TABLE "themes" 
            ADD COLUMN IF NOT EXISTS "card" text,
            ADD COLUMN IF NOT EXISTS "text" text,
            ADD COLUMN IF NOT EXISTS "welcome_color" text;
        `;
        
        console.log('📋 Executing migration SQL...');
        console.log('  Adding: card, text, welcome_color columns to themes table');
        
        await sql.unsafe(migrationSQL);
        
        console.log('\n✅ Migration completed!');
        console.log('  - Added "card" column to themes table');
        console.log('  - Added "text" column to themes table');
        console.log('  - Added "welcome_color" column to themes table');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    } finally {
        await sql.end();
        process.exit(0);
    }
}

// Run the migration
runMigration().catch(console.error);
