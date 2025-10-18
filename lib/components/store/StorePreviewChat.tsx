"use client";

import { Text, Button } from "frosted-ui";
import { ArrowLeft, Moon, Send, Sun, Pencil } from "lucide-react";
import React, {
	useState,
	useRef,
	useEffect,
	useCallback,
	useMemo,
} from "react";
import { useFunnelPreviewChat } from "../../hooks/useFunnelPreviewChat";
import { useSafeIframeSdk } from "../../hooks/useSafeIframeSdk";
import type { FunnelFlow } from "../../types/funnel";
import { useTheme } from "../common/ThemeProvider";
import TypingIndicator from "../common/TypingIndicator";
import { ChatRestartButton } from "../funnelBuilder/components/ChatRestartButton";
import AnimatedGoldButton from "../userChat/AnimatedGoldButton";
import { renderTextWithLinks } from "../../utils/link-utils";

interface StorePreviewChatProps {
	funnelFlow: FunnelFlow;
	resources?: any[];
	experienceId?: string;
	onMessageSent?: (message: string, conversationId?: string) => void;
	onBack?: () => void;
	hideAvatar?: boolean;
	onEditMerchant?: () => void;
}

/**
 * --- Store Preview Chat Component ---
 * 
 * Combines UserChat's UI/UX with PreviewChat's simple logic.
 * Features:
 * - All UserChat visual features (progress bar, golden percentage, etc.)
 * - Simple preview logic (no real conversations/backend)
 * - Start over button like PreviewChat
 * - Progress bar positioned like in UserChat
 */
const StorePreviewChat: React.FC<StorePreviewChatProps> = ({
	funnelFlow,
	resources = [],
	experienceId,
	onMessageSent,
	onBack,
	hideAvatar = false,
	onEditMerchant,
}) => {
	const [message, setMessage] = useState("");
	const [isTyping, setIsTyping] = useState(false);
	const [currentStage, setCurrentStage] = useState("WELCOME");
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const chatEndRef = useRef<HTMLDivElement>(null);
	const { appearance, toggleTheme } = useTheme();
	const { iframeSdk, isInIframe } = useSafeIframeSdk();

	/**
	 * Handle external link navigation according to Whop best practices
	 * Uses iframe SDK when available, falls back to window.location for standalone
	 */
	const handleExternalLink = useCallback((href: string): void => {
		try {
			// Check if it's a Whop internal link (should stay in iframe)
			const isWhopInternalLink = href.includes('whop.com') && !href.includes('whop.com/checkout') && !href.includes('whop.com/hub');
			
			if (isInIframe && iframeSdk && iframeSdk.openExternalUrl) {
				// Use Whop iframe SDK for external links (best practice)
				console.log(`🔗 [StorePreviewChat] Opening external link via Whop iframe SDK: ${href}`);
				iframeSdk.openExternalUrl({ url: href });
			} else if (isWhopInternalLink) {
				// For Whop internal links, use window.location to stay in iframe
				console.log(`🔗 [StorePreviewChat] Opening Whop internal link: ${href}`);
				window.location.href = href;
			} else {
				// For external links outside iframe, open in new tab
				console.log(`🔗 [StorePreviewChat] Opening external link in new tab: ${href}`);
				window.open(href, '_blank', 'noopener,noreferrer');
			}
		} catch (error) {
			console.error("❌ [StorePreviewChat] Error handling external link:", error);
			// Fallback to window.location
			window.location.href = href;
		}
	}, [iframeSdk, isInIframe]);

	// Use the preview chat hook (no WebSocket)
	const {
		history,
		currentBlockId,
		options,
		startConversation,
		handleOptionClick,
		handleCustomInput,
	} = useFunnelPreviewChat(funnelFlow, resources, undefined, undefined, experienceId);

	// Function to determine current stage based on currentBlockId
	const determineCurrentStage = useCallback(() => {
		if (!currentBlockId || !funnelFlow) {
			// If conversation is completed and we were at OFFER stage, keep it at OFFER
			if (history.length > 0 && options.length === 0 && !currentBlockId && currentStage === "OFFER") {
				return "OFFER";
			}
			return "WELCOME";
		}

		// Find which stage contains the current block
		const stage = funnelFlow.stages.find(stage => 
			stage.blockIds.includes(currentBlockId)
		);

		return stage?.name || "WELCOME";
	}, [currentBlockId, funnelFlow, history.length, options.length, currentStage]);

	// Update current stage when currentBlockId changes
	useEffect(() => {
		const newStage = determineCurrentStage();
		setCurrentStage(newStage);
	}, [determineCurrentStage]);

	// Ensure conversation starts when component mounts
	useEffect(() => {
		if (funnelFlow && history.length === 0) {
			console.log('[StorePreviewChat] Starting conversation manually');
			console.log('[StorePreviewChat] FunnelFlow:', funnelFlow);
			console.log('[StorePreviewChat] StartBlockId:', funnelFlow.startBlockId);
			startConversation();
		}
	}, [funnelFlow, history.length]);
	
	// Debug history changes
	useEffect(() => {
		console.log('[StorePreviewChat] History changed:', history);
		console.log('[StorePreviewChat] Current block ID:', currentBlockId);
		console.log('[StorePreviewChat] Options:', options);
	}, [history, currentBlockId, options]);

	// Determine if conversation is completed (Start Over button shown)
	const isConversationCompleted = history.length > 0 && options.length === 0 && !currentBlockId;

	// Auto-scroll to bottom when new messages arrive
	useEffect(() => {
		if (chatEndRef.current) {
			chatEndRef.current.scrollIntoView({ behavior: "smooth" });
		}
	}, [history]);

	// Function to scroll to offer button with better detection
	const scrollToOffer = () => {
		// Look for offer button with more specific selectors
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
	};

	// Auto-resize textarea
	const handleTextareaInput = useCallback(() => {
		const textarea = textareaRef.current;
		if (textarea) {
			textarea.style.height = "auto";
			textarea.style.height = `${Math.min(textarea.scrollHeight, 128)}px`;
		}
	}, []);

	// Handle option clicks
	const handleOptionClickLocal = useCallback(
		(option: any, index: number) => {
			handleOptionClick(option, index);
			onMessageSent?.(option.text);
		},
		[handleOptionClick, onMessageSent],
	);

	// Handle custom input submission
	const handleSubmit = useCallback(async () => {
		if (!message.trim()) return;

		const messageText = message.trim();
		setMessage("");
		
		// Reset textarea height
		if (textareaRef.current) {
			textareaRef.current.style.height = "auto";
		}

		// Show typing indicator
		setIsTyping(true);
		
		// Simulate typing delay (reduced for better UX)
		setTimeout(() => {
			setIsTyping(false);
			handleCustomInput(messageText);
			onMessageSent?.(messageText);
		}, 800);
	}, [message, handleCustomInput, onMessageSent]);

	// Handle Enter key
	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "Enter" && !e.shiftKey) {
				e.preventDefault();
				handleSubmit();
			}
		},
		[handleSubmit],
	);

	// Function to render messages with [LINK] resolution for different stages
	const renderMessageWithLinks = useCallback((text: string, currentBlockId: string | null) => {
		// Check for animated button HTML first
		if (text.includes('animated-gold-button')) {
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
								// Handle link navigation according to Whop best practices
								handleExternalLink(href);
							}}
						/>
					);
				} else if (partIndex % 3 === 0) {
					// This is text content
					if (part.trim()) {
						textParts.push(
							<Text key={partIndex} size="2" className="whitespace-pre-wrap leading-relaxed text-base">
								{part}
							</Text>
						);
					}
				}
			});
			
			return (
				<div className="space-y-3">
					{textParts}
					{buttons.length > 0 && (
						<div className="flex justify-center">
							{buttons}
						</div>
					)}
				</div>
			);
		}
		
		// Handle regular links (like TRANSITION stage experience links)
		if (text.includes('http')) {
			// Split text by URLs and create clickable links
			const urlRegex = /(https?:\/\/[^\s]+)/g;
			const parts = text.split(urlRegex);
			
			return (
				<Text size="2" className="whitespace-pre-wrap leading-relaxed text-base">
					{parts.map((part, index) => {
						if (urlRegex.test(part)) {
							return (
								<button
									key={index}
									onClick={() => handleExternalLink(part)}
									className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline cursor-pointer transition-colors duration-200"
								>
									{part}
								</button>
							);
						}
						return part;
					})}
				</Text>
			);
		}
		
		// Regular text message
		return (
			<Text size="2" className="whitespace-pre-wrap leading-relaxed text-base">
				{text}
			</Text>
		);
	}, [handleExternalLink]);

	// Memoized message component for better performance
	const MessageComponent = React.memo(
		({ msg, index }: { msg: any; index: number }) => {
			// Special handling for system messages
			if (msg.type === "system") {
				// Special handling for live chat redirect marker
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
						{renderMessageWithLinks(msg.text, currentBlockId)}
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

	// Memoized message list
	const messageList = useMemo(() => {
		const messageElements = history.map((msg, index) => (
			<MessageComponent
				key={`${msg.type}-${index}`}
				msg={msg}
				index={index}
			/>
		));

		// Add separation line after first message for store preview
		if (history.length > 0) {
			messageElements.splice(1, 0, (
				<div key="store-preview-separation-line" className="relative my-6 flex items-center">
					{/* Left line */}
					<div className="flex-1 h-px bg-gradient-to-r from-transparent via-violet-300 dark:via-violet-600 to-transparent"></div>
					
					{/* Center text on line */}
					<div className="px-4 py-1 bg-gradient-to-r from-violet-100 to-purple-100 dark:from-violet-900/40 dark:to-purple-900/40 border border-violet-300 dark:border-violet-700/50 rounded-full shadow-sm backdrop-blur-sm mx-2">
						<div className="flex items-center gap-2">
							<div className="w-2 h-2 bg-violet-500 rounded-full animate-pulse"></div>
							<Text size="1" weight="medium" className="text-violet-700 dark:text-violet-300 whitespace-nowrap">
								Store Preview
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
	}, [history]);

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
				// Improve scrolling performance
				WebkitOverflowScrolling: "touch",
			}}
		>
			{/* Chat Container */}
			<div className="flex-1 flex flex-col min-h-0">
				{/* Messages */}
				<div className="flex-1 overflow-y-auto p-4 touch-pan-y scrollbar-hide chat-messages-container">
					{messageList}

					{/* Options - User side (right side) */}
					{history.length > 0 &&
						history[history.length - 1].type === "bot" &&
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

				{/* Progress Bar - Same as UserChat */}
				{funnelFlow && (
					<div className="px-4 py-3 border-t border-border/20 dark:border-border/10 relative">
						{/* Floating Golden Percentage - Above progress bar, centered */}
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
								const currentStageIndex = stageOrder.findIndex(stage => stage.key === currentStage);
								const availableStages = stageOrder.filter(stage => 
									funnelFlow.stages.some(s => s.name === stage.key)
								);
								
								// Special case: OFFER stage should be 100%
								if (currentStage === "OFFER") {
									return 100;
								}
								
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
											const currentStageIndex = stageOrder.findIndex(stage => stage.key === currentStage);
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
											const currentStageIndex = stageOrder.findIndex(stage => stage.key === currentStage);
											const availableStages = stageOrder.filter(stage => 
												funnelFlow.stages.some(s => s.name === stage.key)
											);
											
											// Special case: OFFER stage should be 100%
											if (currentStage === "OFFER") {
												return 100;
											}
											
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
							// Show completion button when OFFER stage is reached
							return currentStage === "OFFER";
						})() && (
								<div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
									{/* Faded Background Line */}
									<div className="absolute inset-0 flex items-center">
										<div className="w-full h-px bg-gray-200/50 dark:bg-gray-600/50 opacity-50"></div>
									</div>
									
									{/* Smooth completion button */}
									<button
										onClick={() => {
											console.log("🎯 [EXCLUSIVE] Button clicked - searching for OFFER elements");
											
											// Simple: find element containing "Get Started" text
											console.log("🎯 [EXCLUSIVE] Searching for 'Get Started' text...");
											
											// Get all elements in the chat container
											const chatContainer = document.querySelector('.chat-messages-container');
											if (!chatContainer) {
												console.log("🎯 [EXCLUSIVE] No chat container found");
												window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
												return;
											}
											
											// Find all elements and check their text content
											const allElements = chatContainer.querySelectorAll('*');
											let getStartedElement = null;
											
											for (const element of allElements) {
												if (element.textContent && element.textContent.includes('Get Started')) {
													getStartedElement = element;
													console.log("🎯 [EXCLUSIVE] Found 'Get Started' element:", element);
													break;
												}
											}
											
											if (getStartedElement) {
												console.log("🎯 [EXCLUSIVE] Scrolling to 'Get Started' element:", getStartedElement);
												getStartedElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
											} else {
												console.log("🎯 [EXCLUSIVE] No 'Get Started' element found, scrolling to bottom");
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
								className="chat-optimized p-3 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed touch-manipulation active:from-gray-200 active:to-gray-300 dark:active:from-gray-700 dark:active:to-gray-800 active:scale-95 transition-all duration-150 shadow-lg shadow-gray-300/50 dark:shadow-gray-800/50 hover:shadow-gray-400/60 dark:hover:shadow-gray-700/60 disabled:shadow-none"
								title="Send message"
							>
								<Send size={18} className="text-gray-700 dark:text-gray-100" />
							</button>
						</div>
					</div>
				)}

				{/* Start Over Button - Show when conversation has ended (no more options) */}
				{history.length > 0 && options.length === 0 && !currentBlockId && (
					<div className="flex-shrink-0 p-0 border-t border-border/30 dark:border-border/20 bg-surface/50 dark:bg-surface/30">
						<div className="flex justify-center gap-3 py-4">
							{onEditMerchant && (
								<Button
									size="2"
									color="violet"
									onClick={() => {
										console.log("🏪 [STORE PREVIEW CHAT] Edit Merchant button clicked");
										onEditMerchant();
									}}
									className="px-6 py-2 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-105 transition-all duration-300"
								>
									<Pencil size={16} className="mr-2" />
									Edit Merchant
								</Button>
							)}
							<Button
								size="2"
								color="violet"
								onClick={startConversation}
								className="px-6 py-2 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-105 transition-all duration-300"
							>
								Start Over
							</Button>
						</div>
					</div>
				)}

			</div>
		</div>
	);
};

StorePreviewChat.displayName = "StorePreviewChat";

export default StorePreviewChat;
