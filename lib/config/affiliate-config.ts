/**
 * Affiliate Configuration
 * 
 * Centralized configuration for affiliate DM system
 */

export const AFFILIATE_CONFIG = {
  // Commission rate (10% = 0.10)
  COMMISSION_RATE: 0.10,
  
  // App install link - replace with your actual app install link
  APP_INSTALL_LINK: "https://whop.com/apps/app_FInBMCJGyVdD9T/install/",
  
  // Delay before sending affiliate DM (in minutes)
  DM_DELAY_MINUTES: 5,
  
  // Message template for affiliate DM
  MESSAGE_TEMPLATE: `🎉 Congratulations! You've unlocked exclusive access to our premium product!

💰 **Your Affiliate Link (10% Commission):**
{affiliateLink}

📱 **Install Our App to Start Earning:**
{appInstallLink}

🚀 **How it works:**
1. Share your affiliate link with others
2. Earn 10% commission on every sale
3. Track your earnings in our app
4. Get paid directly to your account

Start earning today! 💪`,

  // Alternative shorter message template
  SHORT_MESSAGE_TEMPLATE: `🎉 You're now an affiliate! 

💰 Your link: {affiliateLink}
📱 Install app: {appInstallLink}

Earn 10% on every sale! 🚀`,

  // Tracking parameters for affiliate links
  TRACKING_PARAMS: {
    AFFILIATE: 'affiliate',
    EXPERIENCE: 'experience', 
    COMMISSION: 'commission',
    SOURCE: 'source',
    SOURCE_VALUE: 'dm_offer'
  }
} as const;

/**
 * Get the app install link for a specific experience
 * This allows for experience-specific app links if needed
 */
export function getAppInstallLink(experienceId?: string): string {
  // For now, return the same link for all experiences
  // In the future, you could have experience-specific app links
  return AFFILIATE_CONFIG.APP_INSTALL_LINK;
}

/**
 * Generate commission rate as percentage string
 */
export function getCommissionRateString(): string {
  return `${(AFFILIATE_CONFIG.COMMISSION_RATE * 100).toFixed(0)}%`;
}
