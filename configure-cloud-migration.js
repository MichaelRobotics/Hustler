const { Client } = require('pg');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function configureCloudMigration() {
  console.log('🚀 Direct Database Connection Setup');
  console.log('=====================================');
  console.log('');

  console.log('📋 To get your database credentials:');
  console.log('1. Go to your Supabase Dashboard');
  console.log('2. Navigate to Settings → Database');
  console.log('3. Copy the "Connection string" under "Connection parameters"');
  console.log('');

  const dbUrl = await askQuestion('Enter your Supabase cloud database URL: ');
  
  if (!dbUrl || !dbUrl.includes('supabase.co')) {
    console.log('❌ Invalid database URL. Please make sure it includes "supabase.co"');
    rl.close();
    return;
  }

  console.log('');
  console.log('🔗 Testing connection...');

  const client = new Client({
    connectionString: dbUrl,
    ssl: {
      rejectUnauthorized: false // Required for Supabase cloud
    }
  });

  try {
    await client.connect();
    console.log('✅ Connection successful!');

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

    console.log('');
    console.log('🔄 Applying migration...');
    await client.query(migrationSQL);
    
    console.log('✅ Migration applied successfully!');
    console.log('Added fields: price, image, storage_url to resources table');

    // Verify the migration
    console.log('');
    console.log('🔍 Verifying migration...');
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'resources' 
      AND column_name IN ('price', 'image', 'storage_url')
      ORDER BY column_name
    `);

    if (result.rows.length === 3) {
      console.log('✅ All fields added successfully:');
      result.rows.forEach(row => {
        console.log(`   - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
      });
    } else {
      console.log('⚠️ Some fields may not have been added');
      console.log('Found fields:', result.rows.map(r => r.column_name));
    }

    // Save the connection string for future use
    const saveToEnv = await askQuestion('\n💾 Save this connection string to .env.local? (y/n): ');
    if (saveToEnv.toLowerCase() === 'y' || saveToEnv.toLowerCase() === 'yes') {
      const fs = require('fs');
      const envContent = `\n# Supabase Cloud Database\nSUPABASE_CLOUD_DB_URL=${dbUrl}\n`;
      fs.appendFileSync('.env.local', envContent);
      console.log('✅ Connection string saved to .env.local');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    
    if (error.message.includes('column') && error.message.includes('already exists')) {
      console.log('ℹ️ Some columns may already exist - this is normal');
    }
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
    rl.close();
  }
}

configureCloudMigration();
