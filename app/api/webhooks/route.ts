import { addCredits, getCreditPack } from "@/lib/actions/credit-actions";
import type { CreditPackId } from "@/lib/types/credit";
import { waitUntil } from "@vercel/functions";
import { makeWebhookValidator } from "@whop/api";
import type { NextRequest } from "next/server";
import { handleUserJoinEvent } from "@/lib/actions/user-join-actions";
import { getWhopApiClient } from "@/lib/whop-api-client";
import { db } from "@/lib/supabase/db-server";
import { resources, experiences } from "@/lib/supabase/schema";
import { eq, and, isNotNull } from "drizzle-orm";

const validateWebhook = makeWebhookValidator({
	webhookSecret: process.env.WHOP_WEBHOOK_SECRET ?? "fallback",
});

export async function POST(request: NextRequest): Promise<Response> {
	// Parse the request body first
	let webhookData;
	try {
		webhookData = await request.json();
		console.log("Received webhook data:", webhookData);
	} catch (parseError) {
		console.error("Failed to parse request body:", parseError);
		return new Response("Invalid webhook request", { status: 400 });
	}

	// Check if this is a test request (bypass validation)
	const isTestRequest = request.headers.get('X-Test-Bypass') === 'true';
	
	if (!isTestRequest) {
		// Validate the webhook signature for production requests
		try {
			// Create a new request with the same body for validation
			const validationRequest = new Request(request.url, {
				method: request.method,
				headers: request.headers,
				body: JSON.stringify(webhookData),
			});
			
			await validateWebhook(validationRequest);
			console.log("Webhook signature validation passed");
		} catch (error) {
			console.error("Webhook signature validation failed:", error);
			return new Response("Invalid webhook signature", { status: 401 });
		}
	} else {
		console.log("Skipping signature validation for test request");
	}

	// Handle the webhook event
	if (webhookData.action === "payment.succeeded") {
		const { id, final_amount, amount_after_fees, currency, user_id, metadata } =
			webhookData.data;

		// final_amount is the amount the user paid
		// amount_after_fees is the amount that is received by you, after card fees and processing fees are taken out

		console.log(
			`Payment ${id} succeeded for ${user_id} with amount ${final_amount} ${currency}`,
		);

		// Check if this is a credit pack purchase
		if (
			metadata?.type === "credit_pack" &&
			metadata?.packId &&
			metadata?.credits
		) {
			waitUntil(
				handleCreditPackPurchase(
					user_id,
					metadata.packId as CreditPackId,
					metadata.credits as number,
					id,
					metadata?.experienceId as string, // Pass experienceId from metadata
				),
			);
		} else {
			// Handle other payment types
			waitUntil(
				potentiallyLongRunningHandler(
					user_id,
					final_amount,
					currency,
					amount_after_fees,
				),
			);
		}
	} else if (webhookData.action === "membership.went_valid") {
		const { user_id, product_id } = webhookData.data;

		console.log(
			`Membership went valid: User ${user_id} joined product ${product_id}`,
		);

		// Handle user join event asynchronously
		// Note: We need to map product_id to experience_id
		if (user_id && product_id) {
			waitUntil(
				handleUserJoinEvent(user_id, product_id, webhookData),
			);
		} else {
			console.error("Missing user_id or product_id in membership webhook");
		}
	} else if (webhookData.action === "app_membership_went_valid") {
		const { company_id, app_id, user_id } = webhookData.data;

		console.log(
			`App membership went valid: User ${user_id} got access to app ${app_id} for company ${company_id}`,
		);

		// Handle app membership - sync apps to resources when user gets access
		if (company_id) {
			waitUntil(
				handleAppMembershipValid(company_id, app_id, user_id),
			);
		} else {
			console.error("Missing company_id in app membership webhook");
		}
	}

	// Make sure to return a 2xx status code quickly. Otherwise the webhook will be retried.
	return new Response("OK", { status: 200 });
}

async function handleCreditPackPurchase(
	user_id: string | null | undefined,
	packId: CreditPackId,
	credits: number,
	paymentId: string,
	experienceId?: string,
) {
	if (!user_id) {
		console.error("No user_id provided for credit pack purchase");
		return;
	}

	// Use provided experienceId or fallback to environment variable
	const expId = experienceId || process.env.NEXT_PUBLIC_WHOP_EXPERIENCE_ID || "";
	
	if (!expId) {
		console.error("No experienceId available for credit pack purchase");
		return;
	}

	try {
		console.log(
			`Processing credit pack purchase: ${packId} for user ${user_id} in experience ${expId}`,
		);

		// Add credits to user's balance for specific experience
		await addCredits(user_id, expId, credits);

		// Get pack info for logging
		const pack = await getCreditPack(packId);
		console.log(
			`Successfully added ${credits} credits to user ${user_id} from ${pack.name} purchase`,
		);

		// You could also send a notification to the user here
		// await whopSdk.notifications.sendNotification({
		//   userId: user_id,
		//   title: 'Credits Added!',
		//   message: `You've received ${credits} credits from your ${pack.name} purchase!`
		// });
	} catch (error) {
		console.error("Error processing credit pack purchase:", error);
		// In production, you might want to implement retry logic or alerting here
	}
}

async function potentiallyLongRunningHandler(
	_user_id: string | null | undefined,
	_amount: number,
	_currency: string,
	_amount_after_fees: number | null | undefined,
) {
	// This is a placeholder for a potentially long running operation
	// In a real scenario, you might need to fetch user data, update a database, etc.
}

async function handleAppMembershipValid(companyId: string, appId: string, userId: string) {
	try {
		console.log(`Handling app membership valid for company ${companyId}, app ${appId}, user ${userId}`);
		
		// Check if the user is the company owner/admin
		const whopClient = getWhopApiClient();
		const userAccess = await whopClient.checkIfUserHasAccessToCompany(companyId, userId);
		
		// Only proceed if user is admin/owner of the company
		if (!userAccess.hasAccess || userAccess.accessLevel !== "admin") {
			console.log(`User ${userId} is not an admin of company ${companyId}, skipping app sync`);
			return;
		}
		
		console.log(`User ${userId} is admin of company ${companyId}, proceeding with app sync`);
		
		// Get experience ID from company ID
		const experience = await db.select()
			.from(experiences)
			.where(eq(experiences.whopCompanyId, companyId))
			.limit(1);
		
		if (experience.length === 0) {
			console.error(`No experience found for company ${companyId}`);
			return;
		}
		
		const experienceId = experience[0].id;
		
		// Check if this experience has already been synced for apps
		const existingAppResources = await db.select()
			.from(resources)
			.where(
				and(
					eq(resources.experienceId, experienceId),
					eq(resources.type, "MY_PRODUCTS"),
					eq(resources.category, "FREE_VALUE"),
					isNotNull(resources.whopAppId)
				)
			)
			.limit(1);
		
		if (existingAppResources.length > 0) {
			console.log(`Apps already synced for experience ${experienceId}`);
			return;
		}
		
		// Sync all apps when company owner gets access to any app (one-time only)
		const apps = await whopClient.getInstalledApps(companyId);
		
		for (const app of apps) {
			const resourceData = {
				experienceId,
				userId: "system",
				name: app.name || app.description || `App ${app.id}`,
				type: "MY_PRODUCTS" as const,
				category: "FREE_VALUE" as const,
				link: `https://whop.com/hub/${companyId}/${app.id}?ref=${experienceId}`,
				description: app.description,
				whopAppId: app.id,
				whopProductId: null,
				whopMembershipId: null
			};
			
			await db.insert(resources).values(resourceData);
		}
		
		console.log(`Synced ${apps.length} apps for experience ${experienceId} when company owner ${userId} got access to app ${appId}`);
	} catch (error) {
		console.error("Error handling app membership valid:", error);
	}
}

