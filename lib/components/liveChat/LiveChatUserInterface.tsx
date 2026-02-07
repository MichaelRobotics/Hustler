"use client";

import { ArrowLeft, Check, CheckCheck, Send, Store, User } from "lucide-react";
import React, {
	useState,
	useRef,
	useEffect,
	useLayoutEffect,
	useCallback,
	useMemo,
} from "react";
import type {
	LiveChatConversation,
	LiveChatMessage,
} from "../../types/liveChat";
import { useTypingIndicator } from "../../hooks/useTypingIndicator";
import { ThemeToggle } from "../common/ThemeToggle";
import { AvatarSquare } from "../common/AvatarSquare";
import TypingIndicator from "../common/TypingIndicator";
import AnimatedGoldButton from "../userChat/AnimatedGoldButton";
import { renderTextWithLinks } from "../../utils/link-utils";

interface LiveChatUserInterfaceProps {
	conversation: LiveChatConversation;
	onSendMessage: (message: string) => void;
	onBack: () => void;
	isLoading?: boolean;
	/** Merchant/bot icon URL for bot messages (round avatar) */
	merchantIconUrl?: string | null;
	/** Admin avatar URL (from users table); fallback when conversation.adminAvatar not set */
	adminAvatarUrl?: string | null;
	/** Called when admin views conversation (mark as read) */
	onMarkAsRead?: (conversationId: string) => void;
	/** Called when admin resolves conversation (back to bot) */
	onResolve?: (conversationId: string) => void;
	/** Called when admin typing state changes */
	onTypingChange?: (conversationId: string, active: boolean) => void;
}

const LiveChatUserInterface: React.FC<LiveChatUserInterfaceProps> = React.memo(
	({ conversation, onSendMessage, onBack, isLoading = false, merchantIconUrl, adminAvatarUrl, onMarkAsRead, onResolve, onTypingChange }) => {
		const [newMessage, setNewMessage] = useState("");
		const [isSendingMessage, setIsSendingMessage] = useState(false);
	const chatEndRef = useRef<HTMLDivElement>(null);
	const messagesScrollRef = useRef<HTMLDivElement>(null);
	const lastMessageCountRef = useRef<number>(0);
	// Kept for cleanup compatibility (no longer used for typing debounce)
	const typingStartRef = useRef<NodeJS.Timeout | null>(null);
	const typingStopRef = useRef<NodeJS.Timeout | null>(null);

		// Memoized message count to prevent unnecessary re-renders
		const messageCount = useMemo(
			() => conversation.messages.length,
			[conversation.messages.length],
		);

		const scrollToBottom = useCallback(() => {
			const el = messagesScrollRef.current;
			if (el) {
				el.scrollTop = el.scrollHeight;
			}
		}, []);

		// Mark conversation as read when admin opens/views it
		useEffect(() => {
			if (conversation?.id && onMarkAsRead) {
				onMarkAsRead(conversation.id);
			}
		}, [conversation?.id, onMarkAsRead]);

		// Set scroll position to bottom before paint so first frame shows latest messages (no visible scroll)
		useLayoutEffect(() => {
			if (messageCount > 0) {
				lastMessageCountRef.current = messageCount;
				const el = messagesScrollRef.current;
				if (el) {
					el.scrollTop = el.scrollHeight;
				}
			}
		}, [messageCount]);

		const handleSendMessage = useCallback(async () => {
			if (newMessage.trim() && !isSendingMessage) {
				onTypingChange?.(conversation.id, false);
				setIsSendingMessage(true);

				try {
					// Send message as bot type
					await onSendMessage(newMessage.trim());
					setNewMessage("");
					scrollToBottom();
				} catch (error) {
					console.error("Failed to send message:", error);
				} finally {
					setIsSendingMessage(false);
				}
			}
		}, [newMessage, isSendingMessage, onSendMessage, scrollToBottom, conversation.id, onTypingChange]);

		// Debounced typing: send true after short delay, false after idle or on unmount
		const hasText = Boolean(conversation?.id && onTypingChange && newMessage.trim().length > 0);
		const sendAdminTyping = useCallback(
			(active: boolean) => {
				if (conversation?.id && onTypingChange) onTypingChange(conversation.id, active);
			},
			[conversation?.id, onTypingChange]
		);
		useTypingIndicator(hasText, sendAdminTyping);

		const handleKeyDown = useCallback(
			(e: React.KeyboardEvent) => {
				if (e.key === "Enter" && !e.shiftKey) {
					e.preventDefault();
					handleSendMessage();
				}
			},
			[handleSendMessage],
		);

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

			// Right side: bot and admin messages; left: user
			const isAgent =
				message.type === "bot" ||
				message.type === "admin";
			const isUser = message.type === "user";
			const isAdminMessage = message.type === "admin";

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
										// Open in new tab so app page stays open
										window.open(href, "_blank", "noopener,noreferrer");
									}}
								/>
							);
						} else if (partIndex % 3 === 0) {
							// This is text content
							if (part.trim()) {
								textParts.push(
									<div key={partIndex} className="text-base leading-relaxed whitespace-pre-wrap">
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
				
				// Regular message rendering with clickable links (same as UserChat: text-base, whitespace-pre-wrap, leading-relaxed)
				return <div className="text-base leading-relaxed whitespace-pre-wrap">{renderTextWithLinks(text)}</div>;
			};

			const userAvatar = !isAgent ? (
				<AvatarSquare
					src={conversation.user?.avatar}
					alt={conversation.user?.name ?? "User"}
					sizeClass="w-8 h-8"
					borderClass="border-2 border-gray-200 dark:border-gray-600"
					fallback={
						<div className="w-full h-full bg-gray-400 dark:bg-gray-600 flex items-center justify-center">
							<User size={14} className="text-white" />
						</div>
					}
				/>
			) : null;
			const agentAvatar = isAgent ? (
				<div className="flex flex-col items-end gap-0.5">
					<span className="text-[10px] font-medium text-muted-foreground" title={isAdminMessage ? "Sent by admin" : "Bot message"}>
						{isAdminMessage ? "Admin" : "Bot"}
					</span>
					<AvatarSquare
						src={isAdminMessage ? (conversation.adminAvatar ?? adminAvatarUrl ?? undefined) : (merchantIconUrl ?? undefined)}
						alt={isAdminMessage ? "Admin" : "Merchant"}
						sizeClass="w-8 h-8"
						borderClass={isAdminMessage ? "border-2 border-violet-400 dark:border-violet-500" : "border-2 border-blue-200 dark:border-blue-600"}
						fallback={
							<div className={`w-full h-full flex items-center justify-center ${isAdminMessage ? "bg-violet-500" : "bg-blue-600"}`}>
								<User size={14} className="text-white" />
							</div>
						}
					/>
				</div>
			) : null;

			// Same row and bubble rules as UserChat: direct bubble in row, no wrapper; receipt inside bubble
			return (
				<div
					key={message.id}
					className={`flex ${isAgent ? "justify-end" : "justify-start"} mb-4 px-1 gap-2 items-end`}
				>
					{!isAgent && userAvatar}
					<div
						className={`max-w-[85%] sm:max-w-[80%] px-4 py-3 rounded-xl ${
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
						{/* Read receipt on admin/bot messages only: one check = sent, two = user has seen */}
						{isAgent && (
							<div className="flex items-center justify-end mt-1.5 gap-0.5" aria-label={message.isRead ? "Read by user" : "Sent"}>
								{message.isRead ? (
									<CheckCheck size={14} className="opacity-90 text-white/90" strokeWidth={2.5} />
								) : (
									<Check size={14} className="opacity-90 text-white/90" strokeWidth={2.5} />
								)}
							</div>
						)}
						{/* Failed to send - LiveChat only, inside bubble at bottom */}
						{isAgent && (message.metadata?.failedToSend === true || message.metadata?.isOptimistic === true) && (() => {
							if (message.metadata?.failedToSend === true) {
								return (
									<span className="text-[10px] text-red-600 dark:text-red-400 mt-0.5 block" title="Message could not be sent">
										Failed to send
									</span>
								);
							}
							const addedAt = message.metadata?.optimisticAddedAt ?? new Date(message.timestamp).getTime();
							const ageMs = Date.now() - addedAt;
							if (ageMs < 15000) return null;
							return (
								<span className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5 block" title="Message may not have been delivered">
									Sending failed or delayed
								</span>
							);
						})()}
					</div>
					{isAgent && agentAvatar}
				</div>
			);
		},
		[conversation.user?.avatar, conversation.user?.name, merchantIconUrl],
	);

		// Removed pattern detection logic - it was dead code not used in customer flow

		// Message list: chat messages from cache/DB, then one synthetic "Pass to Merchant" message record last when admin controlling
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

			// Last message record: Pass to Merchant (only when conversation is controlled by admin). Render only after messages so it doesn't flicker from top to bottom.
			if (conversation.controlledBy === "admin" && onResolve && conversation.messages.length > 0) {
				messageElements.push(
					<div
						key="pass-to-merchant-record"
						className="flex justify-center mb-4"
						role="article"
						aria-label="Pass conversation back to merchant"
					>
						<button
							type="button"
							onClick={() => onResolve(conversation.id)}
							className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/40 dark:border-amber-400/40 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 dark:hover:bg-amber-500/30 transition-colors text-sm font-medium shadow-sm"
							title="Return conversation to merchant bot; timers and triggers will resume"
						>
							<Store size={16} className="shrink-0" />
							Pass to Merchant
						</button>
					</div>
				);
			}

			return messageElements;
		}, [conversation.messages, conversation.controlledBy, conversation.id, renderMessage, onResolve]);

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
								<AvatarSquare
									src={conversation.user.avatar}
									alt={conversation.user.name}
									sizeClass="w-8 h-8"
									borderClass="border-2 border-blue-200 dark:border-blue-400"
									fallback={
										<div className="w-full h-full bg-blue-500 flex items-center justify-center">
											<User size={16} className="text-white" />
										</div>
									}
								/>
								<div>
									<h1 className="text-lg font-semibold text-foreground">
										{conversation.user.name}
									</h1>
								</div>
							</div>
						</div>

						<div className="flex items-center gap-2">
							{conversation.controlledBy === "admin" && onResolve && (
								<button
									onClick={() => onResolve(conversation.id)}
									className="px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-500 hover:bg-amber-600 text-white dark:bg-amber-600 dark:hover:bg-amber-700 transition-colors"
									title="Back to bot"
								>
									Resolve
								</button>
							)}
							<div className="p-1 rounded-xl bg-surface/50 border border-border/50 shadow-lg backdrop-blur-sm dark:bg-surface/30 dark:border-border/30 dark:shadow-xl dark:shadow-black/20">
								<ThemeToggle />
							</div>
						</div>
					</div>
					<div className="w-full h-0.5 bg-gradient-to-r from-transparent via-violet-300/40 dark:via-violet-600/40 to-transparent mt-3" />
				</div>

				{/* Chat Container */}
				<div className="flex-1 flex flex-col min-h-0">
					{/* Messages - ref used to set scrollTop before paint so latest messages show first */}
					<div
						ref={messagesScrollRef}
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
								{conversation.typing?.user && (
									<div className="flex justify-start mb-4 gap-2 items-center">
										<AvatarSquare
											src={conversation.user?.avatar}
											alt={conversation.user?.name ?? "User"}
											sizeClass="w-8 h-8"
											borderClass="border-2 border-gray-200 dark:border-gray-600"
											fallback={
												<div className="w-full h-full bg-gray-400 dark:bg-gray-600 flex items-center justify-center">
													<User size={14} className="text-white" />
												</div>
											}
										/>
										<div className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center">
											<TypingIndicator isVisible showText={false} />
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
