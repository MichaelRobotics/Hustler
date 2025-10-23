#!/usr/bin/env node

const postgres = require('postgres');

async function debugApiRequest() {
  console.log('🔍 Debugging API request...');
  
  const connectionString = "postgres://postgres.hjyfwhqlydxsghqpwmjc:sQdEoo5AaL2P80Td@aws-1-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require&supa=base-pooler.x";
  const sql = postgres(connectionString);
  
  try {
    // Check if the experience exists
    console.log('🔍 Checking if experience exists...');
    const experience = await sql`
      SELECT * FROM experiences 
      WHERE whop_experience_id = 'exp_2Cjx49TKxbr2fa'
    `;
    
    if (experience.length === 0) {
      console.log('❌ Experience not found in database');
      return;
    }
    
    console.log('✅ Experience found:', experience[0]);
    
    // Check if there are any users for this experience
    console.log('🔍 Checking users for this experience...');
    const users = await sql`
      SELECT * FROM users 
      WHERE experience_id = ${experience[0].id}
    `;
    
    console.log(`✅ Found ${users.length} users for this experience`);
    
    // Check templates for this experience
    console.log('🔍 Checking templates for this experience...');
    const templates = await sql`
      SELECT * FROM templates 
      WHERE experience_id = ${experience[0].id}
    `;
    
    console.log(`✅ Found ${templates.length} templates for this experience`);
    
    // Check themes for this experience
    console.log('🔍 Checking themes for this experience...');
    const themes = await sql`
      SELECT * FROM themes 
      WHERE experience_id = ${experience[0].id}
    `;
    
    console.log(`✅ Found ${themes.length} themes for this experience`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sql.end();
  }
}

debugApiRequest();

