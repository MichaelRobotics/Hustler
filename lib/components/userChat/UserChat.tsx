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
// Server-side functions moved to API routes to avoid client-side imports
import type { FunnelFlow } from "../../types/funnel";
import type { ConversationWithMessages } from "../../types/user";
import { apiPost } from "../../utils/api-client";
import { useTheme } from "../common/ThemeProvider";
import TypingIndicator from "../common/TypingIndicator";
import AnimatedGoldButton from "./AnimatedGoldButton";
import GeneratingLink from "./GeneratingLink";

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

interface UserChatProps {
	funnelFlow: FunnelFlow;
	conversationId?: string;
	conversation?: ConversationWithMessages;
	experienceId?: string;
	onMessageSent?: (message: string, conversationId?: string) => void;
	onBack?: () => void;
	hideAvatar?: boolean;
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
	stageInfo,
}) => {
	const [message, setMessage] = useState("");
	const [isTyping, setIsTyping] = useState(false);
	const [conversationMessages, setConversationMessages] = useState<Array<{
		id: string;
		type: "user" | "bot" | "system";
		content: string;
		metadata?: any;
		createdAt: Date;
	}>>([]);
	const [localCurrentBlockId, setLocalCurrentBlockId] = useState<string | null>(null);
	const [generatingLinks, setGeneratingLinks] = useState<Set<string>>(new Set());
	const [processingMessages, setProcessingMessages] = useState<Set<string>>(new Set());
	const [processedMessages, setProcessedMessages] = useState<Map<string, string>>(new Map());
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const chatEndRef = useRef<HTMLDivElement>(null);
	const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const { appearance, toggleTheme } = useTheme();

	// Function to process OFFER blocks by calling backend
	const processOfferBlock = useCallback(async (messageId: string, messageText: string): Promise<void> => {
		console.log(`[UserChat] Processing OFFER block for message ${messageId}`);
		console.log(`[UserChat] processOfferBlock params:`, { messageId, messageText: messageText.substring(0, 100) + '...', conversationId, experienceId });
		
		// Add to processing messages set
		setProcessingMessages(prev => new Set(prev).add(messageId));
		
		try {
			// Call the backend to process the OFFER block
			const requestBody = {
				messageId,
				messageText,
				conversationId,
				experienceId
			};
			console.log(`[UserChat] Sending request body:`, requestBody);
			
			const response = await apiPost('/api/userchat/process-offer-block', requestBody, experienceId);
			
			if (response.ok) {
				const result = await response.json();
				if (result.processedMessage) {
					console.log(`[UserChat] Successfully processed OFFER block for message ${messageId}`);
					console.log(`[UserChat] API returned processed message:`, {
						hasAnimatedButton: result.processedMessage.includes('animated-gold-button'),
						hasGeneratingLink: result.processedMessage.includes('generating-link-placeholder'),
						hasReloadPage: result.processedMessage.includes('Reload Page'),
						messageLength: result.processedMessage.length,
						messagePreview: result.processedMessage.substring(0, 200) + '...'
					});
					
					// Store the processed message
					setProcessedMessages(prev => new Map(prev).set(messageId, result.processedMessage));
					
					// Update the message in conversationMessages
					setConversationMessages(prev => prev.map(msg => 
						msg.id === messageId 
							? { ...msg, content: result.processedMessage }
							: msg
					));
					
					console.log(`[UserChat] Updated message ${messageId} with processed content`);
				}
			}
		} catch (error) {
			console.error(`[UserChat] Error processing OFFER block for message ${messageId}:`, error);
		} finally {
			// Remove from processing messages set
			setProcessingMessages(prev => {
				const newSet = new Set(prev);
				newSet.delete(messageId);
				return newSet;
			});
		}
	}, [conversationId, experienceId]);

	// Function to resolve [LINK] placeholders for OFFER stage messages with retry logic
	const resolveOfferLinks = useCallback(async (message: string, resourceName: string, messageId?: string): Promise<string> => {
		if (!message.includes('[LINK]') || !experienceId || !resourceName) {
			return message;
		}

		// Mark this message as generating links
		if (messageId) {
			setGeneratingLinks(prev => new Set(prev).add(messageId));
		}

		const maxRetries = 3;
		const retryDelay = 1000; // Start with 1 second delay
		let retryCount = 0;

		while (retryCount < maxRetries) {
			try {
				console.log(`[UserChat] Resolving [LINK] placeholders attempt ${retryCount + 1}/${maxRetries} for message:`, message.substring(0, 100), `resourceName: ${resourceName}`);
			
			// Call the API to resolve links with resourceName
			const response = await apiPost('/api/userchat/resolve-offer-links', {
				message,
				resourceName,
				experienceId
			}, experienceId);

			if (response.ok) {
				const result = await response.json();
				if (result.success && result.resolvedMessage) {
						console.log(`[UserChat] Successfully resolved [LINK] placeholders on attempt ${retryCount + 1}`);
						// Remove from generating links set
						if (messageId) {
							setGeneratingLinks(prev => {
								const newSet = new Set(prev);
								newSet.delete(messageId);
								return newSet;
							});
						}
					return result.resolvedMessage;
				}
			}
			
				retryCount++;
				if (retryCount < maxRetries) {
					console.log(`[UserChat] Link resolution failed, retrying in ${retryDelay * retryCount}ms...`);
					await new Promise(resolve => setTimeout(resolve, retryDelay * retryCount));
				}
		} catch (error) {
				retryCount++;
				console.error(`[UserChat] Error resolving links attempt ${retryCount}:`, error);
				if (retryCount < maxRetries) {
					console.log(`[UserChat] Retrying in ${retryDelay * retryCount}ms...`);
					await new Promise(resolve => setTimeout(resolve, retryDelay * retryCount));
				}
			}
		}
		
		console.log(`[UserChat] Link resolution failed after ${maxRetries} attempts, keeping [LINK] placeholders`);
		// Remove from generating links set
		if (messageId) {
			setGeneratingLinks(prev => {
				const newSet = new Set(prev);
				newSet.delete(messageId);
				return newSet;
			});
		}
		return message;
	}, [experienceId]);

	// Initialize conversation messages from backend data IMMEDIATELY
	useEffect(() => {
		if (conversation?.messages) {
			const processMessages = async () => {
				const formattedMessages = await Promise.all(
					conversation.messages.map(async (msg: any) => {
						let content = msg.text || msg.content;
						
						// Resolve [LINK] placeholders for bot messages
						if (msg.type === "bot" && content.includes('[LINK]')) {
							// Get resourceName from message metadata
							const resourceName = msg.metadata?.resourceName;
							if (resourceName) {
								content = await resolveOfferLinks(content, resourceName, msg.id);
							} else {
								console.log(`[UserChat] No resourceName in metadata for message with [LINK] placeholder`);
							}
						}
						
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
	}, [conversation?.messages, resolveOfferLinks]);

	// WebSocket integration for REAL-TIME updates only (background initialization)
	const { isConnected, sendMessage, sendTypingIndicator, typingUsers } = useWhopWebSocket({
		conversationId: conversationId || "",
		experienceId: experienceId || "",
		onMessage: (newMessage) => {
			console.log("UserChat: Received WebSocket message:", newMessage);
			// Check if message already exists locally
			const messageExists = conversationMessages.some(msg => 
				msg.content === newMessage.content && 
				msg.type === newMessage.type &&
				Math.abs(new Date(msg.createdAt).getTime() - new Date(newMessage.createdAt).getTime()) < 5000 // 5 second tolerance
			);
			
			if (!messageExists) {
				console.log("UserChat: New message detected, adding directly...");
				// Add new message directly instead of reloading all messages
				setConversationMessages(prev => [...prev, {
					id: newMessage.id,
					type: newMessage.type,
					content: newMessage.content,
					metadata: newMessage.metadata,
					createdAt: newMessage.createdAt,
				}]);
			} else {
				console.log("UserChat: Message already exists locally, skipping");
			}
			scrollToBottom();
		},
		onTyping: (isTyping, userId) => {
			if (userId !== "system") {
				setIsTyping(isTyping);
			}
		},
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
				if (result.conversation.currentBlockId) {
					const nextBlock = funnelFlow.blocks[result.conversation.currentBlockId];
					if (nextBlock?.message) {
						const botMessage = {
							id: `temp-bot-${Date.now()}`,
							type: "bot" as const,
							content: nextBlock.message,
							createdAt: new Date(),
						};
						setConversationMessages(prev => [...prev, botMessage]);
						scrollToBottom();
					}
				}
				
				// IMMEDIATE UI UPDATE: Update local current block ID to show new options immediately
				if (result.conversation.currentBlockId) {
					setLocalCurrentBlockId(result.conversation.currentBlockId);
					console.log("UserChat: Updated local current block ID to:", result.conversation.currentBlockId);
					console.log("UserChat: New options will be:", funnelFlow.blocks[result.conversation.currentBlockId]?.options?.map(opt => opt.text));
				}
				
				// Check for funnel completion
				if (option.nextBlockId === "COMPLETED" || result.conversation.status === "closed") {
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

			// Send typing indicator for conversation-based chat
			if (conversationId && experienceId && isConnected) {
				if (typingTimeoutRef.current) {
					clearTimeout(typingTimeoutRef.current);
				}
				sendTypingIndicator(true);
				typingTimeoutRef.current = setTimeout(() => {
					sendTypingIndicator(false);
				}, 1000);
			}
		},
		[conversationId, experienceId, isConnected, sendTypingIndicator],
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
			// Clear any existing timeout
			if (typingTimeoutRef.current) {
				clearTimeout(typingTimeoutRef.current);
			}

			// Show typing indicator FIRST
			setIsTyping(true);

			// Send user message immediately
			onMessageSent?.(`${index + 1}. ${option.text}`, conversationId);

			// Handle option selection based on conversation type
			if (conversationId && experienceId && isConnected) {
				// Use backend conversation handling
				typingTimeoutRef.current = setTimeout(
					() => {
						setIsTyping(false);
						handleConversationOptionSelection(option);
					},
					1500 + Math.random() * 1000,
				);
			} else {
				// Fallback to preview mode
				typingTimeoutRef.current = setTimeout(
					() => {
						setIsTyping(false);
						previewHandleOptionClick(option, index);
					},
					1500 + Math.random() * 1000,
				);
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

	// Cleanup typing timeout on unmount
	useEffect(() => {
		return () => {
			if (typingTimeoutRef.current) {
				clearTimeout(typingTimeoutRef.current);
			}
		};
	}, []);

	// Auto-scroll when conversation messages change (optimized for mobile performance)
	useEffect(() => {
		if (conversationMessages.length > 0) {
			// Use requestAnimationFrame for better performance
			requestAnimationFrame(() => {
				scrollToBottom();
			});
		}
	}, [conversationMessages, scrollToBottom]);

	// Auto-scroll when typing indicator appears/disappears
	useEffect(() => {
		if (isTyping) {
			// Scroll when typing indicator appears
			requestAnimationFrame(() => {
				scrollToBottom();
			});
		}
	}, [isTyping, scrollToBottom]);

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

		// Handle [LINK] placeholders and animated button HTML in bot messages
		const renderMessageWithLinks = (msg: any, text: string) => {
			// Debug logging
			console.log(`[UserChat] Rendering message:`, { 
				type: msg.type, 
				hasAnimatedButton: text.includes('animated-gold-button'),
				hasLink: text.includes('[LINK]'),
				isGeneratingLinkPlaceholder: text.includes('generating-link-placeholder'),
				hasReloadPage: text.includes('Reload Page'),
				text: text.substring(0, 200) + '...',
				fullText: text // Show full text for debugging
			});
			
		// Hook: If this is a bot message with [LINK] placeholder, wait for backend processing
		if (msg.type === "bot" && text.includes('[LINK]') && !text.includes('animated-gold-button') && !text.includes('generating-link-placeholder')) {
			console.log(`[UserChat] Hook: Detected [LINK] placeholder, waiting for backend processing...`);
			console.log(`[UserChat] Message object:`, { id: msg.id, type: msg.type, hasId: !!msg.id });
			
			// Check if we have a processed message for this messageId
			const processedMessage = processedMessages.get(msg.id);
			if (processedMessage) {
				console.log(`[UserChat] Found processed message for ${msg.id}, rendering it`);
				// Use the processed message instead of the original text
				return renderMessageWithLinks(msg, processedMessage);
			}
			
			// Check if this message is already being processed
			if (processingMessages.has(msg.id)) {
				console.log(`[UserChat] Message ${msg.id} is already being processed, waiting...`);
				// Return a loading state while processing
				return (
					<div className="flex justify-center items-center py-8">
						<div className="text-gray-500 dark:text-gray-400">Processing message...</div>
					</div>
				);
			}
			
			// Trigger backend processing
			console.log(`[UserChat] Calling processOfferBlock with messageId: ${msg.id}`);
			processOfferBlock(msg.id, text);
			
			// Return loading state while processing
			return (
				<div className="flex justify-center items-center py-8">
					<div className="text-gray-500 dark:text-gray-400">Processing message...</div>
				</div>
			);
		}
			
			// Check for generating link placeholder first
			if (msg.type === "bot" && text.includes('generating-link-placeholder')) {
				// Parse the HTML and extract the placeholder
				const placeholderRegex = /<div class="generating-link-placeholder">([^<]+)<\/div>/g;
				const parts = text.split(placeholderRegex);
				
				// Separate text and generating link
				const textParts: React.ReactNode[] = [];
				const generatingLinks: React.ReactNode[] = [];
				
				parts.forEach((part, partIndex) => {
					if (partIndex % 2 === 1) {
						// This is the generating link text
						generatingLinks.push(
							<GeneratingLink key={partIndex} />
						);
					} else if (partIndex % 2 === 0) {
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
						{/* All generating links below text */}
						{generatingLinks.length > 0 && (
							<div className="flex justify-center pt-4">
								{generatingLinks}
							</div>
						)}
					</div>
				);
			}
			
		// Check for animated button HTML
		if (msg.type === "bot" && text.includes('animated-gold-button')) {
				console.log(`[UserChat] Rendering processed message with animated button for message ${msg.id}`);
				console.log(`[UserChat] Processed message content:`, {
					hasAnimatedButton: text.includes('animated-gold-button'),
					messageLength: text.length,
					messagePreview: text.substring(0, 200) + '...'
				});
				
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
							const buttonText = parts[partIndex + 1] || "Get Your Free Guide";
							buttons.push(
								<AnimatedGoldButton 
									key={partIndex} 
									href={href}
									text={buttonText}
									icon="sparkles"
									onClick={() => {
										// Track intent when user clicks button
										if (conversation?.funnelId && experienceId) {
											console.log(`🚀 [UserChat] Tracking intent for experience ${experienceId}, funnel ${conversation.funnelId}`);
											trackIntent(experienceId, conversation.funnelId);
										}
										// Redirect to the link
										window.location.href = href;
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
					
					console.log(`[UserChat] Rendering final message with ${buttons.length} button(s) for message ${msg.id}`);
					
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
				
				// Handle "Reload Page" text (when resource not found)
				if (msg.type === "bot" && text.includes('Reload Page')) {
					// Split message by "Reload Page" text
					const parts = text.split('Reload Page');
					
					return (
						<div className="space-y-3">
							{parts.map((part, partIndex) => (
								<div key={partIndex}>
									{part.trim() && (
										<Text
											size="2"
											className="whitespace-pre-wrap leading-relaxed text-base"
										>
											{part.trim()}
										</Text>
									)}
									{partIndex < parts.length - 1 && (
										<div className="mt-6 pt-4 flex justify-center">
											<Text
												size="2"
												className="text-gray-500 dark:text-gray-400 italic"
											>
												Reload Page
											</Text>
										</div>
									)}
								</div>
							))}
						</div>
					);
				}
				
				// Handle legacy [LINK] placeholders (should not happen in OFFER blocks anymore)
				if (msg.type === "bot" && text.includes('[LINK]')) {
					// Check if this message is currently generating links
					const isGeneratingLink = generatingLinks.has(msg.id);
					
					// Split message by [LINK] placeholders
					const parts = text.split('[LINK]');
					const linkCount = (text.match(/\[LINK\]/g) || []).length;
					
					return (
						<div className="space-y-3">
							{parts.map((part, partIndex) => (
								<div key={partIndex}>
									{part.trim() && (
										<Text
											size="2"
											className="whitespace-pre-wrap leading-relaxed text-base"
										>
											{part.trim()}
										</Text>
									)}
									{partIndex < linkCount && (
										<div className="mt-6 pt-4 flex justify-center">
											{isGeneratingLink ? (
												<GeneratingLink />
											) : (
												<Text
													size="2"
													className="text-gray-500 dark:text-gray-400 italic"
												>
													Link not available
												</Text>
											)}
										</div>
									)}
								</div>
							))}
						</div>
					);
				}
				
				// Regular message without [LINK] placeholders
				return (
					<Text
						size="2"
						className="whitespace-pre-wrap leading-relaxed text-base"
					>
						{text}
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
								? "bg-blue-500 text-white"
								: "bg-white dark:bg-gray-800 border border-border/30 dark:border-border/20 text-gray-900 dark:text-gray-100 shadow-sm"
						}`}
					>
						{renderMessageWithLinks(msg, msg.text)}
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
				className="chat-optimized inline-flex items-center gap-3 pl-4 pr-4 py-3 rounded-lg bg-blue-500 text-white text-left touch-manipulation active:bg-blue-600 active:scale-95 transition-all duration-150"
			>
				<span className="flex-shrink-0 w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
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

		console.log("UserChat: Rendering message list:", messagesToShow.length, "messages");
		console.log("UserChat: Message list sample:", messagesToShow.slice(0, 2).map(m => ({
			type: m.type,
			text: m.text.substring(0, 30) + (m.text.length > 30 ? '...' : ''),
			timestamp: m.timestamp
		})));

		return messagesToShow.map((msg: any, index: number) => (
			<MessageComponent
				key={`${msg.type}-${index}`}
				msg={msg}
				index={index}
			/>
		));
	}, [conversationMessages]);

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
					<div className="flex items-center gap-3">
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
							<div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
								<User size={16} className="text-white" />
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

					{/* Typing Indicator */}
					{isTyping && (
						<div className="flex justify-start mb-4">
							<div className="max-w-[85%] sm:max-w-[80%] px-4 py-3 rounded-xl bg-white dark:bg-gray-800 border border-border/30 dark:border-border/20 text-gray-900 dark:text-gray-100 shadow-sm">
								<TypingIndicator text="Hustler is typing..." />
							</div>
						</div>
					)}

					<div ref={chatEndRef} />
				</div>

				{/* Input Area - Now below the overflow container */}
				{options.length > 0 && currentBlockId && (
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
								className="chat-optimized p-3 rounded-xl bg-blue-500 disabled:bg-gray-300 disabled:cursor-not-allowed touch-manipulation active:bg-blue-600 active:scale-95 transition-all duration-150"
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
