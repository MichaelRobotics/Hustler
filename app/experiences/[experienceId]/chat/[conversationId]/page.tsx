"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { UserChat } from "@/lib/components/userChat";
// Database actions moved to API routes to avoid client-side imports
import type { FunnelFlow } from "@/lib/types/funnel";
import type { ConversationWithMessages } from "@/lib/types/user";

interface UserChatPageProps {
	params: Promise<{
		experienceId: string;
		conversationId: string;
	}>;
}

/**
 * UserChat Page Component
 * 
 * Handles user-facing chat interface for internal conversations.
 * Integrates with Phase 4 internal chat sessions and provides
 * real-time funnel navigation through UserChat component.
 */
export default function UserChatPage({ params }: UserChatPageProps) {
	const router = useRouter();
	const [experienceId, setExperienceId] = useState<string>("");
	const [conversationId, setConversationId] = useState<string>("");
	
	const [conversation, setConversation] = useState<ConversationWithMessages | null>(null);
	const [funnelFlow, setFunnelFlow] = useState<FunnelFlow | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [stageInfo, setStageInfo] = useState<{
		currentStage: string;
		isDMFunnelActive: boolean;
		isTransitionStage: boolean;
		isExperienceQualificationStage: boolean;
	} | null>(null);

	// Resolve async params
	useEffect(() => {
		params.then((resolvedParams) => {
			setExperienceId(resolvedParams.experienceId);
			setConversationId(resolvedParams.conversationId);
		});
	}, [params]);

	// Load conversation and funnel data on mount
	useEffect(() => {
		const loadData = async () => {
			try {
				setLoading(true);
				setError(null);


				// Call API route to load conversation
				const response = await fetch('/api/userchat/load-conversation', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						conversationId,
					}),
				});

				const result = await response.json();
				
				if (!result.success) {
					setError(result.error || "Failed to load conversation");
					return;
				}

				setConversation(result.conversation || null);
				setFunnelFlow(result.funnelFlow || null);
				setStageInfo(result.stageInfo || null);
			} catch (err) {
				console.error("Error loading conversation:", err);
				setError("An unexpected error occurred");
			} finally {
				setLoading(false);
			}
		};

		if (conversationId && experienceId) {
			loadData();
		}
	}, [conversationId, experienceId]);

	// Handle message sent from UserChat
	const handleMessageSent = async (message: string, conversationId?: string) => {
		try {
			// This will be handled by the UserChat component's internal message handling
			// The WebSocket integration will handle real-time updates
			console.log("Message sent:", message, "to conversation:", conversationId);
		} catch (err) {
			console.error("Error handling message sent:", err);
		}
	};

	// Handle back navigation
	const handleBack = () => {
		router.back();
	};

	// Loading state
	if (loading) {
		return (
			<div className="h-screen w-full flex items-center justify-center bg-gradient-to-br from-surface via-surface/95 to-surface/90">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
					<p className="text-gray-600 dark:text-gray-400">Loading conversation...</p>
				</div>
			</div>
		);
	}

	// Error state
	if (error) {
		return (
			<div className="h-screen w-full flex items-center justify-center bg-gradient-to-br from-surface via-surface/95 to-surface/90">
				<div className="text-center max-w-md mx-auto p-6">
					<div className="text-red-500 text-6xl mb-4">⚠️</div>
					<h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
						Unable to Load Conversation
					</h1>
					<p className="text-gray-600 dark:text-gray-400 mb-6">
						{error}
					</p>
					<button
						onClick={handleBack}
						className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
					>
						Go Back
					</button>
				</div>
			</div>
		);
	}

	// No conversation found
	if (!conversation || !funnelFlow) {
		return (
			<div className="h-screen w-full flex items-center justify-center bg-gradient-to-br from-surface via-surface/95 to-surface/90">
				<div className="text-center max-w-md mx-auto p-6">
					<div className="text-gray-500 text-6xl mb-4">💬</div>
					<h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
						Conversation Not Found
					</h1>
					<p className="text-gray-600 dark:text-gray-400 mb-6">
						This conversation may have expired or you may not have access to it.
					</p>
					<button
						onClick={handleBack}
						className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
					>
						Go Back
					</button>
				</div>
			</div>
		);
	}

	// Validate conversation is active and has a current block
	if (!conversation.currentBlockId) {
		return (
			<div className="h-screen w-full flex items-center justify-center bg-gradient-to-br from-surface via-surface/95 to-surface/90">
				<div className="text-center max-w-md mx-auto p-6">
					<div className="text-yellow-500 text-6xl mb-4">⏳</div>
					<h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
						Conversation Not Ready
					</h1>
					<p className="text-gray-600 dark:text-gray-400 mb-6">
						This conversation is not yet ready for the chat interface. Please complete the initial setup first.
					</p>
					<button
						onClick={handleBack}
						className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
					>
						Go Back
					</button>
				</div>
			</div>
		);
	}

	// Render enhanced UserChat component
	return (
		<div className="h-screen w-full">
			<UserChat
				funnelFlow={funnelFlow}
				conversation={conversation}
				conversationId={conversationId}
				experienceId={experienceId}
				onMessageSent={handleMessageSent}
				onBack={handleBack}
				hideAvatar={false}
				stageInfo={stageInfo || undefined}
			/>
		</div>
	);
}
