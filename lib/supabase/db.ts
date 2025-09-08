import { createClient } from "@supabase/supabase-js";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Environment variables for Supabase configuration
const getSupabaseConfig = () => {
	const supabaseUrl = process.env.SUPABASE_URL;
	const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
	const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

	// Only validate during runtime, not build time
	if (typeof window === "undefined" && process.env.NODE_ENV !== "production") {
		if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
			throw new Error("Missing required Supabase environment variables");
		}
	}

	return { supabaseUrl, supabaseAnonKey, supabaseServiceRoleKey };
};

// Supabase client for client-side operations (with RLS)
export const supabase = (() => {
	const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();
	if (!supabaseUrl || !supabaseAnonKey) {
		return null as any; // Will be properly initialized at runtime
	}
	return createClient(supabaseUrl, supabaseAnonKey, {
		auth: {
			autoRefreshToken: true,
			persistSession: true,
			detectSessionInUrl: true,
		},
		db: {
			schema: "public",
		},
	});
})();

// Supabase client for server-side operations (bypasses RLS)
export const supabaseAdmin = (() => {
	const { supabaseUrl, supabaseServiceRoleKey } = getSupabaseConfig();
	if (!supabaseUrl || !supabaseServiceRoleKey) {
		return null as any; // Will be properly initialized at runtime
	}
	return createClient(supabaseUrl, supabaseServiceRoleKey, {
		auth: {
			autoRefreshToken: false,
			persistSession: false,
		},
		db: {
			schema: "public",
		},
	});
})();

// Postgres connection for Drizzle ORM
const getConnectionString = () => {
	const connectionString = process.env.POSTGRES_URL_NON_POOLING;

	// Only validate during runtime, not build time
	if (typeof window === "undefined" && process.env.NODE_ENV !== "production") {
		if (!connectionString) {
			throw new Error("Missing POSTGRES_URL_NON_POOLING environment variable");
		}
	}

	return connectionString;
};

// Create postgres client with enhanced connection pooling and error handling
const createPostgresClient = () => {
	const connectionString = getConnectionString();
	if (!connectionString) {
		return null as any; // Will be properly initialized at runtime
	}

	return postgres(connectionString, {
		max: 20, // Maximum number of connections
		idle_timeout: 20, // Close idle connections after 20 seconds
		connect_timeout: 10, // Connection timeout
		prepare: true, // Enable prepared statements for better performance
		onnotice: (notice) => {
			console.log("PostgreSQL Notice:", notice);
		},
		onparameter: (key, value) => {
			console.log(`PostgreSQL Parameter: ${key} = ${value}`);
		},
		transform: {
			undefined: null, // Transform undefined to null
		},
		debug: process.env.NODE_ENV === "development",
	});
};

const client = createPostgresClient();

// Drizzle ORM instance with schema
export const db = client ? drizzle(client, { schema }) : (null as any);

// Export the postgres client for direct queries if needed
export { client as postgresClient };

// Database health check function
export async function checkDatabaseConnection(): Promise<boolean> {
	try {
		if (!client) {
			console.error("❌ Database client not initialized");
			return false;
		}
		await client`SELECT 1`;
		console.log("✅ Database connection successful");
		return true;
	} catch (error) {
		console.error("❌ Database connection failed:", error);
		return false;
	}
}

// Graceful shutdown function
export async function closeDatabaseConnection(): Promise<void> {
	try {
		if (!client) {
			console.log("✅ Database client not initialized, nothing to close");
			return;
		}
		await client.end();
		console.log("✅ Database connection closed gracefully");
	} catch (error) {
		console.error("❌ Error closing database connection:", error);
	}
}

// Export schema for type safety
export { schema };
