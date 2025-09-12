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
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const chatEndRef = useRef<HTMLDivElement>(null);
	const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const { appearance, toggleTheme } = useTheme();

	// WebSocket integration for conversation-based chat
	const { isConnected, sendMessage, sendTypingIndicator, typingUsers } = useWhopWebSocket({
		conversationId: conversationId || "",
		experienceId: experienceId || "",
		onMessage: (newMessage) => {
			console.log("UserChat: Received WebSocket message:", newMessage);
			// Instead of adding to local state, refresh the entire conversation
			// This ensures we get the latest state from the database
			refreshConversation();
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

	// Initialize conversation messages from backend data
	useEffect(() => {
		if (conversation?.messages) {
			const formattedMessages = conversation.messages.map(msg => ({
				id: msg.id,
				type: msg.type,
				content: msg.content,
				metadata: msg.metadata,
				createdAt: msg.createdAt,
			}));
			setConversationMessages(formattedMessages);
			console.log("UserChat: Loaded conversation messages from backend:", formattedMessages.length);
		}
	}, [conversation?.messages]);

	// Refresh conversation data when WebSocket receives new messages
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
				if (result.success && result.conversation?.messages) {
					const formattedMessages = result.conversation.messages.map((msg: any) => ({
						id: msg.id,
						type: msg.type,
						content: msg.content,
						metadata: msg.metadata,
						createdAt: msg.createdAt,
					}));
					setConversationMessages(formattedMessages);
					console.log("UserChat: Refreshed conversation messages:", formattedMessages.length);
				}
			}
		} catch (error) {
			console.error("UserChat: Error refreshing conversation:", error);
		}
	}, [conversationId, experienceId]);

	// Get current block ID from conversation state (not from preview hook)
	const currentBlockId = conversation?.currentBlockId || null;
	
	// Get options for current block from funnel flow
	const currentBlock = currentBlockId ? funnelFlow?.blocks[currentBlockId] : null;
	const options = currentBlock?.options || [];

	// Handle different conversation states
	const isNoConversation = !conversationId || !conversation;
	const isDMFunnelActive = stageInfo?.isDMFunnelActive || false;
	const isTransitionStage = stageInfo?.isTransitionStage || false;
	const isExperienceQualificationStage = stageInfo?.isExperienceQualificationStage || false;
	const currentStage = stageInfo?.currentStage || "UNKNOWN";

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
			// Send via WebSocket (this will trigger a conversation refresh)
			await sendMessage(messageContent, "user");

			// Handle funnel navigation if current block has options
			const currentBlock = funnelFlow.blocks[currentBlockId || ""];
			if (currentBlock?.options) {
				const selectedOption = currentBlock.options.find((opt: any) => 
					opt.text.toLowerCase() === messageContent.toLowerCase()
				);

				if (selectedOption) {
					await handleConversationOptionSelection(selectedOption);
				} else {
					// Handle invalid response
					await handleInvalidResponse(messageContent);
				}
			}
		} else {
			// Handle preview mode (existing functionality)
			previewHandleCustomInput(messageContent);
		}

		onMessageSent?.(messageContent, conversationId);
		scrollToBottom();
	};

	// Handle conversation option selection
	const handleConversationOptionSelection = useCallback(async (option: { text: string; nextBlockId: string | null }) => {
		try {
			if (!conversationId) return;

		// Navigate funnel via API route
		const response = await apiPost('/api/userchat/navigate-funnel', {
			conversationId,
			navigationData: {
				text: option.text,
				value: option.text,
				blockId: option.nextBlockId || currentBlockId || "",
			},
		}, experienceId);

		const result = await response.json();

			if (result.success && result.conversation) {
				// The conversation will be refreshed via WebSocket
				// No need to add messages locally
				
				// Check for funnel completion
				if (option.nextBlockId === "COMPLETED" || result.conversation.status === "completed") {
					await handleFunnelCompletion();
				}
			}
		} catch (error) {
			console.error("Error handling conversation option selection:", error);
		}
	}, [conversationId, currentBlockId, funnelFlow, sendMessage]);

	// Handle invalid response
	const handleInvalidResponse = useCallback(async (userInput: string) => {
		// Send error message via WebSocket (this will trigger a conversation refresh)
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

	// Auto-scroll when history changes (optimized for mobile performance)
	useEffect(() => {
		if (history.length > 0) {
			// Use requestAnimationFrame for better performance
			requestAnimationFrame(() => {
				scrollToBottom();
			});
		}
	}, [history, scrollToBottom]);

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
						<Text
							size="2"
							className="whitespace-pre-wrap leading-relaxed text-base"
						>
							{msg.text}
						</Text>
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

	// Memoized message list - show conversation messages if available, otherwise preview messages
	const messageList = useMemo(() => {
		const messagesToShow = conversationId && conversationMessages.length > 0 
			? conversationMessages.map(msg => ({
				type: msg.type,
				text: msg.content,
				timestamp: msg.createdAt,
			}))
			: Array.isArray(history) ? history : [];

		return messagesToShow.map((msg: any, index: number) => (
			<MessageComponent
				key={`${msg.type}-${index}`}
				msg={msg}
				index={index}
			/>
		));
	}, [history, conversationMessages, conversationId]);

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

				{/* Conversation State Display - Now below the overflow container */}
				{(() => {
					// Handle different conversation states
					if (isNoConversation) {
						return (
							<div className="flex-shrink-0 chat-input-container safe-area-bottom">
								<div className="w-full py-4 text-center">
									<div className="text-gray-500 text-6xl mb-4">💬</div>
									<h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
										No Conversation
									</h3>
									<p className="text-gray-600 dark:text-gray-400 mb-4">
										You don't have an active conversation yet.
									</p>
								</div>
							</div>
						);
					}

					if (isDMFunnelActive) {
						return (
							<div className="flex-shrink-0 chat-input-container safe-area-bottom">
								<div className="w-full py-4 text-center">
									<div className="text-blue-500 text-6xl mb-4">📱</div>
									<h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
										DM Funnel Active
									</h3>
									<p className="text-gray-600 dark:text-gray-400 mb-4">
										You're currently in the DM funnel phase. Please complete it to access the chat interface.
									</p>
									<div className="text-sm text-gray-500 dark:text-gray-400">
										Current Stage: {currentStage}
									</div>
								</div>
							</div>
						);
					}

					if (isTransitionStage) {
						return (
							<div className="flex-shrink-0 chat-input-container safe-area-bottom">
								<div className="w-full py-4 text-center">
									<div className="text-yellow-500 text-6xl mb-4">⏳</div>
									<h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
										Transitioning to Chat
									</h3>
									<p className="text-gray-600 dark:text-gray-400 mb-4">
										You're transitioning from DM to chat interface. Please wait...
									</p>
									<div className="text-sm text-gray-500 dark:text-gray-400">
										Current Stage: {currentStage}
									</div>
								</div>
							</div>
						);
					}

					// Show normal chat interface for EXPERIENCE_QUALIFICATION and other active stages
					if (isExperienceQualificationStage || (currentBlockId && options.length > 0)) {
						return null; // Let the normal chat interface show
					}

					// Fallback for other states
					return (
						<div className="flex-shrink-0 chat-input-container safe-area-bottom">
							<div className="w-full py-4 text-center text-muted-foreground">
								No conversation available
							</div>
						</div>
					);
				})()}
			</div>
		</div>
	);
};

UserChat.displayName = "UserChat";

export default UserChat;
