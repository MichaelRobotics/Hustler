"use client";

import type React from "react";
import { useState, useEffect, useCallback } from "react";
import UserChat from "./UserChat";
import type { FunnelFlow } from "../../types/funnel";
import type { ConversationWithMessages } from "../../types/user";
import { apiPost } from "../../utils/api-client";
import { Text } from "frosted-ui";
import { MessageSquare, Play, RotateCcw, Settings, User } from "lucide-react";

/**
 * --- Customer View Component ---
 * This is the entry point for customers to experience the funnel.
 * Now connected to real backend infrastructure instead of mock data.
 */

interface CustomerViewProps {
	userName?: string;
	experienceId?: string;
	onMessageSent?: (message: string, conversationId?: string) => void;
	userType?: "admin" | "customer";
	whopUserId?: string;
}

const CustomerView: React.FC<CustomerViewProps> = ({
	userName,
	experienceId,
	onMessageSent,
	userType = "customer",
	whopUserId,
}) => {
	const [funnelFlow, setFunnelFlow] = useState<FunnelFlow | null>(null);
	const [conversation, setConversation] = useState<ConversationWithMessages | null>(null);
	const [conversationId, setConversationId] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [stageInfo, setStageInfo] = useState<{
		currentStage: string;
		isDMFunnelActive: boolean;
		isTransitionStage: boolean;
		isExperienceQualificationStage: boolean;
	} | null>(null);
	
	// Admin state
	const [adminMode, setAdminMode] = useState(false);
	const [adminLoading, setAdminLoading] = useState(false);
	const [adminError, setAdminError] = useState<string | null>(null);
	const [adminSuccess, setAdminSuccess] = useState<string | null>(null);

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
			const response = await apiPost('/api/userchat/load-conversation', {
				conversationId: conversationId,
				experienceId,
				whopUserId: whopUserId,
			}, experienceId);

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

				// Set stage information
				if (result.stageInfo) {
					setStageInfo(result.stageInfo);
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
	}, [experienceId, userName, conversationId, whopUserId]);

	// Admin functions
	const checkConversationStatus = async () => {
		if (!experienceId) return;
		
		try {
			setAdminLoading(true);
			setAdminError(null);
			
			const response = await fetch('/api/userchat/check-conversation', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					experienceId,
					whopUserId: whopUserId,
				}),
			});

			const result = await response.json();
			
			if (result.success) {
				if (result.hasActiveConversation) {
					setConversationId(result.conversation.id);
					setStageInfo(result.stageInfo);
					setAdminSuccess(`Found active conversation: ${result.conversation.id}`);
				} else {
					setConversationId(null);
					setStageInfo(result.stageInfo);
					setAdminSuccess("No active conversation found");
				}
			} else {
				setAdminError(result.error || "Failed to check conversation status");
			}
		} catch (err) {
			console.error("Error checking conversation status:", err);
			setAdminError("An unexpected error occurred");
		} finally {
			setAdminLoading(false);
		}
	};


	const triggerDMForAdmin = async () => {
		if (!experienceId) {
			setAdminError("Experience ID is required");
			return;
		}

		try {
			setAdminLoading(true);
			setAdminError(null);
			setAdminSuccess(null);
			
			const response = await fetch('/api/admin/trigger-first-dm', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ experienceId }),
			});

			const result = await response.json();
			
			if (result.success) {
				setAdminSuccess(`DM sent successfully! Conversation ID: ${result.conversationId}`);
				setConversationId(result.conversationId);
				await checkConversationStatus();
			} else {
				setAdminError(result.error || "Failed to trigger DM");
			}
		} catch (err) {
			console.error("Error triggering DM:", err);
			setAdminError("An unexpected error occurred");
		} finally {
			setAdminLoading(false);
		}
	};

	const resetConversations = async () => {
		if (!experienceId) {
			setAdminError("Experience ID is required");
			return;
		}

		try {
			setAdminLoading(true);
			setAdminError(null);
			setAdminSuccess(null);
			
			const response = await fetch('/api/admin/reset-conversations', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ experienceId }),
			});

			const result = await response.json();
			
			if (result.success) {
				setAdminSuccess(`Conversations reset successfully! Closed ${result.data.closedConversations} conversations`);
				setConversationId(null);
				setConversation(null);
				setStageInfo(null);
			} else {
				setAdminError(result.error || "Failed to reset conversations");
			}
		} catch (err) {
			console.error("Error resetting conversations:", err);
			setAdminError("An unexpected error occurred");
		} finally {
			setAdminLoading(false);
		}
	};

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
		<div className="h-screen w-full flex flex-col">
			{/* Admin Controls - Only show for admins */}
			{userType === "admin" && (
				<div className="flex-shrink-0 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
					<div className="max-w-4xl mx-auto">
						<div className="flex items-center justify-between mb-4">
							<div className="flex items-center gap-2">
								<Settings size={20} className="text-gray-600 dark:text-gray-400" />
								<Text size="3" weight="semi-bold" className="text-gray-900 dark:text-gray-100">
									Admin Controls
								</Text>
							</div>
							<button
								onClick={() => setAdminMode(!adminMode)}
								className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
							>
								{adminMode ? "Hide" : "Show"} Admin Panel
							</button>
						</div>

						{adminMode && (
							<div className="space-y-4">
								{/* Status Display */}
								<div className="p-3 bg-white dark:bg-gray-700 rounded-lg border">
									<div className="flex items-center gap-2 mb-2">
										<div className={`w-2 h-2 rounded-full ${conversationId ? 'bg-green-500' : 'bg-gray-400'}`}></div>
										<Text size="2" className="text-gray-900 dark:text-gray-100">
											{conversationId ? 'Active Conversation' : 'No Active Conversation'}
										</Text>
									</div>
									{conversationId && (
										<div className="text-sm text-gray-600 dark:text-gray-400">
											Conversation ID: {conversationId}
										</div>
									)}
									{stageInfo && (
										<div className="text-sm text-gray-600 dark:text-gray-400">
											Current Stage: {stageInfo.currentStage}
											{stageInfo.isDMFunnelActive && " (DM Funnel Active)"}
											{stageInfo.isTransitionStage && " (Transitioning)"}
											{stageInfo.isExperienceQualificationStage && " (Experience Qualification)"}
										</div>
									)}
								</div>

								{/* Action Buttons */}
								<div className="flex gap-2">
									<button
										onClick={checkConversationStatus}
										disabled={adminLoading}
										className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
									>
										<MessageSquare size={16} />
										Refresh Status
									</button>
									
									<button
										onClick={triggerDMForAdmin}
										disabled={adminLoading || !!conversationId}
										className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
									>
										<Play size={16} />
										Trigger DM (Admin)
									</button>
									
									<button
										onClick={resetConversations}
										disabled={adminLoading}
										className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
									>
										<RotateCcw size={16} />
										Reset All
									</button>
								</div>


								{/* Admin Messages */}
								{adminError && (
									<div className="p-2 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded text-sm text-red-700 dark:text-red-300">
										{adminError}
									</div>
								)}
								{adminSuccess && (
									<div className="p-2 bg-green-100 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded text-sm text-green-700 dark:text-green-300">
										{adminSuccess}
									</div>
								)}
							</div>
						)}
					</div>
				</div>
			)}

			{/* Main Chat Interface */}
			<div className="flex-1 min-h-0">
				<UserChat
					funnelFlow={funnelFlow}
					conversationId={conversationId || undefined}
					conversation={conversation || undefined}
					experienceId={experienceId}
					onMessageSent={handleMessageSentInternal}
					stageInfo={stageInfo || undefined}
				/>
			</div>
		</div>
	);
};

export default CustomerView;
