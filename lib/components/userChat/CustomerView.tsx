"use client";

import type React from "react";
import { useState, useEffect, useCallback } from "react";
import UserChat from "./UserChat";
import { AdminNavbar } from "./AdminNavbar";
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
	const [adminLoading, setAdminLoading] = useState(false);
	const [adminError, setAdminError] = useState<string | null>(null);
	const [adminSuccess, setAdminSuccess] = useState<string | null>(null);
	
	// User context for admin features
	const [userContext, setUserContext] = useState<{
		user_id?: string;
		company_id?: string;
	} | null>(null);

	// Fetch user context for admin features
	const fetchUserContext = useCallback(async () => {
		if (!experienceId || userType !== "admin") return;
		
		try {
			const response = await fetch(`/api/user/context?experienceId=${experienceId}`);
			if (response.ok) {
				const data = await response.json();
				if (data.user) {
					setUserContext({
						user_id: data.user.whopUserId,
						company_id: data.user.experience.whopCompanyId
					});
				}
			}
		} catch (error) {
			console.error("Error fetching user context:", error);
		}
	}, [experienceId, userType]);

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

			// Debug logging for CustomerView
			console.log(`[CustomerView] Debug - Loading conversation for experienceId: ${experienceId}, whopUserId: ${whopUserId}`);

			// Step 1: Check if there's an active conversation
			const checkResponse = await apiPost('/api/userchat/check-conversation', {
				whopUserId: whopUserId,
			}, experienceId);

			const checkResult = await checkResponse.json();

			if (checkResult.success) {
				// Set funnel flow from API response
				if (checkResult.funnelFlow) {
					setFunnelFlow(checkResult.funnelFlow);
				}

				// Set stage information
				if (checkResult.stageInfo) {
					setStageInfo(checkResult.stageInfo);
				}

				// If there's an active conversation, load it
				if (checkResult.hasActiveConversation && checkResult.conversation) {
					setConversationId(checkResult.conversation.id);
					
					// Set stage info from check result first
					if (checkResult.stageInfo) {
						setStageInfo(checkResult.stageInfo);
					}
					
					// Try to load the full conversation data (optimized)
					try {
						const loadResponse = await apiPost('/api/userchat/load-conversation', {
							conversationId: checkResult.conversation.id,
							whopUserId: whopUserId,
							userType: userType, // Pass userType for message filtering
						}, experienceId);

						const loadResult = await loadResponse.json();

						if (loadResult.success) {
							// Set conversation data (messages included)
							if (loadResult.conversation) {
								setConversation(loadResult.conversation);
							}

							// Update stage information with latest data
							if (loadResult.stageInfo) {
								setStageInfo(loadResult.stageInfo);
							}

							console.log("CustomerView loaded conversation with messages:", {
								experienceId,
								conversationId: checkResult.conversation.id,
								hasFunnelFlow: !!checkResult.funnelFlow,
								hasConversation: !!loadResult.conversation,
								messageCount: loadResult.conversation?.messages?.length || 0,
								stageInfo: loadResult.stageInfo,
							});
						} else {
							console.error("Failed to load conversation details:", loadResult.error);
							// Don't clear the conversation - we still have basic info from check
						}
					} catch (loadError) {
						console.error("Error loading conversation details:", loadError);
						// Don't clear the conversation - we still have basic info from check
					}
				} else {
					// No active conversation
					setConversationId(null);
					setConversation(null);
					console.log("CustomerView: No active conversation found");
					console.log("CustomerView: checkResult details:", {
						success: checkResult.success,
						hasActiveConversation: checkResult.hasActiveConversation,
						conversation: checkResult.conversation,
						error: checkResult.error
					});
				}
			} else {
				throw new Error(checkResult.error || "Failed to check conversation status");
			}
		} catch (err) {
			console.error("Error loading funnel and conversation:", err);
			setError(err instanceof Error ? err.message : "Failed to load conversation");
		} finally {
			setIsLoading(false);
		}
	}, [experienceId, userName, whopUserId]);

	// Admin functions
	const checkConversationStatus = async () => {
		console.log(`[AdminNavbar] checkConversationStatus called with experienceId: ${experienceId}`);
		if (!experienceId) {
			setAdminError("Experience ID is required");
			return;
		}
		
		try {
			setAdminLoading(true);
			setAdminError(null);
			
			const response = await apiPost('/api/userchat/check-conversation', {}, experienceId);
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


	const triggerDMForAdmin = async (productId?: string) => {
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
				body: JSON.stringify({ experienceId, productId }),
			});

			const result = await response.json();
			
			if (result.success) {
				const productInfo = result.productId ? ` for product ${result.productId}` : '';
				setAdminSuccess(`DM sent successfully${productInfo}! Conversation ID: ${result.conversationId}`);
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
		fetchUserContext();
	}, [loadFunnelAndConversation, fetchUserContext]);

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
		// If user is admin, show admin controls even without funnel
		if (userType === "admin") {
			return (
				<div className="h-screen w-full relative">
					{/* Admin Navbar - Layered overlay */}
					<div className="absolute top-0 left-0 right-0 z-50">
						<AdminNavbar
							conversationId={conversationId}
							stageInfo={stageInfo}
							adminLoading={adminLoading}
							adminError={adminError}
							adminSuccess={adminSuccess}
							onCheckStatus={checkConversationStatus}
							onTriggerDM={triggerDMForAdmin}
							onResetConversations={resetConversations}
						/>
					</div>

					{/* Main Content - No Conversation Message */}
					<div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-surface via-surface/95 to-surface/90">
						<div className="text-center max-w-md mx-auto p-6">
							<div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
								<svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
								</svg>
							</div>
							<h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Conversation</h3>
							<p className="text-gray-600 dark:text-gray-400 mb-4">
								You don't have an active conversation yet.
							</p>
							<button
								onClick={loadFunnelAndConversation}
								className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
							>
								Refresh
							</button>
						</div>
					</div>
				</div>
			);
		}

		// For customers, show simple no conversation message
		return (
			<div className="h-screen w-full flex items-center justify-center bg-gradient-to-br from-surface via-surface/95 to-surface/90">
				<div className="text-center max-w-md mx-auto p-6">
					<div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
						<svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
						</svg>
					</div>
					<h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Conversation</h3>
					<p className="text-gray-600 dark:text-gray-400 mb-4">
						You don't have an active conversation yet.
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

	// Check if we should show UserChat (for all UserChat stages)
	const shouldShowUserChat = stageInfo?.isExperienceQualificationStage || 
		stageInfo?.currentStage === "WELCOME" ||
		stageInfo?.currentStage === "VALUE_DELIVERY" ||
		stageInfo?.currentStage === "EXPERIENCE_QUALIFICATION" ||
		stageInfo?.currentStage === "PAIN_POINT_QUALIFICATION" ||
		stageInfo?.currentStage === "OFFER" ||
		(stageInfo?.isTransitionStage && conversationId) || 
		(stageInfo?.currentStage === "TRANSITION" && conversationId);
	
	// Debug logging
	console.log("CustomerView render state:", {
		hasConversation: !!conversation,
		conversationId,
		stageInfo,
		shouldShowUserChat,
		funnelFlow: !!funnelFlow,
		userType,
		shouldShowAdminPanel: userType === "admin"
	});

	// Render UserChat with real data
	return (
		<div className="h-screen w-full relative">
			{/* Admin Navbar - Layered overlay for admins */}
			{userType === "admin" && (
				<div className="absolute top-0 left-0 right-0 z-50">
					<AdminNavbar
						conversationId={conversationId}
						stageInfo={stageInfo}
						adminLoading={adminLoading}
						adminError={adminError}
						adminSuccess={adminSuccess}
						onCheckStatus={checkConversationStatus}
						onTriggerDM={triggerDMForAdmin}
						onResetConversations={resetConversations}
						experienceId={experienceId}
						funnelFlow={funnelFlow}
						user_id={userContext?.user_id}
						company_id={userContext?.company_id}
					/>
				</div>
			)}

			{/* Main Content Area - Full height, no scrollbars */}
			<div className="h-full w-full">
				{shouldShowUserChat ? (
					/* Show UserChat only when in EXPERIENCE_QUALIFICATION stage */
					<UserChat
						funnelFlow={funnelFlow}
						conversationId={conversationId || undefined}
						conversation={conversation || undefined}
						experienceId={experienceId}
						onMessageSent={handleMessageSentInternal}
						userType={userType}
						stageInfo={stageInfo || undefined}
					/>
				) : (
					/* Show appropriate message based on conversation stage */
					<div className="h-full flex items-center justify-center bg-gradient-to-br from-surface via-surface/95 to-surface/90">
						<div className="text-center max-w-md mx-auto p-6">
							<div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
								<svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
								</svg>
							</div>
							
							{stageInfo?.isDMFunnelActive ? (
								<>
									<h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">DM Funnel Active</h3>
									<p className="text-gray-600 dark:text-gray-400 mb-4">
										Please check your DMs to continue the conversation.
									</p>
								</>
							) : stageInfo?.isTransitionStage ? (
								<>
									<h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Transitioning to Chat</h3>
									<p className="text-gray-600 dark:text-gray-400 mb-4">
										Please wait while we prepare your personalized strategy session.
									</p>
								</>
							) : (
								<>
									<h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Conversation</h3>
									<p className="text-gray-600 dark:text-gray-400 mb-4">
										You don't have an active conversation yet.
									</p>
								</>
							)}
							
							<button
								onClick={loadFunnelAndConversation}
								className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
							>
								Refresh
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

export default CustomerView;
