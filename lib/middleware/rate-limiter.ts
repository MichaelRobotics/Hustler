/**
 * Multi-Tenant Rate Limiter for MVP Scale
 * 
 * Per-tenant rate limiting with proper isolation
 * Each tenant (experience) gets their own rate limit bucket
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface TenantRateLimitEntry {
  tenantId: string;
  limits: Map<string, RateLimitEntry>;
  lastActivity: number;
}

class MultiTenantRateLimiter {
  private tenantLimits = new Map<string, TenantRateLimitEntry>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Check if request is within rate limit for a specific tenant
   * @param tenantId - Tenant identifier (experienceId)
   * @param key - Unique identifier (userId, IP, etc.)
   * @param limit - Maximum requests per window
   * @param windowMs - Time window in milliseconds
   * @returns true if within limit, false if rate limited
   */
  isAllowed(tenantId: string, key: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    
    // Get or create tenant entry
    let tenantEntry = this.tenantLimits.get(tenantId);
    if (!tenantEntry) {
      tenantEntry = {
        tenantId,
        limits: new Map(),
        lastActivity: now,
      };
      this.tenantLimits.set(tenantId, tenantEntry);
    }

    // Update last activity
    tenantEntry.lastActivity = now;

    // Get or create limit entry for this key
    const entry = tenantEntry.limits.get(key);

    if (!entry || now > entry.resetTime) {
      // First request or window expired
      tenantEntry.limits.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });
      return true;
    }

    if (entry.count >= limit) {
      return false; // Rate limited
    }

    // Increment counter
    entry.count++;
    return true;
  }

  /**
   * Get remaining requests for a key within a tenant
   */
  getRemaining(tenantId: string, key: string, limit: number, windowMs: number): number {
    const tenantEntry = this.tenantLimits.get(tenantId);
    if (!tenantEntry) {
      return limit;
    }
    
    const entry = tenantEntry.limits.get(key);
    if (!entry || Date.now() > entry.resetTime) {
      return limit;
    }
    return Math.max(0, limit - entry.count);
  }

  /**
   * Get reset time for a key within a tenant
   */
  getResetTime(tenantId: string, key: string): number | null {
    const tenantEntry = this.tenantLimits.get(tenantId);
    if (!tenantEntry) {
      return null;
    }
    
    const entry = tenantEntry.limits.get(key);
    return entry ? entry.resetTime : null;
  }

  /**
   * Get tenant statistics
   */
  getTenantStats(tenantId: string): {
    activeKeys: number;
    totalRequests: number;
    lastActivity: number;
  } {
    const tenantEntry = this.tenantLimits.get(tenantId);
    if (!tenantEntry) {
      return {
        activeKeys: 0,
        totalRequests: 0,
        lastActivity: 0,
      };
    }

    let totalRequests = 0;
    for (const entry of tenantEntry.limits.values()) {
      totalRequests += entry.count;
    }

    return {
      activeKeys: tenantEntry.limits.size,
      totalRequests,
      lastActivity: tenantEntry.lastActivity,
    };
  }

  private cleanup() {
    const now = Date.now();
    const INACTIVE_TENANT_TIMEOUT = 30 * 60 * 1000; // 30 minutes
    
    for (const [tenantId, tenantEntry] of this.tenantLimits.entries()) {
      // Clean up expired entries within tenant
      for (const [key, entry] of tenantEntry.limits.entries()) {
        if (now > entry.resetTime) {
          tenantEntry.limits.delete(key);
        }
      }
      
      // Remove inactive tenants
      if (now - tenantEntry.lastActivity > INACTIVE_TENANT_TIMEOUT) {
        this.tenantLimits.delete(tenantId);
      }
    }
  }

  destroy() {
    clearInterval(this.cleanupInterval);
    this.tenantLimits.clear();
  }
}

// Multi-tenant rate limiter instance
export const rateLimiter = new MultiTenantRateLimiter();

// Legacy RateLimiter for backward compatibility
class LegacyRateLimiter {
  private limits = new Map<string, RateLimitEntry>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  isAllowed(key: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    const entry = this.limits.get(key);

    if (!entry || now > entry.resetTime) {
      this.limits.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });
      return true;
    }

    if (entry.count >= limit) {
      return false;
    }

    entry.count++;
    return true;
  }

  getRemaining(key: string, limit: number, windowMs: number): number {
    const entry = this.limits.get(key);
    if (!entry || Date.now() > entry.resetTime) {
      return limit;
    }
    return Math.max(0, limit - entry.count);
  }

  getResetTime(key: string): number | null {
    const entry = this.limits.get(key);
    return entry ? entry.resetTime : null;
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.limits.entries()) {
      if (now > entry.resetTime) {
        this.limits.delete(key);
      }
    }
  }

  destroy() {
    clearInterval(this.cleanupInterval);
    this.limits.clear();
  }
}

// Legacy rate limiter for backward compatibility
export const legacyRateLimiter = new LegacyRateLimiter();

/**
 * Rate limiting configurations for different endpoints
 */
export const RATE_LIMITS = {
  // Message processing: 30 messages per minute per user
  MESSAGE_PROCESSING: {
    limit: 30,
    windowMs: 60 * 1000, // 1 minute
  },
  
  // Conversation loading: 60 requests per minute per user
  CONVERSATION_LOADING: {
    limit: 60,
    windowMs: 60 * 1000, // 1 minute
  },
  
  // Admin operations: 10 requests per minute per user
  ADMIN_OPERATIONS: {
    limit: 10,
    windowMs: 60 * 1000, // 1 minute
  },
  
  // WebSocket connections: 5 per minute per IP
  WEBSOCKET_CONNECTION: {
    limit: 5,
    windowMs: 60 * 1000, // 1 minute
  },
} as const;

/**
 * Multi-tenant rate limiting middleware for API routes
 */
export function withTenantRateLimit(
  tenantId: string,
  key: string,
  limit: number,
  windowMs: number,
  errorMessage: string = "Rate limit exceeded"
) {
  return (handler: Function) => {
    return async (request: any, ...args: any[]) => {
      const isAllowed = rateLimiter.isAllowed(tenantId, key, limit, windowMs);
      
      if (!isAllowed) {
        const resetTime = rateLimiter.getResetTime(tenantId, key);
        const retryAfter = resetTime ? Math.ceil((resetTime - Date.now()) / 1000) : 60;
        
        return new Response(
          JSON.stringify({
            error: errorMessage,
            retryAfter,
            resetTime: resetTime ? new Date(resetTime).toISOString() : null,
            tenantId,
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': retryAfter.toString(),
              'X-RateLimit-Limit': limit.toString(),
              'X-RateLimit-Remaining': rateLimiter.getRemaining(tenantId, key, limit, windowMs).toString(),
              'X-RateLimit-Reset': resetTime ? new Date(resetTime).toISOString() : new Date(Date.now() + windowMs).toISOString(),
              'X-Tenant-ID': tenantId,
            },
          }
        );
      }
      
      return handler(request, ...args);
    };
  };
}

/**
 * Helper function to extract tenant ID from AuthContext (proper multi-tenancy)
 */
export function extractTenantIdFromContext(context: { user: { experienceId?: string } }): string | null {
  try {
    // Get experienceId from authenticated user context (proper way)
    const tenantId = context.user.experienceId;
    
    if (tenantId) {
      return tenantId;
    }

    return null;
  } catch (error) {
    console.error('Error extracting tenant ID from context:', error);
    return null;
  }
}

/**
 * WHOP Auth-compatible rate limiting middleware (uses AuthContext)
 */
export function withWhopTenantRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  errorMessage: string = "Rate limit exceeded"
) {
  return (handler: (request: any, context: any) => Promise<any>) => {
    return async (request: any, context: any) => {
      const tenantId = extractTenantIdFromContext(context);
      
      if (!tenantId) {
        return new Response(
          JSON.stringify({
            error: "Experience ID required for rate limiting",
            message: "User must be authenticated with a valid experience ID",
          }),
          {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
      }

      const isAllowed = rateLimiter.isAllowed(tenantId, key, limit, windowMs);
      
      if (!isAllowed) {
        const resetTime = rateLimiter.getResetTime(tenantId, key);
        const retryAfter = resetTime ? Math.ceil((resetTime - Date.now()) / 1000) : 60;
        
        return new Response(
          JSON.stringify({
            error: errorMessage,
            retryAfter,
            resetTime: resetTime ? new Date(resetTime).toISOString() : null,
            tenantId,
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': retryAfter.toString(),
              'X-RateLimit-Limit': limit.toString(),
              'X-RateLimit-Remaining': rateLimiter.getRemaining(tenantId, key, limit, windowMs).toString(),
              'X-RateLimit-Reset': resetTime ? new Date(resetTime).toISOString() : new Date(Date.now() + windowMs).toISOString(),
              'X-Tenant-ID': tenantId,
            },
          }
        );
      }
      
      return handler(request, context);
    };
  };
}

/**
 * Legacy rate limiting middleware for backward compatibility
 */
export function withRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  errorMessage: string = "Rate limit exceeded"
) {
  return (handler: Function) => {
    return async (request: any, ...args: any[]) => {
      const isAllowed = legacyRateLimiter.isAllowed(key, limit, windowMs);
      
      if (!isAllowed) {
        const resetTime = legacyRateLimiter.getResetTime(key);
        const retryAfter = resetTime ? Math.ceil((resetTime - Date.now()) / 1000) : 60;
        
        return new Response(
          JSON.stringify({
            error: errorMessage,
            retryAfter,
            resetTime: resetTime ? new Date(resetTime).toISOString() : null,
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': retryAfter.toString(),
              'X-RateLimit-Limit': limit.toString(),
              'X-RateLimit-Remaining': legacyRateLimiter.getRemaining(key, limit, windowMs).toString(),
              'X-RateLimit-Reset': resetTime ? new Date(resetTime).toISOString() : new Date(Date.now() + windowMs).toISOString(),
            },
          }
        );
      }
      
      return handler(request, ...args);
    };
  };
}




