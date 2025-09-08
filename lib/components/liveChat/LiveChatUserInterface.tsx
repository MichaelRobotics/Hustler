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
import TypingIndicator from "../common/TypingIndicator";

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
		const [isTyping, setIsTyping] = useState(false);
		const chatEndRef = useRef<HTMLDivElement>(null);
		const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
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

				// Clear any existing timeout
				if (typingTimeoutRef.current) {
					clearTimeout(typingTimeoutRef.current);
				}

				// Show typing indicator FIRST
				setIsTyping(true);

				try {
					await onSendMessage(newMessage.trim());
					setNewMessage("");

					// Hide typing indicator after a delay (simulating response time)
					typingTimeoutRef.current = setTimeout(
						() => {
							setIsTyping(false);
						},
						2000 + Math.random() * 2000,
					); // Random delay between 2-4 seconds

					// Optimized scroll with requestAnimationFrame
					requestAnimationFrame(() => {
						scrollToBottom();
					});
				} catch (error) {
					console.error("Failed to send message:", error);
					// Hide typing indicator on error
					setIsTyping(false);
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
				if (typingTimeoutRef.current) {
					clearTimeout(typingTimeoutRef.current);
				}
				if (scrollTimeoutRef.current) {
					clearTimeout(scrollTimeoutRef.current);
				}
			};
		}, []);

		// Auto-scroll when typing indicator appears
		useEffect(() => {
			if (isTyping) {
				// Scroll when typing indicator appears
				requestAnimationFrame(() => {
					scrollToBottom();
				});
			}
		}, [isTyping, scrollToBottom]);

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

		// Memoized time formatter to prevent recreation on every render
		const formatTime = useCallback((date: Date) => {
			return new Intl.DateTimeFormat("en-US", {
				hour: "2-digit",
				minute: "2-digit",
				hour12: true,
			}).format(date);
		}, []);

		// Memoized message renderer to prevent unnecessary re-renders
		const renderMessage = useCallback(
			(message: LiveChatMessage) => {
				// Agent perspective: agent messages on right, user messages on left
				const isAgent =
					message.type === "bot" ||
					message.type === "system" ||
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
							<div className="text-sm leading-relaxed">{message.text}</div>
							<div
								className={`text-xs mt-1 ${
									isAgent ? "text-blue-100" : "text-gray-500 dark:text-gray-400"
								}`}
							>
								{formatTime(message.timestamp)}
							</div>
						</div>
					</div>
				);
			},
			[formatTime],
		);

		// Memoized messages list to prevent unnecessary re-renders
		const messagesList = useMemo(() => {
			return conversation.messages.map(renderMessage);
		}, [conversation.messages, renderMessage]);

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
								<div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
									<User size={16} className="text-white" />
								</div>
								<div>
									<h1 className="text-lg font-semibold text-foreground">
										{conversation.user.name}
									</h1>
									<p className="text-sm text-muted-foreground">
										{conversation.user.isOnline ? "Online" : "Offline"}
									</p>
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

								{/* Typing Indicator - User is typing (appears on left) */}
								{isTyping && (
									<div className="flex justify-start mb-4">
										<div className="max-w-[80%] px-4 py-3 rounded-xl bg-white dark:bg-gray-800 border border-border/30 dark:border-border/20 text-gray-900 dark:text-gray-100 shadow-sm">
											<TypingIndicator
												text={`${conversation.user.name} is typing...`}
											/>
										</div>
									</div>
								)}

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
