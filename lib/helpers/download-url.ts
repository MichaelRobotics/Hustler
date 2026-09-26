const WHOP_HOST = /(^|\.)whop\.com$/i;

/** HTTPS URLs on whop.com only. Blocks IP hosts and non-Whop storage. */
export function isAllowedDownloadUrl(raw: string): boolean {
	let parsed: URL;
	try {
		parsed = new URL(raw);
	} catch {
		return false;
	}
	if (parsed.protocol !== "https:") return false;
	if (parsed.username || parsed.password) return false;
	const host = parsed.hostname.toLowerCase();
	if (!host || host === "localhost") return false;
	if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(":")) return false;
	return WHOP_HOST.test(host);
}

export function safeDownloadFilename(name: string): string {
	const cleaned = name.replace(/[\r\n"]/g, "").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
	return cleaned || "download";
}
