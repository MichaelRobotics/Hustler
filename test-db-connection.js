const { db } = require('./lib/supabase/db-server.ts');

async function testDatabase() {
  try {
    console.log('🔍 Testing database connection...');
    
    // Test basic connection
    const result = await db.execute('SELECT 1 as test');
    console.log('✅ Basic connection test passed:', result);
    
    // Check if themes table exists
    const themesCheck = await db.execute(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'themes'
      );
    `);
    console.log('🔍 Themes table exists:', themesCheck);
    
    // Check if templates table exists
    const templatesCheck = await db.execute(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'templates'
      );
    `);
    console.log('🔍 Templates table exists:', templatesCheck);
    
    // Try to query themes table
    try {
      const themes = await db.execute('SELECT * FROM themes LIMIT 1');
      console.log('✅ Themes table query successful:', themes);
    } catch (error) {
      console.log('❌ Themes table query failed:', error.message);
    }
    
    // Try to query templates table
    try {
      const templates = await db.execute('SELECT * FROM templates LIMIT 1');
      console.log('✅ Templates table query successful:', templates);
    } catch (error) {
      console.log('❌ Templates table query failed:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
  }
}

testDatabase();


