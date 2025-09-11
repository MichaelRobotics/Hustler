"use client";

import type React from "react";
import { useState, useEffect, useCallback } from "react";
import UserChat from "./UserChat";
import type { FunnelFlow } from "../../types/funnel";
import type { ConversationWithMessages } from "../../types/user";

/**
 * --- Customer View Component ---
 * This is the entry point for customers to experience the funnel.
 * Now connected to real backend infrastructure instead of mock data.
 */

interface CustomerViewProps {
	userName?: string;
	experienceId?: string;
	onMessageSent?: (message: string, conversationId?: string) => void;
}

const CustomerView: React.FC<CustomerViewProps> = ({
	userName,
	experienceId,
	onMessageSent,
}) => {
	const [funnelFlow, setFunnelFlow] = useState<FunnelFlow | null>(null);
	const [conversation, setConversation] = useState<ConversationWithMessages | null>(null);
	const [conversationId, setConversationId] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Load real funnel data and create/load conversation
	const loadFunnelAndConversation = useCallback(async () => {
		if (!experienceId) {
			setError("Experience ID is required");
			setIsLoading(false);
			return;
		}

		try {
			setIsLoading(true);
			setError(null);

			// Step 1: Load conversation and funnel data via API
			const response = await fetch('/api/userchat/load-conversation', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					experienceId,
					userName: userName || "Customer",
				}),
			});

			const result = await response.json();

			if (result.success) {
				// Set funnel flow from API response
				if (result.funnelFlow) {
					setFunnelFlow(result.funnelFlow);
				}

				// Set conversation data
				if (result.conversation) {
					setConversation(result.conversation);
					setConversationId(result.conversation.id);
				} else if (result.conversationId) {
					// If we only got a conversation ID, we'll use it
					setConversationId(result.conversationId);
				}

				console.log("CustomerView loaded real data:", {
					experienceId,
					conversationId: result.conversationId,
					hasFunnelFlow: !!result.funnelFlow,
					hasConversation: !!result.conversation,
				});
			} else {
				throw new Error(result.error || "Failed to load conversation");
			}
		} catch (err) {
			console.error("Error loading funnel and conversation:", err);
			setError(err instanceof Error ? err.message : "Failed to load conversation");
		} finally {
			setIsLoading(false);
		}
	}, [experienceId, userName]);

	// Load data on mount
	useEffect(() => {
		loadFunnelAndConversation();
	}, [loadFunnelAndConversation]);

	const handleMessageSentInternal = (message: string, convId?: string) => {
		console.log("Customer message:", {
			message,
			conversationId: convId || conversationId,
			userName,
			experienceId,
			timestamp: new Date().toISOString(),
		});
		if (onMessageSent) {
			onMessageSent(message, convId || conversationId || undefined);
		}
	};

	// Show loading state
	if (isLoading) {
		return (
			<div className="h-screen w-full flex items-center justify-center bg-gradient-to-br from-surface via-surface/95 to-surface/90">
				<div className="text-center">
					<div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
					<p className="text-gray-600 dark:text-gray-400">Loading conversation...</p>
				</div>
			</div>
		);
	}

	// Show error state
	if (error) {
		return (
			<div className="h-screen w-full flex items-center justify-center bg-gradient-to-br from-surface via-surface/95 to-surface/90">
				<div className="text-center max-w-md mx-auto p-6">
					<div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
						<svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
						</svg>
					</div>
					<h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Unable to Load Conversation</h3>
					<p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
					<button
						onClick={loadFunnelAndConversation}
						className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
					>
						Try Again
					</button>
				</div>
			</div>
		);
	}

	// Show no funnel available state
	if (!funnelFlow) {
		return (
			<div className="h-screen w-full flex items-center justify-center bg-gradient-to-br from-surface via-surface/95 to-surface/90">
				<div className="text-center max-w-md mx-auto p-6">
					<div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
						<svg className="w-8 h-8 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
						</svg>
					</div>
					<h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Funnel Available</h3>
					<p className="text-gray-600 dark:text-gray-400 mb-4">
						No active funnel found for this experience. Please contact the administrator.
					</p>
					<button
						onClick={loadFunnelAndConversation}
						className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
					>
						Refresh
					</button>
				</div>
			</div>
		);
	}

	// Render UserChat with real data
	return (
		<UserChat
			funnelFlow={funnelFlow}
			conversationId={conversationId || undefined}
			conversation={conversation || undefined}
			experienceId={experienceId}
			onMessageSent={handleMessageSentInternal}
		/>
	);
};

export default CustomerView;
