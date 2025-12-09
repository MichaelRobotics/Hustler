import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: [".env.development.local", ".env.local", ".env"] });

// Parse connection URL to extract components for SSL configuration
const parseConnectionUrl = (url: string) => {
	try {
		const parsed = new URL(url);
		return {
			host: parsed.hostname,
			port: parseInt(parsed.port) || 5432,
			database: parsed.pathname.slice(1), // Remove leading '/'
			user: parsed.username,
			password: parsed.password,
		};
	} catch {
		return null;
	}
};

const connectionUrl = process.env.POSTGRES_URL!;
const connectionParams = parseConnectionUrl(connectionUrl);

export default defineConfig({
	schema: "./lib/supabase/schema.ts",
	out: "./drizzle",
	dialect: "postgresql",
	dbCredentials: connectionParams
		? {
				host: connectionParams.host,
				port: connectionParams.port,
				database: connectionParams.database,
				user: connectionParams.user,
				password: connectionParams.password,
				ssl: {
					rejectUnauthorized: false, // Allow self-signed certificates
				},
			}
		: {
				url: connectionUrl,
				ssl: {
					rejectUnauthorized: false, // Allow self-signed certificates
				},
			},
	verbose: true,
	strict: true,
	migrations: {
		prefix: "timestamp",
	},
});
