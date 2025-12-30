/**
 * Script to cancel all trialing memberships for a specific user
 * 
 * Usage:
 *   npx tsx scripts/cancel-trialing-memberships.ts
 * 
 * Or with environment variables:
 *   WHOP_API_KEY=xxx NEXT_PUBLIC_WHOP_COMPANY_ID=xxx npx tsx scripts/cancel-trialing-memberships.ts
 */

// Load environment variables - try .env.local first, then .env
import * as dotenv from 'dotenv';
import * as path from 'path';
import Whop from '@whop/sdk';

// Load .env.local first, then .env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config(); // This will load .env if .env.local doesn't have all vars

// Configuration
const TARGET_USER_ID = 'user_L8YwhuixVcRCf';
const COMPANY_ID = process.env.NEXT_PUBLIC_WHOP_COMPANY_ID;

if (!process.env.WHOP_API_KEY) {
	throw new Error('WHOP_API_KEY environment variable is required');
}

if (!COMPANY_ID) {
	throw new Error('NEXT_PUBLIC_WHOP_COMPANY_ID environment variable is required');
}

async function cancelTrialingMemberships() {
	console.log('🚀 Starting cancellation of trialing memberships...');
	console.log(`   Target User ID: ${TARGET_USER_ID}`);
	console.log(`   Company ID: ${COMPANY_ID}`);
	console.log('');

	// Initialize Whop SDK client
	const client = new Whop({
		apiKey: process.env.WHOP_API_KEY!,
	});

	// Fetch all memberships for the company
	console.log('📋 Fetching memberships...');
	const memberships: any[] = [];
	
	try {
		for await (const membershipListResponse of client.memberships.list({ 
			company_id: COMPANY_ID 
		})) {
			memberships.push(membershipListResponse);
		}
		console.log(`   Found ${memberships.length} total memberships`);
	} catch (error) {
		console.error('❌ Error fetching memberships:', error);
		throw error;
	}

	// Filter memberships for the target user with "trialing" status
	const trialingMemberships = memberships.filter((membership: any) => {
		const membershipUserId = membership.user?.id;
		const membershipStatus = membership.status;
		return (
			membershipUserId === TARGET_USER_ID &&
			membershipStatus === 'trialing'
		);
	});

	console.log(`\n🔍 Found ${trialingMemberships.length} trialing membership(s) for user ${TARGET_USER_ID}`);

	if (trialingMemberships.length === 0) {
		console.log('✅ No trialing memberships to cancel.');
		return;
	}

	// Display memberships to be cancelled
	console.log('\n📝 Memberships to cancel:');
	trialingMemberships.forEach((membership: any, index: number) => {
		const planName = membership.plan?.title || membership.plan?.name || 'Unknown Plan';
		const planId = membership.plan?.id || 'N/A';
		console.log(
			`   ${index + 1}. Membership ID: ${membership.id}\n` +
			`      Plan: "${planName}" (${planId})\n` +
			`      Status: ${membership.status}\n` +
			`      Created: ${membership.created_at || 'N/A'}`
		);
	});

	// Confirm before cancelling
	console.log('\n⚠️  About to cancel the above memberships.');
	console.log('   Press Ctrl+C to abort, or wait 3 seconds to continue...\n');
	
	await new Promise(resolve => setTimeout(resolve, 3000));

	// Cancel each trialing membership
	let successCount = 0;
	let errorCount = 0;

	for (const membership of trialingMemberships) {
		try {
			console.log(`🔄 Cancelling membership ${membership.id}...`);
			const cancelledMembership = await client.memberships.cancel(membership.id);
			console.log(`   ✅ Successfully cancelled: ${cancelledMembership.id}`);
			successCount++;
		} catch (error: any) {
			console.error(`   ❌ Failed to cancel ${membership.id}:`, error.message || error);
			errorCount++;
		}
	}

	// Summary
	console.log('\n📊 Summary:');
	console.log(`   ✅ Successfully cancelled: ${successCount}`);
	console.log(`   ❌ Failed: ${errorCount}`);
	console.log(`   📋 Total processed: ${trialingMemberships.length}`);
}

// Run the script
cancelTrialingMemberships()
	.then(() => {
		console.log('\n✅ Script completed successfully.');
		process.exit(0);
	})
	.catch((error) => {
		console.error('\n❌ Script failed:', error);
		process.exit(1);
	});

