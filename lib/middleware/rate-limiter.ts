/**
 * Rate Limiter Middleware for MVP Scale
 * 
 * Simple in-memory rate limiting for production use
 * For larger scale, consider Redis-based rate limiting
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private limits = new Map<string, RateLimitEntry>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Check if request is within rate limit
   * @param key - Unique identifier (userId, IP, etc.)
   * @param limit - Maximum requests per window
   * @param windowMs - Time window in milliseconds
   * @returns true if within limit, false if rate limited
   */
  isAllowed(key: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    const entry = this.limits.get(key);

    if (!entry || now > entry.resetTime) {
      // First request or window expired
      this.limits.set(key, {
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
   * Get remaining requests for a key
   */
  getRemaining(key: string, limit: number, windowMs: number): number {
    const entry = this.limits.get(key);
    if (!entry || Date.now() > entry.resetTime) {
      return limit;
    }
    return Math.max(0, limit - entry.count);
  }

  /**
   * Get reset time for a key
   */
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

// Global rate limiter instance
export const rateLimiter = new RateLimiter();

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
 * Rate limiting middleware for API routes
 */
export function withRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  errorMessage: string = "Rate limit exceeded"
) {
  return (handler: Function) => {
    return async (request: any, ...args: any[]) => {
      const isAllowed = rateLimiter.isAllowed(key, limit, windowMs);
      
      if (!isAllowed) {
        const resetTime = rateLimiter.getResetTime(key);
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
              'X-RateLimit-Remaining': rateLimiter.getRemaining(key, limit, windowMs).toString(),
              'X-RateLimit-Reset': resetTime ? new Date(resetTime).toISOString() : new Date(Date.now() + windowMs).toISOString(),
            },
          }
        );
      }
      
      return handler(request, ...args);
    };
  };
}



