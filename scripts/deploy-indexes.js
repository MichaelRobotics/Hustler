#!/usr/bin/env node

/**
 * Deploy Database Indexes Script
 * Runs the performance optimization indexes migration
 */

const { db } = require('../lib/supabase/db.ts');
const fs = require('fs');
const path = require('path');

async function deployIndexes() {
  try {
    console.log('🚀 Starting database indexes deployment...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '../drizzle/20250115000000_add_performance_indexes.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Migration file loaded successfully');
    
    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📊 Found ${statements.length} index creation statements`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`);
          console.log(`   ${statement.substring(0, 100)}...`);
          
          await db.execute(statement);
          console.log(`✅ Statement ${i + 1} executed successfully`);
        } catch (error) {
          if (error.message.includes('already exists')) {
            console.log(`⚠️  Index already exists, skipping statement ${i + 1}`);
          } else {
            console.error(`❌ Error executing statement ${i + 1}:`, error.message);
            throw error;
          }
        }
      }
    }
    
    console.log('\n🎉 Database indexes deployment completed successfully!');
    console.log('\n📈 Performance improvements applied:');
    console.log('   ✅ Funnels table indexes for experience/user queries');
    console.log('   ✅ Resources table indexes for experience/user queries');
    console.log('   ✅ Funnel-resources junction table indexes');
    console.log('   ✅ Full-text search indexes for names');
    console.log('   ✅ Composite indexes for common query patterns');
    
  } catch (error) {
    console.error('❌ Database indexes deployment failed:', error);
    process.exit(1);
  }
}

// Run the deployment
if (require.main === module) {
  deployIndexes();
}

module.exports = { deployIndexes };
