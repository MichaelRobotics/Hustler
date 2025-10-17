"use client";

import type React from "react";
import type { FunnelFlow } from "../../types/funnel";
import PreviewChat from "./PreviewChat";

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
	experienceId?: string;
	onBack: () => void;
	sourcePage?: "resources" | "funnelBuilder" | "analytics" | "resourceLibrary";
}

/**
 * Preview Page Component
 *
 * Dedicated preview page that shows the funnel flow as a chat interface.
 * Uses the same frontend design as UserChat but without WebSocket functionality.
 * Provides a clean, focused experience for testing the generated funnel.
 */
const PreviewPage: React.FC<PreviewPageProps> = ({
	funnel,
	experienceId,
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
		<PreviewChat
			funnelFlow={funnelFlow}
			resources={funnel.resources || []}
			experienceId={experienceId}
			onMessageSent={handleMessageSent}
			onBack={onBack}
			hideAvatar={false}
		/>
	);
};

PreviewPage.displayName = "PreviewPage";

export default PreviewPage;
