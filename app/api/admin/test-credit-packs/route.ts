import { NextRequest, NextResponse } from "next/server";
import { withWhopAuth, type AuthContext } from "@/lib/middleware/whop-auth";
import { db } from "@/lib/supabase/db-server";
import { experiences, users } from "@/lib/supabase/schema";
import { eq, and } from "drizzle-orm";
import { addCredits } from "@/lib/actions/credit-actions";

/**
 * Add credits directly to user without triggering user context cleanup
 */
async function addCreditsDirect(
	userId: string,
	experienceId: string,
	amount: number,
): Promise<void> {
	try {
		// Get current credits
		const currentUser = await db
			.select({ credits: users.credits })
			.from(users)
			.where(eq(users.id, userId))
			.limit(1);

		if (currentUser.length === 0) {
			console.error("User not found for adding credits");
			return;
		}

		const currentCredits = currentUser[0].credits;
		const newCredits = currentCredits + amount;

		// Update credits directly in database
		await db
			.update(users)
			.set({
				credits: newCredits,
				updatedAt: new Date(),
			})
			.where(eq(users.id, userId));

		console.log(`Updated credits for user ${userId}: ${currentCredits} + ${amount} = ${newCredits}`);
	} catch (error) {
		console.error("Error adding credits directly:", error);
		throw error;
	}
}

// Credit pack mapping (same as chargeUser approach)
const CREDIT_PACK_MAPPING: Record<string, { packId: string; credits: number }> = {
	"pro": { packId: "pro", credits: 30 },
	"popular": { packId: "popular", credits: 15 },
	"starter": { packId: "starter", credits: 5 }
};

/**
 * POST /api/admin/test-credit-packs - Test credit pack purchase with authentication
 */
async function testCreditPackHandler(
	request: NextRequest,
	context: AuthContext,
) {
	try {
		const { user } = context;
		const experienceId = user.experienceId;
		
		if (!experienceId) {
			return NextResponse.json(
				{ error: "Experience ID required" },
				{ status: 400 }
			);
		}

		const { packId } = await request.json();

		if (!packId) {
			return NextResponse.json(
				{ error: "Missing required parameter: packId" },
				{ status: 400 }
			);
		}

		// Get real user ID from auth context
		const user_id = user.userId;
		
		// Get company ID from experience
		const experience = await db
			.select()
			.from(experiences)
			.where(eq(experiences.whopExperienceId, experienceId))
			.limit(1);

		if (experience.length === 0) {
			return NextResponse.json(
				{ error: `No experience found for experienceId: ${experienceId}` },
				{ status: 404 }
			);
		}

		const company_id = experience[0].whopCompanyId;

		// Validate packId exists in our mapping
		if (!CREDIT_PACK_MAPPING[packId]) {
			return NextResponse.json(
				{ error: `Invalid packId: ${packId}. Valid packs: ${Object.keys(CREDIT_PACK_MAPPING).join(", ")}` },
				{ status: 400 }
			);
		}

		const creditInfo = CREDIT_PACK_MAPPING[packId];
		console.log(`[Credit Pack Test] Testing: ${creditInfo.credits} credits for user ${user_id} from company ${company_id}`);

		// Use the experience we already found
		const experienceUuid = experience[0].id;
		console.log(`[Credit Pack Test] Found experience ${experienceUuid} for company ${company_id}`);

		// 2. Find user by user_id and experience_id
		const userRecord = await db
			.select()
			.from(users)
			.where(
				and(
					eq(users.whopUserId, user_id),
					eq(users.experienceId, experienceUuid)
				)
			)
			.limit(1);

		if (userRecord.length === 0) {
			return NextResponse.json(
				{ error: `No user found with whop_user_id ${user_id} in experience ${experienceUuid}` },
				{ status: 404 }
			);
		}

		const userId = userRecord[0].id;
		const currentCredits = userRecord[0].credits;
		console.log(`[Credit Pack Test] Found user ${userId} for whop_user_id ${user_id} in experience ${experienceUuid}. Current credits: ${currentCredits}`);

		// 3. Add credits directly to the user (bypass user context to avoid cleanup)
		await addCreditsDirect(userId, experienceUuid, creditInfo.credits);
		console.log(`[Credit Pack Test] Successfully added ${creditInfo.credits} credits to user ${userId} in experience ${experienceUuid}`);

		// 4. Get updated user data to return
		const updatedUser = await db
			.select({ credits: users.credits })
			.from(users)
			.where(eq(users.id, userId))
			.limit(1);

		return NextResponse.json({
			success: true,
			message: `Successfully added ${creditInfo.credits} credits`,
			data: {
				user_id,
				company_id,
				packId: packId,
				pack_id: creditInfo.packId,
				credits_added: creditInfo.credits,
				previous_credits: currentCredits,
				new_credits: updatedUser[0]?.credits || currentCredits + creditInfo.credits,
				experience_id: experienceUuid,
				user_db_id: userId
			}
		});

	} catch (error) {
		console.error("[Credit Pack Test] Error testing credit pack purchase:", error);
		return NextResponse.json(
			{ error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
			{ status: 500 }
		);
	}
}

// GET endpoint to show available test packs
export async function GET() {
	return NextResponse.json({
		message: "Credit Pack Test Endpoint",
		available_packs: CREDIT_PACK_MAPPING,
		usage: {
			method: "POST",
			required_fields: ["packId"],
			authentication: "Whop Auth required",
			example: {
				packId: "starter"
			}
		}
	});
}

// Export with authentication
export const POST = withWhopAuth(testCreditPackHandler);
