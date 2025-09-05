#!/usr/bin/env node

/**
 * Migration Script: Companies to Experiences
 * 
 * This script migrates the existing company-based data to experience-based data.
 * It creates experience records for each company and updates all foreign key references.
 */

const postgres = require('postgres');
require('dotenv').config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL);

async function migrateToExperiences() {
  try {
    console.log('🚀 Starting migration from companies to experiences...');
    console.log('✅ Connected to database');

    // Step 1: Create experiences for each existing company
    console.log('\n📝 Step 1: Creating experiences from existing companies...');
    
    const companies = await sql`
      SELECT id, whop_company_id, name, description, logo, created_at, updated_at 
      FROM companies
    `;
    
    console.log(`Found ${companies.length} companies to migrate`);
    
    for (const company of companies) {
      // Create a unique experience ID for each company
      const experienceId = `exp_${company.whop_company_id}_${Date.now()}`;
      
      const [experience] = await sql`
        INSERT INTO experiences (
          whop_experience_id, 
          whop_company_id, 
          name, 
          description, 
          logo, 
          created_at, 
          updated_at
        ) VALUES (${experienceId}, ${company.whop_company_id}, ${company.name}, ${company.description}, ${company.logo}, ${company.created_at}, ${company.updated_at})
        RETURNING id
      `;
      
      const experienceDbId = experience.id;
      
      // Update all related records to use the new experience ID
      console.log(`  📊 Updating records for company: ${company.name}`);
      
      // Update users
      const usersResult = await sql`
        UPDATE users 
        SET experience_id = ${experienceDbId}
        WHERE company_id = ${company.id}
      `;
      console.log(`    👥 Updated ${usersResult.count} users`);
      
      // Update funnels
      const funnelsResult = await sql`
        UPDATE funnels 
        SET experience_id = ${experienceDbId}
        WHERE company_id = ${company.id}
      `;
      console.log(`    🎯 Updated ${funnelsResult.count} funnels`);
      
      // Update resources
      const resourcesResult = await sql`
        UPDATE resources 
        SET experience_id = ${experienceDbId}
        WHERE company_id = ${company.id}
      `;
      console.log(`    📚 Updated ${resourcesResult.count} resources`);
      
      // Update conversations
      const conversationsResult = await sql`
        UPDATE conversations 
        SET experience_id = ${experienceDbId}
        WHERE company_id = ${company.id}
      `;
      console.log(`    💬 Updated ${conversationsResult.count} conversations`);
      
      // Update funnel_analytics
      const analyticsResult = await sql`
        UPDATE funnel_analytics 
        SET experience_id = ${experienceDbId}
        WHERE company_id = ${company.id}
      `;
      console.log(`    📈 Updated ${analyticsResult.count} analytics records`);
    }

    // Step 2: Verify the migration
    console.log('\n🔍 Step 2: Verifying migration...');
    
    const [experienceCount] = await sql`SELECT COUNT(*) FROM experiences`;
    const [userCount] = await sql`SELECT COUNT(*) FROM users WHERE experience_id IS NOT NULL`;
    const [funnelCount] = await sql`SELECT COUNT(*) FROM funnels WHERE experience_id IS NOT NULL`;
    const [resourceCount] = await sql`SELECT COUNT(*) FROM resources WHERE experience_id IS NOT NULL`;
    const [conversationCount] = await sql`SELECT COUNT(*) FROM conversations WHERE experience_id IS NOT NULL`;
    const [analyticsCount] = await sql`SELECT COUNT(*) FROM funnel_analytics WHERE experience_id IS NOT NULL`;
    
    console.log(`✅ Migration completed successfully!`);
    console.log(`   📊 Created ${experienceCount.count} experiences`);
    console.log(`   👥 Updated ${userCount.count} users`);
    console.log(`   🎯 Updated ${funnelCount.count} funnels`);
    console.log(`   📚 Updated ${resourceCount.count} resources`);
    console.log(`   💬 Updated ${conversationCount.count} conversations`);
    console.log(`   📈 Updated ${analyticsCount.count} analytics records`);

    // Step 3: Show sample data
    console.log('\n📋 Step 3: Sample migrated data...');
    const sampleExperiences = await sql`
      SELECT e.whop_experience_id, e.name, e.whop_company_id, 
             COUNT(u.id) as user_count,
             COUNT(f.id) as funnel_count
      FROM experiences e
      LEFT JOIN users u ON u.experience_id = e.id
      LEFT JOIN funnels f ON f.experience_id = e.id
      GROUP BY e.id, e.whop_experience_id, e.name, e.whop_company_id
      LIMIT 5
    `;
    
    console.log('Sample experiences:');
    sampleExperiences.forEach(exp => {
      console.log(`  🏢 ${exp.name} (${exp.whop_experience_id})`);
      console.log(`     Company: ${exp.whop_company_id}`);
      console.log(`     Users: ${exp.user_count}, Funnels: ${exp.funnel_count}`);
    });

    console.log('\n🎉 Migration completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Update your application code to use experienceId instead of companyId');
    console.log('2. Test the application with the new experience-based data');
    console.log('3. Once verified, you can drop the company_id columns and companies table');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await sql.end();
    console.log('🔌 Database connection closed');
  }
}

// Run the migration
if (require.main === module) {
  migrateToExperiences()
    .then(() => {
      console.log('✅ Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateToExperiences };
