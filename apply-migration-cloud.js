// Apply migration to Supabase Cloud Database
// Replace these with your actual cloud Supabase credentials

const { createClient } = require('@supabase/supabase-js');

async function applyMigrationToCloud() {
  // Replace with your actual cloud Supabase URL and service role key
  const supabaseUrl = 'https://your-project-ref.supabase.co';
  const supabaseServiceKey = 'your-service-role-key';
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

  try {
    console.log('🔄 Applying migration to cloud database...');
    
    // Execute the migration
    const { data, error } = await supabase.rpc('exec', { sql: migrationSQL });
    
    if (error) {
      console.error('❌ Migration failed:', error);
    } else {
      console.log('✅ Migration applied successfully!');
      console.log('Added fields: price, image, storage_url to resources table');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Uncomment and run when you have your cloud credentials
// applyMigrationToCloud();
