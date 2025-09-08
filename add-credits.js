#!/usr/bin/env node

/**
 * Admin Credit Addition Script
 * Simple script to add credits to a specific user
 *
 * Usage: node add-credits.js <whopUserId> <creditsToAdd>
 * Example: node add-credits.js user_L8YwhuixVcRCf 10
 */

require("dotenv").config({ path: ".env.local" });

const postgres = require("postgres");

async function addCredits(whopUserId, creditsToAdd) {
	const sql = postgres(process.env.POSTGRES_URL);

	try {
		console.log(
			`🔧 Admin Tool: Adding ${creditsToAdd} credits to user: ${whopUserId}`,
		);

		// Find user by WHOP user ID
		const users = await sql`
      SELECT id, name, email, credits 
      FROM users 
      WHERE whop_user_id = ${whopUserId}
    `;

		if (users.length === 0) {
			console.error(`❌ User not found: ${whopUserId}`);
			console.log(
				"💡 Make sure the user has logged in at least once to be created in the database",
			);
			return false;
		}

		const user = users[0];
		console.log(`👤 Found user: ${user.name} (${user.email})`);
		console.log(`💰 Current credits: ${user.credits}`);

		// Calculate new credits
		const newCredits = Number.parseInt(user.credits) + creditsToAdd;

		// Update credits in database
		await sql`
      UPDATE users 
      SET credits = ${newCredits}, updated_at = NOW() 
      WHERE id = ${user.id}
    `;

		console.log(`✅ Successfully added ${creditsToAdd} credits!`);
		console.log(`💰 New credit balance: ${newCredits}`);
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

if (args.length !== 2) {
	console.log("🔧 Admin Credit Addition Tool");
	console.log("");
	console.log("Usage: node add-credits.js <whopUserId> <creditsToAdd>");
	console.log("");
	console.log("Examples:");
	console.log("  node add-credits.js user_L8YwhuixVcRCf 10");
	console.log("  node add-credits.js user_L8YwhuixVcRCf 50");
	console.log("");
	process.exit(1);
}

const [whopUserId, creditsToAdd] = args;
const credits = Number.parseInt(creditsToAdd);

if (isNaN(credits) || credits <= 0) {
	console.error("❌ Credits must be a positive number");
	process.exit(1);
}

// Run the script
addCredits(whopUserId, credits)
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
