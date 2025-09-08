import { NextResponse } from "next/server";

/**
 * Comprehensive Error Handling for WHOP Authentication & Authorization
 * Provides standardized error responses and logging
 */

export interface ErrorDetails {
	code: string;
	message: string;
	status: number;
	category:
		| "AUTHENTICATION"
		| "AUTHORIZATION"
		| "VALIDATION"
		| "RESOURCE"
		| "SYSTEM";
	details?: any;
}

/**
 * Predefined error types for consistent error handling
 */
export const ERROR_TYPES = {
	// Authentication Errors
	MISSING_TOKEN: {
		code: "MISSING_TOKEN",
		message: "WHOP user token is required",
		status: 401,
		category: "AUTHENTICATION" as const,
	},
	INVALID_TOKEN: {
		code: "INVALID_TOKEN",
		message: "Invalid or expired WHOP user token",
		status: 401,
		category: "AUTHENTICATION" as const,
	},
	TOKEN_VERIFICATION_FAILED: {
		code: "TOKEN_VERIFICATION_FAILED",
		message: "Failed to verify WHOP user token",
		status: 401,
		category: "AUTHENTICATION" as const,
	},
	MISSING_COMPANY: {
		code: "MISSING_COMPANY",
		message: "Company ID is required for this operation",
		status: 400,
		category: "AUTHENTICATION" as const,
	},
	USER_CONTEXT_FAILED: {
		code: "USER_CONTEXT_FAILED",
		message: "Failed to create or retrieve user context",
		status: 401,
		category: "AUTHENTICATION" as const,
	},

	// Authorization Errors
	NO_ACCESS: {
		code: "NO_ACCESS",
		message: "User does not have access to this company",
		status: 403,
		category: "AUTHORIZATION" as const,
	},
	INSUFFICIENT_PERMISSIONS: {
		code: "INSUFFICIENT_PERMISSIONS",
		message: "Insufficient permissions for this operation",
		status: 403,
		category: "AUTHORIZATION" as const,
	},
	ADMIN_REQUIRED: {
		code: "ADMIN_REQUIRED",
		message: "Admin permissions are required for this operation",
		status: 403,
		category: "AUTHORIZATION" as const,
	},
	NO_EXPERIENCE_ACCESS: {
		code: "NO_EXPERIENCE_ACCESS",
		message: "You do not have access to this experience",
		status: 403,
		category: "AUTHORIZATION" as const,
	},
	NO_RESOURCE_ACCESS: {
		code: "NO_RESOURCE_ACCESS",
		message: "Insufficient permissions for this resource",
		status: 403,
		category: "AUTHORIZATION" as const,
	},
	INSUFFICIENT_CREDITS: {
		code: "INSUFFICIENT_CREDITS",
		message: "Not enough credits for this operation",
		status: 402,
		category: "AUTHORIZATION" as const,
	},

	// Validation Errors
	MISSING_REQUIRED_FIELDS: {
		code: "MISSING_REQUIRED_FIELDS",
		message: "Required fields are missing",
		status: 400,
		category: "VALIDATION" as const,
	},
	INVALID_INPUT: {
		code: "INVALID_INPUT",
		message: "Invalid input provided",
		status: 400,
		category: "VALIDATION" as const,
	},
	MISSING_RESOURCE_ID: {
		code: "MISSING_RESOURCE_ID",
		message: "Resource ID is required for this operation",
		status: 400,
		category: "VALIDATION" as const,
	},
	MISSING_EXPERIENCE_ID: {
		code: "MISSING_EXPERIENCE_ID",
		message: "Experience ID is required for this operation",
		status: 400,
		category: "VALIDATION" as const,
	},

	// Resource Errors
	RESOURCE_NOT_FOUND: {
		code: "RESOURCE_NOT_FOUND",
		message: "The requested resource does not exist",
		status: 404,
		category: "RESOURCE" as const,
	},
	FUNNEL_NOT_FOUND: {
		code: "FUNNEL_NOT_FOUND",
		message: "The requested funnel does not exist",
		status: 404,
		category: "RESOURCE" as const,
	},
	USER_NOT_FOUND: {
		code: "USER_NOT_FOUND",
		message: "User not found",
		status: 404,
		category: "RESOURCE" as const,
	},
	COMPANY_NOT_FOUND: {
		code: "COMPANY_NOT_FOUND",
		message: "Company not found",
		status: 404,
		category: "RESOURCE" as const,
	},

	// System Errors
	INTERNAL_ERROR: {
		code: "INTERNAL_ERROR",
		message: "An unexpected error occurred",
		status: 500,
		category: "SYSTEM" as const,
	},
	DATABASE_ERROR: {
		code: "DATABASE_ERROR",
		message: "Database operation failed",
		status: 500,
		category: "SYSTEM" as const,
	},
	WHOP_API_ERROR: {
		code: "WHOP_API_ERROR",
		message: "WHOP API request failed",
		status: 502,
		category: "SYSTEM" as const,
	},
	ACCESS_CHECK_FAILED: {
		code: "ACCESS_CHECK_FAILED",
		message: "Failed to verify access permissions",
		status: 500,
		category: "SYSTEM" as const,
	},
} as const;

/**
 * Create standardized error response
 */
export function createErrorResponse(
	errorType: keyof typeof ERROR_TYPES,
	customMessage?: string,
	details?: any,
): NextResponse {
	const error = ERROR_TYPES[errorType];

	const response = {
		success: false,
		error: error.category,
		message: customMessage || error.message,
		code: error.code,
		details: details || undefined,
	};

	// Log error for monitoring
	logError(error, customMessage, details);

	return NextResponse.json(response, { status: error.status });
}

/**
 * Create custom error response
 */
export function createCustomErrorResponse(
	message: string,
	status = 500,
	code = "CUSTOM_ERROR",
	category: ErrorDetails["category"] = "SYSTEM",
	details?: any,
): NextResponse {
	const response = {
		success: false,
		error: category,
		message,
		code,
		details: details || undefined,
	};

	// Log error for monitoring
	logError({ code, message, status, category }, message, details);

	return NextResponse.json(response, { status });
}

/**
 * Log error for monitoring and debugging
 */
function logError(
	error: ErrorDetails,
	customMessage?: string,
	details?: any,
): void {
	const logData = {
		timestamp: new Date().toISOString(),
		error: error.code,
		message: customMessage || error.message,
		status: error.status,
		category: error.category,
		details: details || undefined,
	};

	// Log based on error category
	switch (error.category) {
		case "AUTHENTICATION":
			console.warn("🔐 Authentication Error:", logData);
			break;
		case "AUTHORIZATION":
			console.warn("🚫 Authorization Error:", logData);
			break;
		case "VALIDATION":
			console.warn("⚠️ Validation Error:", logData);
			break;
		case "RESOURCE":
			console.warn("📦 Resource Error:", logData);
			break;
		case "SYSTEM":
			console.error("💥 System Error:", logData);
			break;
		default:
			console.error("❓ Unknown Error:", logData);
	}
}

/**
 * Handle and wrap unexpected errors
 */
export function handleUnexpectedError(error: unknown): NextResponse {
	console.error("💥 Unexpected Error:", error);

	if (error instanceof Error) {
		return createCustomErrorResponse(
			error.message,
			500,
			"UNEXPECTED_ERROR",
			"SYSTEM",
			{ stack: error.stack },
		);
	}

	return createCustomErrorResponse(
		"An unexpected error occurred",
		500,
		"UNEXPECTED_ERROR",
		"SYSTEM",
		{ error: String(error) },
	);
}

/**
 * Handle WHOP API errors
 */
export function handleWhopApiError(error: any): NextResponse {
	console.error("🔌 WHOP API Error:", error);

	const message = error?.message || "WHOP API request failed";
	const status = error?.status || 502;
	const code = error?.code || "WHOP_API_ERROR";

	return createCustomErrorResponse(message, status, code, "SYSTEM", {
		whopError: error,
		timestamp: new Date().toISOString(),
	});
}

/**
 * Handle database errors
 */
export function handleDatabaseError(error: any): NextResponse {
	console.error("🗄️ Database Error:", error);

	const message = error?.message || "Database operation failed";
	const code = error?.code || "DATABASE_ERROR";

	return createCustomErrorResponse(message, 500, code, "SYSTEM", {
		databaseError: error,
		timestamp: new Date().toISOString(),
	});
}

/**
 * Middleware wrapper for error handling
 */
export function withErrorHandling<T extends any[]>(
	handler: (...args: T) => Promise<NextResponse>,
) {
	return async (...args: T): Promise<NextResponse> => {
		try {
			return await handler(...args);
		} catch (error) {
			return handleUnexpectedError(error);
		}
	};
}

/**
 * Get error details for client-side error handling
 */
export function getErrorDetails(
	errorType: keyof typeof ERROR_TYPES,
): ErrorDetails {
	return ERROR_TYPES[errorType];
}

/**
 * Check if error is retryable
 */
export function isRetryableError(errorType: keyof typeof ERROR_TYPES): boolean {
	const retryableErrors = [
		"WHOP_API_ERROR",
		"DATABASE_ERROR",
		"ACCESS_CHECK_FAILED",
		"INTERNAL_ERROR",
	];

	return retryableErrors.includes(errorType);
}
