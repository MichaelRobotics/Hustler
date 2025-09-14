import { validateToken } from "@whop-apps/sdk";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Simple WHOP Authentication using validateToken from @whop-apps/sdk
 * Based on WHOP documentation examples
 */

export interface WhopUser {
	userId: string;
	experienceId?: string;
}

export interface AuthContext {
	user: WhopUser;
	isAuthenticated: boolean;
}

/**
 * Simple WHOP authentication using validateToken
 */
export async function authenticateWhopUser(
	request?: NextRequest,
): Promise<AuthContext | null> {
	try {
		const headersList = await headers();
		const { userId } = await validateToken({ headers: headersList });

		if (!userId) {
			console.log("No valid WHOP user token found");
			return null;
		}

		// Extract experienceId from request URL or headers
		let experienceId: string | undefined;
		if (request) {
			// First try to get from X-Experience-ID header (for API calls)
			experienceId = request.headers.get("X-Experience-ID") || undefined;
			console.log("🔍 Middleware - X-Experience-ID header:", experienceId);
			
			// If not in header, try to extract from URL path
			if (!experienceId) {
				const url = new URL(request.url);
				const pathParts = url.pathname.split("/");
				const experienceIndex = pathParts.indexOf("experiences");
				experienceId =
					experienceIndex !== -1 && pathParts[experienceIndex + 1]
						? pathParts[experienceIndex + 1]
						: undefined;
				console.log("🔍 Middleware - URL experience ID:", experienceId);
			}
			
			// If still no experienceId, try to get from URL query parameters
			if (!experienceId) {
				const url = new URL(request.url);
				experienceId = url.searchParams.get("experienceId") || undefined;
				console.log("🔍 Middleware - Query experience ID:", experienceId);
			}
		}
		console.log("🔍 Middleware - Final experienceId:", experienceId);

		return {
			user: { userId, experienceId },
			isAuthenticated: true,
		};
	} catch (error) {
		console.error("WHOP authentication error:", error);
		return null;
	}
}

/**
 * Middleware wrapper for WHOP authenticated routes
 */
export function withWhopAuth(
	handler: (
		request: NextRequest,
		context: AuthContext,
	) => Promise<NextResponse>,
) {
	return async (request: NextRequest): Promise<NextResponse> => {
		const authContext = await authenticateWhopUser(request);

		if (!authContext?.isAuthenticated) {
			return NextResponse.json(
				{ error: "Valid WHOP user token required" },
				{ status: 401 },
			);
		}

		return handler(request, authContext);
	};
}

/**
 * Get user ID from WHOP token (for use in API routes)
 */
export async function getWhopUserId(): Promise<string | null> {
	try {
		const headersList = await headers();
		const { userId } = await validateToken({ headers: headersList });
		return userId || null;
	} catch (error) {
		console.error("Error getting WHOP user ID:", error);
		return null;
	}
}

/**
 * Simple resource auth functions for backward compatibility
 * These are simplified versions that just use WHOP auth
 */
export function withFunnelAuth(
	handler: (
		request: NextRequest,
		context: AuthContext,
	) => Promise<NextResponse>,
) {
	return withWhopAuth(handler);
}

export function withResourceAuth(
	handler: (
		request: NextRequest,
		context: AuthContext,
	) => Promise<NextResponse>,
) {
	return withWhopAuth(handler);
}

export function withConversationAuth(
	handler: (
		request: NextRequest,
		context: AuthContext,
	) => Promise<NextResponse>,
) {
	return withWhopAuth(handler);
}

export function withAdminAuth(
	handler: (
		request: NextRequest,
		context: AuthContext,
	) => Promise<NextResponse>,
) {
	return withWhopAuth(handler);
}

export function withCustomerAuth(
	handler: (
		request: NextRequest,
		context: AuthContext,
	) => Promise<NextResponse>,
) {
	return withWhopAuth(handler);
}

/**
 * Simple response helpers for backward compatibility
 */
export function createSuccessResponse<T>(
	data: T,
	message?: string,
	status = 200,
) {
	return NextResponse.json({ success: true, data, message }, { status });
}

export function createErrorResponse(
	error: string,
	message: string,
	status = 500,
) {
	return NextResponse.json({ success: false, error, message }, { status });
}
