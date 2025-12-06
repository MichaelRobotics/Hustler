import { withWhopAppConfig } from "@whop/react/next.config";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	/* config options here */
	images: {
		remotePatterns: [{ hostname: "**" }],
	},
	webpack: (config, { isServer }) => {
		if (!isServer) {
			// Exclude Node.js modules from client-side bundle
			config.resolve.fallback = {
				...config.resolve.fallback,
				net: false,
				tls: false,
				fs: false,
				perf_hooks: false,
				os: false,
				path: false,
				crypto: false,
				stream: false,
				util: false,
				url: false,
				assert: false,
				http: false,
				https: false,
				zlib: false,
				querystring: false,
				child_process: false,
				sharp: false,
			};
			// Exclude sharp from client bundle
			config.externals = config.externals || [];
			if (Array.isArray(config.externals)) {
				config.externals.push('sharp');
			} else {
				config.externals = [config.externals, 'sharp'];
			}
		}
		return config;
	},
};

export default withWhopAppConfig(nextConfig);
