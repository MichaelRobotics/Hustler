// Simple WHOP Authentication Middleware
export {
  authenticateWhopUser,
  withWhopAuth,
  getWhopUserId,
  withFunnelAuth,
  withResourceAuth,
  withConversationAuth,
  createSuccessResponse,
  createErrorResponse,
  type WhopUser,
  type AuthContext
} from './whop-auth';

// User Context Management
export {
  getUserContext,
  updateUserCredits,
  getUserCredits,
  invalidateUserCache,
  getCacheStats,
  clearCache,
  type UserContext
} from '../context/user-context';

// Error Handling
export {
  createCustomErrorResponse,
  handleUnexpectedError,
  handleWhopApiError,
  handleDatabaseError,
  withErrorHandling,
  getErrorDetails,
  isRetryableError,
  ERROR_TYPES,
  type ErrorDetails
} from './error-handling';
