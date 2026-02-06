"use client";

import React, { useState, useEffect } from "react";
import type { FunnelFlow } from "../../types/funnel";
import { apiGet, apiPut } from "../../utils/api-client";
import PreviewChat from "./PreviewChat";

interface Funnel {
	id: string;
	name: string;
	flow?: FunnelFlow;
	isDeployed?: boolean;
	wasEverDeployed?: boolean;
	merchantType?: string;
	resources?: any[];
}

interface PreviewPageProps {
	funnel: Funnel;
	experienceId?: string;
	onBack: () => void;
	sourcePage?: "resources" | "funnelBuilder" | "analytics" | "resourceLibrary";
	onPreviewNextMerchant?: (funnel: Funnel) => void;
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
	onPreviewNextMerchant,
}) => {
	// Get the funnel flow, fallback to empty flow if not available
	const funnelFlow = funnel.flow || {
		startBlockId: "",
		stages: [],
		blocks: {},
	};

	// When funnel has no resources (e.g. opened from builder before save), fetch funnel with resources so offer buttons resolve
	const [resources, setResources] = useState<any[]>(funnel.resources ?? []);

	useEffect(() => {
		setResources(funnel.resources ?? []);
	}, [funnel.resources, funnel.id]);

	// Fetch funnel with resources when resources are empty so product links resolve in preview
	useEffect(() => {
		if (!funnel.id || !experienceId || (funnel.resources?.length ?? 0) > 0) return;
		apiGet(`/api/funnels/${funnel.id}`, experienceId)
			.then((res) => res.json())
			.then((data) => {
				if (data.success && data.data?.resources?.length) {
					setResources(data.data.resources);
				}
			})
			.catch((err) => console.error("Error fetching funnel resources for preview:", err));
	}, [funnel.id, experienceId, funnel.resources?.length]);

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
			resources={resources}
			experienceId={experienceId}
			funnelId={funnel.id}
			merchantType={funnel.merchantType}
			merchantName={funnel.name}
			onMessageSent={handleMessageSent}
			onBack={onBack}
			onPreviewNextMerchant={onPreviewNextMerchant}
		/>
	);
};

PreviewPage.displayName = "PreviewPage";

export default PreviewPage;
