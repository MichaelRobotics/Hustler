#!/usr/bin/env node

const postgres = require('postgres');
const fs = require('fs');
const path = require('path');

async function pushMigrations() {
  console.log('🚀 Pushing SQL migrations directly to database...');
  
  const connectionString = "postgres://postgres.hjyfwhqlydxsghqpwmjc:sQdEoo5AaL2P80Td@aws-1-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require&supa=base-pooler.x";
  
  const sql = postgres(connectionString);
  
  try {
    // Test connection
    console.log('🔍 Testing database connection...');
    await sql`SELECT 1 as test`;
    console.log('✅ Database connection successful');
    
    // Read and execute the themes migration
    console.log('📋 Applying themes table migration...');
    const themesSQL = fs.readFileSync(path.join(__dirname, 'drizzle/20250120000001_add_themes_table.sql'), 'utf8');
    
    try {
      await sql.unsafe(themesSQL);
      console.log('✅ Themes table migration applied successfully');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️  Themes table already exists, skipping...');
      } else {
        throw error;
      }
    }
    
    // Read and execute the templates migration
    console.log('📋 Applying templates table migration...');
    const templatesSQL = fs.readFileSync(path.join(__dirname, 'drizzle/20250120000002_add_templates_table.sql'), 'utf8');
    
    try {
      await sql.unsafe(templatesSQL);
      console.log('✅ Templates table migration applied successfully');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️  Templates table already exists, skipping...');
      } else {
        throw error;
      }
    }
    
    // Read and execute the theme metadata migration
    console.log('📋 Applying theme metadata migration...');
    const themeMetadataSQL = fs.readFileSync(path.join(__dirname, 'drizzle/20250120000004_add_theme_metadata.sql'), 'utf8');
    
    try {
      await sql.unsafe(themeMetadataSQL);
      console.log('✅ Theme metadata migration applied successfully');
    } catch (error) {
      if (error.message.includes('already exists') || error.message.includes('duplicate column')) {
        console.log('ℹ️  Theme metadata columns already exist, skipping...');
      } else {
        throw error;
      }
    }
    
    // Verify tables exist
    console.log('🔍 Verifying tables...');
    const themesCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'themes'
      );
    `;
    
    const templatesCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'templates'
      );
    `;
    
    console.log('✅ Themes table exists:', themesCheck[0].exists);
    console.log('✅ Templates table exists:', templatesCheck[0].exists);
    
    // Test queries
    console.log('🔍 Testing table queries...');
    const themesCount = await sql`SELECT COUNT(*) as count FROM themes`;
    const templatesCount = await sql`SELECT COUNT(*) as count FROM templates`;
    
    console.log(`✅ Themes table has ${themesCount[0].count} records`);
    console.log(`✅ Templates table has ${templatesCount[0].count} records`);
    
    console.log('🎉 Database schema push completed successfully!');
    
  } catch (error) {
    console.error('❌ Error pushing migrations:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

pushMigrations().catch(console.error);

