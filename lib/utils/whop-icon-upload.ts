/**
 * Utility function to upload the WHOP icon to Whop storage
 * This is a one-time setup function that should be run once to get the Whop storage URL
 * 
 * Usage:
 * import { uploadWhopIcon } from './whop-icon-upload';
 * const result = await uploadWhopIcon();
 * console.log('Whop storage URL:', result.url);
 * // Then update lib/constants/whop-icon.ts with the URL
 */

import { uploadUrlToWhop } from './whop-image-upload';

const WHOP_ICON_SOURCE_URL = 'https://play-lh.googleusercontent.com/aiWW7QNl7l9rQfXmBE38hehHCkmBvqITu9b2Ej9jR0oN53YmcGkZz730RCg72IorRog=w240-h480-rw';

/**
 * Upload the WHOP icon from Google Play to Whop storage
 * @returns The uploaded image details including the Whop storage URL
 */
export async function uploadWhopIcon() {
  try {
    console.log('📤 Uploading WHOP icon to Whop storage...');
    const result = await uploadUrlToWhop(WHOP_ICON_SOURCE_URL, 'whop-icon.png');
    console.log('✅ WHOP icon uploaded successfully:', result.url);
    return result;
  } catch (error) {
    console.error('❌ Error uploading WHOP icon:', error);
    throw error;
  }
}






