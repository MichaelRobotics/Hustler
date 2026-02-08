import { type NextRequest, NextResponse } from "next/server";
import {
	getFunnelNotifications,
	upsertFunnelNotification,
	deleteFunnelNotification,
} from "../../../../../lib/actions/funnel-actions";
import { getUserContext } from "../../../../../lib/context/user-context";
import {
	type AuthContext,
	withWhopAuth,
} from "../../../../../lib/middleware/whop-auth";

/**
 * GET /api/funnels/[funnelId]/notifications - Get all notifications for a funnel
 */
async function getNotificationsHandler(
	request: NextRequest,
	context: AuthContext
) {
	try {
		const { user } = context;
		const funnelId = request.nextUrl.pathname.split("/")[3]; // Extract funnelId from path

		if (!user.experienceId) {
			return NextResponse.json(
				{ error: "Experience ID is required" },
				{ status: 400 }
			);
		}

		const userContext = await getUserContext(
			user.userId,
			"",
			user.experienceId,
			false,
		);

		if (!userContext) {
			return NextResponse.json(
				{ error: "User context not found" },
				{ status: 401 }
			);
		}

		const notifications = await getFunnelNotifications(userContext.user, funnelId);

		return NextResponse.json({
			success: true,
			data: notifications,
			message: "Notifications retrieved successfully",
		});
	} catch (error) {
		console.error("Error getting notifications:", error);
		return NextResponse.json(
			{ error: (error as Error).message },
			{ status: 500 }
		);
	}
}

/**
 * POST /api/funnels/[funnelId]/notifications - Create or update a notification
 */
async function upsertNotificationHandler(
	request: NextRequest,
	context: AuthContext
) {
	try {
		const { user } = context;
		const funnelId = request.nextUrl.pathname.split("/")[3]; // Extract funnelId from path
		const body = await request.json();

		if (!user.experienceId) {
			return NextResponse.json(
				{ error: "Experience ID is required" },
				{ status: 400 }
			);
		}

		const userContext = await getUserContext(
			user.userId,
			"",
			user.experienceId,
			false,
		);

		if (!userContext) {
			return NextResponse.json(
				{ error: "User context not found" },
				{ status: 401 }
			);
		}

		const notification = await upsertFunnelNotification(userContext.user, {
			...(body.id && { id: body.id }),
			funnelId,
			stageId: body.stageId,
			sequence: body.sequence,
			inactivityMinutes: body.inactivityMinutes,
			message: body.message,
			notificationType: body.notificationType,
			isReset: body.isReset ?? false,
			resetAction: body.resetAction,
			delayMinutes: body.delayMinutes,
		});

		return NextResponse.json({
			success: true,
			data: notification,
			message: "Notification saved successfully",
		});
	} catch (error) {
		console.error("Error upserting notification:", error);
		return NextResponse.json(
			{ error: (error as Error).message },
			{ status: 500 }
		);
	}
}

/**
 * DELETE /api/funnels/[funnelId]/notifications - Delete a notification
 */
async function deleteNotificationHandler(
	request: NextRequest,
	context: AuthContext
) {
	try {
		const { user } = context;
		const funnelId = request.nextUrl.pathname.split("/")[3]; // Extract funnelId from path
		const { searchParams } = new URL(request.url);
		const notificationId = searchParams.get("notificationId");

		if (!notificationId) {
			return NextResponse.json(
				{ error: "Notification ID is required" },
				{ status: 400 }
			);
		}

		if (!user.experienceId) {
			return NextResponse.json(
				{ error: "Experience ID is required" },
				{ status: 400 }
			);
		}

		const userContext = await getUserContext(
			user.userId,
			"",
			user.experienceId,
			false,
		);

		if (!userContext) {
			return NextResponse.json(
				{ error: "User context not found" },
				{ status: 401 }
			);
		}

		await deleteFunnelNotification(userContext.user, notificationId);

		return NextResponse.json({
			success: true,
			message: "Notification deleted successfully",
		});
	} catch (error) {
		console.error("Error deleting notification:", error);
		return NextResponse.json(
			{ error: (error as Error).message },
			{ status: 500 }
		);
	}
}

export const GET = withWhopAuth(getNotificationsHandler);
export const POST = withWhopAuth(upsertNotificationHandler);
export const DELETE = withWhopAuth(deleteNotificationHandler);
