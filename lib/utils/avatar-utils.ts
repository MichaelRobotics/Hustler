/**
 * Returns a higher-resolution version of an avatar URL when it uses Whop CDN
 * resize params, so avatars stay sharp on retina displays. Non-Whop URLs are
 * returned unchanged (used as-is for full quality).
 */
const TARGET_SIZE = 512;
const TARGET_QUALITY = 90;

export function getHighResAvatarUrl(url: string | null | undefined): string | undefined {
	if (!url || typeof url !== "string") return undefined;

	// Whop img proxy: e.g. .../rs:fit:256:0/... or ...?w=256&q=75
	let out = url;

	// Bump rs:fit:W:0 to higher size (e.g. 256 -> 512) for retina
	const rsFitMatch = out.match(/rs:fit:(\d+):(\d+)/);
	if (rsFitMatch) {
		const current = parseInt(rsFitMatch[1], 10);
		const w = Math.min(Math.max(current * 2, TARGET_SIZE), 1024);
		out = out.replace(/rs:fit:\d+:\d+/, `rs:fit:${w}:0`);
	}

	// Bump w= and q= in query string if present
	if (out.includes("w=")) {
		out = out.replace(/w=\d+/, `w=${TARGET_SIZE}`);
	}
	if (out.includes("q=")) {
		out = out.replace(/q=\d+/, `q=${TARGET_QUALITY}`);
	}

	return out;
}
