const { Client } = require('pg');
require('dotenv').config();

async function migrateToCloud() {
  console.log('🚀 Direct Migration to Supabase Cloud Database');
  console.log('');

  // You need to provide your cloud database connection string
  const cloudDbUrl = process.env.SUPABASE_CLOUD_DB_URL || process.env.POSTGRES_URL_CLOUD || process.env.POSTGRES_URL;
  
  if (!cloudDbUrl) {
    console.log('❌ No cloud database URL found');
    console.log('');
    console.log('📋 To get your cloud database URL:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to Settings → Database');
    console.log('3. Copy the "Connection string" under "Connection parameters"');
    console.log('4. Set it as SUPABASE_CLOUD_DB_URL environment variable');
    console.log('');
    console.log('Example:');
    console.log('export SUPABASE_CLOUD_DB_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"');
    console.log('');
    console.log('Then run: node migrate-to-cloud.js');
    return;
  }

  const client = new Client({
    connectionString: cloudDbUrl,
    ssl: {
      rejectUnauthorized: false, // Required for Supabase cloud
      checkServerIdentity: () => undefined // Skip hostname verification
    }
  });

  try {
    console.log('🔗 Connecting to cloud database...');
    await client.connect();
    console.log('✅ Connected successfully!');

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
    await client.query(migrationSQL);
    
    console.log('✅ Migration applied successfully!');
    console.log('Added fields: price, image, storage_url to resources table');

    // Verify the migration
    console.log('🔍 Verifying migration...');
    const result = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'resources' 
      AND column_name IN ('price', 'image', 'storage_url')
    `);

    if (result.rows.length === 3) {
      console.log('✅ All fields added successfully:');
      result.rows.forEach(row => {
        console.log(`   - ${row.column_name}: ${row.data_type}`);
      });
    } else {
      console.log('⚠️ Some fields may not have been added');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    
    if (error.message.includes('column') && error.message.includes('already exists')) {
      console.log('ℹ️ Some columns may already exist - this is normal');
    }
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

migrateToCloud();
