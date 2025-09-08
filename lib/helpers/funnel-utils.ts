/**
 * Funnel Utilities
 *
 * Helper functions for funnel flow operations and message construction.
 */

interface FunnelBlock {
	id: string;
	message: string;
	options?: Array<{
		text: string;
		nextBlockId: string | null;
	}>;
}

/**
 * Constructs a complete message by combining the base message with numbered options
 * @param block - The funnel block containing message and options
 * @returns The complete message string with numbered options
 */
export const constructCompleteMessage = (block: FunnelBlock): string => {
	if (!block || !block.options || block.options.length === 0) {
		return block.message;
	}

	const numberedOptions = block.options
		.map((opt, index) => `${index + 1}. ${opt.text}`)
		.join("\n");

	return `${block.message}\n\n${numberedOptions}`;
};

/**
 * Extracts the base message without numbered options
 * @param message - The complete message string
 * @returns The base message without numbered options
 */
export const extractBaseMessage = (message: string): string => {
	// Remove numbered options from the end of the message
	const lines = message.split("\n");
	const baseLines: string[] = [];

	for (const line of lines) {
		// Stop when we encounter a numbered option (e.g., "1. Option text")
		if (/^\d+\.\s/.test(line.trim())) {
			break;
		}
		baseLines.push(line);
	}

	return baseLines.join("\n").trim();
};
