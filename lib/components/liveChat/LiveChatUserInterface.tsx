"use client";

import { ArrowLeft, Send, User } from "lucide-react";
import React, {
	useState,
	useRef,
	useEffect,
	useCallback,
	useMemo,
} from "react";
import type {
	LiveChatConversation,
	LiveChatMessage,
} from "../../types/liveChat";
import { ThemeToggle } from "../common/ThemeToggle";

interface LiveChatUserInterfaceProps {
	conversation: LiveChatConversation;
	onSendMessage: (message: string) => void;
	onBack: () => void;
	isLoading?: boolean;
}

const LiveChatUserInterface: React.FC<LiveChatUserInterfaceProps> = React.memo(
	({ conversation, onSendMessage, onBack, isLoading = false }) => {
		const [newMessage, setNewMessage] = useState("");
		const [isSendingMessage, setIsSendingMessage] = useState(false);
	const chatEndRef = useRef<HTMLDivElement>(null);
	const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const lastMessageCountRef = useRef<number>(0);


		// Memoized message count to prevent unnecessary re-renders
		const messageCount = useMemo(
			() => conversation.messages.length,
			[conversation.messages.length],
		);

		const scrollToBottom = useCallback(() => {
			if (chatEndRef.current) {
				// Use requestAnimationFrame for smoother scrolling
				requestAnimationFrame(() => {
					if (chatEndRef.current) {
						chatEndRef.current.scrollIntoView({
							behavior: "auto",
							block: "end",
							inline: "nearest",
						});
					}
				});
			}
		}, []);

		// Optimized auto-scroll with throttling
		useEffect(() => {
			// Only scroll if message count actually changed
			if (messageCount > 0 && messageCount !== lastMessageCountRef.current) {
				lastMessageCountRef.current = messageCount;

				// Clear any existing scroll timeout
				if (scrollTimeoutRef.current) {
					clearTimeout(scrollTimeoutRef.current);
				}

				// Throttle scroll to prevent excessive DOM manipulation
				scrollTimeoutRef.current = setTimeout(scrollToBottom, 100);
			}
		}, [messageCount, scrollToBottom]);

		const handleSendMessage = useCallback(async () => {
			if (newMessage.trim() && !isSendingMessage) {
				setIsSendingMessage(true);

				try {
					// Send message as bot type
					await onSendMessage(newMessage.trim());
					setNewMessage("");

					// Optimized scroll with requestAnimationFrame
					requestAnimationFrame(() => {
						scrollToBottom();
					});
				} catch (error) {
					console.error("Failed to send message:", error);
				} finally {
					setIsSendingMessage(false);
				}
			}
		}, [newMessage, isSendingMessage, onSendMessage, scrollToBottom]);

		const handleKeyDown = useCallback(
			(e: React.KeyboardEvent) => {
				if (e.key === "Enter" && !e.shiftKey) {
					e.preventDefault();
					handleSendMessage();
				}
			},
			[handleSendMessage],
		);

	// Cleanup timeouts on unmount
	useEffect(() => {
		return () => {
			if (scrollTimeoutRef.current) {
				clearTimeout(scrollTimeoutRef.current);
			}
		};
	}, []);


		const handleTextareaInput = useCallback(
			(e: React.FormEvent<HTMLTextAreaElement>) => {
				const target = e.target as HTMLTextAreaElement;
				// Use requestAnimationFrame for smoother height adjustment
				requestAnimationFrame(() => {
					target.style.height = "auto";
					target.style.height = `${Math.min(target.scrollHeight, 128)}px`;
				});
			},
			[],
		);


	// Memoized message renderer to prevent unnecessary re-renders
	const renderMessage = useCallback(
		(message: LiveChatMessage, index: number, allMessages: LiveChatMessage[]) => {
			// Special handling for system messages (separation line between TRANSITION and EXPERIENCE_QUALIFICATION)
			if (message.type === "system") {
				if (message.text === "redirect_to_live_chat") {
					return (
						<div key={message.id} className="relative my-6 flex items-center">
							{/* Left line */}
							<div className="flex-1 h-px bg-gradient-to-r from-transparent via-violet-300 dark:via-violet-600 to-transparent"></div>
							
							{/* Center text on line */}
							<div className="px-4 py-1 bg-gradient-to-r from-violet-100 to-purple-100 dark:from-violet-900/40 dark:to-purple-900/40 border border-violet-300 dark:border-violet-700/50 rounded-full shadow-sm backdrop-blur-sm mx-2">
								<div className="flex items-center gap-2">
									<div className="w-2 h-2 bg-violet-500 rounded-full animate-pulse"></div>
									<span className="text-xs font-medium text-violet-700 dark:text-violet-300 whitespace-nowrap">
										Redirecting to Live Chat
									</span>
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
					<div key={message.id} className="flex justify-center my-4">
						<div className="px-4 py-2 bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 border border-amber-300 dark:border-amber-700/50 rounded-full shadow-sm">
							<span className="text-xs font-medium text-amber-700 dark:text-amber-300 text-center">
								{message.text}
							</span>
						</div>
					</div>
				);
			}

			// Agent perspective: agent messages on right, user messages on left
			const isAgent =
				message.type === "bot" ||
				message.type === "agent";
			const isUser = message.type === "user";

			return (
				<div
					key={message.id}
					className={`flex ${isAgent ? "justify-end" : "justify-start"} mb-4`}
				>
					<div
						className={`max-w-[80%] px-4 py-3 rounded-xl ${
							isAgent
								? "bg-blue-500 text-white" // Agent messages: blue on right
								: "bg-white dark:bg-gray-800 border border-border/30 dark:border-border/20 text-gray-900 dark:text-gray-100 shadow-sm" // User messages: white on left
						}`}
					>
						<div className="text-sm leading-relaxed whitespace-pre-wrap">{message.text}</div>
					</div>
				</div>
			);
		},
		[],
	);

		// Function to detect transition from TRANSITION to EXPERIENCE_QUALIFICATION and add separation line
		const processMessagesWithTransitionLine = useCallback((messages: LiveChatMessage[]) => {
			const processedMessages: LiveChatMessage[] = [];
			
			for (let i = 0; i < messages.length; i++) {
				const message = messages[i];
				const nextMessage = messages[i + 1];
				
				// Add current message
				processedMessages.push(message);
				
				// Check if we need to add a transition line between consecutive bot messages
				if (nextMessage && 
					message.type === "bot" && 
					nextMessage.type === "bot") {
					
					// Check for transition using content patterns
					// Look for patterns that indicate TRANSITION stage (completion messages)
					const isTransition = message.text.includes("completed step") || 
										message.text.includes("✅") ||
										message.text.includes("Excellent! You've completed") ||
										message.text.includes("step one");
					
					// Look for patterns that indicate EXPERIENCE_QUALIFICATION stage (assessment questions)
					const isExperienceQualification = nextMessage.text.includes("assess your current level") ||
													nextMessage.text.includes("What's the biggest challenge") ||
													nextMessage.text.includes("current level with the topic") ||
													nextMessage.text.includes("assessment");
					
					if (isTransition && isExperienceQualification) {
						// Add the transition separation line
						const transitionLine: LiveChatMessage = {
							id: `transition-${message.id}-${nextMessage.id}`,
							conversationId: message.conversationId,
							type: "system",
							text: "redirect_to_live_chat",
							timestamp: message.timestamp,
							isRead: true,
							metadata: {
								funnelStage: "TRANSITION_LINE"
							}
						};
						processedMessages.push(transitionLine);
					}
				}
			}
			
			return processedMessages;
		}, []);

		// Memoized messages list to prevent unnecessary re-renders
		const messagesList = useMemo(() => {
			const processedMessages = processMessagesWithTransitionLine(conversation.messages);
			return processedMessages.map((message, index) => 
				renderMessage(message, index, processedMessages)
			);
		}, [conversation.messages, renderMessage, processMessagesWithTransitionLine]);

		return (
			<div
				className="h-full w-full flex flex-col bg-gradient-to-br from-surface via-surface/95 to-surface/90 touch-manipulation"
				style={{
					// Mobile performance optimizations
					transform: "translateZ(0)",
					WebkitTransform: "translateZ(0)",
					backfaceVisibility: "hidden",
					WebkitBackfaceVisibility: "hidden",
					WebkitTextSizeAdjust: "100%",
					touchAction: "pan-y pinch-zoom",
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
									style={{
										WebkitTapHighlightColor: "transparent",
										transform: "translateZ(0)",
										WebkitTransform: "translateZ(0)",
										backfaceVisibility: "hidden",
										WebkitBackfaceVisibility: "hidden",
										touchAction: "manipulation",
										WebkitUserSelect: "none",
										MozUserSelect: "none",
										msUserSelect: "none",
										userSelect: "none",
									}}
								>
									<ArrowLeft size={20} />
								</button>
							)}
							<div className="flex items-center gap-3">
								{conversation.user.avatar ? (
									<img
										src={conversation.user.avatar}
										alt={conversation.user.name}
										className="w-8 h-8 rounded-lg object-cover border-2 border-blue-200 dark:border-blue-400"
									/>
								) : (
									<div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
										<User size={16} className="text-white" />
									</div>
								)}
								<div>
									<h1 className="text-lg font-semibold text-foreground">
										{conversation.user.name}
									</h1>
								</div>
							</div>
						</div>

						<div className="p-1 rounded-xl bg-surface/50 border border-border/50 shadow-lg backdrop-blur-sm dark:bg-surface/30 dark:border-border/30 dark:shadow-xl dark:shadow-black/20">
							<ThemeToggle />
						</div>
					</div>
					<div className="w-full h-0.5 bg-gradient-to-r from-transparent via-violet-300/40 dark:via-violet-600/40 to-transparent mt-3" />
				</div>

				{/* Chat Container */}
				<div className="flex-1 flex flex-col min-h-0">
					{/* Messages */}
					<div
						className="flex-1 overflow-y-auto p-4 touch-pan-y scrollbar-hide"
						style={{
							WebkitOverflowScrolling: "touch",
							overscrollBehavior: "contain",
							scrollBehavior: "auto",
							willChange: "scroll-position",
							transform: "translateZ(0)",
							backfaceVisibility: "hidden",
							perspective: "1000px",
							WebkitTransform: "translateZ(0)",
							WebkitBackfaceVisibility: "hidden",
							msOverflowStyle: "none",
							WebkitUserSelect: "none",
							MozUserSelect: "none",
							msUserSelect: "none",
							userSelect: "none",
						}}
					>
						{isLoading ? (
							<div className="flex items-center justify-center h-full">
								<div className="text-muted-foreground">Loading messages...</div>
							</div>
						) : (
							<>
								{messagesList}


								<div ref={chatEndRef} />
							</>
						)}
					</div>

					{/* Input Area - Now below the overflow container */}
					<div className="flex-shrink-0 px-4 py-2 bg-gradient-to-br from-surface via-surface/95 to-surface/90 backdrop-blur-sm border-t border-border/30 dark:border-border/20 shadow-lg safe-area-bottom">
						<div className="flex items-end gap-3">
							<div className="flex-1">
								<textarea
									value={newMessage}
									onChange={(e) => setNewMessage(e.target.value)}
									onKeyDown={handleKeyDown}
									onInput={handleTextareaInput}
									placeholder="Message..."
									rows={1}
									className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-border/30 dark:border-border/20 rounded-xl text-base text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none min-h-[48px] max-h-32 touch-manipulation shadow-sm"
									style={{
										height: "auto",
										minHeight: "48px",
										fontSize: "16px",
										transform: "translateZ(0)",
										WebkitTransform: "translateZ(0)",
										backfaceVisibility: "hidden",
										WebkitBackfaceVisibility: "hidden",
										WebkitTextSizeAdjust: "100%",
										touchAction: "manipulation",
										WebkitUserSelect: "text",
										MozUserSelect: "text",
										msUserSelect: "text",
										userSelect: "text",
									}}
								/>
							</div>

							<button
								onClick={handleSendMessage}
								disabled={!newMessage.trim() || isSendingMessage}
								className="p-3 rounded-xl bg-blue-500 disabled:bg-gray-300 disabled:cursor-not-allowed touch-manipulation active:bg-blue-600 active:scale-95 transition-all duration-150"
								style={{
									WebkitTapHighlightColor: "transparent",
									transform: "translateZ(0)",
									WebkitTransform: "translateZ(0)",
									backfaceVisibility: "hidden",
									WebkitBackfaceVisibility: "hidden",
									touchAction: "manipulation",
									WebkitUserSelect: "none",
									MozUserSelect: "none",
									msUserSelect: "none",
									userSelect: "none",
								}}
							>
								<Send size={18} className="text-white dark:text-gray-100" />
							</button>
						</div>
					</div>
				</div>
			</div>
		);
	},
);

LiveChatUserInterface.displayName = "LiveChatUserInterface";

export default LiveChatUserInterface;
