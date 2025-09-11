import { createClient } from "@supabase/supabase-js";
import * as schema from "./schema";

// This file is client-safe and only exports Supabase clients
// For server-side database operations, use db-server.ts instead

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

// Note: Database operations (db, postgresClient, etc.) are moved to db-server.ts
// This file only exports client-safe Supabase clients

// Export schema for type safety
export { schema };
