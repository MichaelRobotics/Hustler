// Script to clean up products with empty names
// Run this once to fix existing products with empty names

const { db } = require('./lib/supabase/db-server');
const { resources } = require('./lib/supabase/schema');
const { eq, or, sql } = require('drizzle-orm');

async function cleanupEmptyNames() {
  try {
    console.log('🧹 Starting cleanup of products with empty names...');
    
    // Find resources with empty or whitespace-only names
    const emptyNameResources = await db.query.resources.findMany({
      where: or(
        eq(resources.name, ''),
        sql`TRIM(${resources.name}) = ''`
      )
    });
    
    console.log(`Found ${emptyNameResources.length} resources with empty names`);
    
    if (emptyNameResources.length === 0) {
      console.log('✅ No resources with empty names found');
      return;
    }
    
    // Delete resources with empty names
    for (const resource of emptyNameResources) {
      console.log(`🗑️ Deleting resource with empty name (ID: ${resource.id})`);
      await db.delete(resources).where(eq(resources.id, resource.id));
    }
    
    console.log(`✅ Cleaned up ${emptyNameResources.length} resources with empty names`);
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  }
}

// Run the cleanup
cleanupEmptyNames().then(() => {
  console.log('🏁 Cleanup completed');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Cleanup failed:', error);
  process.exit(1);
});


