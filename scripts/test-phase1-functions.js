/**
 * Phase 1 Function Testing Script
 * 
 * Tests the core functions from user-join-actions.ts
 * Run with: node scripts/test-phase1-functions.js
 */

// Mock funnel flow for testing
const mockFunnelFlow = {
	startBlockId: "block_welcome",
	blocks: {
		block_welcome: {
			id: "block_welcome",
			message: "Welcome to our funnel! 🚀 Click below to get started.",
			options: [
				{
					text: "Get Started",
					nextBlockId: "block_offer"
				}
			]
		},
		block_offer: {
			id: "block_offer",
			message: "Here's our amazing offer!",
			options: []
		}
	},
	stages: []
};

// Test function: getWelcomeMessage (simplified version)
function getWelcomeMessage(funnelFlow) {
	try {
		if (!funnelFlow.startBlockId) {
			console.error("No startBlockId found in funnel flow");
			return null;
		}

		const startBlock = funnelFlow.blocks[funnelFlow.startBlockId];
		if (!startBlock) {
			console.error(`Start block ${funnelFlow.startBlockId} not found in funnel flow`);
			return null;
		}

		if (!startBlock.message || startBlock.message.trim() === "") {
			console.error("Start block has no message or empty message");
			return null;
		}

		return startBlock.message;
	} catch (error) {
		console.error("Error extracting welcome message:", error);
		return null;
	}
}

async function testPhase1Functions() {
	console.log("🧪 Testing Phase 1 Core Functions...\n");

	// Test 1: Welcome message extraction
	console.log("Test 1: Welcome Message Extraction");
	try {
		const welcomeMessage = getWelcomeMessage(mockFunnelFlow);
		if (welcomeMessage) {
			console.log("✅ Welcome message extracted successfully");
			console.log(`   Message: "${welcomeMessage}"`);
		} else {
			console.log("❌ Failed to extract welcome message");
		}
	} catch (error) {
		console.log("❌ Welcome message extraction failed:", error.message);
	}

	// Test 2: Invalid funnel flow handling
	console.log("\nTest 2: Invalid Funnel Flow Handling");
	try {
		const invalidFlow = { startBlockId: "nonexistent" };
		const result = getWelcomeMessage(invalidFlow);
		if (result === null) {
			console.log("✅ Invalid flow handled correctly (returned null)");
		} else {
			console.log("❌ Invalid flow should have returned null");
		}
	} catch (error) {
		console.log("❌ Invalid flow handling failed:", error.message);
	}

	// Test 3: Empty message handling
	console.log("\nTest 3: Empty Message Handling");
	try {
		const emptyFlow = {
			startBlockId: "empty_block",
			blocks: {
				empty_block: {
					id: "empty_block",
					message: "",
					options: []
				}
			}
		};
		const result = getWelcomeMessage(emptyFlow);
		if (result === null) {
			console.log("✅ Empty message handled correctly (returned null)");
		} else {
			console.log("❌ Empty message should have returned null");
		}
	} catch (error) {
		console.log("❌ Empty message handling failed:", error.message);
	}

	// Test 4: Missing startBlockId
	console.log("\nTest 4: Missing startBlockId Handling");
	try {
		const noStartFlow = {
			blocks: {
				some_block: {
					id: "some_block",
					message: "Some message",
					options: []
				}
			}
		};
		const result = getWelcomeMessage(noStartFlow);
		if (result === null) {
			console.log("✅ Missing startBlockId handled correctly (returned null)");
		} else {
			console.log("❌ Missing startBlockId should have returned null");
		}
	} catch (error) {
		console.log("❌ Missing startBlockId handling failed:", error.message);
	}

	console.log("\n🎉 Phase 1 Function Testing Complete!");
	console.log("\n📋 Next Steps for Full Testing:");
	console.log("1. Deploy a funnel with isDeployed = true");
	console.log("2. Create a test user and join the whop experience");
	console.log("3. Verify the webhook fires with user.joined action");
	console.log("4. Check that a DM is sent to the user");
	console.log("5. Verify a conversation record is created in the database");
	console.log("6. Test with multiple users and different experiences");
}

// Run tests
testPhase1Functions().catch(console.error);
