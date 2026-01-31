"use client";

import React, { useState, useEffect } from "react";
import type { FunnelFlow, FunnelProductFaq, FunnelProductFaqInput } from "../../types/funnel";
import PreviewChat from "./PreviewChat";

interface Funnel {
	id: string;
	name: string;
	flow?: FunnelFlow;
	isDeployed?: boolean;
	wasEverDeployed?: boolean;
	resources?: any[];
	handoutKeyword?: string;
	handoutAdminNotification?: string;
	handoutUserMessage?: string;
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

	const [productFaqs, setProductFaqs] = useState<FunnelProductFaq[]>([]);

	// Fetch product FAQs when component mounts
	useEffect(() => {
		if (funnel.id && experienceId) {
			fetch(`/api/funnels/${funnel.id}/product-faqs`)
				.then((res) => res.json())
				.then((data) => {
					if (data.success && data.data) {
						setProductFaqs(data.data);
					}
				})
				.catch((err) => console.error("Error fetching product FAQs:", err));
		}
	}, [funnel.id, experienceId]);

	const handleMessageSent = (message: string, conversationId?: string) => {
		// Handle message sent - could be used for analytics or logging
		console.log("Preview message sent:", {
			message,
			conversationId,
			funnelId: funnel.id,
			timestamp: new Date().toISOString(),
		});
	};

	const handleHandoutChange = async (keyword: string, adminNotification?: string, userMessage?: string) => {
		try {
			// Update funnel via API
			const response = await fetch(`/api/funnels/${funnel.id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					handoutKeyword: keyword,
					handoutAdminNotification: adminNotification,
					handoutUserMessage: userMessage,
				}),
			});
			if (!response.ok) {
				console.error("Error updating handout configuration");
			}
		} catch (error) {
			console.error("Error saving handout configuration:", error);
		}
	};

	const handleProductFaqChange = async (input: FunnelProductFaqInput) => {
		try {
			const response = await fetch(`/api/funnels/${funnel.id}/product-faqs`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(input),
			});
			const data = await response.json();
			if (data.success && data.data) {
				// Update local state
				const existingIndex = productFaqs.findIndex((f) => f.resourceId === input.resourceId);
				if (existingIndex >= 0) {
					setProductFaqs(productFaqs.map((f, i) => (i === existingIndex ? data.data : f)));
				} else {
					setProductFaqs([...productFaqs, data.data]);
				}
			}
		} catch (error) {
			console.error("Error saving product FAQ:", error);
		}
	};

	return (
		<PreviewChat
			funnelFlow={funnelFlow}
			resources={funnel.resources || []}
			experienceId={experienceId}
			funnelId={funnel.id}
			handoutKeyword={funnel.handoutKeyword}
			handoutAdminNotification={funnel.handoutAdminNotification}
			handoutUserMessage={funnel.handoutUserMessage}
			productFaqs={productFaqs}
			onHandoutChange={handleHandoutChange}
			onProductFaqChange={handleProductFaqChange}
			onMessageSent={handleMessageSent}
			onBack={onBack}
			hideAvatar={false}
		/>
	);
};

PreviewPage.displayName = "PreviewPage";

export default PreviewPage;
