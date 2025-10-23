const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function migrateWithSupabaseClient() {
  console.log('🚀 Migration using Supabase Client');
  console.log('');

  // You need your cloud Supabase credentials
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL_CLOUD;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY_CLOUD;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.log('❌ Missing cloud Supabase credentials');
    console.log('');
    console.log('📋 Required environment variables:');
    console.log('- NEXT_PUBLIC_SUPABASE_URL_CLOUD (your cloud project URL)');
    console.log('- SUPABASE_SERVICE_ROLE_KEY_CLOUD (your service role key)');
    console.log('');
    console.log('To get these:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Settings → API');
    console.log('3. Copy "Project URL" and "service_role" key');
    console.log('');
    console.log('Example:');
    console.log('export NEXT_PUBLIC_SUPABASE_URL_CLOUD="https://your-project-ref.supabase.co"');
    console.log('export SUPABASE_SERVICE_ROLE_KEY_CLOUD="your-service-role-key"');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log('🔗 Connecting to Supabase cloud...');
    
    // Test connection
    const { data, error } = await supabase
      .from('resources')
      .select('id')
      .limit(1);

    if (error && !error.message.includes('column')) {
      console.error('❌ Connection failed:', error.message);
      return;
    }

    console.log('✅ Connected to Supabase cloud successfully');

    // Apply migration using RPC
    const migrationSQL = `
      ALTER TABLE resources 
      ADD COLUMN IF NOT EXISTS price DECIMAL(10,2),
      ADD COLUMN IF NOT EXISTS image TEXT,
      ADD COLUMN IF NOT EXISTS storage_url TEXT;
    `;

    console.log('🔄 Applying migration...');
    
    // Try using RPC to execute SQL
    const { data: result, error: migrationError } = await supabase.rpc('exec', {
      sql: migrationSQL
    });

    if (migrationError) {
      console.log('⚠️ RPC method failed, trying alternative...');
      
      // Alternative: Use direct SQL execution if available
      const { error: altError } = await supabase
        .from('resources')
        .select('price, image, storage_url')
        .limit(1);
        
      if (altError && altError.message.includes('column') && altError.message.includes('does not exist')) {
        console.log('📋 Manual SQL execution required');
        console.log('Go to your Supabase dashboard → SQL Editor and run:');
        console.log('');
        console.log(migrationSQL);
      } else {
        console.log('✅ Migration appears to be successful!');
      }
    } else {
      console.log('✅ Migration applied successfully!');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

migrateWithSupabaseClient();
