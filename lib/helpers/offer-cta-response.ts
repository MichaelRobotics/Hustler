/** Offer CTA success is `{ success, data: { conversation } }`. */
export function offerResponseClosedConversation(body: unknown): boolean {
	if (!body || typeof body !== "object") return false;
	const record = body as {
		conversation?: { status?: string };
		data?: { conversation?: { status?: string } };
	};
	const status = record.data?.conversation?.status ?? record.conversation?.status;
	return status === "closed";
}
