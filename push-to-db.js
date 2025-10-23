#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Pushing database schema to cloud...');

try {
  // Set environment variables for the database connection
  const env = {
    ...process.env,
    POSTGRES_URL: "postgres://postgres.hjyfwhqlydxsghqpwmjc:sQdEoo5AaL2P80Td@aws-1-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require&supa=base-pooler.x",
    POSTGRES_URL_NON_POOLING: "postgres://postgres.hjyfwhqlydxsghqpwmjc:sQdEoo5AaL2P80Td@aws-1-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require",
    SUPABASE_URL: "https://hjyfwhqlydxsghqpwmjc.supabase.co",
    SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqeWZ3aHFseWR4c2docXB3bWpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyOTk2MDcsImV4cCI6MjA3MTg3NTYwN30.C7VO6Q3z4TfbAzdQa4UW8_xmWQ1-ac_TV1F8646x_Ac",
    SUPABASE_SERVICE_ROLE_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjyfwhqlydxsghqpwmjcIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjI5OTYwNywiZXhwIjoyMDcxODc1NjA3fQ.S3kyzqnEF-X6uu7tV8-cTE9fMVaYhjgtPSGAy93XZNQ"
  };

  console.log('📋 Step 1: Generating migrations...');
  execSync('npx drizzle-kit generate', { 
    stdio: 'inherit', 
    env,
    cwd: path.resolve(__dirname)
  });

  console.log('📋 Step 2: Pushing schema to database...');
  execSync('npx drizzle-kit push', { 
    stdio: 'inherit', 
    env,
    cwd: path.resolve(__dirname)
  });

  console.log('✅ Database schema pushed successfully!');
  
  // Test the connection
  console.log('🔍 Testing database connection...');
  execSync('node test-simple-db.js', { 
    stdio: 'inherit', 
    env,
    cwd: path.resolve(__dirname)
  });

} catch (error) {
  console.error('❌ Error pushing to database:', error.message);
  process.exit(1);
}

