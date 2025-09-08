import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
	ChatMessage,
	FunnelBlockOption,
	FunnelFlow,
} from "../types/funnel";

export const useFunnelPreviewChat = (
	funnelFlow: FunnelFlow | null,
	selectedOffer?: string | null,
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

		const numberedOptions = block.options
			.map((opt: any, index: number) => `${index + 1}. ${opt.text}`)
			.join("\n");

		return `${block.message}\n\n${numberedOptions}`;
	}, []);

	// Function to start or restart the conversation
	const startConversation = useCallback(() => {
		if (funnelFlow && funnelFlow.startBlockId) {
			const startBlock = funnelFlow.blocks[funnelFlow.startBlockId];
			if (startBlock) {
				const completeMessage = constructCompleteMessage(startBlock);
				setHistory([{ type: "bot", text: completeMessage }]);
				setCurrentBlockId(funnelFlow.startBlockId);
			}
		}
	}, [funnelFlow, constructCompleteMessage]);

	// Start the conversation when the component mounts or the funnelFlow changes
	useEffect(() => {
		startConversation();
	}, [startConversation]);

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
				chatEndRef.current?.scrollIntoView({ behavior: "instant" });
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
	const options = useMemo(() => {
		return currentBlock?.options || [];
	}, [currentBlock]);

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
			const userMessage: ChatMessage = {
				type: "user",
				text: `${index + 1}. ${option.text}`,
			};

			// If the selected option has no next block, the conversation ends
			if (!option.nextBlockId) {
				setHistory((prev) => [...prev, userMessage]);
				setCurrentBlockId(null);
				return;
			}

			const nextBlock = funnelFlow?.blocks[option.nextBlockId];

			// If the next block exists, add the user's and the bot's messages to the history
			if (nextBlock) {
				const completeMessage = constructCompleteMessage(nextBlock);
				const botMessage: ChatMessage = { type: "bot", text: completeMessage };
				setHistory((prev) => [...prev, userMessage, botMessage]);
				setCurrentBlockId(option.nextBlockId);
			} else {
				// If the next block ID is invalid, end the conversation
				const errorMessage: ChatMessage = {
					type: "bot",
					text: "This path encountered an error. You can start over to try again.",
				};
				setHistory((prev) => [...prev, userMessage, errorMessage]);
				setCurrentBlockId(null);
			}
		},
		[funnelFlow, constructCompleteMessage],
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

	// Effect to handle blocks with no options (dead-end paths)
	useEffect(() => {
		if (currentBlockId && funnelFlow) {
			const currentBlock = funnelFlow.blocks[currentBlockId];
			if (
				currentBlock &&
				(!currentBlock.options || currentBlock.options.length === 0)
			) {
				// If we reach a block with no options, end the conversation silently
				setCurrentBlockId(null);
			}
		}
	}, [currentBlockId, funnelFlow]);

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
	};
};
