"use client";

import { Text, Heading } from "frosted-ui";
import { ArrowLeft, FastForward, Moon, Send, Sun, User, Settings } from "lucide-react";
import React, {
	useState,
	useRef,
	useEffect,
	useCallback,
	useMemo,
} from "react";
import { useFunnelPreviewChat } from "../../hooks/useFunnelPreviewChat";
import { useSafeIframeSdk } from "../../hooks/useSafeIframeSdk";
// No WebSocket imports - this is preview only
import type { FunnelFlow } from "../../types/funnel";
import { useTheme } from "../common/ThemeProvider";
import TypingIndicator from "../common/TypingIndicator";
import { ChatRestartButton } from "../funnelBuilder/components/ChatRestartButton";
import AnimatedGoldButton from "../userChat/AnimatedGoldButton";
import ChatConfigPanel from "./ChatConfigPanel";
import { apiGet } from "../../utils/api-client";
import { getFunnelProgressPercentageFromBlock } from "../../utils/funnelUtils";

/** Funnel shape returned by next-trigger-funnels API (enough for PreviewPage / setSelectedFunnel) */
export interface NextTriggerFunnel {
	id: string;
	name: string;
	flow?: FunnelFlow;
	resources?: unknown[];
	merchantType?: string;
	isDeployed?: boolean;
	wasEverDeployed?: boolean;
	triggerType?: string | null;
	sourceFunnelName?: string | null;
	resourceName?: string | null;
}

export type TriggerLabelType = "afterConversation" | "whenUserBuys" | "whenUserCancels";

/** One trigger with type and product/merchant name for display */
export interface TriggerDetail {
	type: TriggerLabelType;
	triggerType: string;
	productOrMerchantName: string | null;
}

/** One merchant with its applicable trigger(s) for the unified trigger section */
export interface MerchantWithTriggers {
	funnel: NextTriggerFunnel;
	triggers: TriggerDetail[];
}

/** Human-readable labels for trigger type enum values */
const TRIGGER_TYPE_LABELS: Record<string, string> = {
	qualification_merchant_complete: "After this qualification",
	upsell_merchant_complete: "After this upsell",
	any_membership_buy: "Any purchase",
	membership_buy: "Purchase",
	any_cancel_membership: "Any cancel",
	cancel_membership: "Cancel",
};

interface PreviewChatProps {
	funnelFlow: FunnelFlow;
	resources?: any[];
	experienceId?: string;
	funnelId?: string;
	/** "qualification" | "upsell" – Upsell: link button uses only resource (product) link; Qualification: may fallback to app experience link */
	merchantType?: string;
	onMessageSent?: (message: string, conversationId?: string) => void;
	onBack?: () => void;
	/** Display name for the merchant/funnel in the header (replaces generic "Hustler" branding) */
	merchantName?: string;
	onPreviewNextMerchant?: (funnel: NextTriggerFunnel) => void;
}

/**
 * --- Preview Chat Component ---
 * 
 * Uses the same frontend design as UserChat but without WebSocket functionality.
 * This is for testing/previewing funnels only.
 */
const PreviewChat: React.FC<PreviewChatProps> = ({
	funnelFlow,
	resources = [],
	experienceId,
	funnelId,
	merchantType,
	onMessageSent,
	onBack,
	merchantName,
	onPreviewNextMerchant,
}) => {
	const [message, setMessage] = useState("");
	const [isTyping, setIsTyping] = useState(false);
	const [currentStage, setCurrentStage] = useState("WELCOME");
	const [showConfigPanel, setShowConfigPanel] = useState(false);
	const [merchantsWithTriggers, setMerchantsWithTriggers] = useState<MerchantWithTriggers[]>([]);
	const [nextTriggerLoading, setNextTriggerLoading] = useState(false);
	const [nextTriggerError, setNextTriggerError] = useState<string | null>(null);
	const [nextTriggerHasFetched, setNextTriggerHasFetched] = useState(false);
	const nextTriggerFetchedRef = useRef(false);
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const chatEndRef = useRef<HTMLDivElement>(null);
	const { appearance, toggleTheme } = useTheme();
	const { iframeSdk, isInIframe } = useSafeIframeSdk();

	/** Open link in new tab only; never navigate the current page (or iframe). */
	const handleExternalLink = useCallback((href: string): void => {
		window.open(href, '_blank', 'noopener,noreferrer');
	}, []);

	// Use the preview chat hook (no WebSocket)
	const {
		history,
		currentBlockId,
		options,
		startConversation,
		handleOptionClick,
		handleCustomInput,
		offerTimerActive,
		startOfferTimer,
		resolveOfferTimer,
		getMessageForBlock,
		offerTimerDelayLabel,
		offerTimerHasUpsell,
		offerTimerHasDownsell,
	} = useFunnelPreviewChat(funnelFlow, resources, undefined, undefined, experienceId, merchantType);

	// Fetch next-trigger funnels when conversation is completed (funnel_completed + membership_activated + membership_deactivated)
	const isConversationCompleted = history.length > 0 && options.length === 0 && !currentBlockId;

	// Progress = (stage position / total stages) × 100 — 1/5 = 20%, 2/5 = 40%, etc. Works for qualification and upsell.
	const progressPercentage = useMemo(() => {
		if (isConversationCompleted && funnelFlow?.stages?.length) return 100;
		return funnelFlow?.stages?.length
			? getFunnelProgressPercentageFromBlock(currentBlockId, funnelFlow.stages)
			: 0;
	}, [isConversationCompleted, currentBlockId, funnelFlow]);
	useEffect(() => {
		if (!isConversationCompleted || !experienceId || !funnelId || nextTriggerFetchedRef.current) return;
		nextTriggerFetchedRef.current = true;
		setNextTriggerLoading(true);
		setNextTriggerError(null);
		const url = `/api/next-trigger-funnels?experienceId=${encodeURIComponent(experienceId)}&completedFunnelId=${encodeURIComponent(funnelId)}`;
		apiGet(url, experienceId)
			.then((res) => res.json())
			.then((data) => {
				if (!data.success) {
					setMerchantsWithTriggers([]);
					return;
				}
				const funnelCompleted = Array.isArray(data.funnels) ? data.funnels : [];
				const membershipActivated = Array.isArray(data.membershipActivated) ? data.membershipActivated : [];
				const membershipDeactivated = Array.isArray(data.membershipDeactivated) ? data.membershipDeactivated : [];
				const byId = new Map<string, { funnel: NextTriggerFunnel; triggers: TriggerDetail[] }>();
				const add = (
					list: (NextTriggerFunnel & { triggerType?: string | null; sourceFunnelName?: string | null; resourceName?: string | null })[],
					category: TriggerLabelType,
				) => {
					for (const f of list) {
						const productOrMerchantName =
							category === "afterConversation"
								? (f.sourceFunnelName ?? null)
								: f.resourceName ?? (f.triggerType === "any_membership_buy" || f.triggerType === "any_cancel_membership" ? "Any product" : null);
						const detail: TriggerDetail = {
							type: category,
							triggerType: f.triggerType ?? "",
							productOrMerchantName,
						};
						const existing = byId.get(f.id);
						if (existing) {
							existing.triggers.push(detail);
						} else {
							byId.set(f.id, { funnel: f, triggers: [detail] });
						}
					}
				};
				add(funnelCompleted, "afterConversation");
				add(membershipActivated, "whenUserBuys");
				add(membershipDeactivated, "whenUserCancels");
				setMerchantsWithTriggers(Array.from(byId.values()));
			})
			.catch((err) => {
				console.error("Error fetching next-trigger funnels:", err);
				setNextTriggerError("Could not load merchants.");
				setMerchantsWithTriggers([]);
			})
			.finally(() => {
				setNextTriggerLoading(false);
				setNextTriggerHasFetched(true);
			});
	}, [isConversationCompleted, experienceId, funnelId]);

	// Reset when funnel or experience changes (e.g. user clicked Preview on another merchant)
	useEffect(() => {
		nextTriggerFetchedRef.current = false;
		setMerchantsWithTriggers([]);
		setNextTriggerError(null);
		setNextTriggerHasFetched(false);
	}, [funnelId, experienceId]);

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
			console.log('[PreviewChat] Starting conversation manually');
			console.log('[PreviewChat] FunnelFlow:', funnelFlow);
			console.log('[PreviewChat] StartBlockId:', funnelFlow.startBlockId);
			startConversation();
		}
	}, [funnelFlow, history.length]);
	
	// Debug history changes
	useEffect(() => {
		console.log('[PreviewChat] History changed:', history);
		console.log('[PreviewChat] Current block ID:', currentBlockId);
		console.log('[PreviewChat] Options:', options);
	}, [history, currentBlockId, options]);

	// Auto-scroll to bottom when new messages arrive
	useEffect(() => {
		if (chatEndRef.current) {
			chatEndRef.current.scrollIntoView({ behavior: "smooth" });
		}
	}, [history]);

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

	// Function to render messages with [LINK] resolution for different stages. blockId used for offer timer when button is clicked.
	const renderMessageWithLinks = useCallback((text: string, blockId: string | null) => {
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
					// This is the href (may contain &quot; from HTML escape)
					const href = (part || "").replace(/&quot;/g, '"').trim() || "#";
					const buttonText = parts[partIndex + 1] || "Get Started!";
					const isLinkReady = href !== "#" && href.startsWith("http");
					
					// Determine if this is a VALUE_DELIVERY button (free resource) or OFFER button (paid resource)
					const isValueDeliveryButton = buttonText === "Claim!";
					const buttonIcon = isValueDeliveryButton ? "gift" : "sparkles";
					
					if (isLinkReady) {
						buttons.push(
							<AnimatedGoldButton
								key={partIndex}
								href={href}
								text={buttonText}
								icon={buttonIcon}
								onClick={() => {
									if (!isValueDeliveryButton && blockId) startOfferTimer(blockId);
								}}
							/>
						);
					} else {
						// Link not resolved yet or failed: show grey disabled button (loading or unavailable)
						buttons.push(
							<div
								key={partIndex}
								className="relative inline-flex items-center justify-center px-6 py-3 text-lg font-bold text-gray-500 dark:text-gray-400 transition-all duration-300 ease-out bg-gray-200 dark:bg-gray-700 rounded-full shadow cursor-not-allowed select-none"
							>
								<span className="flex items-center gap-2">
									{buttonIcon === "gift" ? "🎁" : "✨"}
									<span>{href === "#" ? "Loading…" : buttonText}</span>
								</span>
							</div>
						);
					}
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
	}, [handleExternalLink, startOfferTimer]);

	// Memoized message component. Re-resolves bot message when blockId present so button link updates when resources load.
	const MessageComponent = React.memo(
		({ msg, index, funnelFlowForResolve, getMessageForBlockFn }: { msg: any; index: number; funnelFlowForResolve: typeof funnelFlow; getMessageForBlockFn: (block: any) => string }) => {
			const block = msg.metadata?.blockId && funnelFlowForResolve?.blocks ? funnelFlowForResolve.blocks[msg.metadata.blockId] : null;
			const displayText = msg.type === "bot" && block && getMessageForBlockFn ? getMessageForBlockFn(block) : msg.text;
			const blockIdForButton = msg.metadata?.blockId ?? null;

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
								: displayText.includes('animated-gold-button')
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
						{renderMessageWithLinks(displayText, blockIdForButton)}
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
				funnelFlowForResolve={funnelFlow}
				getMessageForBlockFn={getMessageForBlock}
			/>
		));

		// Add separation line after first message for preview
		if (history.length > 0) {
			messageElements.splice(1, 0, (
				<div key="preview-separation-line" className="relative my-6 flex items-center">
					{/* Left line */}
					<div className="flex-1 h-px bg-gradient-to-r from-transparent via-violet-300 dark:via-violet-600 to-transparent"></div>
					
					{/* Center text on line */}
					<div className="px-4 py-1 bg-gradient-to-r from-violet-100 to-purple-100 dark:from-violet-900/40 dark:to-purple-900/40 border border-violet-300 dark:border-violet-700/50 rounded-full shadow-sm backdrop-blur-sm mx-2">
						<div className="flex items-center gap-2">
							<div className="w-2 h-2 bg-violet-500 rounded-full animate-pulse"></div>
							<Text size="1" weight="medium" className="text-violet-700 dark:text-violet-300 whitespace-nowrap">
								Preview Mode
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
	}, [history, funnelFlow, getMessageForBlock]);

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
				// Improve scrolling performance
				WebkitOverflowScrolling: "touch",
			}}
		>
			{/* Header - Visible on all screen sizes */}
			<div className="flex-shrink-0 bg-gradient-to-br from-surface via-surface/95 to-surface/90 backdrop-blur-sm border-b border-border/30 dark:border-border/20 shadow-lg px-4 py-3 safe-area-top">
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

						<div>
							<Text
								size="3"
								weight="semi-bold"
								className="text-black dark:text-white"
							>
								{merchantName ?? "Preview"}
							</Text>
							<span className="block text-xs text-muted-foreground mt-0.5">Preview</span>
						</div>
					</div>

					{/* Configure Button */}
					<div className="p-1 rounded-xl bg-surface/50 border border-border/50 shadow-lg backdrop-blur-sm dark:bg-surface/30 dark:border-border/30 dark:shadow-xl dark:shadow-black/20">
						<button
							onClick={() => setShowConfigPanel(!showConfigPanel)}
							className="p-2 rounded-lg touch-manipulation transition-all duration-200 hover:scale-105 flex items-center gap-2"
							style={{ WebkitTapHighlightColor: "transparent" }}
							title="Configure AI chat"
						>
							<Settings
								size={20}
								className={`text-foreground/70 dark:text-foreground/70 transition-transform duration-300 ${
									showConfigPanel ? "rotate-90" : ""
								}`}
							/>
							<span className="text-sm font-medium hidden sm:inline">Configure</span>
						</button>
					</div>
				</div>

				{/* Subtle Separator Line */}
				<div className="w-full h-0.5 bg-gradient-to-r from-transparent via-violet-300/40 dark:via-violet-600/40 to-transparent mt-3" />
			</div>

			{/* Progress Bar - Same as UserChat */}
			{funnelFlow && (
				<div className="px-4 py-3 border-t border-border/20 dark:border-border/10">
					{/* Completion Percentage - Above progress bar (stage N of total = N/total*100%) */}
					<div className="flex justify-center mb-3">
						<span className="text-yellow-500 font-bold text-2xl drop-shadow-lg">
							{Math.round(progressPercentage)}%
						</span>
					</div>
					<div className="relative w-full">
						{/* Background Track - Smooth and subtle */}
						<div className="w-full bg-gray-200/30 dark:bg-gray-600/30 rounded-full h-1">
							<div
								className="h-1 rounded-full transition-all duration-500 ease-out relative overflow-hidden bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-600"
								style={{
									width: `${progressPercentage}%`,
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
						{progressPercentage >= 100 && (
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

					{/* Speed up timer (preview): simulate outcome after offer CTA click; only show options that have a next block */}
					{offerTimerActive && (offerTimerHasDownsell || offerTimerHasUpsell) && (
						<div className="flex flex-wrap gap-3 justify-center mb-4">
							{offerTimerHasDownsell && (
								<button
									type="button"
									onClick={() => resolveOfferTimer("didnt_buy")}
									className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
								>
									<FastForward size={16} className="shrink-0" />
									Downsell {offerTimerDelayLabel ? `(${offerTimerDelayLabel})` : ""}
								</button>
							)}
							{offerTimerHasUpsell && (
								<button
									type="button"
									onClick={() => resolveOfferTimer("bought")}
									className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-100 dark:bg-amber-900/40 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 text-sm font-medium hover:bg-amber-200 dark:hover:bg-amber-800/50 transition-colors"
								>
									<FastForward size={16} className="shrink-0" />
									Upsell {offerTimerDelayLabel ? `(${offerTimerDelayLabel})` : ""}
								</button>
							)}
						</div>
					)}

					{/* Typing Indicator */}
					{isTyping && (
						<div className="flex justify-start mb-4">
							<div className="max-w-[85%] sm:max-w-[80%] px-4 py-3 rounded-xl bg-white dark:bg-gray-800 border border-border/30 dark:border-border/20 text-gray-900 dark:text-gray-100 shadow-sm">
								<TypingIndicator text={`${merchantName ?? "Chat"} is typing...`} />
							</div>
						</div>
					)}

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
								className="chat-optimized p-3 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed touch-manipulation active:from-gray-200 active:to-gray-300 dark:active:from-gray-700 dark:active:to-gray-800 active:scale-95 transition-all duration-150 shadow-lg shadow-gray-300/50 dark:shadow-gray-800/50 hover:shadow-gray-400/60 dark:hover:shadow-gray-700/60 disabled:shadow-none"
								title="Send message"
							>
								<Send size={18} className="text-gray-700 dark:text-gray-100" />
							</button>
						</div>
					</div>
				)}

				{/* Available merchants to trigger - Show when conversation is completed */}
				{history.length > 0 && options.length === 0 && !currentBlockId && (
					<>
						<div className="flex-shrink-0 border-t border-border/30 dark:border-border/20 bg-surface/50 dark:bg-surface/30 p-4 space-y-4">
							<Heading size="3" weight="bold" className="text-foreground">
								Available merchants to trigger
							</Heading>
							{nextTriggerLoading && (
								<ul className="space-y-3">
									{[1, 2, 3].map((i) => (
										<li
											key={i}
											className="bg-gradient-to-br from-white via-gray-50 to-violet-50 dark:from-gray-950 dark:via-gray-900 dark:to-indigo-900/50 border-2 border-border dark:border-violet-500/40 rounded-xl p-4 shadow-sm animate-pulse"
											aria-hidden
										>
											<div className="h-5 w-3/4 rounded bg-gray-200 dark:bg-gray-700 mb-3" />
											<div className="flex gap-2 flex-wrap">
												<div className="h-6 w-24 rounded-full bg-gray-200 dark:bg-gray-700" />
												<div className="h-6 w-28 rounded-full bg-gray-200 dark:bg-gray-700" />
											</div>
										</li>
									))}
								</ul>
							)}
							{!nextTriggerLoading && nextTriggerError && (
								<p className="text-center text-sm text-amber-600 dark:text-amber-400">{nextTriggerError}</p>
							)}
							{!nextTriggerLoading && !nextTriggerError && merchantsWithTriggers.length > 0 && (
								<ul className="space-y-3">
									{merchantsWithTriggers.map(({ funnel, triggers }) => (
										<li
											key={funnel.id}
											role="button"
											tabIndex={0}
											onClick={() => onPreviewNextMerchant?.(funnel)}
											onKeyDown={(e) => {
												if (e.key === "Enter" || e.key === " ") {
													e.preventDefault();
													onPreviewNextMerchant?.(funnel);
												}
											}}
											className="bg-gradient-to-br from-white via-gray-50 to-violet-50 dark:from-gray-950 dark:via-gray-900 dark:to-indigo-900/50 border-2 border-border dark:border-violet-500/40 rounded-xl p-4 shadow-sm flex flex-col gap-3 cursor-pointer transition-all duration-200 hover:shadow-md hover:border-violet-400/60 dark:hover:border-violet-400/60 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:ring-offset-2"
										>
											<Text size="3" weight="semi-bold" className="text-foreground line-clamp-2">
												{funnel.name}
											</Text>
											<div className="flex flex-wrap gap-2">
												{triggers.map((t, idx) => {
													const friendlyLabel = TRIGGER_TYPE_LABELS[t.triggerType] ?? t.triggerType;
													const isPurchaseOrCancelWithProduct =
														(t.type === "whenUserBuys" || t.type === "whenUserCancels") &&
														(t.triggerType === "membership_buy" || t.triggerType === "cancel_membership") &&
														t.productOrMerchantName;
													const badgeText = isPurchaseOrCancelWithProduct
														? `${friendlyLabel}: ${t.productOrMerchantName}`
														: friendlyLabel;
													const secondLine =
														isPurchaseOrCancelWithProduct
															? null
															: t.type === "afterConversation" &&
																	t.triggerType !== "qualification_merchant_complete" &&
																	t.triggerType !== "upsell_merchant_complete" &&
																	t.productOrMerchantName
																? `From: ${t.productOrMerchantName}`
																: null;
													return (
														<span
															key={`${t.type}-${t.triggerType}-${t.productOrMerchantName ?? ""}-${idx}`}
															className={
																t.type === "afterConversation"
																	? "inline-flex flex-col gap-0.5 px-2.5 py-1.5 rounded-full text-xs font-medium bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-200 border border-violet-300/60 dark:border-violet-500/40"
																	: t.type === "whenUserBuys"
																		? "inline-flex flex-col gap-0.5 px-2.5 py-1.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200 border border-emerald-300/60 dark:border-emerald-500/40"
																		: "inline-flex flex-col gap-0.5 px-2.5 py-1.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200 border border-amber-300/60 dark:border-amber-500/40"
															}
															title={secondLine ? `Trigger · ${secondLine}` : badgeText ? `Trigger · ${badgeText}` : "Trigger"}
														>
															<span>{badgeText}</span>
															{secondLine && (
																<span className="opacity-90 font-normal">{secondLine}</span>
															)}
														</span>
													);
												})}
											</div>
										</li>
									))}
								</ul>
							)}
							{!nextTriggerLoading && nextTriggerHasFetched && !nextTriggerError && merchantsWithTriggers.length === 0 && (
								<p className="text-center text-sm text-muted-foreground">
									No available merchants to trigger
								</p>
							)}
						</div>
						<ChatRestartButton onRestart={startConversation} />
					</>
				)}

			</div>

			{/* Chat Config Panel */}
			{showConfigPanel && funnelId && (
				<ChatConfigPanel
					isOpen={showConfigPanel}
					funnelId={funnelId}
					onClose={() => setShowConfigPanel(false)}
				/>
			)}
		</div>
	);
};

PreviewChat.displayName = "PreviewChat";

export default PreviewChat;

