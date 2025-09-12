#!/usr/bin/env node

/**
 * Admin Credit Addition Script
 * Simple script to add credits to a specific user in a specific experience
 *
 * Usage: node add-credits.js <whopUserId> <experienceId> <creditsToAdd>
 * Example: node add-credits.js user_L8YwhuixVcRCf exp_wl5EtbHqAqLdjV 10
 */

require("dotenv").config({ path: ".env.local" });

const postgres = require("postgres");

async function addCredits(whopUserId, experienceId, creditsToAdd) {
	const sql = postgres(process.env.POSTGRES_URL);

	try {
		console.log(
			`🔧 Admin Tool: Adding ${creditsToAdd} credits to user: ${whopUserId} in experience: ${experienceId}`,
		);

		// First, find the experience by Whop Experience ID
		const experiences = await sql`
      SELECT id, whop_experience_id, whop_company_id 
      FROM experiences 
      WHERE whop_experience_id = ${experienceId}
    `;

		if (experiences.length === 0) {
			console.error(`❌ Experience not found: ${experienceId}`);
			console.log("💡 Make sure the experience ID is correct");
			return false;
		}

		const experience = experiences[0];
		console.log(`🏢 Found experience: ${experience.whop_experience_id} (Company: ${experience.whop_company_id})`);

		// Find user by WHOP user ID and experience ID (database UUID)
		const users = await sql`
      SELECT u.id, u.name, u.email, u.credits, u.access_level, u.experience_id
      FROM users u
      WHERE u.whop_user_id = ${whopUserId} 
      AND u.experience_id = ${experience.id}
    `;

		if (users.length === 0) {
			console.error(`❌ User not found: ${whopUserId} in experience: ${experienceId}`);
			console.log("💡 Make sure the user has logged in at least once to be created in the database");
			console.log("💡 Check that the user has access to this specific experience");
			return false;
		}

		const user = users[0];
		console.log(`👤 Found user: ${user.name} (${user.email})`);
		console.log(`🔐 Access level: ${user.access_level}`);
		console.log(`💰 Current credits: ${user.credits}`);

		// Calculate new credits
		const newCredits = Number.parseInt(user.credits) + creditsToAdd;

		// Update credits in database for this specific user-experience combination
		await sql`
      UPDATE users 
      SET credits = ${newCredits}, updated_at = NOW() 
      WHERE id = ${user.id} AND experience_id = ${experience.id}
    `;

		console.log(`✅ Successfully added ${creditsToAdd} credits!`);
		console.log(`💰 New credit balance: ${newCredits}`);
		console.log(`🏢 Experience: ${experienceId}`);
		console.log("🎉 Credits updated in database");

		return true;
	} catch (error) {
		console.error("❌ Error adding credits:", error.message);
		return false;
	} finally {
		await sql.end();
	}
}

// Get command line arguments
const args = process.argv.slice(2);

if (args.length !== 3) {
	console.log("🔧 Admin Credit Addition Tool");
	console.log("");
	console.log("Usage: node add-credits.js <whopUserId> <experienceId> <creditsToAdd>");
	console.log("");
	console.log("Examples:");
	console.log("  node add-credits.js user_L8YwhuixVcRCf exp_wl5EtbHqAqLdjV 10");
	console.log("  node add-credits.js user_L8YwhuixVcRCf exp_wl5EtbHqAqLdjV 50");
	console.log("");
	console.log("💡 Note: This script now requires both user ID and experience ID for security");
	process.exit(1);
}

const [whopUserId, experienceId, creditsToAdd] = args;
const credits = Number.parseInt(creditsToAdd);

if (isNaN(credits)) {
	console.error("❌ Credits must be a number");
	process.exit(1);
}

// Validate experience ID format
if (!experienceId.startsWith('exp_')) {
	console.error("❌ Experience ID must start with 'exp_' (Whop Experience ID format)");
	console.log("💡 Example: exp_wl5EtbHqAqLdjV");
	process.exit(1);
}

// Run the script
addCredits(whopUserId, experienceId, credits)
	.then((success) => {
		if (success) {
			console.log("🎉 Admin operation completed successfully!");
		} else {
			console.log("❌ Admin operation failed");
		}
		process.exit(success ? 0 : 1);
	})
	.catch((error) => {
		console.error("💥 Script failed:", error);
		process.exit(1);
	});
