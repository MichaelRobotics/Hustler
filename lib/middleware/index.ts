// Simplified Authentication Middleware
export {
  authenticateRequest,
  withAuth,
  withAdminAuth,
  withCustomerAuth,
  createSuccessResponse,
  createErrorResponse,
  type AuthenticatedUser,
  type AuthContext
} from './simple-auth';

// Simplified Resource Authorization Middleware
export {
  checkFunnelAccess,
  checkResourceAccess,
  checkConversationAccess,
  withFunnelAuth,
  withResourceAuth,
  withConversationAuth
} from './simple-resource-auth';

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
