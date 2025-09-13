/**
 * Request Validation Middleware for Production
 * 
 * Validates and sanitizes incoming requests to prevent
 * malicious input and ensure data integrity
 */

import { NextRequest } from "next/server";

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedData?: any;
}

/**
 * Validate conversation ID format
 */
export function validateConversationId(conversationId: string): ValidationResult {
  const errors: string[] = [];
  
  if (!conversationId) {
    errors.push("Conversation ID is required");
  } else if (typeof conversationId !== "string") {
    errors.push("Conversation ID must be a string");
  } else if (conversationId.length < 10 || conversationId.length > 100) {
    errors.push("Conversation ID must be between 10 and 100 characters");
  } else if (!/^[a-zA-Z0-9-_]+$/.test(conversationId)) {
    errors.push("Conversation ID contains invalid characters");
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitizedData: conversationId?.trim(),
  };
}

/**
 * Validate experience ID format
 */
export function validateExperienceId(experienceId: string): ValidationResult {
  const errors: string[] = [];
  
  if (!experienceId) {
    errors.push("Experience ID is required");
  } else if (typeof experienceId !== "string") {
    errors.push("Experience ID must be a string");
  } else if (!experienceId.startsWith("exp_")) {
    errors.push("Experience ID must start with 'exp_'");
  } else if (experienceId.length < 15 || experienceId.length > 50) {
    errors.push("Experience ID must be between 15 and 50 characters");
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitizedData: experienceId?.trim(),
  };
}

/**
 * Validate message content
 */
export function validateMessageContent(content: string): ValidationResult {
  const errors: string[] = [];
  
  if (!content) {
    errors.push("Message content is required");
  } else if (typeof content !== "string") {
    errors.push("Message content must be a string");
  } else if (content.length === 0) {
    errors.push("Message content cannot be empty");
  } else if (content.length > 5000) {
    errors.push("Message content must be less than 5000 characters");
  }
  
  // Sanitize content
  const sanitized = content?.trim().replace(/[\x00-\x1F\x7F]/g, ""); // Remove control characters
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitizedData: sanitized,
  };
}

/**
 * Validate user ID format
 */
export function validateUserId(userId: string): ValidationResult {
  const errors: string[] = [];
  
  if (!userId) {
    errors.push("User ID is required");
  } else if (typeof userId !== "string") {
    errors.push("User ID must be a string");
  } else if (!userId.startsWith("user_")) {
    errors.push("User ID must start with 'user_'");
  } else if (userId.length < 15 || userId.length > 50) {
    errors.push("User ID must be between 15 and 50 characters");
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitizedData: userId?.trim(),
  };
}

/**
 * Validate request body structure
 */
export function validateRequestBody(body: any, requiredFields: string[]): ValidationResult {
  const errors: string[] = [];
  
  if (!body || typeof body !== "object") {
    errors.push("Request body must be a valid JSON object");
    return { isValid: false, errors };
  }
  
  for (const field of requiredFields) {
    if (!(field in body)) {
      errors.push(`Missing required field: ${field}`);
    }
  }
  
  // Check for unexpected fields
  const allowedFields = new Set(requiredFields);
  const unexpectedFields = Object.keys(body).filter(key => !allowedFields.has(key));
  if (unexpectedFields.length > 0) {
    errors.push(`Unexpected fields: ${unexpectedFields.join(", ")}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitizedData: body,
  };
}

/**
 * Extract and validate user ID from request headers
 */
export async function extractUserIdFromHeaders(request: NextRequest): Promise<ValidationResult> {
  try {
    const authHeader = request.headers.get("authorization");
    const userTokenHeader = request.headers.get("x-whop-user-token");
    
    if (!authHeader && !userTokenHeader) {
      return {
        isValid: false,
        errors: ["No authentication token found in headers"],
      };
    }
    
    // For MVP, we'll let the Whop SDK handle token validation
    // This is just for basic format checking
    return {
      isValid: true,
      errors: [],
      sanitizedData: userTokenHeader || authHeader,
    };
  } catch (error) {
    return {
      isValid: false,
      errors: ["Failed to extract user ID from headers"],
    };
  }
}

/**
 * Validate API request with common checks
 */
export async function validateApiRequest(
  request: NextRequest,
  requiredFields: string[] = []
): Promise<ValidationResult> {
  const errors: string[] = [];
  
  try {
    // Check content type
    const contentType = request.headers.get("content-type");
    if (contentType && !contentType.includes("application/json")) {
      errors.push("Content-Type must be application/json");
    }
    
    // Validate request body if it exists
    if (request.method !== "GET" && requiredFields.length > 0) {
      const body = await request.json();
      const bodyValidation = validateRequestBody(body, requiredFields);
      if (!bodyValidation.isValid) {
        errors.push(...bodyValidation.errors);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData: request,
    };
  } catch (error) {
    return {
      isValid: false,
      errors: ["Invalid request format"],
    };
  }
}

