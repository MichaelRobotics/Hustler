/** Open lists admin-handled threads. Auto lists bot-handled threads. */
export function liveChatFilterLabel(status: "open" | "auto"): string {
	return status === "auto" ? "Bot" : "Needs reply";
}
