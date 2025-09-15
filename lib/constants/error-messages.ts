/**
 * Shared error message constants for progressive error handling
 * Used across UserChat, DM monitoring, and other services
 */

export const PROGRESSIVE_ERROR_MESSAGES = {
  FIRST_ATTEMPT: "Please choose from the provided options above.",
  SECOND_ATTEMPT: "I'll inform the Whop owner about your request. Please wait for assistance.",
  THIRD_ATTEMPT: "I'm unable to help you further. Please contact the Whop owner directly.",
} as const;

export type ProgressiveErrorType = keyof typeof PROGRESSIVE_ERROR_MESSAGES;

/**
 * Get progressive error message based on attempt count
 */
export function getProgressiveErrorMessage(attemptCount: number): string {
  switch (attemptCount) {
    case 1:
      return PROGRESSIVE_ERROR_MESSAGES.FIRST_ATTEMPT;
    case 2:
      return PROGRESSIVE_ERROR_MESSAGES.SECOND_ATTEMPT;
    case 3:
    default:
      return PROGRESSIVE_ERROR_MESSAGES.THIRD_ATTEMPT;
  }
}

/**
 * UserPath metadata interface for consistent error tracking
 */
export interface UserPathMetadata {
  invalidResponseCount: number;
  lastInvalidResponseAt?: string;
  lastValidResponseAt?: string;
}

/**
 * Standardized UserPath structure
 */
export interface StandardizedUserPath {
  path: string[];
  metadata: UserPathMetadata;
}

/**
 * Parse userPath from database (handles both array and object formats)
 */
export function parseUserPath(userPath: any): StandardizedUserPath {
  if (Array.isArray(userPath)) {
    // Legacy array format
    return {
      path: userPath,
      metadata: {
        invalidResponseCount: 0,
      }
    };
  } else if (userPath && typeof userPath === 'object' && Array.isArray(userPath.path)) {
    // Object format with path array
    return {
      path: userPath.path,
      metadata: {
        invalidResponseCount: 0,
        ...userPath.metadata
      }
    };
  } else {
    // Fallback for unexpected formats
    return {
      path: [],
      metadata: {
        invalidResponseCount: 0,
      }
    };
  }
}

/**
 * Create updated userPath with new invalid response count
 */
export function createUpdatedUserPath(
  currentUserPath: StandardizedUserPath,
  newInvalidResponseCount: number
): StandardizedUserPath {
  return {
    path: currentUserPath.path,
    metadata: {
      ...currentUserPath.metadata,
      invalidResponseCount: newInvalidResponseCount,
      lastInvalidResponseAt: new Date().toISOString(),
    }
  };
}

/**
 * Create userPath with reset invalid response count
 */
export function createResetUserPath(
  currentUserPath: StandardizedUserPath
): StandardizedUserPath {
  return {
    path: currentUserPath.path,
    metadata: {
      ...currentUserPath.metadata,
      invalidResponseCount: 0,
      lastValidResponseAt: new Date().toISOString(),
    }
  };
}