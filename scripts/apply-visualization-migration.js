#!/usr/bin/env node

/**
 * Apply visualization state migration directly
 */

const { createClient } = require('@supabase/supabase-js');

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function applyMigration() {
  console.log('🔄 Applying visualization state migration...\n');

  try {
    // Check if column already exists
    const { data: existingColumns, error: checkError } = await supabase
      .rpc('get_table_columns', { table_name: 'funnels' });

    if (checkError) {
      console.log('⚠️  Could not check existing columns, proceeding with migration...');
    } else {
      const hasVisualizationState = existingColumns?.some(col => col.column_name === 'visualization_state');
      if (hasVisualizationState) {
        console.log('✅ Column visualization_state already exists, skipping migration');
        return;
      }
    }

    // Apply the migration using raw SQL
    const migrationSQL = `
      ALTER TABLE funnels ADD COLUMN IF NOT EXISTS visualization_state jsonb DEFAULT '{}'::jsonb;
      CREATE INDEX IF NOT EXISTS funnels_visualization_state_idx ON funnels USING gin (visualization_state);
      COMMENT ON COLUMN funnels.visualization_state IS 'Stores user visualization preferences: positions, viewport, layout settings, and interaction state';
    `;

    const { error: migrationError } = await supabase.rpc('exec_sql', { 
      sql: migrationSQL 
    });

    if (migrationError) {
      console.error('❌ Migration failed:', migrationError.message);
      
      // Try alternative approach - direct SQL execution
      console.log('🔄 Trying alternative migration approach...');
      
      // Test if we can at least query the table
      const { data: testData, error: testError } = await supabase
        .from('funnels')
        .select('id')
        .limit(1);
      
      if (testError) {
        console.error('❌ Cannot access funnels table:', testError.message);
        return;
      }
      
      console.log('✅ Can access funnels table, but migration requires database admin privileges');
      console.log('📋 Manual migration required:');
      console.log('   ALTER TABLE funnels ADD COLUMN visualization_state jsonb DEFAULT \'{}\'::jsonb;');
      console.log('   CREATE INDEX funnels_visualization_state_idx ON funnels USING gin (visualization_state);');
      return;
    }

    console.log('✅ Migration applied successfully!');
    
    // Verify the migration
    const { data: verifyData, error: verifyError } = await supabase
      .from('funnels')
      .select('visualization_state')
      .limit(1);
    
    if (verifyError) {
      console.error('❌ Verification failed:', verifyError.message);
    } else {
      console.log('✅ Migration verified successfully!');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.log('\n📋 Manual migration required:');
    console.log('   ALTER TABLE funnels ADD COLUMN visualization_state jsonb DEFAULT \'{}\'::jsonb;');
    console.log('   CREATE INDEX funnels_visualization_state_idx ON funnels USING gin (visualization_state);');
  }
}

// Run the migration
applyMigration();
