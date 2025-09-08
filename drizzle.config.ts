import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: [".env.development.local", ".env.local", ".env"] });

export default defineConfig({
	schema: "./lib/supabase/schema.ts",
	out: "./drizzle",
	dialect: "postgresql",
	dbCredentials: {
		url: process.env.POSTGRES_URL_NON_POOLING!,
	},
	verbose: true,
	strict: true,
	migrations: {
		prefix: "timestamp",
	},
});
