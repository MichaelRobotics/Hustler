/**
 * One-time script to upload the WHOP icon to Whop storage
 * Run this once to get the Whop storage URL, then update lib/constants/whop-icon.ts
 * 
 * Usage: npx tsx scripts/upload-whop-icon.ts
 */

// Load environment variables
import 'dotenv/config';
import { uploadWhopIcon } from '../lib/utils/whop-icon-upload';

async function main() {
  try {
    console.log('🚀 Starting WHOP icon upload...');
    const result = await uploadWhopIcon();
    console.log('\n✅ Upload successful!');
    console.log('\n📋 Next step: Update lib/constants/whop-icon.ts with this URL:');
    console.log(`\nexport const WHOP_ICON_URL = '${result.url}';\n`);
  } catch (error) {
    console.error('❌ Upload failed:', error);
    process.exit(1);
  }
}

main();

