/**
 * Cron Authentication Middleware
 * 
 * Provides authentication and rate limiting for cron endpoints
 */

import { NextRequest, NextResponse } from "next/server";
import { createErrorResponse } from "./whop-auth";
import { rateLimiter } from "./rate-limiter";

/**
 * Authenticate cron endpoint request
 */
export function authenticateCronRequest(request: NextRequest): NextResponse | null {
  const authHeader = request.headers.get('authorization');
  const cronApiKey = process.env.CRON_API_KEY;
  
  if (!cronApiKey) {
    console.error("[Cron Auth] CRON_API_KEY not configured");
    return createErrorResponse("CONFIG_ERROR", "Cron API key not configured");
  }
  
  if (authHeader !== `Bearer ${cronApiKey}`) {
    console.error("[Cron Auth] Invalid authentication");
    return createErrorResponse("UNAUTHORIZED", "Invalid cron API key");
  }

  return null; // Authentication successful
}

/**
 * Check rate limiting for cron endpoints
 */
export function checkCronRateLimit(tenantId: string = 'cron'): NextResponse | null {
  if (!rateLimiter.isAllowed(tenantId, 'cron_execution', 10, 60000)) { // 10 requests per minute
    console.error("[Cron Auth] Rate limited");
    return createErrorResponse("RATE_LIMITED", "Too many cron requests");
  }

  return null; // Rate limit check passed
}

/**
 * Validate experienceId format
 */
export function validateExperienceId(experienceId?: string): NextResponse | null {
  if (experienceId && !experienceId.startsWith('exp_')) {
    console.error(`[Cron Auth] Invalid experienceId format: ${experienceId}`);
    return createErrorResponse("INVALID_EXPERIENCE_ID", "Invalid experienceId format");
  }

  return null; // Validation passed
}

/**
 * Complete cron authentication and validation
 */
export function authenticateAndValidateCron(
  request: NextRequest, 
  experienceId?: string
): NextResponse | null {
  // Check authentication
  const authError = authenticateCronRequest(request);
  if (authError) return authError;

  // Check rate limiting
  const rateLimitError = checkCronRateLimit(experienceId);
  if (rateLimitError) return rateLimitError;

  // Validate experienceId if provided
  const validationError = validateExperienceId(experienceId);
  if (validationError) return validationError;

  return null; // All checks passed
}
