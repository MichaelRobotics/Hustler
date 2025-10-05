import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
	ChatMessage,
	FunnelBlockOption,
	FunnelFlow,
} from "../types/funnel";

export const useFunnelPreviewChat = (
	funnelFlow: FunnelFlow | null,
	selectedOffer?: string | null,
	conversation?: any,
	experienceId?: string,
) => {
	const [history, setHistory] = useState<ChatMessage[]>([]);
	const [currentBlockId, setCurrentBlockId] = useState<string | null>(null);
	const chatEndRef = useRef<HTMLDivElement>(null);
	const chatContainerRef = useRef<HTMLDivElement>(null);
	const lastProcessedInputRef = useRef<string>("");
	const lastProcessedTimeRef = useRef<number>(0);

	// Helper function to construct complete message with numbered options
	const constructCompleteMessage = useCallback((block: any): string => {
		if (!block || !block.options || block.options.length === 0) {
			return block.message;
		}

		// Check if this block is in a stage that should not show numbered options
		// Stages without numbered options: VALUE_DELIVERY, TRANSITION, PAIN_POINT_QUALIFICATION, EXPERIENCE_QUALIFICATION, OFFER
		const shouldHideOptions = funnelFlow?.stages.some(
			stage => 
				(stage.name === "VALUE_DELIVERY" ||
				 stage.name === "TRANSITION" || 
				 stage.name === "PAIN_POINT_QUALIFICATION" || 
				 stage.name === "EXPERIENCE_QUALIFICATION" ||
				 stage.name === "OFFER") && 
				stage.blockIds.includes(block.id)
		);

		if (shouldHideOptions) {
			return block.message; // Don't include options for specified stages
		}

		const numberedOptions = block.options
			.map((opt: any, index: number) => `${index + 1}. ${opt.text}`)
			.join("\n");

		return `${block.message}\n\n${numberedOptions}`;
	}, [funnelFlow]);

	// Function to start or restart the conversation
	const startConversation = useCallback(() => {
		if (funnelFlow) {
			// Use conversation's currentBlockId if available (for internal chat), otherwise use startBlockId
			const startBlockId = conversation?.currentBlockId || funnelFlow.startBlockId;
			const startBlock = funnelFlow.blocks[startBlockId];
			
			if (startBlock) {
				const completeMessage = constructCompleteMessage(startBlock);
				setHistory([{ type: "bot", text: completeMessage }]);
				setCurrentBlockId(startBlockId);
			}
		}
	}, [funnelFlow, constructCompleteMessage, conversation?.currentBlockId]);

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
						setHistory(prev => [...prev, { type: "bot", text: completeMessage }]);
					}
				}
			}
		}
	}, [startConversation, conversation?.messages, conversation?.currentBlockId, funnelFlow, constructCompleteMessage]);

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
	// Use conversation's currentBlockId if available, otherwise use hook's currentBlockId
	const effectiveCurrentBlockId = conversation?.currentBlockId || currentBlockId;
	const currentBlock = useMemo(() => {
		return funnelFlow?.blocks[effectiveCurrentBlockId || ""];
	}, [funnelFlow, effectiveCurrentBlockId]);

	// Helper function to validate options against conversation's whopProductId
	const validateOptionsAgainstProduct = useCallback(async (options: FunnelBlockOption[]): Promise<FunnelBlockOption[]> => {
		if (!conversation?.whopProductId || !funnelFlow) {
			return options; // No validation if no conversation or product ID
		}

		try {
			// Use apiPost to include proper authentication headers
			const { apiPost } = await import('../utils/api-client');
			const response = await apiPost('/api/userchat/validate-welcome-options', {
				conversationId: conversation.id,
				whopProductId: conversation.whopProductId,
				options: options,
				funnelFlow: funnelFlow
			}, experienceId);

			if (response.ok) {
				const result = await response.json();
				if (result.success && result.filteredOptions) {
					console.log(`[Frontend] Filtered options: ${result.filteredOptions.length}/${options.length} valid`);
					return result.filteredOptions;
				}
			}
		} catch (error) {
			console.warn('[Frontend] Option validation failed, showing all options:', error);
		}

		return options; // Fallback to original options
	}, [conversation, funnelFlow]);

	// State for filtered options
	const [filteredOptions, setFilteredOptions] = useState<FunnelBlockOption[]>([]);
	const [isValidatingOptions, setIsValidatingOptions] = useState(false);

	// Memoize options to prevent unnecessary re-computations
	const options = useMemo(() => {
		if (!currentBlock?.options) return [];
		
		// Check if this block is in a TRANSITION stage - don't show options for these
		const isTransitionBlock = funnelFlow?.stages.some(
			stage => stage.name === "TRANSITION" && stage.blockIds.includes(currentBlock.id)
		);
		
		// Return empty array for TRANSITION blocks (they auto-proceed)
		if (isTransitionBlock) return [];
		
		return currentBlock.options;
	}, [currentBlock, funnelFlow]);

	// Validate options when they change - ONLY for WELCOME stage
	useEffect(() => {
		const validateAndSetOptions = async () => {
			console.log('[Frontend] Options validation check:', {
				hasOptions: !!options && options.length > 0,
				optionsCount: options?.length || 0,
				hasConversation: !!conversation,
				hasWhopProductId: !!conversation?.whopProductId,
				whopProductId: conversation?.whopProductId,
				currentBlockId: currentBlock?.id,
				effectiveCurrentBlockId
			});

			if (!options || options.length === 0) {
				setFilteredOptions([]);
				return;
			}

			// Check if this is a WELCOME stage block
			const isWelcomeBlock = funnelFlow?.stages.some(
				stage => stage.name === "WELCOME" && stage.blockIds.includes(effectiveCurrentBlockId || '')
			);

			console.log('[Frontend] WELCOME stage check:', {
				isWelcomeBlock,
				hasWhopProductId: !!conversation?.whopProductId,
				willValidate: isWelcomeBlock && conversation?.whopProductId,
				effectiveCurrentBlockId
			});

			// Only validate for WELCOME stage blocks with whopProductId
			if (!isWelcomeBlock || !conversation?.whopProductId) {
				// Not a WELCOME block or no conversation - show all options without validation
				console.log('[Frontend] Skipping validation - not WELCOME or no whopProductId');
				setFilteredOptions(options);
				return;
			}

			// Validate options for WELCOME stage only
			console.log('[Frontend] Starting WELCOME stage option validation...');
			setIsValidatingOptions(true);
			try {
				const validatedOptions = await validateOptionsAgainstProduct(options);
				console.log('[Frontend] WELCOME validation result:', {
					originalCount: options.length,
					filteredCount: validatedOptions.length,
					filteredOptions: validatedOptions.map(opt => opt.text)
				});
				setFilteredOptions(validatedOptions);
			} catch (error) {
				console.warn('[Frontend] WELCOME option validation failed, showing all options:', error);
				setFilteredOptions(options);
			} finally {
				setIsValidatingOptions(false);
			}
		};

		validateAndSetOptions();
	}, [options, currentBlock, funnelFlow, conversation, validateOptionsAgainstProduct, effectiveCurrentBlockId]);

	// Use filtered options instead of original options
	const displayOptions = filteredOptions;

	// Helper function to check if input matches a valid option
	const isValidOption = useCallback(
		(
			input: string,
			currentBlock: any,
		): { isValid: boolean; optionIndex?: number } => {
			if (!displayOptions || displayOptions.length === 0) return { isValid: false };

			const normalizedInput = input.toLowerCase().trim();

			// Check for exact text match
			const exactMatch = displayOptions.findIndex(
				(opt: any) => opt.text.toLowerCase() === normalizedInput,
			);
			if (exactMatch !== -1) return { isValid: true, optionIndex: exactMatch };

			// Check for number match (1, 2, 3, etc.)
			const numberMatch = Number.parseInt(normalizedInput);
			if (
				!isNaN(numberMatch) &&
				numberMatch >= 1 &&
				numberMatch <= displayOptions.length
			) {
				return { isValid: true, optionIndex: numberMatch - 1 };
			}

			// Check for fuzzy matching (partial text match)
			const fuzzyMatch = displayOptions.findIndex((opt: any) => {
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
				const botMessage: ChatMessage = { type: "bot", text: completeMessage };
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
		[currentBlockId, funnelFlow, isValidOption, handleOptionClick],
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
						handleOptionClick(firstOption, 0);
					}, 50);
				}
				return;
			}
			
			// If we reach a block with no options, end the conversation silently
			if (!currentBlock.options || currentBlock.options.length === 0) {
				setCurrentBlockId(null);
			}
		}
	}, [currentBlockId, funnelFlow, handleOptionClick]);

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
		options: displayOptions,
		isValidatingOptions,
	};
};
