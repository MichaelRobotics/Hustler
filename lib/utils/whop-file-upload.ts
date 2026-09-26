/**
 * Public file upload on @whop/sdk@2: files.create, PUT bytes, poll until ready.
 */

import { createWhopRestClient } from "@/lib/whop-rest";

export interface UploadedWhopFile {
	attachmentId: string;
	url: string;
	filename: string;
	size: number;
	type: string;
}

function headerRecord(headers: Record<string, unknown> | undefined): Record<string, string> {
	const out: Record<string, string> = {};
	if (!headers) return out;
	for (const [key, value] of Object.entries(headers)) {
		if (typeof value === "string") out[key] = value;
		else if (typeof value === "number" || typeof value === "boolean") out[key] = String(value);
	}
	return out;
}

export async function uploadPublicWhopFile(file: File): Promise<UploadedWhopFile> {
	const client = createWhopRestClient();
	const created = await client.files.create({
		filename: file.name || `upload-${Date.now()}`,
		visibility: "public",
	});

	if (!created.upload_url) {
		throw new Error("Whop files.create did not return an upload_url");
	}

	const bytes = await file.arrayBuffer();
	const put = await fetch(created.upload_url, {
		method: "PUT",
		headers: headerRecord(created.upload_headers),
		body: bytes,
	});
	if (!put.ok) {
		throw new Error(`Whop file upload failed (${put.status})`);
	}

	let current = created;
	for (let attempt = 0; attempt < 8 && current.upload_status !== "ready"; attempt++) {
		if (current.upload_status === "failed") {
			throw new Error("Whop file upload failed");
		}
		await new Promise((resolve) => setTimeout(resolve, 400));
		current = await client.files.retrieve({ id: created.id });
	}

	if (current.upload_status !== "ready" || !current.url) {
		throw new Error("Whop file was not ready after upload");
	}

	return {
		attachmentId: current.id,
		url: current.url,
		filename: file.name,
		size: file.size,
		type: file.type,
	};
}
