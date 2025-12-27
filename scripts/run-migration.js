#!/usr/bin/env node

/**
 * Run the migration to remove checkout columns and add credits/messages
 */

const postgres = require('postgres');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: ['.env.development.local', '.env.local', '.env'] });

async function runMigration() {
	const connectionString = process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING;
	if (!connectionString) {
		throw new Error('POSTGRES_URL or POSTGRES_URL_NON_POOLING environment variable is required');
	}

	const sql = postgres(connectionString, {
		max: 1,
		idle_timeout: 10,
		connect_timeout: 30,
		prepare: false,
		ssl: false,
	});

	try {
		// Read migration file
		const migrationPath = path.join(__dirname, '../drizzle/20251227155339_remove_checkout_add_credits_messages.sql');
		const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

		console.log('🔄 Running migration...');
		console.log('Migration SQL:');
		console.log(migrationSQL);

		// Execute migration
		await sql.unsafe(migrationSQL);

		console.log('✅ Migration completed successfully');
	} catch (error) {
		console.error('❌ Migration failed:', error);
		throw error;
	} finally {
		await sql.end();
	}
}

runMigration().catch((error) => {
	console.error('❌ Fatal error:', error);
	process.exit(1);
});

