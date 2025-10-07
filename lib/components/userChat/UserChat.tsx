"use client";

import { Text } from "frosted-ui";
import { ArrowLeft, Moon, Send, Sun, User } from "lucide-react";
import React, {
	useState,
	useRef,
	useEffect,
	useCallback,
	useMemo,
} from "react";
import { useFunnelPreviewChat } from "../../hooks/useFunnelPreviewChat";
import { useWhopWebSocket } from "../../hooks/useWhopWebSocket";
import { useSafeIframeSdk } from "../../hooks/useSafeIframeSdk";
// Server-side functions moved to API routes to avoid client-side imports
import type { FunnelFlow } from "../../types/funnel";
import type { ConversationWithMessages } from "../../types/user";
import { apiPost } from "../../utils/api-client";
import { useTheme } from "../common/ThemeProvider";
import TypingIndicator from "../common/TypingIndicator";
import AnimatedGoldButton from "./AnimatedGoldButton";
import { renderTextWithLinks } from "../../utils/link-utils";
import FunnelProgressBar from "./FunnelProgressBar";

/**
 * Track intent by calling the API endpoint
 */
async function trackIntent(experienceId: string, funnelId: string): Promise<void> {
  try {
    await apiPost("/api/analytics/track-intent", {
      experienceId,
      funnelId
    });
    console.log(`✅ [UserChat] Intent tracked for experience ${experienceId}, funnel ${funnelId}`);
  } catch (error) {
    console.error("❌ [UserChat] Error tracking intent:", error);
    // Don't throw - this is background tracking
  }
}

/**
 * Handle external link navigation according to Whop best practices
 * Uses iframe SDK when available, falls back to window.location for standalone
 */
function handleExternalLink(href: string, iframeSdk: any, isInIframe: boolean): void {
  try {
    // Check if it's a Whop internal link (should stay in iframe)
    const isWhopInternalLink = href.includes('whop.com') && !href.includes('whop.com/checkout') && !href.includes('whop.com/hub');
    
    if (isInIframe && iframeSdk && iframeSdk.openExternalUrl) {
      // Use Whop iframe SDK for external links (best practice)
      console.log(`🔗 [UserChat] Opening external link via Whop iframe SDK: ${href}`);
      iframeSdk.openExternalUrl({ url: href });
    } else if (isWhopInternalLink) {
      // For Whop internal links, use window.location to stay in iframe
      console.log(`🔗 [UserChat] Opening Whop internal link: ${href}`);
      window.location.href = href;
    } else {
      // For external links outside iframe, open in new tab
      console.log(`🔗 [UserChat] Opening external link in new tab: ${href}`);
      window.open(href, '_blank', 'noopener,noreferrer');
    }
  } catch (error) {
    console.error("❌ [UserChat] Error handling external link:", error);
    // Fallback to window.location
    window.location.href = href;
  }
}

interface UserChatProps {
	funnelFlow: FunnelFlow;
	conversationId?: string;
	conversation?: ConversationWithMessages;
	experienceId?: string;
	onMessageSent?: (message: string, conversationId?: string) => void;
	onBack?: () => void;
	hideAvatar?: boolean;
	userType?: "admin" | "customer";
	stageInfo?: {
		currentStage: string;
		isDMFunnelActive: boolean;
		isTransitionStage: boolean;
		isExperienceQualificationStage: boolean;
	};
}

/**
 * --- Ultra-High-Performance Chat Component ---
 *
 * Maximum performance with:
 * - No unnecessary re-renders
 * - Minimal hooks and callbacks
 * - Direct DOM manipulation
 * - Zero animations
 * - Native browser behavior only
 */
const UserChat: React.FC<UserChatProps> = ({
	funnelFlow,
	conversationId,
	conversation,
	experienceId,
	onMessageSent,
	onBack,
	hideAvatar = false,
	userType,
	stageInfo,
}) => {
	const [message, setMessage] = useState("");
	// ✅ REMOVED: isTyping state - no typing indicators needed
	const [conversationMessages, setConversationMessages] = useState<Array<{
		id: string;
		type: "user" | "bot" | "system";
		content: string;
		metadata?: any;
		createdAt: Date;
	}>>([]);
	const [localCurrentBlockId, setLocalCurrentBlockId] = useState<string | null>(null);
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const chatEndRef = useRef<HTMLDivElement>(null);
	// ✅ REMOVED: typingTimeoutRef - no typing indicators needed
	const { appearance, toggleTheme } = useTheme();
	const { iframeSdk, isInIframe } = useSafeIframeSdk();

	// Removed OFFER link resolution logic - links are now handled by backend

	// Initialize conversation messages from backend data IMMEDIATELY
	useEffect(() => {
		if (conversation?.messages) {
			const processMessages = async () => {
				const formattedMessages = await Promise.all(
					conversation.messages.map(async (msg: any) => {
						let content = msg.text || msg.content;
						
						// Links are now handled by backend - no frontend processing needed
						
						return {
							id: msg.id,
							type: msg.type,
							content,
							metadata: msg.metadata,
							createdAt: msg.timestamp || msg.createdAt,
						};
					})
				);
				
				setConversationMessages(formattedMessages);
				console.log("UserChat: Loaded conversation messages from backend:", formattedMessages.length);
				console.log("UserChat: Sample message:", formattedMessages[0]);
				console.log("UserChat: All messages:", formattedMessages.map(m => ({
					id: m.id,
					type: m.type,
					content: m.content.substring(0, 50) + (m.content.length > 50 ? '...' : ''),
					createdAt: m.createdAt
				})));
				// Scroll to bottom after loading messages
				setTimeout(() => scrollToBottom(), 100);
			};
			
			processMessages();
		}
	}, [conversation?.messages]);

	// WebSocket integration for REAL-TIME updates only (background initialization)
	console.log("🔌 [UserChat] WebSocket configuration:", {
		conversationId: conversationId || "",
		experienceId: experienceId || "",
		userType: userType,
		hasConversation: !!conversation,
		conversationIdFromConversation: conversation?.id
	});
	
	const { isConnected, sendMessage } = useWhopWebSocket({
		conversationId: conversationId || "",
		experienceId: experienceId || "",
		onMessage: (newMessage) => {
			console.log("📨 [UserChat] WebSocket message received in component:", {
				id: newMessage.id,
				type: newMessage.type,
				content: newMessage.content.substring(0, 50) + "...",
				conversationId: newMessage.metadata?.conversationId,
				userId: newMessage.metadata?.userId,
				experienceId: newMessage.metadata?.experienceId,
				timestamp: newMessage.createdAt,
				userType: userType // ✅ DEBUG: Add userType to see if admin/customer affects WebSocket
			});
			
			// Check if message already exists locally
			const messageExists = conversationMessages.some(msg => 
				msg.content === newMessage.content && 
				msg.type === newMessage.type &&
				Math.abs(new Date(msg.createdAt).getTime() - new Date(newMessage.createdAt).getTime()) < 5000 // 5 second tolerance
			);
			
			if (!messageExists) {
				console.log("✅ [UserChat] New message detected, adding directly...");
				// Add new message directly instead of reloading all messages
				setConversationMessages(prev => [...prev, {
					id: newMessage.id,
					type: newMessage.type,
					content: newMessage.content,
					metadata: newMessage.metadata,
					createdAt: newMessage.createdAt,
				}]);
			} else {
				console.log("⚠️ [UserChat] Message already exists locally, skipping");
			}
			
			// Check for stage transition in message metadata
			if (newMessage.metadata?.stageTransition) {
				const newStage = newMessage.metadata.stageTransition.currentStage;
				console.log("🔄 [UserChat] Stage transition detected:", newStage);
				
				// Dispatch custom event for progress bar update
				const stageUpdateEvent = new CustomEvent('funnel-stage-update', {
					detail: { newStage }
				});
				window.dispatchEvent(stageUpdateEvent);
			}
			
			scrollToBottom();
		},
		// ✅ REMOVED: onTyping callback - no typing indicators needed
		onError: (error) => {
			console.error("WebSocket error:", error);
		},
	});

	// Refresh conversation data when WebSocket receives new messages (optimized)
	const refreshConversation = useCallback(async () => {
		if (!conversationId || !experienceId) return;
		
		try {
			console.log("UserChat: Refreshing conversation data...");
			const response = await apiPost('/api/userchat/load-conversation', {
				conversationId,
				experienceId,
			}, experienceId);
			
			if (response.ok) {
				const result = await response.json();
				// Note: result.data because load-conversation uses createSuccessResponse
				const conversationData = result.data || result;
				if (conversationData.success && conversationData.conversation?.messages) {
					const formattedMessages = conversationData.conversation.messages.map((msg: any) => ({
						id: msg.id,
						type: msg.type,
						content: msg.content,
						metadata: msg.metadata,
						createdAt: msg.createdAt,
					}));
					setConversationMessages(formattedMessages);
					console.log("UserChat: Refreshed conversation messages:", formattedMessages.length);
					// Scroll to bottom after refreshing
					setTimeout(() => scrollToBottom(), 50);
				}
			}
		} catch (error) {
			console.error("UserChat: Error refreshing conversation:", error);
		}
	}, [conversationId, experienceId]);

	// Get current block ID from conversation state or local state
	const currentBlockId = localCurrentBlockId || conversation?.currentBlockId || null;
	
	// Get options for current block from funnel flow
	const currentBlock = currentBlockId ? funnelFlow?.blocks[currentBlockId] : null;
	const options = currentBlock?.options || [];

	// Update local current block ID when conversation changes
	useEffect(() => {
		if (conversation?.currentBlockId) {
			setLocalCurrentBlockId(conversation.currentBlockId);
		}
	}, [conversation?.currentBlockId]);

	// Handle different conversation states (simplified to match preview)
	const isExperienceQualificationStage = stageInfo?.isExperienceQualificationStage || false;

	// Get funnel navigation functions (only for option handling)
	const {
		handleOptionClick: previewHandleOptionClick,
		handleCustomInput: previewHandleCustomInput,
	} = useFunnelPreviewChat(funnelFlow, undefined, conversation);

	// Direct handlers - no callbacks for maximum performance
	const handleSubmit = async (e?: React.FormEvent) => {
		e?.preventDefault();
		if (!message.trim()) return;

		const messageContent = message.trim();
		setMessage("");

		// Handle conversation-based chat
		if (conversationId && experienceId && isConnected) {
			// Process message through funnel system (API handles database save)
			try {
				const response = await apiPost('/api/userchat/process-message', {
					conversationId,
					messageContent,
					messageType: "user",
				}, experienceId);

				if (response.ok) {
					const result = await response.json();
					console.log("Message processed through funnel:", result);
					
					// Add user message to UI (API already saved to database)
					const userMessage = {
						id: `user-${Date.now()}`,
						type: "user" as const,
						content: messageContent,
						createdAt: new Date(),
					};
					setConversationMessages(prev => [...prev, userMessage]);
					console.log("UserChat: Added user message to UI:", userMessage);
					
					// ✅ FIXED: Broadcast user message via WebSocket for real-time sync
					console.log("🔊 [UserChat UI] BEFORE SENDING MESSAGE:", {
						instanceId: `userchat-ui-${conversationId}-${Date.now()}`,
						conversationId,
						experienceId,
						userType,
						messageContent: messageContent.substring(0, 50) + "...",
						isConnected,
						channels: [`experience:${experienceId}`, `livechat:${experienceId}`],
						timestamp: new Date().toISOString()
					});
					
					try {
						const result = await sendMessage(messageContent, "user", {
							conversationId,
							userId: "customer",
							experienceId,
							timestamp: new Date().toISOString(),
						});
						console.log("✅ [UserChat UI] AFTER SENDING MESSAGE:", {
							instanceId: `userchat-ui-${conversationId}-${Date.now()}`,
							conversationId,
							experienceId,
							userType,
							messageContent: messageContent.substring(0, 50) + "...",
							broadcastResult: result,
							isConnected,
							channels: [`experience:${experienceId}`, `livechat:${experienceId}`],
							timestamp: new Date().toISOString()
						});
					} catch (wsError) {
						console.error("❌ [UserChat] Failed to broadcast user message:", wsError);
					}
					
					// If there's a bot response, add it to UI
					// Note: result.data.funnelResponse because createSuccessResponse wraps data
					const funnelResponse = result.data?.funnelResponse || result.funnelResponse;
					if (funnelResponse?.botMessage) {
						const botMessage = {
							id: `bot-${Date.now()}`,
							type: "bot" as const,
							content: funnelResponse.botMessage,
							createdAt: new Date(),
						};
						setConversationMessages(prev => [...prev, botMessage]);
						console.log("UserChat: Added bot message to UI:", botMessage);
						
						// ✅ FIXED: Broadcast bot message via WebSocket for real-time sync
						console.log("🔊 [UserChat UI] BEFORE SENDING BOT MESSAGE:", {
							instanceId: `userchat-ui-${conversationId}-${Date.now()}`,
							conversationId,
							experienceId,
							userType,
							botMessage: funnelResponse.botMessage.substring(0, 50) + "...",
							isConnected,
							channels: [`experience:${experienceId}`, `livechat:${experienceId}`],
							timestamp: new Date().toISOString()
						});
						
						try {
							await sendMessage(funnelResponse.botMessage, "bot", {
								conversationId,
								userId: "system",
								experienceId,
								timestamp: new Date().toISOString(),
								blockId: funnelResponse.nextBlockId,
							});
							console.log("✅ [UserChat UI] AFTER SENDING BOT MESSAGE:", {
								instanceId: `userchat-ui-${conversationId}-${Date.now()}`,
								conversationId,
								experienceId,
								userType,
								botMessage: funnelResponse.botMessage.substring(0, 50) + "...",
								isConnected,
								channels: [`experience:${experienceId}`, `livechat:${experienceId}`],
								timestamp: new Date().toISOString()
							});
						} catch (wsError) {
							console.error("❌ [UserChat] Failed to broadcast bot message:", wsError);
						}
					}

					// Update local current block ID if next block is provided
					if (funnelResponse?.nextBlockId) {
						setLocalCurrentBlockId(funnelResponse.nextBlockId);
						console.log("UserChat: Updated local current block ID to:", funnelResponse.nextBlockId);
						console.log("UserChat: New options will be:", funnelFlow.blocks[funnelResponse.nextBlockId]?.options?.map(opt => opt.text));
					}

					// Scroll to bottom after adding messages
					scrollToBottom();
				} else {
					const errorText = await response.text();
					console.error("Failed to process message through funnel:", {
						status: response.status,
						statusText: response.statusText,
						errorText: errorText,
					});
					
					// Show error message to user
					const errorMessage = {
						id: `error-${Date.now()}`,
						type: "bot" as const,
						content: "Sorry, there was an error processing your message. Please try again.",
						createdAt: new Date(),
					};
					setConversationMessages(prev => [...prev, errorMessage]);
					scrollToBottom();
				}
			} catch (apiError) {
				console.error("Error calling message processing API:", apiError);
				// Show error message to user
				const errorMessage = {
					id: `error-${Date.now()}`,
					type: "bot" as const,
					content: "Sorry, there was an error processing your message. Please try again.",
					createdAt: new Date(),
				};
				setConversationMessages(prev => [...prev, errorMessage]);
				scrollToBottom();
			}
		} else {
			// Handle preview mode (existing functionality)
			previewHandleCustomInput(messageContent);
		}

		onMessageSent?.(messageContent, conversationId);
	};

	// Handle conversation option selection
	const handleConversationOptionSelection = useCallback(async (option: { text: string; nextBlockId: string | null }) => {
		try {
			if (!conversationId) return;

			// IMMEDIATE UI UPDATE: Add user message to local state first
			const userMessage = {
				id: `temp-user-${Date.now()}`,
				type: "user" as const,
				content: option.text,
				createdAt: new Date(),
			};
			setConversationMessages(prev => [...prev, userMessage]);
			scrollToBottom();

			// ✅ FIXED: Broadcast user message via WebSocket for real-time sync
			console.log("🔊 [UserChat UI] BEFORE SENDING OPTION MESSAGE:", {
				instanceId: `userchat-ui-${conversationId}-${Date.now()}`,
				conversationId,
				experienceId,
				userType,
				optionText: option.text.substring(0, 50) + "...",
				isConnected,
				channels: [`experience:${experienceId}`, `livechat:${experienceId}`],
				timestamp: new Date().toISOString()
			});
			
			try {
				const result = await sendMessage(option.text, "user", {
					conversationId,
					userId: "customer",
					experienceId,
					timestamp: new Date().toISOString(),
				});
				console.log("✅ [UserChat UI] AFTER SENDING OPTION MESSAGE:", {
					instanceId: `userchat-ui-${conversationId}-${Date.now()}`,
					conversationId,
					experienceId,
					userType,
					optionText: option.text.substring(0, 50) + "...",
					broadcastResult: result,
					isConnected,
					channels: [`experience:${experienceId}`, `livechat:${experienceId}`],
					timestamp: new Date().toISOString()
				});
			} catch (wsError) {
				console.error("❌ [UserChat] Failed to broadcast option message:", wsError);
			}

			// Navigate funnel via API route
			const response = await apiPost('/api/userchat/navigate-funnel', {
				conversationId,
				navigationData: {
					text: option.text,
					value: option.text,
					blockId: currentBlockId || "", // Use current block ID, not next block ID
				},
			}, experienceId);

			const result = await response.json();

			if (result.success && result.conversation) {
				// IMMEDIATE UI UPDATE: Add bot response if available
				if (result.botMessage) {
					const botMessage = {
						id: `temp-bot-${Date.now()}`,
						type: "bot" as const,
						content: result.botMessage, // Use processed message from backend
						createdAt: new Date(),
					};
					setConversationMessages(prev => [...prev, botMessage]);
					scrollToBottom();

					// ✅ FIXED: Broadcast bot message via WebSocket for real-time sync
					console.log("🔊 [UserChat UI] BEFORE SENDING OPTION BOT MESSAGE:", {
						instanceId: `userchat-ui-${conversationId}-${Date.now()}`,
						conversationId,
						experienceId,
						userType,
						botMessage: result.botMessage.substring(0, 50) + "...",
						isConnected,
						channels: [`experience:${experienceId}`, `livechat:${experienceId}`],
						timestamp: new Date().toISOString()
					});
					
					try {
						// Prepare metadata with stage transition if available
						const metadata: any = {
							conversationId,
							userId: "system",
							experienceId,
							timestamp: new Date().toISOString(),
							blockId: result.conversation.currentBlockId,
						};

						// Add stage transition metadata if stage transition occurred
						if (result.stageTransition) {
							metadata.stageTransition = result.stageTransition;
							console.log("🔄 [UserChat] Stage transition detected in API response:", result.stageTransition);
						}

						await sendMessage(result.botMessage, "bot", metadata);
						console.log("✅ [UserChat UI] AFTER SENDING OPTION BOT MESSAGE:", {
							instanceId: `userchat-ui-${conversationId}-${Date.now()}`,
							conversationId,
							experienceId,
							userType,
							botMessage: result.botMessage.substring(0, 50) + "...",
							isConnected,
							channels: [`experience:${experienceId}`, `livechat:${experienceId}`],
							timestamp: new Date().toISOString()
						});
					} catch (wsError) {
						console.error("❌ [UserChat] Failed to broadcast option bot message:", wsError);
					}
				}
				
				// IMMEDIATE UI UPDATE: Update local current block ID to show new options immediately
				if (result.conversation.currentBlockId) {
					setLocalCurrentBlockId(result.conversation.currentBlockId);
					console.log("UserChat: Updated local current block ID to:", result.conversation.currentBlockId);
					console.log("UserChat: New options will be:", funnelFlow.blocks[result.conversation.currentBlockId]?.options?.map(opt => opt.text));
				}
				
				// Check for funnel completion
				if (result.conversation.status === "closed") {
					await handleFunnelCompletion();
				}
			}
		} catch (error) {
			console.error("Error handling conversation option selection:", error);
		}
	}, [conversationId, currentBlockId, funnelFlow, sendMessage]);

	// Handle invalid response
	const handleInvalidResponse = useCallback(async (userInput: string) => {
		// IMMEDIATE UI UPDATE: Add error message to local state first
		const errorMessage = {
			id: `temp-error-${Date.now()}`,
			type: "bot" as const,
			content: "Please choose from the provided options above.",
			createdAt: new Date(),
		};
		setConversationMessages(prev => [...prev, errorMessage]);
		scrollToBottom();

		// Send via WebSocket for real-time sync (optional)
		await sendMessage("Please choose from the provided options above.", "bot");
	}, [sendMessage]);

	// Handle funnel completion
	const handleFunnelCompletion = useCallback(async () => {
		try {
			if (!conversationId) return;

			// Complete funnel via API route
		const response = await apiPost('/api/userchat/complete-funnel', {
			conversationId,
		}, experienceId);

		const result = await response.json();
			if (result.success) {
				const completionMessage = {
					id: `completion-${Date.now()}`,
					type: "system" as const,
					content: "🎉 Congratulations! You've completed the funnel. Thank you for your time!",
					createdAt: new Date(),
				};
				setConversationMessages(prev => [...prev, completionMessage]);
				await sendMessage(completionMessage.content, "system");
			}
		} catch (error) {
			console.error("Error handling funnel completion:", error);
		}
	}, [conversationId, sendMessage]);

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSubmit();
		}
	};

	const handleTextareaInput = useCallback(
		(e: React.FormEvent<HTMLTextAreaElement>) => {
			const target = e.target as HTMLTextAreaElement;
			requestAnimationFrame(() => {
				target.style.height = "auto";
				target.style.height = Math.min(target.scrollHeight, 120) + "px";
			});

			// ✅ REMOVED: Typing indicator for user messages
			// No typing indicator shown when user types messages
		},
		[conversationId, experienceId, isConnected],
	);

	// Optimized scroll to bottom - mobile performance optimized
	const scrollToBottom = useCallback(() => {
		if (chatEndRef.current) {
			// Use instant scroll for better mobile performance
			chatEndRef.current.scrollIntoView({
				behavior: "instant",
				block: "end",
				inline: "nearest",
			});
		}
	}, []);

	const handleOptionClickLocal = useCallback(
		(option: any, index: number) => {
			// ✅ REMOVED: Typing timeout clearing - no typing indicators needed

			// Send user message immediately
			onMessageSent?.(`${index + 1}. ${option.text}`, conversationId);

			// Handle option selection based on conversation type
			if (conversationId && experienceId && isConnected) {
				// Use backend conversation handling
				handleConversationOptionSelection(option);
			} else {
				// Fallback to preview mode
				previewHandleOptionClick(option, index);
			}
		},
		[conversationId, experienceId, isConnected, handleConversationOptionSelection, previewHandleOptionClick, onMessageSent, scrollToBottom],
	);

	// Optimized keyboard handling - reduced timeout for better performance
	useEffect(() => {
		let previousViewportHeight =
			window.visualViewport?.height || window.innerHeight;

		const handleViewportChange = () => {
			const currentViewportHeight =
				window.visualViewport?.height || window.innerHeight;

			// Only scroll when keyboard appears (viewport height decreases)
			if (currentViewportHeight < previousViewportHeight) {
				// Reduced timeout for faster response
				setTimeout(scrollToBottom, 100);
			}

			previousViewportHeight = currentViewportHeight;
		};

		if (window.visualViewport) {
			window.visualViewport.addEventListener("resize", handleViewportChange);
			return () => {
				window.visualViewport?.removeEventListener(
					"resize",
					handleViewportChange,
				);
			};
		}
	}, []);

	// ✅ REMOVED: Typing timeout cleanup - no typing indicators needed

	// Auto-scroll when conversation messages change (optimized for mobile performance)
	useEffect(() => {
		if (conversationMessages.length > 0) {
			// Use requestAnimationFrame for better performance
			requestAnimationFrame(() => {
				scrollToBottom();
			});
		}
	}, [conversationMessages, scrollToBottom]);

	// ✅ REMOVED: Auto-scroll for typing indicator - no typing indicators needed

	// Memoized message component for better performance
	const MessageComponent = React.memo(
		({ msg, index }: { msg: any; index: number }) => {
			// Special handling for system messages (redirect indicator)
			if (msg.type === "system") {
				if (msg.text === "redirect_to_live_chat") {
					return (
						<div className="relative my-6 flex items-center">
							{/* Left line */}
							<div className="flex-1 h-px bg-gradient-to-r from-transparent via-violet-300 dark:via-violet-600 to-transparent"></div>
							
							{/* Center text on line */}
							<div className="px-4 py-1 bg-gradient-to-r from-violet-100 to-purple-100 dark:from-violet-900/40 dark:to-purple-900/40 border border-violet-300 dark:border-violet-700/50 rounded-full shadow-sm backdrop-blur-sm mx-2">
								<div className="flex items-center gap-2">
									<div className="w-2 h-2 bg-violet-500 rounded-full animate-pulse"></div>
									<Text size="1" weight="medium" className="text-violet-700 dark:text-violet-300 whitespace-nowrap">
										Redirecting to Live Chat
									</Text>
									<div className="w-2 h-2 bg-violet-500 rounded-full animate-pulse"></div>
								</div>
							</div>
							
							{/* Right line */}
							<div className="flex-1 h-px bg-gradient-to-r from-transparent via-violet-300 dark:via-violet-600 to-transparent"></div>
						</div>
					);
				}
				
				// Default system message styling
				return (
					<div className="flex justify-center my-4">
						<div className="px-4 py-2 bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 border border-amber-300 dark:border-amber-700/50 rounded-full shadow-sm">
							<Text size="1" weight="medium" className="text-amber-700 dark:text-amber-300 text-center">
								{msg.text}
							</Text>
						</div>
					</div>
				);
			}

		// Handle animated button HTML in bot messages (processed by backend)
		const renderMessageWithLinks = (text: string) => {
			// Debug logging
			const hasButton = text.includes('animated-gold-button');
			console.log(`[UserChat] Rendering message:`, { 
				type: msg.type, 
				hasAnimatedButton: hasButton,
				text: text.substring(0, 200) + '...',
				willApplySpecialStyling: hasButton && msg.type === 'bot'
			});
			
			// Check for animated button HTML first
			if (msg.type === "bot" && text.includes('animated-gold-button')) {
					// Parse the HTML and extract the button data
					const buttonRegex = /<div class="animated-gold-button" data-href="([^"]+)">([^<]+)<\/div>/g;
					const parts = text.split(buttonRegex);
					
					// Separate text and buttons
					const textParts: React.ReactNode[] = [];
					const buttons: React.ReactNode[] = [];
					
					parts.forEach((part, partIndex) => {
						if (partIndex % 3 === 1) {
							// This is the href
							const href = part;
							const buttonText = parts[partIndex + 1] || "Get Started!";
							
							// Determine if this is a VALUE_DELIVERY button (free resource) or OFFER button (paid resource)
							const isValueDeliveryButton = buttonText === "Claim!";
							const buttonIcon = isValueDeliveryButton ? "gift" : "sparkles";
							
							buttons.push(
								<AnimatedGoldButton 
									key={partIndex} 
									href={href}
									text={buttonText}
									icon={buttonIcon}
									onClick={() => {
										// Only track intent for OFFER buttons (paid resources), not VALUE_DELIVERY buttons (free resources)
										if (!isValueDeliveryButton && conversation?.funnelId && experienceId) {
											console.log(`🚀 [UserChat] Tracking intent for experience ${experienceId}, funnel ${conversation.funnelId}`);
											trackIntent(experienceId, conversation.funnelId);
										} else if (isValueDeliveryButton) {
											console.log(`🎁 [UserChat] Free resource claim - no intent tracking for VALUE_DELIVERY button`);
										}
										// Handle link navigation according to Whop best practices
										handleExternalLink(href, iframeSdk, isInIframe);
									}}
								/>
							);
						} else if (partIndex % 3 === 0) {
							// This is text content
							if (part.trim()) {
								textParts.push(
									<Text key={partIndex} size="2" className="whitespace-pre-wrap leading-relaxed text-base">
										{part.trim()}
									</Text>
								);
							}
						}
					});
					
					return (
						<div className="space-y-6">
							{/* All text content first */}
							{textParts}
							{/* All buttons below text with extra spacing */}
							{buttons.length > 0 && (
								<div className="flex justify-center pt-4">
									{buttons}
								</div>
							)}
						</div>
					);
				}
				
				// Legacy [LINK] placeholder handling removed - all link processing now handled by backend
				
				// Regular message with clickable links
				return (
					<Text
						size="2"
						className="whitespace-pre-wrap leading-relaxed text-base"
					>
						{renderTextWithLinks(text)}
					</Text>
				);
			};

			return (
				<div
					key={`${msg.type}-${index}`}
					className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"} mb-4 px-1`}
				>
					<div
						className={`max-w-[85%] sm:max-w-[80%] px-4 py-3 rounded-xl ${
							msg.type === "user"
								? "bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25"
								: msg.text.includes('animated-gold-button')
									? "bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 border-3 border-amber-500 dark:border-amber-400 text-gray-900 dark:text-gray-100 shadow-lg shadow-amber-300/60 dark:shadow-amber-700/60"
									: "bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 shadow-lg shadow-gray-200/50 dark:shadow-gray-800/50"
						}`}
						style={{
							userSelect: "text",
							WebkitUserSelect: "text",
							MozUserSelect: "text",
							msUserSelect: "text",
						}}
					>
						{renderMessageWithLinks(msg.text)}
					</div>
				</div>
			);
		},
	);

	// Memoized option component for better performance
	const OptionComponent = React.memo(
		({
			option,
			index,
			onClick,
		}: {
			option: any;
			index: number;
			onClick: (option: any, index: number) => void;
		}) => (
			<button
				key={`option-${index}`}
				onClick={() => onClick(option, index)}
				className="chat-optimized inline-flex items-center gap-3 pl-4 pr-4 py-3 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white text-left touch-manipulation active:from-blue-600 active:to-blue-700 active:scale-95 transition-all duration-150 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40"
			>
				<span className="flex-shrink-0 w-7 h-7 bg-blue-700 rounded-full flex items-center justify-center text-sm font-medium shadow-md">
					{index + 1}
				</span>
				<Text size="2" className="text-white leading-relaxed">
					{option.text}
				</Text>
			</button>
		),
	);

	// Memoized message list - show conversation messages
	const messageList = useMemo(() => {
		const messagesToShow = conversationMessages.map(msg => ({
			type: msg.type,
			text: msg.content, // Use content property
			timestamp: msg.createdAt,
		}));

		// Filter out transition messages for customers
		const filteredMessages = userType === "customer" 
			? messagesToShow.filter(msg => {
				// Hide transition messages from customers
				if (msg.type === "bot" && msg.text) {
					// Check for TRANSITION message pattern: "Wait! [WHOP_OWNER] has a gift for you, [USER]!"
					const isTransitionMessage = msg.text.includes("Wait!") && 
						msg.text.includes("has a gift for you") &&
						msg.text.includes("VIP chat");
					
					// Also check for other transition patterns
					const isTransitionPattern = msg.text.includes("catch") && 
						(msg.text.includes("LINK") || msg.text.includes("whop.com"));
					
					return !(isTransitionMessage || isTransitionPattern);
				}
				return true;
			})
			: messagesToShow;

		console.log("UserChat: Rendering message list:", filteredMessages.length, "messages");
		console.log("UserChat: Message list sample:", filteredMessages.slice(0, 2).map(m => ({
			type: m.type,
			text: m.text.substring(0, 30) + (m.text.length > 30 ? '...' : ''),
			timestamp: m.timestamp
		})));

		const messageElements = filteredMessages.map((msg: any, index: number) => (
			<MessageComponent
				key={`${msg.type}-${index}`}
				msg={msg}
				index={index}
			/>
		));

		// Add separation line after first message for admin users
		if (userType === "admin" && filteredMessages.length > 0) {
			messageElements.splice(1, 0, (
				<div key="admin-separation-line" className="relative my-6 flex items-center">
					{/* Left line */}
					<div className="flex-1 h-px bg-gradient-to-r from-transparent via-violet-300 dark:via-violet-600 to-transparent"></div>
					
					{/* Center text on line */}
					<div className="px-4 py-1 bg-gradient-to-r from-violet-100 to-purple-100 dark:from-violet-900/40 dark:to-purple-900/40 border border-violet-300 dark:border-violet-700/50 rounded-full shadow-sm backdrop-blur-sm mx-2">
						<div className="flex items-center gap-2">
							<div className="w-2 h-2 bg-violet-500 rounded-full animate-pulse"></div>
							<Text size="1" weight="medium" className="text-violet-700 dark:text-violet-300 whitespace-nowrap">
								Admin View - Live Chat
							</Text>
							<div className="w-2 h-2 bg-violet-500 rounded-full animate-pulse"></div>
						</div>
					</div>
					
					{/* Right line */}
					<div className="flex-1 h-px bg-gradient-to-r from-transparent via-violet-300 dark:via-violet-600 to-transparent"></div>
				</div>
			));
		}

		return messageElements;
	}, [conversationMessages, userType]);

	// Memoized options list
	const optionsList = useMemo(
		() =>
			options.map((opt, i) => (
				<OptionComponent
					key={`option-${i}`}
					option={opt}
					index={i}
					onClick={handleOptionClickLocal}
				/>
			)),
		[options, handleOptionClickLocal],
	);

	return (
		<div
			className="h-screen w-full flex flex-col bg-gradient-to-br from-surface via-surface/95 to-surface/90 touch-manipulation"
			style={{
				// Mobile performance optimizations
				transform: "translateZ(0)", // Force hardware acceleration
				WebkitTransform: "translateZ(0)", // iOS hardware acceleration
				backfaceVisibility: "hidden", // Prevent flickering
				WebkitBackfaceVisibility: "hidden", // iOS flicker prevention
				// Prevent zoom on input focus (iOS)
				WebkitTextSizeAdjust: "100%",
				// Optimize touch interactions
				touchAction: "pan-y pinch-zoom",
				// Prevent pull-to-refresh
				overscrollBehavior: "contain",
			}}
		>
			{/* Header - Hidden on desktop */}
			<div className="lg:hidden flex-shrink-0 bg-gradient-to-br from-surface via-surface/95 to-surface/90 backdrop-blur-sm border-b border-border/30 dark:border-border/20 shadow-lg px-4 py-3 safe-area-top">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-4">
						{onBack && (
							<button
								onClick={onBack}
								className="p-2 rounded-lg touch-manipulation text-muted-foreground hover:text-foreground hover:bg-surface/80 transition-colors duration-200 dark:hover:bg-surface/60"
								style={{ WebkitTapHighlightColor: "transparent" }}
							>
								<ArrowLeft size={20} strokeWidth={2.5} />
							</button>
						)}

						{/* Avatar Icon - only show if not hidden */}
						{!hideAvatar && (
							<div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0">
								<img 
									src="https://img-v2-prod.whop.com/unsafe/rs:fit:256:0/plain/https%3A%2F%2Fassets.whop.com%2Fuploads%2F2025-10-02%2Fuser_16843562_c991d27a-feaa-4318-ab44-2aaa27937382.jpeg@avif?w=256&q=75"
									alt="User Avatar"
									className="w-20 h-20 object-cover"
									onError={(e) => {
										// Fallback to default icon if image fails to load
										const target = e.target as HTMLImageElement;
										target.style.display = 'none';
										const parent = target.parentElement;
										if (parent) {
											parent.innerHTML = '<div class="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center"><svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg></div>';
										}
									}}
								/>
							</div>
						)}

						<div>
							<Text
								size="3"
								weight="semi-bold"
								className="text-black dark:text-white"
							>
								Hustler
							</Text>
							{conversationId && (
								<div className="flex items-center gap-2 mt-1">
									<div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
									<span className="text-xs text-gray-500 dark:text-gray-400">
										{isConnected ? 'Connected' : 'Disconnected'}
									</span>
								</div>
							)}
						</div>
					</div>

					{/* Theme Toggle Button */}
					<div className="p-1 rounded-xl bg-surface/50 border border-border/50 shadow-lg backdrop-blur-sm dark:bg-surface/30 dark:border-border/30 dark:shadow-xl dark:shadow-black/20">
						<button
							onClick={toggleTheme}
							className="p-2 rounded-lg touch-manipulation transition-all duration-200 hover:scale-105"
							style={{ WebkitTapHighlightColor: "transparent" }}
							title={
								appearance === "dark"
									? "Switch to light mode"
									: "Switch to dark mode"
							}
						>
							{appearance === "dark" ? (
								<Sun
									size={20}
									className="text-foreground/70 dark:text-foreground/70"
								/>
							) : (
								<Moon
									size={20}
									className="text-foreground/70 dark:text-foreground/70"
								/>
							)}
						</button>
					</div>
				</div>

				{/* Subtle Separator Line */}
				<div className="w-full h-0.5 bg-gradient-to-r from-transparent via-violet-300/40 dark:via-violet-600/40 to-transparent mt-3" />
			</div>

			{/* Funnel Progress Bar */}
			{funnelFlow && (
				<FunnelProgressBar
					currentStage={stageInfo?.currentStage || "WELCOME"}
					stages={funnelFlow.stages}
					onStageUpdate={(newStage) => {
						// Handle stage updates from WebSocket
						console.log("Progress bar stage update:", newStage);
					}}
				/>
			)}

			{/* Chat Container */}
			<div className="flex-1 flex flex-col min-h-0">
				{/* Messages */}
				<div className="flex-1 overflow-y-auto p-4 touch-pan-y scrollbar-hide chat-messages-container">
					{messageList}

					{/* Options - User side (right side) */}
					{conversationMessages.length > 0 &&
						conversationMessages[conversationMessages.length - 1].type === "bot" &&
						options.length > 0 && (
							<div className="flex justify-end mb-4 pr-0">
								<div className="space-y-2 flex flex-col items-end">
									{optionsList}
								</div>
							</div>
						)}

					{/* ✅ REMOVED: Typing Indicator - no typing indicators needed */}

					<div ref={chatEndRef} />
				</div>

				{/* Input Area - Now below the overflow container */}
				{currentBlockId && (
					<div className="flex-shrink-0 chat-input-container safe-area-bottom">
						<div className="flex items-end gap-3">
							<div className="flex-1">
								<textarea
									ref={textareaRef}
									value={message}
									onChange={(e) => setMessage(e.target.value)}
									onKeyDown={handleKeyDown}
									onInput={handleTextareaInput}
									placeholder="Type a message..."
									rows={1}
									className="chat-input-optimized w-full px-4 py-3 bg-white dark:bg-gray-800 border border-border/30 dark:border-border/20 rounded-xl text-base text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none min-h-[48px] max-h-32 touch-manipulation shadow-sm"
									style={{
										height: "auto",
										minHeight: "48px",
										fontSize: "16px", // Prevents zoom on iOS
									}}
								/>
							</div>

							<button
								onClick={handleSubmit}
								disabled={!message.trim()}
								className="chat-optimized p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed touch-manipulation active:from-blue-600 active:to-blue-700 active:scale-95 transition-all duration-150 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 disabled:shadow-none"
							>
								<Send size={18} className="text-white dark:text-gray-100" />
							</button>
						</div>
					</div>
				)}

			</div>
		</div>
	);
};

UserChat.displayName = "UserChat";

export default UserChat;


