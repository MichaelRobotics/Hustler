/**
 * UserChat Backend Configuration
 * Centralized configuration for UserChat backend integration
 */

export interface UserChatConfig {
  apiBaseUrl: string;
  apiKey?: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  enableLogging: boolean;
  enableAnalytics: boolean;
  defaultFunnelId?: string;
}

// Default configuration
const defaultConfig: UserChatConfig = {
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || '/api',
  apiKey: process.env.NEXT_PUBLIC_API_KEY,
  timeout: 30000, // 30 seconds
  retryAttempts: 3,
  retryDelay: 1000, // 1 second
  enableLogging: process.env.NODE_ENV === 'development',
  enableAnalytics: true,
  defaultFunnelId: process.env.NEXT_PUBLIC_DEFAULT_FUNNEL_ID
};

// Configuration instance
let config: UserChatConfig = { ...defaultConfig };

/**
 * Get current configuration
 */
export const getUserChatConfig = (): UserChatConfig => {
  return { ...config };
};

/**
 * Update configuration
 */
export const setUserChatConfig = (newConfig: Partial<UserChatConfig>): void => {
  config = { ...config, ...newConfig };
};

/**
 * Reset configuration to defaults
 */
export const resetUserChatConfig = (): void => {
  config = { ...defaultConfig };
};

/**
 * Environment-specific configurations
 */
export const getEnvironmentConfig = (): Partial<UserChatConfig> => {
  const env = process.env.NODE_ENV;
  
  switch (env) {
    case 'development':
      return {
        apiBaseUrl: 'http://localhost:3000/api',
        enableLogging: true,
        enableAnalytics: false
      };
    
    case 'production':
      return {
        apiBaseUrl: 'https://api.yourapp.com/api',
        enableLogging: false,
        enableAnalytics: true
      };
    
    default:
      return {
        apiBaseUrl: 'https://staging-api.yourapp.com/api',
        enableLogging: true,
        enableAnalytics: true
      };
  }
};

/**
 * Initialize configuration with environment settings
 */
export const initializeUserChatConfig = (): void => {
  const envConfig = getEnvironmentConfig();
  setUserChatConfig(envConfig);
};

// Auto-initialize on import
initializeUserChatConfig();
