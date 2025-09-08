"use client";

import type React from "react";
import type { FunnelFlow } from "../../types/funnel";
import UserChat from "../userChat/UserChat";

interface Funnel {
	id: string;
	name: string;
	flow?: FunnelFlow;
	isDeployed?: boolean;
	wasEverDeployed?: boolean;
	resources?: any[];
}

interface PreviewPageProps {
	funnel: Funnel;
	onBack: () => void;
	sourcePage?: "resources" | "funnelBuilder" | "analytics" | "resourceLibrary";
}

/**
 * Preview Page Component
 *
 * Dedicated preview page that shows the funnel flow as a chat interface.
 * Provides a clean, focused experience for testing the generated funnel.
 */
const PreviewPage: React.FC<PreviewPageProps> = ({
	funnel,
	onBack,
	sourcePage = "resources",
}) => {
	// Get the funnel flow, fallback to empty flow if not available
	const funnelFlow = funnel.flow || {
		startBlockId: "",
		stages: [],
		blocks: {},
	};

	const handleMessageSent = (message: string, conversationId?: string) => {
		// Handle message sent - could be used for analytics or logging
		console.log("Preview message sent:", {
			message,
			conversationId,
			funnelId: funnel.id,
			timestamp: new Date().toISOString(),
		});
	};

	return (
		<UserChat
			funnelFlow={funnelFlow}
			onMessageSent={handleMessageSent}
			onBack={onBack}
			hideAvatar={true}
		/>
	);
};

PreviewPage.displayName = "PreviewPage";

export default PreviewPage;
