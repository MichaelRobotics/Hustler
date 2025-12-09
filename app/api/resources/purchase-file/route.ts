import { withWhopAuth, type AuthContext } from "@/lib/middleware/whop-auth";
import { NextRequest, NextResponse } from "next/server";
import { whopSdk } from "@/lib/whop-sdk";
import { db } from "@/lib/supabase/db-server";
import { resources } from "@/lib/supabase/schema";
import { eq } from "drizzle-orm";

async function purchaseFileHandler(
	request: NextRequest,
	context: AuthContext,
) {
	try {
		const { user } = context;
		const { resourceId, price, name } = await request.json();

		if (!resourceId) {
			return NextResponse.json(
				{ error: "Resource ID is required" },
				{ status: 400 }
			);
		}

		if (!price || price <= 0) {
			return NextResponse.json(
				{ error: "Invalid product price" },
				{ status: 400 }
			);
		}

		const userId = user.userId;
		const experienceId = user.experienceId;

		if (!userId || !experienceId) {
			return NextResponse.json(
				{ error: "User ID or Experience ID not available" },
				{ status: 400 }
			);
		}

		// Verify resource exists and belongs to user
		const [resource] = await db
			.select()
			.from(resources)
			.where(eq(resources.id, resourceId));

		if (!resource) {
			return NextResponse.json(
				{ error: "Product not found" },
				{ status: 404 }
			);
		}

		if (resource.experienceId !== experienceId) {
			return NextResponse.json(
				{ error: "Unauthorized" },
				{ status: 403 }
			);
		}

		if (resource.type !== "FILE") {
			return NextResponse.json(
				{ error: "Product is not a FILE type" },
				{ status: 400 }
			);
		}

		if (!resource.storageUrl) {
			return NextResponse.json(
				{ error: "Product file not available" },
				{ status: 400 }
			);
		}

		console.log(`Creating charge for FILE product ${resourceId}: $${price} for ${name}`);

		// Create charge using Whop SDK
		const result = await whopSdk.payments.chargeUser({
			amount: price,
			currency: "usd",
			userId: userId,
			description: `${name} - Digital Product`,
			metadata: {
				type: "file_product",
				resourceId: resourceId,
				productName: name,
				experienceId: experienceId,
			},
		});

		if (!result?.inAppPurchase) {
			throw new Error("Failed to create charge");
		}

		console.log("Charge created successfully:", result.inAppPurchase);

		return NextResponse.json(result.inAppPurchase);
	} catch (error) {
		console.error("Error creating charge:", error);
		return NextResponse.json(
			{ error: "Failed to create charge" },
			{ status: 500 }
		);
	}
}

export const POST = withWhopAuth(purchaseFileHandler);


