// Authentication Middleware
export {
  authenticateRequest,
  withAuth,
  withAdminAuth,
  withCustomerAuth,
  type AuthenticatedUser,
  type AuthContext
} from './auth';

// Authorization Middleware
export {
  checkExperienceAccess,
  checkCompanyAccess,
  checkFunnelAccess,
  checkResourceAccess,
  checkConversationAccess,
  checkCreditsAccess,
  withResourceAccess,
  withCreditsAccess,
  withExperienceAccess,
  type AuthorizationContext
} from './authorization';

// Route Protection Middleware
export {
  withRouteProtection,
  withAdminProtection,
  withCustomerProtection,
  withCreditsProtection,
  withExperienceProtection,
  withResourceProtection,
  getUserFromRequest,
  createSuccessResponse,
  extractWhopToken,
  extractCompanyId,
  extractExperienceId,
  type ProtectedRouteContext,
  type ErrorResponse,
  type SuccessResponse
} from './route-protection';

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
  createErrorResponse,
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
