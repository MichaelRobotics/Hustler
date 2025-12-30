import { NextRequest, NextResponse } from "next/server";
import { withWhopAuth, type AuthContext } from "@/lib/middleware/whop-auth";
import { db } from "@/lib/supabase/db-server";
import { orders, experiences } from "@/lib/supabase/schema";
import { eq, and, desc, count, sql } from "drizzle-orm";

export const dynamic = 'force-dynamic';

/**
 * GET /api/orders - Fetch orders for the current company
 * 
 * Query params:
 * - page: number (default: 1)
 * - limit: number (default: 20)
 */
async function getOrdersHandler(
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

		// Get query parameters
		const { searchParams } = new URL(request.url);
		const page = parseInt(searchParams.get("page") || "1", 10);
		const limit = parseInt(searchParams.get("limit") || "20", 10);
		const offset = (page - 1) * limit;

		// Resolve Whop experience ID to database UUID if needed
		let resolvedExperienceId = experienceId;
		let whopCompanyId: string | null = null;

		if (experienceId.startsWith('exp_')) {
			const experience = await db.query.experiences.findFirst({
				where: eq(experiences.whopExperienceId, experienceId),
				columns: {
					id: true,
					whopCompanyId: true,
				},
			});

			if (experience) {
				resolvedExperienceId = experience.id;
				whopCompanyId = experience.whopCompanyId;
			} else {
				return NextResponse.json(
					{ error: "Experience not found" },
					{ status: 404 }
				);
			}
		} else {
			// If it's already a UUID, get the company ID
			const experience = await db.query.experiences.findFirst({
				where: eq(experiences.id, experienceId),
				columns: {
					whopCompanyId: true,
				},
			});

			if (experience) {
				whopCompanyId = experience.whopCompanyId;
			} else {
				return NextResponse.json(
					{ error: "Experience not found" },
					{ status: 404 }
				);
			}
		}

		if (!whopCompanyId) {
			return NextResponse.json(
				{ error: "Company ID not found for experience" },
				{ status: 404 }
			);
		}

		// Build where conditions: filter by company and customer access level
		const whereConditions = and(
			eq(orders.whopCompanyId, whopCompanyId),
			eq(orders.accessLevel, 'customer')
		);

		// Get total count
		const [totalResult] = await db
			.select({ count: count() })
			.from(orders)
			.where(whereConditions!);

		const total = totalResult.count;

		// Get paginated orders
		const ordersList = await db
			.select({
				id: orders.id,
				userName: orders.userName,
				email: orders.email,
				avatar: orders.avatar,
				prodName: orders.prodName,
				amount: orders.amount,
				createdAt: orders.createdAt,
				subscription: orders.subscription,
				planId: orders.planId,
				paymentId: orders.paymentId,
			})
			.from(orders)
			.where(whereConditions!)
			.orderBy(desc(orders.createdAt))
			.limit(limit)
			.offset(offset);

		return NextResponse.json({
			orders: ordersList.map((order: typeof ordersList[0]) => ({
				id: order.id,
				userName: order.userName,
				email: order.email,
				avatar: order.avatar,
				prodName: order.prodName,
				amount: order.amount,
				createdAt: order.createdAt,
				subscription: order.subscription,
				planId: order.planId,
				paymentId: order.paymentId,
			})),
			pagination: {
				page,
				limit,
				total,
				totalPages: Math.ceil(total / limit),
			},
		});
	} catch (error: any) {
		console.error("Error fetching orders:", error);
		return NextResponse.json(
			{ error: error.message || "Failed to fetch orders" },
			{ status: 500 }
		);
	}
}

export const GET = withWhopAuth(getOrdersHandler);


