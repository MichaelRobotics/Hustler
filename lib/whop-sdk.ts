/**
 * Unified Whop SDK Configuration
 * 
 * Centralized SDK initialization following Whop best practices
 * Use this instead of creating multiple SDK instances
 */

import { WhopServerSdk } from "@whop/api";

// Debug environment variables. Company and acting user come from the request, not env.
console.log('🔍 WHOP SDK Environment check:', {
  WHOP_API_KEY: process.env.WHOP_API_KEY ? 'Present' : 'Missing',
  NEXT_PUBLIC_WHOP_APP_ID: process.env.NEXT_PUBLIC_WHOP_APP_ID ? 'Present' : 'Missing',
});

// Validate required environment variables
if (!process.env.NEXT_PUBLIC_WHOP_APP_ID) {
	throw new Error("NEXT_PUBLIC_WHOP_APP_ID environment variable is required");
}

if (!process.env.WHOP_API_KEY) {
	throw new Error("WHOP_API_KEY environment variable is required");
}

// Unified Whop SDK instance
export const whopSdk = WhopServerSdk({
	// This is the appId of your app. You can find this in the "App Settings" section of your app's Whop dashboard.
	appId: process.env.NEXT_PUBLIC_WHOP_APP_ID,

	// Add your app api key here - this is required.
	// You can get this from the Whop dashboard after creating an app in the "API Keys" section.
	appApiKey: process.env.WHOP_API_KEY,
});

// Re-export for backward compatibility
export { whopSdk as whopApi };
