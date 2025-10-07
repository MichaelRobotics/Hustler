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
import AnimatedGoldButton from "../userChat/AnimatedGoldButton";
import { renderTextWithLinks } from "../../utils/link-utils";

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

			// Handle animated gold button HTML in bot messages
			const renderMessageWithLinks = (text: string) => {
				// Check for animated button HTML first
				if (isAgent && text.includes('animated-gold-button')) {
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
							buttons.push(
								<AnimatedGoldButton 
									key={partIndex} 
									href={href}
									text={buttonText}
									icon="sparkles"
									onClick={() => {
										// Redirect to the link
										window.location.href = href;
									}}
								/>
							);
						} else if (partIndex % 3 === 0) {
							// This is text content
							if (part.trim()) {
								textParts.push(
									<div key={partIndex} className="text-sm leading-relaxed whitespace-pre-wrap">
										{part.trim()}
									</div>
								);
							}
						}
					});
					
					return (
						<div className="space-y-6">
							{/* All text content first */}
							{textParts}
							{/* All buttons below text with extra spacing and centered */}
							{buttons.length > 0 && (
								<div className="flex justify-center pt-4">
									{buttons}
								</div>
							)}
						</div>
					);
				}
				
				// Regular message rendering with clickable links
				return <div className="text-sm leading-relaxed whitespace-pre-wrap">{renderTextWithLinks(text)}</div>;
			};

			return (
				<div
					key={message.id}
					className={`flex ${isAgent ? "justify-end" : "justify-start"} mb-4`}
				>
					<div
						className={`max-w-[80%] px-4 py-3 rounded-xl ${
							isAgent
								? message.text.includes('animated-gold-button')
									? "bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25 border-3 border-blue-400 dark:border-blue-500"
									: "bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25"
								: message.text.includes('animated-gold-button')
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
						{renderMessageWithLinks(message.text)}
					</div>
				</div>
			);
		},
		[],
	);

		// Removed pattern detection logic - it was dead code not used in customer flow

		// Memoized messages list to prevent unnecessary re-renders
		const messagesList = useMemo(() => {
			const messageElements = conversation.messages.map((message, index) => 
				renderMessage(message, index, conversation.messages)
			);

			// Add separation line after first message for LiveChat
			if (conversation.messages.length > 0) {
				messageElements.splice(1, 0, (
					<div key="livechat-separation-line" className="relative my-6 flex items-center">
						{/* Left line */}
						<div className="flex-1 h-px bg-gradient-to-r from-transparent via-violet-300 dark:via-violet-600 to-transparent"></div>
						
						{/* Center text on line */}
						<div className="px-4 py-1 bg-gradient-to-r from-violet-100 to-purple-100 dark:from-violet-900/40 dark:to-purple-900/40 border border-violet-300 dark:border-violet-700/50 rounded-full shadow-sm backdrop-blur-sm mx-2">
							<div className="flex items-center gap-2">
								<div className="w-2 h-2 bg-violet-500 rounded-full animate-pulse"></div>
								<span className="text-sm font-medium text-violet-700 dark:text-violet-300 whitespace-nowrap">
									Live Chat
								</span>
								<div className="w-2 h-2 bg-violet-500 rounded-full animate-pulse"></div>
							</div>
						</div>
						
						{/* Right line */}
						<div className="flex-1 h-px bg-gradient-to-r from-transparent via-violet-300 dark:via-violet-600 to-transparent"></div>
					</div>
				));
			}

			return messageElements;
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
								className="p-3 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed touch-manipulation active:from-gray-200 active:to-gray-300 dark:active:from-gray-700 dark:active:to-gray-800 active:scale-95 transition-all duration-150 shadow-lg shadow-gray-300/50 dark:shadow-gray-800/50 hover:shadow-gray-400/60 dark:hover:shadow-gray-700/60 disabled:shadow-none"
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
								<Send size={18} className="text-gray-700 dark:text-gray-100" />
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
