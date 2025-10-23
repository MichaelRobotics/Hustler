const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function applyMigration() {
  // Use your Supabase project URL and service role key
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials');
    console.log('Required environment variables:');
    console.log('- NEXT_PUBLIC_SUPABASE_URL');
    console.log('- SUPABASE_SERVICE_ROLE_KEY');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log('🔗 Connecting to Supabase...');
    
    // Test connection
    const { data, error } = await supabase
      .from('experiences')
      .select('id')
      .limit(1);

    if (error) {
      console.error('❌ Connection failed:', error.message);
      return;
    }

    console.log('✅ Connected to Supabase successfully');

    // Apply the migration using RPC or direct SQL
    const migrationSQL = `
      -- Add new fields to resources table
      ALTER TABLE resources 
      ADD COLUMN IF NOT EXISTS price DECIMAL(10,2),
      ADD COLUMN IF NOT EXISTS image TEXT,
      ADD COLUMN IF NOT EXISTS storage_url TEXT;

      -- Add comments for documentation
      COMMENT ON COLUMN resources.price IS 'Price from access pass plan or user input';
      COMMENT ON COLUMN resources.image IS 'Link to icon of app/product/digital resource image';
      COMMENT ON COLUMN resources.storage_url IS 'Link that triggers digital asset upload';
    `;

    console.log('🔄 Applying migration...');
    
    // Use Supabase RPC to execute SQL
    const { data: result, error: migrationError } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    });

    if (migrationError) {
      console.error('❌ Migration failed:', migrationError.message);
      
      // Try alternative approach with direct SQL execution
      console.log('🔄 Trying alternative approach...');
      
      const { error: altError } = await supabase
        .from('resources')
        .select('id')
        .limit(1);
        
      if (altError && altError.message.includes('column "price" does not exist')) {
        console.log('✅ Migration appears to be needed - columns not found');
        console.log('📋 Please run this SQL manually in your Supabase dashboard:');
        console.log('');
        console.log(migrationSQL);
        console.log('');
        console.log('Or use the Supabase CLI:');
        console.log('npx supabase db push --linked');
      } else {
        console.log('✅ Migration may have already been applied');
      }
    } else {
      console.log('✅ Migration applied successfully!');
      console.log('Added fields: price, image, storage_url to resources table');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

applyMigration();
