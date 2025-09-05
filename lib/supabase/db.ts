import { createClient } from '@supabase/supabase-js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Environment variables for Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Validate required environment variables
if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
  throw new Error('Missing required Supabase environment variables');
}

// Supabase client for client-side operations (with RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  db: {
    schema: 'public'
  }
});

// Supabase client for server-side operations (bypasses RLS)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  db: {
    schema: 'public'
  }
});

// Postgres connection for Drizzle ORM
const connectionString = process.env.POSTGRES_URL_NON_POOLING!;

if (!connectionString) {
  throw new Error('Missing POSTGRES_URL_NON_POOLING environment variable');
}

// Create postgres client with enhanced connection pooling and error handling
const client = postgres(connectionString, {
  max: 20, // Maximum number of connections
  idle_timeout: 20, // Close idle connections after 20 seconds
  connect_timeout: 10, // Connection timeout
  prepare: true, // Enable prepared statements for better performance
  onnotice: (notice) => {
    console.log('PostgreSQL Notice:', notice);
  },
  onparameter: (key, value) => {
    console.log(`PostgreSQL Parameter: ${key} = ${value}`);
  },
  transform: {
    undefined: null, // Transform undefined to null
  },
  debug: process.env.NODE_ENV === 'development',
});

// Drizzle ORM instance with schema
export const db = drizzle(client, { schema });

// Export the postgres client for direct queries if needed
export { client as postgresClient };

// Database health check function
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await client`SELECT 1`;
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

// Graceful shutdown function
export async function closeDatabaseConnection(): Promise<void> {
  try {
    await client.end();
    console.log('✅ Database connection closed gracefully');
  } catch (error) {
    console.error('❌ Error closing database connection:', error);
  }
}

// Export schema for type safety
export { schema };
