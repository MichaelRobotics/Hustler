import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
	ChatMessage,
	FunnelBlockOption,
	FunnelFlow,
} from "../types/funnel";
import { isProductCardBlock, getProductCardButtonLabel } from "../utils/funnelUtils";

export const useFunnelPreviewChat = (
	funnelFlow: FunnelFlow | null,
	resources: any[] = [],
	selectedOffer?: string | null,
	conversation?: any,
	experienceId?: string,
	merchantType?: string,
) => {
	const [history, setHistory] = useState<ChatMessage[]>([]);
	const [currentBlockId, setCurrentBlockId] = useState<string | null>(null);
	const [offerTimerBlockId, setOfferTimerBlockId] = useState<string | null>(null);
	const [experienceLink, setExperienceLink] = useState<string | null>(null);
	const [whopCompanyId, setWhopCompanyId] = useState<string | null>(null);
	const chatEndRef = useRef<HTMLDivElement>(null);
	const chatContainerRef = useRef<HTMLDivElement>(null);
	const lastProcessedInputRef = useRef<string>("");
	const lastProcessedTimeRef = useRef<number>(0);

	// Fetch experience link on mount (only for qualification – upsell uses only resource.link and must not wait on this)
	useEffect(() => {
		if (!experienceId) return;
		// Skip fetch for upsell (check at run time; merchantType not in deps to keep array size stable)
		if (merchantType === "upsell") return;

		const fetchExperienceData = async () => {
			try {
				const response = await fetch(`/api/experience/link?experienceId=${experienceId}`);
				if (response.ok) {
					const data = await response.json();
					if (data.experience) {
						if (data.experience.link) {
							setExperienceLink(data.experience.link);
						}
						if (data.experience.whopCompanyId) {
							setWhopCompanyId(data.experience.whopCompanyId);
						}
					}
				}
			} catch (error) {
				console.error("Error fetching experience data:", error);
			}
		};

		fetchExperienceData();
	}, [experienceId]);

	// Build experience fallback URL (qualification only; upsell never uses it)
	const experienceFallbackUrl =
		(experienceId && whopCompanyId
			? `https://whop.com/joined/${whopCompanyId}/${experienceId.replace(/^exp_/, "upsell-")}/app/`
			: experienceId
				? `https://whop.com/joined/${experienceId}/${experienceId.replace(/^exp_/, "upsell-")}/app/`
				: null) ?? null;

	// No [LINK] in messages. Strip [LINK] and append button: product cards always show button; link from resource only.
	const resolveLinkPlaceholder = useCallback((message: string, block: any, blockId: string): string => {
		let msg = (message || "").replace(/\[LINK\]/g, "").trim();
		const isProductCard = funnelFlow ? isProductCardBlock(blockId, funnelFlow) : false;
		const buttonLabel = funnelFlow ? getProductCardButtonLabel(blockId, funnelFlow) : "Get Started!";
		const effectiveResourceLink = (r: any): string | null => {
			const raw = r?.link != null ? String(r.link).trim() : "";
			if (raw) return raw;
			if (r?.whopProductId) return null;
			const pur = r?.purchaseUrl != null ? String(r.purchaseUrl).trim() : "";
			return pur || null;
		};
		let link: string | null = null;
		// Resolve only by resource: resourceId first, then resourceName (same order and semantics as backend getBlockResourceLink).
		const rawRid = block.resourceId != null ? String(block.resourceId).trim() : "";
		if (rawRid) {
			const byId = resources.find((r: any) => r != null && String(r.id).trim() === rawRid);
			link = byId ? effectiveResourceLink(byId) : null;
		}
		const rawName = block.resourceName != null ? String(block.resourceName).trim() : "";
		if (!link && rawName) {
			const byName = resources.find((r: any) => r?.name != null && String(r.name).trim() === rawName);
			link = byName ? effectiveResourceLink(byName) : null;
		}
		// Product cards: button href = resource.link only (no experience fallback).
		if (isProductCard) {
			const href = link || "#";
			const safeHref = (href || "#").replace(/"/g, "&quot;");
			const buttonHtml = `<div class="animated-gold-button" data-href="${safeHref}">${buttonLabel}</div>`;
			return msg ? `${msg}\n\n${buttonHtml}` : buttonHtml;
		}
		return msg;
	}, [funnelFlow, resources]);

	// Helper function to construct complete message with numbered options
	const constructCompleteMessage = useCallback((block: any): string => {
		if (!block) {
			return "";
		}

		// Strip [LINK] and append button (matches backend: product link from card resource, or app link)
		let resolvedMessage = resolveLinkPlaceholder(block.message || "", block, block.id);

		if (!block.options || block.options.length === 0) {
			return resolvedMessage;
		}

		// Qualification merchant: never show options as text in bot message; options are clickable in UI only.
		if (merchantType === "qualification") {
			return resolvedMessage;
		}

		// Don't show numbered options for: product cards, WELCOME, TRANSITION, or Upsell/Downsell pair.
		const inNoOptionsStage = funnelFlow?.stages.some(
			(stage) =>
				(stage.cardType === "product" ||
					stage.name === "WELCOME" ||
					stage.name === "TRANSITION") &&
				stage.blockIds.includes(block.id)
		);
		const isUpsellDownsellPair =
			block.options.length === 2 &&
			block.options.some((o: any) => (o.text || "").toLowerCase() === "upsell") &&
			block.options.some((o: any) => (o.text || "").toLowerCase() === "downsell");

		if (inNoOptionsStage || isUpsellDownsellPair) {
			return resolvedMessage;
		}

		const numberedOptions = block.options
			.map((opt: any, index: number) => `${index + 1}. ${opt.text}`)
			.join("\n");

		return `${resolvedMessage}\n\n${numberedOptions}`;
	}, [funnelFlow, resolveLinkPlaceholder, merchantType]);

	// Function to start or restart the conversation
	const startConversation = useCallback(() => {
		if (funnelFlow) {
			// Use conversation's currentBlockId if available (for internal chat), otherwise use startBlockId
			const startBlockId = conversation?.currentBlockId || funnelFlow.startBlockId;
			const startBlock = funnelFlow.blocks[startBlockId];
			
			if (startBlock) {
				const completeMessage = constructCompleteMessage(startBlock);
				setHistory([{ type: "bot", text: completeMessage, metadata: { blockId: startBlockId } }]);
				setCurrentBlockId(startBlockId);
			}
		}
	}, [funnelFlow, conversation?.currentBlockId]);

	// Start the conversation when the component mounts or the funnelFlow changes
	useEffect(() => {
		// Only start conversation if we don't have existing conversation messages
		// (for internal chat with DM history, we don't want to override the existing messages)
		if (!conversation?.messages || conversation.messages.length === 0) {
			startConversation();
		} else {
			// For internal chat with existing messages, just set the current block ID
			const startBlockId = conversation?.currentBlockId || funnelFlow?.startBlockId;
			if (startBlockId) {
				setCurrentBlockId(startBlockId);
				
				// Check if we need to add the bot message for the current block
				// (this happens when transitioning from DM to internal chat)
				const currentBlock = funnelFlow?.blocks[startBlockId];
				if (currentBlock && funnelFlow) {
					// Check if the last message in conversation is not from the current block
					const lastMessage = conversation.messages[conversation.messages.length - 1];
					const needsBotMessage = !lastMessage || 
						(lastMessage.type === "user" && lastMessage.metadata?.blockId !== startBlockId);
					
					if (needsBotMessage) {
						const completeMessage = constructCompleteMessage(currentBlock);
						setHistory(prev => [...prev, { type: "bot", text: completeMessage, metadata: { blockId: startBlockId } }]);
					}
				}
			}
		}
	}, [conversation?.messages, conversation?.currentBlockId, funnelFlow]);

	// Effect to handle auto-scrolling as new messages are added (optimized)
	useEffect(() => {
		if (history.length === 1) {
			// On the first message, scroll the container to the top
			if (chatContainerRef.current) {
				chatContainerRef.current.scrollTop = 0;
			}
		} else {
			// For all subsequent messages, use requestAnimationFrame for smooth performance
			requestAnimationFrame(() => {
				chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
			});
		}
	}, [history]);

	// Helper function to check if a path leads to the offer - memoized for performance
	const doesPathLeadToOffer = useCallback(
		(blockId: string, targetOfferId: string, visited: Set<string>): boolean => {
			if (visited.has(blockId)) return false; // Prevent infinite loops
			visited.add(blockId);

			const block = funnelFlow?.blocks[blockId];
			if (!block) return false;

			// Check if this block is the offer block
			if (block.id === `offer_${targetOfferId}` || block.id === targetOfferId) {
				return true;
			}

			// Check if this block has options that lead to the offer
			if (block.options) {
				for (const option of block.options) {
					if (
						option.nextBlockId &&
						doesPathLeadToOffer(option.nextBlockId, targetOfferId, visited)
					) {
						return true;
					}
				}
			}

			return false;
		},
		[funnelFlow],
	);

	// Memoize the path finding function to prevent expensive recalculations
	const memoizedPathFinder = useMemo(() => {
		const pathCache = new Map<string, boolean>();

		return (blockId: string, targetOfferId: string): boolean => {
			const cacheKey = `${blockId}-${targetOfferId}`;
			if (pathCache.has(cacheKey)) {
				return pathCache.get(cacheKey)!;
			}

			const result = doesPathLeadToOffer(blockId, targetOfferId, new Set());
			pathCache.set(cacheKey, result);
			return result;
		};
	}, [doesPathLeadToOffer]);

	// Find which answer options in the current question would lead to the selected offer
	const findOptionsLeadingToOffer = useCallback(
		(offerId: string, currentBlockId: string | null): number[] => {
			if (!currentBlockId || !funnelFlow) return [];

			const leadingOptionIndices: number[] = [];
			const currentBlock = funnelFlow.blocks[currentBlockId];

			if (!currentBlock?.options) return [];

			// For each option in the current block, check if it leads to the offer
			currentBlock.options.forEach((option, index) => {
				if (option.nextBlockId) {
					// Use memoized path finder for better performance
					if (memoizedPathFinder(option.nextBlockId, offerId)) {
						leadingOptionIndices.push(index);
					}
				}
			});

			return leadingOptionIndices;
		},
		[funnelFlow, memoizedPathFinder],
	);

	// Get the indices of options that lead to the selected offer
	const optionsLeadingToOffer = useMemo(() => {
		if (!selectedOffer || !currentBlockId) return [];
		return findOptionsLeadingToOffer(selectedOffer, currentBlockId);
	}, [selectedOffer, currentBlockId, findOptionsLeadingToOffer]);

	// Memoize current block to prevent unnecessary re-computations
	const currentBlock = useMemo(() => {
		return funnelFlow?.blocks[currentBlockId || ""];
	}, [funnelFlow, currentBlockId]);

	// Memoize options to prevent unnecessary re-computations
	// In preview: hide Upsell/Downsell option buttons for product-card blocks (user sees only CTA; timer starts on CTA click)
	// When block has Upsell/Downsell options, only show the option if that next block exists (upsellBlockId / downsellBlockId).
	const options = useMemo(() => {
		if (!currentBlock?.options) return [];

		// Product card with upsell or downsell target: show only message + CTA, no Upsell/Downsell option buttons
		const isOfferWithUpsellDownsell = funnelFlow && isProductCardBlock(currentBlock.id, funnelFlow) && (currentBlock.upsellBlockId || currentBlock.downsellBlockId);
		if (isOfferWithUpsellDownsell) return [];

		// Upsell merchant: only show Upsell/Downsell option if the block has that next block configured
		const isUpsellDownsellPair =
			currentBlock.options.length === 2 &&
			currentBlock.options.some((o: any) => (o.text || "").toLowerCase() === "upsell") &&
			currentBlock.options.some((o: any) => (o.text || "").toLowerCase() === "downsell");
		if (isUpsellDownsellPair) {
			return currentBlock.options.filter((o: any) => {
				const t = (o.text || "").toLowerCase();
				if (t === "upsell") return !!currentBlock.upsellBlockId;
				if (t === "downsell") return !!currentBlock.downsellBlockId;
				return true;
			});
		}

		// Check if this block is in a TRANSITION stage - don't show options for these
		const isTransitionBlock = funnelFlow?.stages.some(
			stage => stage.name === "TRANSITION" && stage.blockIds.includes(currentBlock.id)
		);

		// Return empty array for TRANSITION blocks (they auto-proceed)
		if (isTransitionBlock) return [];

		return currentBlock.options;
	}, [currentBlock, funnelFlow]);

	// Helper function to check if input matches a valid option
	const isValidOption = useCallback(
		(
			input: string,
			currentBlock: any,
		): { isValid: boolean; optionIndex?: number } => {
			if (!currentBlock?.options) return { isValid: false };

			const normalizedInput = input.toLowerCase().trim();

			// Check for exact text match
			const exactMatch = currentBlock.options.findIndex(
				(opt: any) => opt.text.toLowerCase() === normalizedInput,
			);
			if (exactMatch !== -1) return { isValid: true, optionIndex: exactMatch };

			// Check for number match (1, 2, 3, etc.)
			const numberMatch = Number.parseInt(normalizedInput);
			if (
				!isNaN(numberMatch) &&
				numberMatch >= 1 &&
				numberMatch <= currentBlock.options.length
			) {
				return { isValid: true, optionIndex: numberMatch - 1 };
			}

			// Check for fuzzy matching (partial text match)
			const fuzzyMatch = currentBlock.options.findIndex((opt: any) => {
				const optionText = opt.text.toLowerCase();
				// Check if input is contained in option text or vice versa
				return (
					optionText.includes(normalizedInput) ||
					normalizedInput.includes(optionText)
				);
			});
			if (fuzzyMatch !== -1) return { isValid: true, optionIndex: fuzzyMatch };

			// Check for common synonyms
			const synonymMap: Record<string, string[]> = {
				yes: ["y", "yeah", "yep", "sure", "ok", "okay", "agree", "accept"],
				no: ["n", "nope", "nah", "disagree", "decline", "reject"],
				maybe: ["perhaps", "possibly", "might", "could be"],
				continue: ["next", "proceed", "go on", "keep going"],
				back: ["previous", "go back", "return", "undo"],
			};

			for (const [key, synonyms] of Object.entries(synonymMap)) {
				if (synonyms.includes(normalizedInput)) {
					const synonymMatch = currentBlock.options.findIndex((opt: any) =>
						opt.text.toLowerCase().includes(key),
					);
					if (synonymMatch !== -1)
						return { isValid: true, optionIndex: synonymMatch };
				}
			}

			return { isValid: false };
		},
		[],
	);

	// Handler for when a user clicks on a chat option
	const handleOptionClick = useCallback(
		(option: FunnelBlockOption, index: number) => {
			// Check if we're in a TRANSITION stage - handle differently
			const currentBlock = funnelFlow?.blocks[currentBlockId || ""];
			const isTransitionBlock = currentBlock && 
				funnelFlow?.stages.some(stage => 
					stage.name === "TRANSITION" && stage.blockIds.includes(currentBlock.id)
				);

			// If the selected option has no next block, the conversation ends
			if (!option.nextBlockId) {
				if (!isTransitionBlock) {
					const userMessage: ChatMessage = {
						type: "user",
						text: option.text,
					};
					setHistory((prev) => [...prev, userMessage]);
				}
				setCurrentBlockId(null);
				return;
			}

			const nextBlock = funnelFlow?.blocks[option.nextBlockId];

			// If the next block exists, add the user's and the bot's messages to the history
			if (nextBlock) {
				// Check if we're transitioning from TRANSITION stage to EXPERIENCE_QUALIFICATION stage
				const isTransitionToLiveChat = isTransitionBlock &&
					option.nextBlockId &&
					funnelFlow?.stages.some(stage => 
						stage.name === "EXPERIENCE_QUALIFICATION" && stage.blockIds.includes(option.nextBlockId!)
					);

				// Add transition marker if moving from DM funnel to Live Chat
				if (isTransitionToLiveChat) {
					const transitionMarker: ChatMessage = {
						type: "system",
						text: "redirect_to_live_chat", // Special marker for background styling
					};
					setHistory((prev) => [...prev, transitionMarker]);
				} else if (!isTransitionBlock) {
					// Only add user message if not in TRANSITION stage
					const userMessage: ChatMessage = {
						type: "user",
						text: option.text,
					};
					setHistory((prev) => [...prev, userMessage]);
				}

				const completeMessage = constructCompleteMessage(nextBlock);
				const botMessage: ChatMessage = { type: "bot", text: completeMessage, metadata: { blockId: option.nextBlockId } };
				setHistory((prev) => [...prev, botMessage]);
				setCurrentBlockId(option.nextBlockId);
			} else {
				// If the next block ID is invalid, end the conversation
				const errorMessage: ChatMessage = {
					type: "bot",
					text: "This path encountered an error. You can start over to try again.",
				};
				if (!isTransitionBlock) {
					const userMessage: ChatMessage = {
						type: "user",
						text: `${index + 1}. ${option.text}`,
					};
					setHistory((prev) => [...prev, userMessage, errorMessage]);
				} else {
					setHistory((prev) => [...prev, errorMessage]);
				}
				setCurrentBlockId(null);
			}
		},
		[funnelFlow, constructCompleteMessage, currentBlockId],
	);

	// Handler for custom text input
	const handleCustomInput = useCallback(
		(input: string) => {
			const now = Date.now();
			const trimmedInput = input.trim();

			// Prevent duplicate processing of the same input within 1 second
			if (
				lastProcessedInputRef.current === trimmedInput &&
				now - lastProcessedTimeRef.current < 1000
			) {
				return;
			}

			lastProcessedInputRef.current = trimmedInput;
			lastProcessedTimeRef.current = now;

			if (!currentBlockId || !funnelFlow) return;

			const currentBlock = funnelFlow.blocks[currentBlockId];
			if (!currentBlock) return;

			const userMessage: ChatMessage = { type: "user", text: trimmedInput };

			// Check if input is valid
			const validation = isValidOption(trimmedInput, currentBlock);

			if (
				validation.isValid &&
				validation.optionIndex !== undefined &&
				validation.optionIndex >= 0
			) {
				// Valid option selection - process as option click
				const option = currentBlock.options[validation.optionIndex];
				handleOptionClick(option, validation.optionIndex);
			} else {
				// Invalid input - simple error message
				const botResponse = "Please choose one of the available options above.";
				const botMessage: ChatMessage = { type: "bot", text: botResponse };
				setHistory((prev) => [...prev, userMessage, botMessage]);
			}
		},
		[currentBlockId, funnelFlow, isValidOption],
	);

	// Effect to handle blocks with no options (dead-end paths) and TRANSITION blocks
	useEffect(() => {
		if (currentBlockId && funnelFlow) {
			const currentBlock = funnelFlow.blocks[currentBlockId];
			if (!currentBlock) return;

			// Check if this is a TRANSITION stage block - auto-proceed to next stage
			const isTransitionBlock = funnelFlow.stages.some(
				stage => stage.name === "TRANSITION" && stage.blockIds.includes(currentBlock.id)
			);

			if (isTransitionBlock && currentBlock.options && currentBlock.options.length > 0) {
				// Auto-proceed to the first option (there should only be one for TRANSITION blocks)
				const firstOption = currentBlock.options[0];
				if (firstOption.nextBlockId) {
					// Use shorter timeout for TRANSITION blocks to reduce flickering
					setTimeout(() => {
						// Call handleOptionClick directly without including it in dependencies
						handleOptionClick(firstOption, 0);
					}, 50);
				}
				return;
			}

			// If we reach a block with no options, end the conversation silently (unless offer timer is active)
			if (!currentBlock.options || currentBlock.options.length === 0) {
				if (!offerTimerBlockId) setCurrentBlockId(null);
			}
		}
	}, [currentBlockId, funnelFlow, offerTimerBlockId]);

	// Start offer timer when user clicks offer CTA in preview (no real wait; shows Downsell/Upsell controls)
	const startOfferTimer = useCallback((blockId: string) => {
		const block = funnelFlow?.blocks[blockId];
		if (!block || (!block.upsellBlockId && !block.downsellBlockId)) return;
		setOfferTimerBlockId(blockId);
	}, [funnelFlow]);

	// Resolve offer timer in preview: apply upsell or downsell outcome without waiting
	const resolveOfferTimer = useCallback(
		(outcome: "bought" | "didnt_buy") => {
			if (!offerTimerBlockId || !funnelFlow) return;
			const offerBlock = funnelFlow.blocks[offerTimerBlockId];
			if (!offerBlock) {
				setOfferTimerBlockId(null);
				return;
			}
			const upsellBlockId = outcome === "bought" ? offerBlock.upsellBlockId : null;
			const downsellBlockId = outcome === "didnt_buy" ? offerBlock.downsellBlockId : null;
			const nextBlockId = upsellBlockId ?? downsellBlockId;
			if (!nextBlockId) {
				setOfferTimerBlockId(null);
				return;
			}
			const nextBlock = funnelFlow.blocks[nextBlockId];
			if (!nextBlock) {
				setOfferTimerBlockId(null);
				return;
			}
			const message = constructCompleteMessage(nextBlock);
			const botEntry: ChatMessage = { type: "bot", text: message, metadata: { blockId: nextBlockId } };
			if (outcome === "didnt_buy") {
				setHistory((prev) => {
					const last = prev[prev.length - 1];
					const withoutLast = last?.type === "bot" ? prev.slice(0, -1) : prev;
					return [...withoutLast, botEntry];
				});
			} else {
				setHistory((prev) => [...prev, botEntry]);
			}
			setCurrentBlockId(nextBlockId);
			setOfferTimerBlockId(null);
		},
		[offerTimerBlockId, funnelFlow, constructCompleteMessage],
	);

	const getMessageForBlock = useCallback(
		(block: any) => (block ? constructCompleteMessage(block) : ""),
		[constructCompleteMessage],
	);

	// Format offer timer delay for preview "Speed up" buttons: 6s, 3m, 1h, 1d
	const formatDelayMinutes = useCallback((minutes: number): string => {
		if (minutes <= 0) return "0m";
		if (minutes >= 24 * 60) return Math.round(minutes / (24 * 60)) + "d";
		if (minutes >= 60) return Math.round(minutes / 60) + "h";
		if (minutes >= 1) return Math.round(minutes) + "m";
		const sec = Math.round(minutes * 60);
		return sec + "s";
	}, []);

	const offerTimerBlock = useMemo(
		() => (offerTimerBlockId && funnelFlow?.blocks[offerTimerBlockId]) || null,
		[offerTimerBlockId, funnelFlow],
	);

	const offerTimerDelayLabel = useMemo(
		() => formatDelayMinutes(offerTimerBlock?.timeoutMinutes ?? 0),
		[offerTimerBlock?.timeoutMinutes, formatDelayMinutes],
	);

	const offerTimerHasUpsell = !!(offerTimerBlock?.upsellBlockId);
	const offerTimerHasDownsell = !!(offerTimerBlock?.downsellBlockId);

	return {
		history,
		currentBlockId,
		chatEndRef,
		chatContainerRef,
		optionsLeadingToOffer,
		startConversation,
		handleOptionClick,
		handleCustomInput,
		currentBlock,
		options,
		offerTimerBlockId,
		offerTimerActive: offerTimerBlockId !== null,
		startOfferTimer,
		resolveOfferTimer,
		getMessageForBlock,
		offerTimerDelayLabel,
		offerTimerHasUpsell,
		offerTimerHasDownsell,
	};
};
