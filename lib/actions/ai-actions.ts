/**
 * AI Actions - Gemini AI Integration
 *
 * Contains all AI generation functionality for funnel creation and JSON repair.
 * Uses the official @google/genai SDK.
 */

import { GoogleGenAI } from "@google/genai";
import { mainPromptPart1 } from "./prompt2";

interface Resource {
	id: string;
	type: "AFFILIATE" | "MY_PRODUCTS" | "CONTENT" | "TOOL";
	name: string;
	link: string;
	code: string; // promoCode converted to code for consistency
	category: string;
}

interface FunnelFlow {
	startBlockId: string;
	stages: Array<{
		id: string;
		name: string;
		explanation: string;
		blockIds: string[];
	}>;
	blocks: Record<
		string,
		{
			id: string;
			message: string;
			options: Array<{
				text: string;
				nextBlockId: string | null;
			}>;
			resourceName?: string;
		}
	>;
}

// Custom error types for better error handling
export class AIError extends Error {
	constructor(
		message: string,
		public type:
			| "AUTHENTICATION"
			| "NETWORK"
			| "CONTENT"
			| "RATE_LIMIT"
			| "UNKNOWN",
	) {
		super(message);
		this.name = "AIError";
	}
}

export class ValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "ValidationError";
	}
}

/**
 * Validates the API key and environment setup
 * @throws {ValidationError} If API key is missing or invalid
 */
const validateEnvironment = (): void => {
	const apiKey = process.env.GEMINI_API_KEY;
	if (!apiKey || apiKey.trim() === "") {
		throw new ValidationError(
			"GEMINI_API_KEY is not configured. Please check your environment variables.",
		);
	}
	if (apiKey === "your_gemini_api_key_here" || apiKey.includes("test-key")) {
		throw new ValidationError(
			"Please configure a valid GEMINI_API_KEY in your environment variables.",
		);
	}
};

/**
 * Handles specific Google Gen AI SDK errors
 * @param error - The error from the SDK
 * @returns {AIError} A categorized error
 */
const handleSDKError = (error: unknown): AIError => {
	const errorMessage = error instanceof Error ? error.message : String(error);

	// Check for specific error types
	if (
		errorMessage.includes("API key") ||
		errorMessage.includes("authentication")
	) {
		return new AIError(
			"Authentication failed. Please check your API key.",
			"AUTHENTICATION",
		);
	}

	if (errorMessage.includes("rate limit") || errorMessage.includes("quota")) {
		return new AIError(
			"Rate limit exceeded. Please try again later.",
			"RATE_LIMIT",
		);
	}

	if (errorMessage.includes("network") || errorMessage.includes("fetch")) {
		return new AIError(
			"Network error. Please check your connection and try again.",
			"NETWORK",
		);
	}

	if (errorMessage.includes("content") || errorMessage.includes("response")) {
		return new AIError(
			"Content generation failed. Please try again.",
			"CONTENT",
		);
	}

	return new AIError(`Unexpected error: ${errorMessage}`, "UNKNOWN");
};

/**
 * Repairs malformed JSON using AI
 * @param badJson - The malformed JSON string to repair
 * @param maxTries - Maximum number of repair attempts (default: 3)
 * @returns Promise with the repaired JSON object
 */
export const repairFunnelJson = async (
	badJson: string,
	maxTries = 3,
): Promise<FunnelFlow> => {
	let lastError: Error | null = null;

	// Validate environment before making API calls
	validateEnvironment();

	// Initialize the Google Gen AI SDK
	const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

	for (let i = 0; i < maxTries; i++) {
		try {
			const repairPrompt = `
The following JSON is invalid or malformed. Please fix it so it conforms to the required structure.
Do not add any commentary, just return the corrected JSON object.

Invalid JSON:
${badJson}

**IMPORTANT REQUIREMENTS:**
- The funnel must follow the structure: WELCOME -> VALUE_DELIVERY -> TRANSITION -> EXPERIENCE_QUALIFICATION -> PAIN_POINT_QUALIFICATION -> OFFER
- All blocks in the VALUE_DELIVERY stage MUST include a "resourceName" field for free value resources
- All blocks in the OFFER stage MUST include a "resourceName" field for paid product resources
- The "resourceName" field must contain the exact name of the resource being offered
- This field is essential for proper funnel validation and offer display
- The escape hatch option must have "nextBlockId": null

Here is a detailed example of the correct, required JSON structure:
\`\`\`json
{
  "startBlockId": "welcome_1",
  "stages": [
    {
      "id": "stage-welcome",
      "name": "WELCOME",
      "explanation": "Initial greeting and segmentation.",
      "blockIds": [
        "welcome_1"
      ]
    },
    {
      "id": "stage-niche",
      "name": "NICHE",
      "explanation": "Determine the user's business niche.",
      "blockIds": [
        "niche_ds",
        "niche_smma"
      ]
    },
    {
      "id": "stage-offer",
      "name": "OFFER",
      "explanation": "Present the tailored resource.",
      "blockIds": [
        "offer_ds_final",
        "offer_smma_final"
      ]
    }
  ],
  "blocks": {
    "welcome_1": {
      "id": "welcome_1",
      "message": "Welcome! What's your focus?\\n\\nAnswer by pasting one of those numbers",
      "options": [
        {
          "text": "Dropshipping",
          "nextBlockId": "value_ds_guide"
        },
        {
          "text": "SMMA",
          "nextBlockId": "value_smma_guide"
        }
      ]
    },
    "value_ds_guide": {
      "id": "value_ds_guide",
      "message": "Perfect! Here's your free dropshipping guide...\\n\\nAnswer by pasting one of those numbers",
      "resourceName": "Free Dropshipping Guide",
      "options": [
        {
          "text": "Got it, let's continue",
          "nextBlockId": "transition_to_strategy"
        }
      ]
    },
    "value_smma_guide": {
      "id": "value_smma_guide",
      "message": "Excellent! Here's your free SMMA guide...\\n\\nAnswer by pasting one of those numbers",
      "resourceName": "Free SMMA Guide",
      "options": [
        {
          "text": "Got it, let's continue",
          "nextBlockId": "transition_to_strategy"
        }
      ]
    },
    "transition_to_strategy": {
      "id": "transition_to_strategy",
      "message": "Excellent! You've completed the first step. ✅\\n\\nNow it's time to build your personal strategy plan. To do that, I've prepared a private, unlimited chat session just for you.\\n\\nClick below to begin your Personal Strategy Session now.\\n\\n➡️ [LINK_TO_PRIVATE_CHAT] ⬅️",
      "options": [
        {
          "text": "Continue to Strategy Session",
          "nextBlockId": "experience_beginner"
        }
      ]
    },
    "experience_beginner": {
      "id": "experience_beginner",
      "message": "Based on the guide you just saw, where would you place your current skill level?\\n\\nAnswer by pasting one of those numbers",
      "options": [
        {
          "text": "This was mostly new information (Beginner)",
          "nextBlockId": "pain_point_marketing"
        }
      ]
    },
    "experience_advanced": {
      "id": "experience_advanced",
      "message": "Based on the guide you just saw, where would you place your current skill level?\\n\\nAnswer by pasting one of those numbers",
      "options": [
        {
          "text": "I knew most of this (Advanced)",
          "nextBlockId": "pain_point_operations"
        }
      ]
    },
    "pain_point_marketing": {
      "id": "pain_point_marketing",
      "message": "For beginners, what feels like the biggest hurdle for you right now?\\n\\nAnswer by pasting one of those numbers",
      "options": [
        {
          "text": "Getting customers and marketing",
          "nextBlockId": "offer_ds_course"
        }
      ]
    },
    "pain_point_operations": {
      "id": "pain_point_operations",
      "message": "For advanced users, what's your main challenge?\\n\\nAnswer by pasting one of those numbers",
      "options": [
        {
          "text": "Scaling operations efficiently",
          "nextBlockId": "offer_smma_tool"
        }
      ]
    },
    "offer_ds_course": {
      "id": "offer_ds_course",
      "message": "That makes perfect sense. Getting customers is the #1 challenge for beginners.\\n\\nBased on everything you've told me, the clear next step is our \\"Complete Dropshipping Course\\".\\n\\nYou can get instant access here:\\nhttps://example.com/ds-course",
      "resourceName": "Complete Dropshipping Course",
      "options": []
    },
    "offer_smma_tool": {
      "id": "offer_smma_tool",
      "message": "Scaling operations is exactly what separates successful agencies from struggling ones.\\n\\nBased on everything you've told me, the clear next step is our \\"SMMA Operations Tool\\".\\n\\nYou can get instant access here:\\nhttps://example.com/smma-tool",
      "resourceName": "SMMA Operations Tool",
      "options": []
    }
  }
}
\`\`\`
`;

			// Use the official SDK to generate content
			const response = await genAI.models.generateContent({
				model: "gemini-2.5-flash-preview-05-20",
				contents: repairPrompt,
			});

			let repairedText = response.text;
			if (repairedText) {
				if (repairedText.startsWith("```json")) {
					repairedText = repairedText
						.substring(7, repairedText.length - 3)
						.trim();
				}
				// Attempt to parse the repaired JSON to see if it's valid
				const repairedJson = JSON.parse(repairedText);

				// Validate and auto-fix the repaired funnel (if resources are available)
				// Note: We don't have resources in repair context, so just return as-is
				return repairedJson; // Success!
			}
		} catch (error) {
			lastError = handleSDKError(error);
		}
	}
	throw lastError; // All repair attempts failed
};

/**
 * Validates and automatically fixes funnel JSON to ensure all offer blocks have correct resourceName fields
 * @param generatedJson - The JSON generated by AI
 * @param resources - Array of resources to validate against
 * @returns The validated and fixed JSON
 */
const validateAndFixFunnel = (
	generatedJson: FunnelFlow,
	resources: Resource[],
): FunnelFlow => {
	// Find all blocks that should have resourceName (VALUE_DELIVERY and OFFER blocks)
	const blocksWithResources = Object.values(generatedJson.blocks).filter(
		(block) => {
			// Check if block is in VALUE_DELIVERY or OFFER stage
			const isValueDelivery = generatedJson.stages.some(
				(stage) =>
					stage.name === "VALUE_DELIVERY" && stage.blockIds.includes(block.id),
			);
			const isOffer = generatedJson.stages.some(
				(stage) => stage.name === "OFFER" && stage.blockIds.includes(block.id),
			);
			return isValueDelivery || isOffer;
		},
	);

	let fixesApplied = 0;

	for (const block of blocksWithResources) {
		const blockId = block.id;
		let needsFix = false;

		// Check if resourceName field is missing
		if (!block.resourceName) {
			needsFix = true;
		} else {
			// Check if resourceName matches an actual resource
			const matchingResource = resources.find(
				(r) => r.name === block.resourceName,
			);
			if (!matchingResource) {
				needsFix = true;
			}
		}

		// Auto-fix: Find the best matching resource based on message content
		if (needsFix) {
			let bestMatch: Resource | null = null;

			// Try to find by name in the message content first
			if (block.message) {
				const message = block.message.toLowerCase();
				bestMatch =
					resources.find((r) => message.includes(r.name.toLowerCase())) || null;
			}

			// Don't use fallback - if no match found, leave as-is to avoid duplicates

			if (bestMatch) {
				block.resourceName = bestMatch.name;
				fixesApplied++;
			}
		}
	}

	return generatedJson;
};

/**
 * Generates a funnel flow using AI based on provided resources
 * @param resources - Array of resources to include in the funnel
 * @returns Promise with the generated funnel flow
 */
export const generateFunnelFlow = async (
	resources: Resource[],
): Promise<FunnelFlow> => {
	const resourceList = resources
		.map((r) => {
			const categoryLabel =
				r.category === "PAID_PRODUCT" ? "Paid Product" : "Free Value";
			let details = `${r.name} (ID: ${r.id}, Category: ${categoryLabel}, Type: ${r.type})`;
			if (r.code) {
				details += ` [Promo Code: ${r.code}]`;
			}
			return `- ${details}`;
		})
		.join("\n");

	const prompt =
		mainPromptPart1 +
		`
`;

	let textToProcess = "";
	try {
		// Validate environment before making API calls
		validateEnvironment();

		// Initialize the Google Gen AI SDK
		const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

		// Use the official SDK to generate content
		const response = await genAI.models.generateContent({
			model: "gemini-2.5-flash-preview-05-20",
			contents: prompt,
		});

		textToProcess = response.text || "";

		if (!textToProcess || textToProcess.trim() === "") {
			throw new Error("API responded with empty content.");
		}

		if (textToProcess.startsWith("```json")) {
			textToProcess = textToProcess
				.substring(7, textToProcess.length - 3)
				.trim();
		}

		const generatedJson = JSON.parse(textToProcess);

		// Validate and auto-fix the generated funnel
		const validatedJson = validateAndFixFunnel(generatedJson, resources);
		return validatedJson;
	} catch (error) {
		const aiError = handleSDKError(error);
		console.error(
			"Funnel generation failed on first attempt. Reason:",
			aiError.message,
		);

		if (textToProcess) {
			try {
				const repairedJson = await repairFunnelJson(textToProcess);
				return repairedJson;
			} catch (repairError) {
				console.error(
					"Failed to repair JSON after multiple attempts:",
					repairError,
				);
				throw new AIError(
					"The AI returned an invalid response that could not be repaired. Please try generating again.",
					"CONTENT",
				);
			}
		} else {
			throw aiError; // Re-throw the categorized error
		}
	}
};
