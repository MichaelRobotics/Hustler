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
import { useServerMessages } from "../../hooks/useServerMessages";
import { useSafeIframeSdk } from "../../hooks/useSafeIframeSdk";
// Server-side functions moved to API routes to avoid client-side imports
import type { FunnelFlow } from "../../types/funnel";
import type { ConversationWithMessages } from "../../types/user";
import { apiPost } from "../../utils/api-client";
import { useTheme } from "../common/ThemeProvider";
import TypingIndicator from "../common/TypingIndicator";
import AnimatedGoldButton from "./AnimatedGoldButton";
import { renderTextWithLinks } from "../../utils/link-utils";

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

	// Optimized scroll to bottom - mobile performance optimized
	// NOTE: Defined early so it can be used by other callbacks
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

	// WebSocket integration for REAL-TIME updates only (receive-only)
	console.log("🔌 [UserChat] WebSocket configuration:", {
		conversationId: conversationId || "",
		experienceId: experienceId || "",
		userType: userType,
		hasConversation: !!conversation,
		conversationIdFromConversation: conversation?.id
	});
	
	// Use server messages hook for receiving WebSocket messages (server-side broadcasting)
	useServerMessages({
		conversationId: conversationId || "",
		experienceId: experienceId || "",
		onMessage: (serverMessage) => {
			console.log("📨 [UserChat] Server WebSocket message received:", {
				type: serverMessage.type,
				conversationId: serverMessage.conversationId,
				senderType: serverMessage.senderType,
				content: serverMessage.content?.substring(0, 50) + "...",
			});
			
			// Only process messages from other senders (admin/bot)
			// Customer's own messages are added locally when sent
			if (serverMessage.senderType === "customer") {
				console.log("⚠️ [UserChat] Skipping own message from server");
				return;
			}
			
			// Check if message already exists locally
			const messageExists = conversationMessages.some(msg => 
				msg.content === serverMessage.content && 
				msg.type === (serverMessage.senderType === "bot" ? "bot" : "user") &&
				Math.abs(new Date(msg.createdAt).getTime() - new Date(serverMessage.timestamp).getTime()) < 5000
			);
			
			if (!messageExists && serverMessage.content) {
				console.log("✅ [UserChat] New server message detected, adding...");
				setConversationMessages(prev => [...prev, {
					id: serverMessage.messageId || `ws-${Date.now()}`,
					type: serverMessage.senderType === "bot" ? "bot" as const : serverMessage.senderType === "admin" ? "bot" as const : "user" as const,
					content: serverMessage.content || "",
					metadata: serverMessage.metadata,
					createdAt: new Date(serverMessage.timestamp),
				}]);
				scrollToBottom();
			}
		},
		onStageTransition: (currentStage, previousStage) => {
			console.log("🔄 [UserChat] Stage transition detected:", { currentStage, previousStage });
			
			// Dispatch custom event for progress bar update
			const stageUpdateEvent = new CustomEvent('funnel-stage-update', {
				detail: { newStage: currentStage }
			});
			window.dispatchEvent(stageUpdateEvent);
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
	} = useFunnelPreviewChat(funnelFlow, undefined, undefined, conversation);

	// Direct handlers - no callbacks for maximum performance
	const handleSubmit = async (e?: React.FormEvent) => {
		e?.preventDefault();
		if (!message.trim()) return;

		const messageContent = message.trim();
		setMessage("");

		// Handle conversation-based chat
		if (conversationId && experienceId) {
			// Add user message to UI immediately (optimistic update)
			const userMessage = {
				id: `user-${Date.now()}`,
				type: "user" as const,
				content: messageContent,
				createdAt: new Date(),
			};
			setConversationMessages(prev => [...prev, userMessage]);
			console.log("UserChat: Added user message to UI:", userMessage);

			// Process message through funnel system (API handles DB save + WebSocket broadcast)
			try {
				const response = await apiPost('/api/userchat/process-message', {
					conversationId,
					messageContent,
					messageType: "user",
				}, experienceId);

				if (response.ok) {
					const result = await response.json();
					console.log("Message processed through funnel:", result);
					
					// Note: Server broadcasts messages via WebSocket, so bot response will arrive via useServerMessages
					// But we also add it locally for immediate feedback
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
					}

					// Update local current block ID if next block is provided
					if (funnelResponse?.nextBlockId) {
						setLocalCurrentBlockId(funnelResponse.nextBlockId);
						console.log("UserChat: Updated local current block ID to:", funnelResponse.nextBlockId);
					}

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

	// Handle funnel completion - defined early so it can be used by handleConversationOptionSelection
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
			}
		} catch (error) {
			console.error("Error handling funnel completion:", error);
		}
	}, [conversationId, experienceId]);

	// Handle conversation option selection
	const handleConversationOptionSelection = useCallback(async (option: { text: string; nextBlockId: string | null }) => {
		try {
			if (!conversationId) return;

			// IMMEDIATE UI UPDATE: Add user message to local state first (optimistic)
			const userMessage = {
				id: `temp-user-${Date.now()}`,
				type: "user" as const,
				content: option.text,
				createdAt: new Date(),
			};
			setConversationMessages(prev => [...prev, userMessage]);
			scrollToBottom();

			// Navigate funnel via API route (server handles DB save + WebSocket broadcast)
			const response = await apiPost('/api/userchat/navigate-funnel', {
				conversationId,
				navigationData: {
					text: option.text,
					value: option.text,
					blockId: currentBlockId || "",
				},
			}, experienceId);

			const result = await response.json();

			if (result.success && result.conversation) {
				// Add bot response locally for immediate feedback
				// Note: Server also broadcasts via WebSocket for other clients
				if (result.botMessage) {
					const botMessage = {
						id: `temp-bot-${Date.now()}`,
						type: "bot" as const,
						content: result.botMessage,
						createdAt: new Date(),
					};
					setConversationMessages(prev => [...prev, botMessage]);
					scrollToBottom();
				}
				
				// Update local current block ID to show new options immediately
				if (result.conversation.currentBlockId) {
					setLocalCurrentBlockId(result.conversation.currentBlockId);
					console.log("UserChat: Updated local current block ID to:", result.conversation.currentBlockId);
				}
				
				// Check for funnel completion
				if (result.conversation.status === "closed") {
					await handleFunnelCompletion();
				}
			}
		} catch (error) {
			console.error("Error handling conversation option selection:", error);
		}
	}, [conversationId, currentBlockId, funnelFlow, experienceId, handleFunnelCompletion, scrollToBottom]);

	// Handle invalid response
	const handleInvalidResponse = useCallback(async (userInput: string) => {
		// IMMEDIATE UI UPDATE: Add error message to local state
		const errorMessage = {
			id: `temp-error-${Date.now()}`,
			type: "bot" as const,
			content: "Please choose from the provided options above.",
			createdAt: new Date(),
		};
		setConversationMessages(prev => [...prev, errorMessage]);
		scrollToBottom();
	}, [scrollToBottom]);

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
		[conversationId, experienceId],
	);

	const handleOptionClickLocal = useCallback(
		(option: any, index: number) => {
			// Send user message immediately
			onMessageSent?.(`${index + 1}. ${option.text}`, conversationId);

			// Handle option selection based on conversation type
			if (conversationId && experienceId) {
				// Use backend conversation handling (server broadcasts via WebSocket)
				handleConversationOptionSelection(option);
			} else {
				// Fallback to preview mode
				previewHandleOptionClick(option, index);
			}
		},
		[conversationId, experienceId, handleConversationOptionSelection, previewHandleOptionClick, onMessageSent],
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
									? "bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 border-3 border-amber-500 dark:border-amber-400 text-gray-900 dark:text-gray-100 shadow-lg shadow-amber-300/60 dark:shadow-amber-700/60"
									: "bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 shadow-lg shadow-gray-300/50 dark:shadow-gray-800/50"
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
			className="h-full w-full flex flex-col bg-gradient-to-br from-surface via-surface/95 to-surface/90 touch-manipulation"
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

				{/* Progress Bar - Separate element like separation line */}
				{userType === "admin" && stageInfo && funnelFlow && (
					<div className="px-4 py-2 border-t border-border/20 dark:border-border/10 relative">
						{/* Golden Percentage - Directly above progress bar */}
						<div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full z-50">
							<span className="text-yellow-500 font-bold text-2xl drop-shadow-lg">
								{(() => {
									const stageOrder = [
										{ key: "TRANSITION", name: "Getting Started" },
										{ key: "WELCOME", name: "Welcome" },
										{ key: "VALUE_DELIVERY", name: "Value Delivery" },
										{ key: "EXPERIENCE_QUALIFICATION", name: "Experience" },
										{ key: "PAIN_POINT_QUALIFICATION", name: "Pain Points" },
										{ key: "OFFER", name: "Offer" },
									];
									const currentStageIndex = stageOrder.findIndex(stage => stage.key === stageInfo.currentStage);
									const availableStages = stageOrder.filter(stage => 
										funnelFlow.stages.some(s => s.name === stage.key)
									);
									const progressPercentage = availableStages.length > 0 
										? ((currentStageIndex + 1) / availableStages.length) * 100 
										: 0;
									return Math.round(progressPercentage);
								})()}%
							</span>
						</div>
						<div className="relative w-full">
							{/* Background Track - Smooth and subtle */}
							<div className="w-full bg-gray-200/30 dark:bg-gray-600/30 rounded-full h-1">
								<div
									className={`h-1 rounded-full transition-all duration-500 ease-out relative overflow-hidden ${
										(() => {
											const stageOrder = [
												{ key: "TRANSITION", name: "Getting Started" },
												{ key: "WELCOME", name: "Welcome" },
												{ key: "VALUE_DELIVERY", name: "Value Delivery" },
												{ key: "EXPERIENCE_QUALIFICATION", name: "Experience" },
												{ key: "PAIN_POINT_QUALIFICATION", name: "Pain Points" },
												{ key: "OFFER", name: "Offer" },
											];
											const currentStageIndex = stageOrder.findIndex(stage => stage.key === stageInfo.currentStage);
											const availableStages = stageOrder.filter(stage => 
												funnelFlow.stages.some(s => s.name === stage.key)
											);
											const progressPercentage = availableStages.length > 0 
												? ((currentStageIndex + 1) / availableStages.length) * 100 
												: 0;
											return progressPercentage >= 100;
										})()
											? 'bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-600' 
											: 'bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-600'
									}`}
									style={{ 
										width: `${(() => {
											const stageOrder = [
												{ key: "TRANSITION", name: "Getting Started" },
												{ key: "WELCOME", name: "Welcome" },
												{ key: "VALUE_DELIVERY", name: "Value Delivery" },
												{ key: "EXPERIENCE_QUALIFICATION", name: "Experience" },
												{ key: "PAIN_POINT_QUALIFICATION", name: "Pain Points" },
												{ key: "OFFER", name: "Offer" },
											];
											const currentStageIndex = stageOrder.findIndex(stage => stage.key === stageInfo.currentStage);
											const availableStages = stageOrder.filter(stage => 
												funnelFlow.stages.some(s => s.name === stage.key)
											);
											const progressPercentage = availableStages.length > 0 
												? ((currentStageIndex + 1) / availableStages.length) * 100 
												: 0;
											return progressPercentage;
										})()}%`
									}}
								>
									{/* Multiple Random Shining Spots - Sun/Lava Effect */}
									<div className="absolute inset-0 overflow-hidden">
										{/* Main shimmer wave */}
										<div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse"></div>
										
										{/* Random light spots - like sun rays */}
										<div className="absolute top-0 left-1/4 w-2 h-full bg-gradient-to-b from-yellow-200 via-white to-yellow-200 opacity-60 animate-ping" style={{ animationDelay: '0s', animationDuration: '2s' }}></div>
										<div className="absolute top-0 left-1/2 w-1 h-full bg-gradient-to-b from-amber-200 via-white to-amber-200 opacity-80 animate-ping" style={{ animationDelay: '0.5s', animationDuration: '1.5s' }}></div>
										<div className="absolute top-0 left-3/4 w-1.5 h-full bg-gradient-to-b from-yellow-300 via-white to-yellow-300 opacity-70 animate-ping" style={{ animationDelay: '1s', animationDuration: '2.5s' }}></div>
										<div className="absolute top-0 left-1/6 w-1 h-full bg-gradient-to-b from-amber-300 via-white to-amber-300 opacity-50 animate-ping" style={{ animationDelay: '1.5s', animationDuration: '1.8s' }}></div>
										<div className="absolute top-0 left-5/6 w-1.5 h-full bg-gradient-to-b from-yellow-400 via-white to-yellow-400 opacity-60 animate-ping" style={{ animationDelay: '2s', animationDuration: '2.2s' }}></div>
										
										{/* Lava-like bubbling effect */}
										<div className="absolute top-0 left-1/3 w-1 h-full bg-gradient-to-b from-orange-300 via-yellow-200 to-transparent opacity-40 animate-bounce" style={{ animationDelay: '0.3s', animationDuration: '1.2s' }}></div>
										<div className="absolute top-0 left-2/3 w-1 h-full bg-gradient-to-b from-red-300 via-yellow-300 to-transparent opacity-35 animate-bounce" style={{ animationDelay: '0.8s', animationDuration: '1.6s' }}></div>
										
										{/* Glowing particles */}
										<div className="absolute top-0 left-1/5 w-0.5 h-full bg-white opacity-90 animate-pulse" style={{ animationDelay: '0.2s', animationDuration: '0.8s' }}></div>
										<div className="absolute top-0 left-4/5 w-0.5 h-full bg-white opacity-75 animate-pulse" style={{ animationDelay: '0.7s', animationDuration: '1.1s' }}></div>
									</div>
								</div>
							</div>

							{/* Completion Button - Centered with Faded Background (when progress is 100%) */}
							{(() => {
								const stageOrder = [
									{ key: "TRANSITION", name: "Getting Started" },
									{ key: "WELCOME", name: "Welcome" },
									{ key: "VALUE_DELIVERY", name: "Value Delivery" },
									{ key: "EXPERIENCE_QUALIFICATION", name: "Experience" },
									{ key: "PAIN_POINT_QUALIFICATION", name: "Pain Points" },
									{ key: "OFFER", name: "Offer" },
								];
								const currentStageIndex = stageOrder.findIndex(stage => stage.key === stageInfo.currentStage);
								const availableStages = stageOrder.filter(stage => 
									funnelFlow.stages.some(s => s.name === stage.key)
								);
								const progressPercentage = availableStages.length > 0 
									? ((currentStageIndex + 1) / availableStages.length) * 100 
									: 0;
								return progressPercentage >= 100;
							})() && (
								<div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
									{/* Faded Background Line */}
									<div className="absolute inset-0 flex items-center">
										<div className="w-full h-px bg-gray-200/50 dark:bg-gray-600/50 opacity-50"></div>
									</div>
									
									{/* Smooth completion button */}
									<button
										onClick={() => {
											// Scroll to offer button with better detection
											const selectors = [
												'[data-href*="app="]', // Affiliate links
												'.animated-gold-button', // Gold offer buttons
												'[class*="Get Started"]', // Get Started buttons
												'[class*="Claim"]', // Claim buttons
												'button[class*="gold"]', // Gold buttons
												'a[href*="app="]', // Affiliate links
												'[class*="offer-button"]', // Offer buttons
												'[class*="cta"]', // Call-to-action buttons
											];
											
											let offerButton = null;
											for (const selector of selectors) {
												offerButton = document.querySelector(selector);
												if (offerButton) break;
											}
											
											if (offerButton) {
												offerButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
											} else {
												// Fallback: scroll to bottom of chat
												window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
											}
										}}
										className="relative inline-flex items-center justify-center px-3 py-1 text-xs font-medium text-white transition-all duration-300 ease-in-out bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-600 rounded-full shadow-md hover:shadow-lg active:scale-95 overflow-hidden group"
									>
										{/* Animated background overlay */}
										<span className="absolute inset-0 w-full h-full bg-gradient-to-r from-yellow-500 via-amber-600 to-yellow-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
										
										{/* Shimmer effect */}
										<span className="absolute inset-0 -top-1 -left-1 w-full h-full bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-20 group-hover:animate-pulse"></span>
										
										{/* Content */}
										<span className="relative flex items-center space-x-1 z-10">
											<span>✨</span>
											<span>Exclusive</span>
										</span>
										
										{/* Glow effect */}
										<span className="absolute inset-0 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600 opacity-0 group-hover:opacity-30 blur-sm transition-opacity duration-300"></span>
									</button>
								</div>
							)}
						</div>
					</div>
				)}

				{/* Input Area - Now below the overflow container */}
				{currentBlockId && (
					<div className="flex-shrink-0 chat-input-container safe-area-bottom px-4 py-2">
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
								className="chat-optimized p-3 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed touch-manipulation active:from-gray-200 active:to-gray-300 dark:active:from-gray-700 dark:active:to-gray-800 active:scale-95 transition-all duration-150 shadow-lg shadow-gray-300/50 dark:shadow-gray-800/50 hover:shadow-gray-400/60 dark:hover:shadow-gray-700/60 disabled:shadow-none"
							>
								<Send size={18} className="text-gray-700 dark:text-gray-100" />
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


