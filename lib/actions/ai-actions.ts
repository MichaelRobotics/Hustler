/**
 * AI Actions - Gemini AI Integration
 *
 * Contains all AI generation functionality for funnel creation and JSON repair.
 * Uses the official @google/genai SDK.
 */

import { GoogleGenAI } from "@google/genai";
import { FunnelFlow, FunnelStage, FunnelBlock, FunnelBlockOption } from "@/lib/types/funnel";
import { Resource } from "@/lib/types/resource";



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
Fix this invalid JSON to match the required two-part funnel structure. Return only the corrected JSON.

Invalid JSON:
${badJson}

**CRITICAL RULES:**
- FUNNEL_1: TRANSITION (webhook triggered, sends chat link)
- FUNNEL_2: WELCOME → VALUE_DELIVERY → EXPERIENCE_QUALIFICATION → PAIN_POINT_QUALIFICATION → OFFER
- VALUE_DELIVERY: ONLY "FREE_VALUE" resources
- OFFER: ONLY "PAID" resources
- ALL messages max 5 lines (except OFFER messages)
- OFFER messages max 8 lines with proper paragraph spacing
- OFFER: 3-part structure (Value Stack + FOMO + CTA)
- TRANSITION: Simple message with chat link, NO 3-part structure
- Each VALUE_DELIVERY block MUST have "resourceName" field with exact resource name from category FREE_VALUE
- Each OFFER block MUST have "resourceName" field with exact resource name from category PAID
- resourceName must match exactly from provided list

**CORRECT JSON STRUCTURE:**
\`\`\`json
{
  "startBlockId": "transition_1",
  "stages": [
    {
      "id": "stage-transition",
      "name": "TRANSITION",
      "explanation": "DM in whop native chat with link to this conversation.",
      "blockIds": ["transition_1"]
    },
    {
      "id": "stage-welcome",
      "name": "WELCOME",
      "explanation": "Friendly greeting to help customer choose interests.",
      "blockIds": ["welcome_1"]
    },
    {
      "id": "stage-value-delivery",
      "name": "VALUE_DELIVERY",
      "explanation": "Give customer free helpful content.",
      "blockIds": ["value_trading_guide"]
    },
    {
      "id": "stage-experience",
      "name": "EXPERIENCE_QUALIFICATION",
      "explanation": "Ask about customer's experience level.",
      "blockIds": ["experience_qual_1"]
    },
    {
      "id": "stage-pain-point",
      "name": "PAIN_POINT_QUALIFICATION",
      "explanation": "Find out customer's main problems.",
      "blockIds": ["pain_point_1"]
    },
    {
      "id": "stage-offer",
      "name": "OFFER",
      "explanation": "Show products that solve problems.",
      "blockIds": ["offer_risk_management"]
    }
  ],
  "blocks": {
    "transition_1": {
      "id": "transition_1",
      "message": "Wait! [WHOP_OWNER] has a gift for you, [USER]!\\n\\nJoin [WHOP_OWNER] VIP chat to hand-pick your best-fit products together!\\n\\n[WHOP_OWNER] is waiting!",
      "options": [{"text": "Continue to Strategy Session", "nextBlockId": "welcome_1"}]
    },
    "welcome_1": {
      "id": "welcome_1",
      "message": "[USER], check [WHOP] BEST quick-money paths!",
      "options": [
        {"text": "Trading & Investing", "nextBlockId": "value_trading_guide"},
        {"text": "Just exploring for now", "nextBlockId": "value_crypto_basics"}
      ]
    },
    "value_trading_guide": {
      "id": "value_trading_guide",
      "message": "Charts help you spot profitable trades.\\n\\nWARNING! [USER], This is just an appetizer.\\n\\nFor PRO users, UNLOCK hidden offers.",
      "resourceName": "The 3 Core Principles of Crypto Charting",
      "options": [{"text": "unlock", "nextBlockId": "experience_qual_1"}]
    },
    "value_crypto_basics": {
      "id": "value_crypto_basics",
      "message": "Basics help you avoid costly mistakes.\\n\\nWARNING! [USER], This is just an appetizer.\\n\\nFor PRO users, UNLOCK hidden offers.",
      "resourceName": "Crypto Basics Guide",
      "options": [{"text": "unlock", "nextBlockId": "experience_qual_1"}]
    },
    "experience_qual_1": {
      "id": "experience_qual_1",
      "message": "Welcome, @[Username]! Glad you made it. Let's get started.\\n\\nBased on what you've seen so far, where would you place your current skill level?\\n\\n",
      "options": [{"text": "This was mostly new information (Beginner)", "nextBlockId": "pain_point_1"}]
    },
    "pain_point_1": {
      "id": "pain_point_1",
      "message": "Got it. That's the perfect place to start.\\n\\nFor beginners, what feels like the biggest hurdle for you right now?",
      "options": [{"text": "Managing the risk of losing money.", "nextBlockId": "offer_risk_management"}]
    },
    "offer_risk_management": {
      "id": "offer_risk_management",
      "message": "That makes perfect sense. Managing risk is the #1 skill that separates successful traders from gamblers.\\n\\nBased on everything you've told me, the clear next step is our \\"Crypto Risk Management\\" video workshop.\\n\\nYou can get instant access below.",
      "resourceName": "Crypto Risk Management Workshop",
      "options": []
    }
  }
}
\`\`\`
`;

		// Use the official SDK to generate content
		const response = await genAI.models.generateContent({
			model: "gemini-2.5-flash",
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

				// Calculate available offers for each block
				const jsonWithOffers = calculateAvailableOffers(repairedJson);

				// Validate and auto-fix the repaired funnel (if resources are available)
				// Note: We don't have resources in repair context, so just return as-is
				return jsonWithOffers; // Success!
			}
		} catch (error) {
			lastError = handleSDKError(error);
		}
	}
	throw lastError; // All repair attempts failed
};

/**
 * Calculates available offers for each block by traversing the funnel flow
 * @param generatedJson - The JSON generated by AI
 * @returns The JSON with availableOffers populated for each block
 */
const calculateAvailableOffers = (generatedJson: FunnelFlow): FunnelFlow => {
	// Find all OFFER stage blocks
	const offerStage = generatedJson.stages.find(stage => stage.name === "OFFER");
	if (!offerStage) {
		console.warn("No OFFER stage found in funnel");
		return generatedJson;
	}

	// Get all offer block resource names
	const offerResourceNames = offerStage.blockIds
		.map(blockId => generatedJson.blocks[blockId])
		.filter(block => block.resourceName)
		.map(block => block.resourceName!);

	console.log(`Found ${offerResourceNames.length} offer resources:`, offerResourceNames);

	// Function to recursively find all reachable offer blocks from a given block
	const findReachableOffers = (blockId: string, visited = new Set<string>()): string[] => {
		if (visited.has(blockId)) return []; // Prevent infinite loops
		visited.add(blockId);

		const block = generatedJson.blocks[blockId];
		if (!block) return [];

		// If this block is an offer block, return its resource name
		if (offerStage.blockIds.includes(blockId) && block.resourceName) {
			return [block.resourceName];
		}

		// Recursively check all options from this block
		const reachableOffers: string[] = [];
		for (const option of block.options) {
			if (option.nextBlockId) {
				const childOffers = findReachableOffers(option.nextBlockId, new Set(visited));
				reachableOffers.push(...childOffers);
			}
		}

		return [...new Set(reachableOffers)]; // Remove duplicates
	};

	// Calculate available offers for each block
	Object.keys(generatedJson.blocks).forEach(blockId => {
		const block = generatedJson.blocks[blockId];
		const availableOffers = findReachableOffers(blockId);
		
		// Only add the field if there are offers available
		if (availableOffers.length > 0) {
			block.availableOffers = availableOffers;
		}
	});

	console.log("Available offers calculated for all blocks");
	return generatedJson;
};

/**
 * Validates and automatically fixes funnel JSON to ensure correct category-based resource placement
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

		// Determine the expected category based on stage
		const isValueDelivery = generatedJson.stages.some(
			(stage) =>
				stage.name === "VALUE_DELIVERY" && stage.blockIds.includes(block.id),
		);
		const isOffer = generatedJson.stages.some(
			(stage) => stage.name === "OFFER" && stage.blockIds.includes(block.id),
		);
		
		const expectedCategory = isValueDelivery ? "FREE_VALUE" : "PAID";

		// Check if resourceName field is missing
		if (!block.resourceName) {
			needsFix = true;
		} else {
			// Check if resourceName matches an actual resource with correct category
			const matchingResource = resources.find(
				(r) => r.name === block.resourceName && r.category === expectedCategory,
			);
			if (!matchingResource) {
				needsFix = true;
			}
		}

		// Auto-fix: Find the best matching resource based on category and message content
		if (needsFix) {
			let bestMatch: Resource | null = null;

			// First, try to find by name in the message content with correct category
			if (block.message) {
				const message = block.message.toLowerCase();
				bestMatch = resources.find(
					(r) => 
						r.category === expectedCategory && 
						message.includes(r.name.toLowerCase())
				) || null;
			}

			// CRITICAL: Only use exact name matches, never fall back to "any resource"
			// This prevents using wrong resources that happen to have the right category
			if (!bestMatch) {
				console.warn(`No matching resource found for block ${blockId} with category ${expectedCategory}`);
				// Don't assign any resource - let the validation fail
				// This ensures we don't use wrong resources
			}

			if (bestMatch) {
				block.resourceName = bestMatch.name;
				fixesApplied++;
			} else {
				// Log the issue for debugging
				console.error(`Failed to find valid resource for block ${blockId}. Expected category: ${expectedCategory}, Available resources: ${resources.map(r => `${r.name}(${r.category})`).join(', ')}`);
			}
		}
	}

	return generatedJson;
};

/**
 * Validates that the generated funnel only uses provided resources with exceptions for converted resources
 * @param generatedJson - The generated funnel JSON
 * @param originalResources - Array of original resources for validation
 * @param processedResources - Array of processed resources to identify converted ones
 * @throws {ValidationError} If funnel uses non-existing resources
 */
const validateGeneratedFunnelResourcesWithExceptions = (
	generatedJson: FunnelFlow, 
	originalResources: Resource[], 
	processedResources: Resource[]
): void => {
	const validResourceNames = new Set(originalResources.map(r => r.name));
	const validResourceIds = new Set(originalResources.map(r => r.id));
	
	// Identify resources that had their category changed for AI display
	const convertedResources = new Set<string>();
	processedResources.forEach(processed => {
		const original = originalResources.find(r => r.id === processed.id);
		if (original && original.category !== processed.category) {
			convertedResources.add(processed.name);
		}
	});
	
	// Check all blocks that have resourceName fields
	Object.values(generatedJson.blocks).forEach(block => {
		if (block.resourceName) {
			// Check if the resourceName exists in our valid resources
			if (!validResourceNames.has(block.resourceName)) {
				throw new ValidationError(
					`Generated funnel uses non-existing resource: "${block.resourceName}". Valid resources: ${Array.from(validResourceNames).join(', ')}`
				);
			}
			
			// Find the corresponding resource to validate category placement
			const correspondingResource = originalResources.find(r => r.name === block.resourceName);
			if (correspondingResource) {
				// Skip category validation for resources that were converted for AI display
				if (convertedResources.has(block.resourceName)) {
					console.log(`⚠️ Skipping category validation for converted resource: "${block.resourceName}"`);
					return; // Skip category validation for this resource
				}
				
				// Check if the block is in the correct stage based on resource category
				const isValueDelivery = generatedJson.stages.some(
					stage => stage.name === "VALUE_DELIVERY" && stage.blockIds.includes(block.id)
				);
				const isOffer = generatedJson.stages.some(
					stage => stage.name === "OFFER" && stage.blockIds.includes(block.id)
				);
				
				if (correspondingResource.category === "FREE_VALUE" && !isValueDelivery) {
					throw new ValidationError(
						`FREE_VALUE resource "${block.resourceName}" is incorrectly placed in ${isOffer ? 'OFFER' : 'other'} stage instead of VALUE_DELIVERY`
					);
				}
				
				if (correspondingResource.category === "PAID" && !isOffer) {
					throw new ValidationError(
						`PAID resource "${block.resourceName}" is incorrectly placed in ${isValueDelivery ? 'VALUE_DELIVERY' : 'other'} stage instead of OFFER`
					);
				}
			}
		}
	});
	
	// Ensure all provided resources are used in the funnel
	const usedResourceNames = new Set(
		Object.values(generatedJson.blocks)
			.filter(block => block.resourceName)
			.map(block => block.resourceName!)
	);
	
	const unusedResources = originalResources.filter(r => !usedResourceNames.has(r.name));
	if (unusedResources.length > 0) {
		console.warn(`⚠️ Some resources were not used in the funnel: ${unusedResources.map(r => r.name).join(', ')}`);
	}
};

/**
 * Validates that the generated funnel only uses provided resources
 * @param generatedJson - The generated funnel JSON
 * @param resources - Array of valid resources
 * @throws {ValidationError} If funnel uses non-existing resources
 */
const validateGeneratedFunnelResources = (generatedJson: FunnelFlow, resources: Resource[]): void => {
	const validResourceNames = new Set(resources.map(r => r.name));
	const validResourceIds = new Set(resources.map(r => r.id));
	
	// Check all blocks that have resourceName fields
	Object.values(generatedJson.blocks).forEach(block => {
		if (block.resourceName) {
			// Check if the resourceName exists in our valid resources
			if (!validResourceNames.has(block.resourceName)) {
				throw new ValidationError(
					`Generated funnel uses non-existing resource: "${block.resourceName}". Valid resources: ${Array.from(validResourceNames).join(', ')}`
				);
			}
			
			// Find the corresponding resource to validate category placement
			const correspondingResource = resources.find(r => r.name === block.resourceName);
			if (correspondingResource) {
				// Check if the block is in the correct stage based on resource category
				const isValueDelivery = generatedJson.stages.some(
					stage => stage.name === "VALUE_DELIVERY" && stage.blockIds.includes(block.id)
				);
				const isOffer = generatedJson.stages.some(
					stage => stage.name === "OFFER" && stage.blockIds.includes(block.id)
				);
				
				if (correspondingResource.category === "FREE_VALUE" && !isValueDelivery) {
					throw new ValidationError(
						`FREE_VALUE resource "${block.resourceName}" is incorrectly placed in ${isOffer ? 'OFFER' : 'other'} stage instead of VALUE_DELIVERY`
					);
				}
				
				if (correspondingResource.category === "PAID" && !isOffer) {
					throw new ValidationError(
						`PAID resource "${block.resourceName}" is incorrectly placed in ${isValueDelivery ? 'VALUE_DELIVERY' : 'other'} stage instead of OFFER`
					);
				}
			}
		}
	});
	
	// Ensure all provided resources are used in the funnel
	const usedResourceNames = new Set(
		Object.values(generatedJson.blocks)
			.filter(block => block.resourceName)
			.map(block => block.resourceName!)
	);
	
	const unusedResources = resources.filter(r => !usedResourceNames.has(r.name));
	if (unusedResources.length > 0) {
		console.warn(`Some resources were not used in the generated funnel: ${unusedResources.map(r => r.name).join(', ')}`);
	}
};

/**
 * Validates resources before AI generation to prevent non-existing resource usage
 * @param resources - Array of resources to validate
 * @throws {ValidationError} If resources are invalid or missing
 */
const validateResourcesForGeneration = (resources: Resource[]): void => {
	if (!resources || resources.length === 0) {
		throw new ValidationError("No resources provided for funnel generation");
	}

	// Validate each resource has required fields
	resources.forEach((resource, index) => {
		if (!resource.id || !resource.name || !resource.category) {
			throw new ValidationError(
				`Invalid resource at index ${index}: missing required fields (id, name, or category)`
			);
		}

		// Validate category is valid
		if (!["PAID", "FREE_VALUE"].includes(resource.category)) {
			throw new ValidationError(
				`Invalid resource category for "${resource.name}": ${resource.category}. Must be "PAID" or "FREE_VALUE"`
			);
		}

		// Validate type is valid
		if (!["LINK", "FILE", "WHOP"].includes(resource.type)) {
			throw new ValidationError(
				`Invalid resource type for "${resource.name}": ${resource.type}. Must be "LINK", "FILE", or "WHOP"`
			);
		}
	});

	// Check for duplicate resource names
	const resourceNames = resources.map(r => r.name);
	const uniqueNames = new Set(resourceNames);
	if (resourceNames.length !== uniqueNames.size) {
		throw new ValidationError("Duplicate resource names found. Each resource must have a unique name.");
	}

	// Ensure we have at least 3 resources and at least one FREE resource for proper funnel generation
	const freeResources = resources.filter(r => r.category === "FREE_VALUE");

	if (resources.length < 3) {
		throw new ValidationError("At least 3 resources are required for funnel generation");
	}

	if (freeResources.length === 0) {
		throw new ValidationError("At least one FREE_VALUE resource is required for funnel generation");
	}
};

/**
 * Process resources for AI based on PAID offer count
 * IMPORTANT: This function only modifies the display category for AI processing.
 * It does NOT change the actual database records - only the list sent to AI.
 * @param resources - Array of resources to process
 * @returns Processed resources with category adjustments for AI display only
 */
const processResourcesForAI = (resources: Resource[]): Resource[] => {
	const paidResources = resources.filter(r => r.category === "PAID");
	const freeResources = resources.filter(r => r.category === "FREE_VALUE");
	
	console.log(`🔍 Resource Analysis: ${paidResources.length} PAID, ${freeResources.length} FREE_VALUE`);
	
	// Check if there are 2 or more PAID offers
	if (paidResources.length >= 2) {
		console.log("✅ Sufficient PAID offers found, using resources as-is");
		return resources;
	}
	
	// If there are no PAID offers or only 1 PAID offer
	if (paidResources.length <= 1) {
		console.log(`⚠️ Insufficient PAID offers (${paidResources.length}), processing for category adjustments`);
		
		// Create a copy of resources to modify for AI processing only
		// NOTE: This does NOT change the actual database records, only the list sent to AI
		const processedResources = [...resources];
		
		if (paidResources.length === 0) {
			// No PAID offers - check for free resources
			if (freeResources.length >= 2) {
				console.log("🔄 No PAID offers found, converting first 2 FREE_VALUE resources to PAID");
				const hierarchy = ['learn', 'community', 'earn', 'other'];
				let totalConverted = 0;
				const maxToConvert = 2;
				
				for (const category of hierarchy) {
					if (totalConverted >= maxToConvert) break;
					const remainingResources = freeResources.filter(r => {
						const alreadyConverted = processedResources.find(pr => pr.id === r.id)?.category === "PAID";
						return !alreadyConverted && (r.type === "LINK" || r.type === "FILE") && r.name.toLowerCase().includes(category);
					});
					if (remainingResources.length > 0) {
						const remainingSlots = maxToConvert - totalConverted;
						const resourcesToConvert = remainingResources.slice(0, remainingSlots);
						resourcesToConvert.forEach(resource => {
							const resourceIndex = processedResources.findIndex(r => r.id === resource.id);
							if (resourceIndex !== -1) {
								processedResources[resourceIndex] = { ...processedResources[resourceIndex], category: "PAID" as const };
								totalConverted++;
							}
						});
					}
				}
				if (totalConverted < maxToConvert) {
					const remainingSlots = maxToConvert - totalConverted;
					const remainingFreeResources = freeResources.filter(r =>
						processedResources.find(pr => pr.id === r.id)?.category !== "PAID" && (r.type === "LINK" || r.type === "FILE")
					);
					remainingFreeResources.slice(0, remainingSlots).forEach(resource => {
						const resourceIndex = processedResources.findIndex(r => r.id === resource.id);
						if (resourceIndex !== -1) {
							processedResources[resourceIndex] = { ...processedResources[resourceIndex], category: "PAID" as const };
							totalConverted++;
						}
					});
				}
			} else if (freeResources.length === 1) {
				console.log("🔄 Only 1 FREE_VALUE resource found, converting to PAID");
				// Convert the single free resource to PAID
				const resourceIndex = processedResources.findIndex(r => r.id === freeResources[0].id);
				if (resourceIndex !== -1) {
					processedResources[resourceIndex] = {
						...processedResources[resourceIndex],
						category: "PAID" as const
					};
					console.log(`✅ AI Display: Converted "${freeResources[0].name}" from FREE_VALUE to PAID (for AI processing only)`);
				}
			}
		} else if (paidResources.length === 1) {
			// 1 PAID offer - search for only 1 additional free resource
			console.log("🔄 1 PAID offer found, looking for 1 additional FREE_VALUE resource");
			
			if (freeResources.length >= 1) {
				const hierarchy = ['learn', 'community', 'earn', 'other'];
				let resourceToConvert: (typeof freeResources)[number] | null = null;
				for (const category of hierarchy) {
					const categoryResources = freeResources.filter(r =>
						(r.link || r.whopProductId) && r.name.toLowerCase().includes(category)
					);
					if (categoryResources.length > 0) {
						resourceToConvert = categoryResources[0];
						break;
					}
				}
				if (!resourceToConvert) resourceToConvert = freeResources[0];
					
				if (resourceToConvert) {
					const resourceIndex = processedResources.findIndex(r => r.id === resourceToConvert.id);
					if (resourceIndex !== -1) {
						processedResources[resourceIndex] = {
							...processedResources[resourceIndex],
							category: "PAID" as const
						};
						console.log(`✅ AI Display: Converted "${resourceToConvert.name}" from FREE_VALUE to PAID (for AI processing only)`);
					}
				}
			} else {
				console.log("⚠️ No FREE_VALUE resources found to convert");
			}
		}
		
		return processedResources;
	}
	
	return resources;
};

/**
 * Generates a funnel flow using AI based on provided resources
 * @param resources - Array of resources to include in the funnel
 * @returns Promise with the generated funnel flow
 */
export const generateFunnelFlow = async (
	resources: Resource[],
	maxTries = 3,
): Promise<FunnelFlow> => {
	// CRITICAL: Validate resources before AI generation
	validateResourcesForGeneration(resources);
	
	let lastError: Error | null = null;
	
	for (let attempt = 1; attempt <= maxTries; attempt++) {
		try {
			console.log(`Funnel generation attempt ${attempt}/${maxTries}`);
			
			// Process resources based on PAID offer count
			const processedResources = processResourcesForAI(resources);
			
			const resourceList = processedResources
				.map((r) => {
					const categoryLabel = r.category; // Use exact category: "PAID" or "FREE_VALUE"
					let details = `${r.name} (name: ${r.name}, ID: ${r.id}, Category: ${categoryLabel}, Type: ${r.type})`;
				if (r.promoCode) {
					details += ` [Promo Code: ${r.promoCode}]`;
					}
					return `- ${details}`;
				})
				.join("\n");

	const prompt =`
	You are an expert marketing funnel strategist. Your task is to create a branching chatbot conversation flow in a hierarchical JSON format. This flow represents a **complete, two-part funnel system** that transitions a user from a public chat to a private, personalized session.
	
	**🚨 CRITICAL MESSAGE LENGTH RULE 🚨**
	**EVERY MESSAGE MUST BE 5 LINES OR FEWER**
	**COUNT EVERY LINE INCLUDING EMPTY LINES**
	**VIOLATION = REJECTION**
	
	**🚨 CRITICAL RESOURCE VALIDATION RULE 🚨**
	**YOU MUST ONLY USE THESE EXACT RESOURCE NAMES:**
	${processedResources.map(r => `- "${r.name}" (${r.category})`).join('\n')}
	**🚨 ZERO TOLERANCE FOR IMAGINARY RESOURCES 🚨**
	**FORBIDDEN: Do not create, modify, or imagine any resource names not in this list**
	**FORBIDDEN: Do not use abbreviations, variations, or similar names**
	**FORBIDDEN: Do not create placeholder resource names**
	**CRITICAL: Every resourceName field MUST match EXACTLY one of the names above**
	**VIOLATION = IMMEDIATE REJECTION**
	
	**CRITICAL INSTRUCTION**: You MUST create separate blocks for each resource based on their category:
	- Each resource with category "FREE_VALUE" gets its own VALUE_DELIVERY block
	- Each resource with category "PAID" gets its own OFFER block
	- Do NOT put all resources in the same stage or block
	
	---
	### CORE CONCEPTS
	
	1.  **FUNNEL PARTS**: The entire flow is divided into two parts: \`FUNNEL_1_WELCOME_GATE\` and \`FUNNEL_2_STRATEGY_SESSION\`.
	2.  **STAGES**: Each funnel part has its own vertical steps (e.g., WELCOME, QUALIFICATION, OFFER).
	3.  **ITEMS (BLOCKS)**: These are the individual chat messages within a Stage.
	
	---
	### TONE & STYLE
	
	1.  **Overall Tone**: Be helpful, encouraging, and authoritative. You are an expert guide.
	2.  **Funnel 1 (Welcome Gate)**: The tone should be welcoming, friendly, and low-pressure. The goal is to build rapport and deliver value quickly. Use emojis to enhance friendliness.
	3.  **Funnel 2 (Strategy Session)**: The tone should shift to be more professional and consultative. You are now in a "private session" to solve a specific problem.
	4.  **Offer Messages**: When presenting a Paid Product, the tone should be confident and value-driven. Create a sense of opportunity and a clear, encouraging call to action. 
	
	---
	### ITEM MESSAGE CONSTRUCTION
	
	**1. FOR ITEMS WITH CHOICES (in \`FUNNEL_1_WELCOME_GATE\`):**
	The 'message' string MUST be exactly this format:
	- **Line 1**: "[USER], check [WHOP] BEST quick-money paths!" (1 line only).

	*CRITICAL: WELCOME message must be EXACTLY:*
	"**Line 1**: [USER], check [WHOP] BEST quick-money paths!"
	
	**NO VARIATIONS ALLOWED**: Do not modify this message format in any way.
	
	**IMPORTANT**: Do NOT include the numbered options in the message text. The options are defined in the 'options' array.
	
	**2. FOR ITEMS WITH CHOICES (in \`FUNNEL_2_STRATEGY_SESSION\`):**
	The 'message' string for qualification stages (\`EXPERIENCE_QUALIFICATION\`, \`PAIN_POINT_QUALIFICATION\`) should be direct and concise. It must be structured exactly like this:
	- **Line 1**: A direct question as the headline.

	
	**EXPERIENCE_QUALIFICATION SPECIFIC RULES:**
	- Be engaging and specific about what you're assessing
	- Reference the topic/domain clearly (e.g., "with sales", "in trading", "with marketing")
	- Use phrases like "Now let's assess your current level with [topic]" or "Let's see where you stand with [topic]"
	- Ask for honest self-assessment: "Where would you honestly place yourself right now?"
	- Avoid generic phrases like "what's your current experience level"
	
	**CRITICAL**: This message format must NOT include the "Answer by..." instruction line.
	
	*Example Message for Funnel 2:*
	"Now let's assess your current level with this topic.
	
	Where would you honestly place yourself right now?"
	
	**3. FOR ITEMS IN \`FUNNEL_1\`'s 'VALUE_DELIVERY' STAGE:**
	The message must focus on how it will help the user make money faster and include the VIP chat invitation.
	*Structure:* 
	**CRITICAL: VALUE_DELIVERY message must follow this EXACT structure:*
	"**Line 1**: [5-7 words how this will help user make quick money].
	**Line 2**: Empty line
	**Line 3**: WARNING! [USER], This is just an appetizer.
	**Line 4**: Empty line
	**Line 5**: For PRO users, UNLOCK hidden offers.
	**Line 6**: Empty line
	**Line 7**: (A button with the resource link is added automatically at the end—do not put links in the message.)"
	
	**CRITICAL BLOCK RULE**: The block for this stage MUST have exactly one option in its 'options' array, with the text 'unlock' (or similar), which points its 'nextBlockId' to the 'TRANSITION' stage.
	**CRITICAL RESOURCE RULE**: ONLY use resources with category "FREE_VALUE" in VALUE_DELIVERY blocks.
	
	**4. FOR ITEMS IN \`FUNNEL_1\`'s 'TRANSITION' STAGE:**

   TRANSITION message must be EXACTLY:

	"**Line 1**: Wait! [WHOP_OWNER] has a gift for you, [USER]!
	**Line 2**: Empty line
	**Line 3**: Join [WHOP_OWNER] VIP chat to hand-pick your best-fit products together!
	**Line 4**: Empty line
	**Line 5**: [WHOP_OWNER] is waiting!
	**Line 6**: Empty line
	**Line 7**: (A button with the app link is added automatically at the end—do not put links in the message.)"

	
	
	**NO VARIATIONS ALLOWED**: Do not modify this message format in any way.
	- **FORBIDDEN**: Do NOT use the 3-part OFFER structure (Value Stack + FOMO + CTA)
	- **FORBIDDEN**: Do NOT use "The Observer" vs "The Action Taker" contrast
	- **FORBIDDEN**: Do NOT use "Our Service Isn't For Everyone" or similar exclusivity language
	- **FORBIDDEN**: Do NOT add congratulatory messages or explanations
	- **FORBIDDEN**: Do NOT add any text beyond the exact format above
	
	**CRITICAL BLOCK RULE**: The block for this stage MUST have options that connect to the corresponding EXPERIENCE_QUALIFICATION blocks in Funnel 2. These options should have generic connector text like "Continue" or "Start Session" - they are system connectors only and will not be displayed as user choices in the preview chat.
	
	**5. FOR ITEMS WITH AN OFFER (in \`FUNNEL_2\`'s 'OFFER' stage):**
	The 'message' string must be a compelling sales message for ONE specific resource with category "PAID".
	- **Opening**: A congratulatory message.
	- **Resource Details**: Include the resource name and link.
	- **Closing**: An encouraging call to action.
	**CRITICAL RESOURCE RULE**: ONLY use resources with category "PAID" in OFFER blocks.
	
	**6. MESSAGE LENGTH RULES (CRITICAL - STRICTLY ENFORCED):**
	- **TRANSITION messages** must be **6 lines or fewer** and include chat link
	- **WELCOME messages** must be **1 line only** and MUST be exactly: "[USER], check [WHOP] BEST quick-money paths!"
	- **VALUE_DELIVERY messages** must be **6 lines or fewer** (not counting empty lines) to accommodate structure with [WHOP_OWNER] and [USER] placeholders
	- **All other message types** (EXPERIENCE_QUALIFICATION, PAIN_POINT_QUALIFICATION) must be **5 lines or fewer**
	- **OFFER messages** can be **8 lines or fewer** to accommodate proper paragraph spacing
	- **VIOLATION WILL RESULT IN REJECTION**: Any message over its limit will be rejected
	- **WELCOME MESSAGE ENFORCEMENT**: WELCOME messages must be EXACTLY "[USER], check [WHOP] BEST quick-money paths!" - NO VARIATIONS ALLOWED
	- Keep messages concise and impactful
	- Use line breaks strategically for readability
	- **COUNT EVERY LINE**: Empty lines count as lines
	- **MOBILE FORMATTING**: Add empty lines between paragraphs to prevent cluttering on mobile (but stay within line limits)
	- **NO [LINK] IN MESSAGES**: Do not use [LINK] or any link placeholder in message text. The product link is resolved from the card's selected resource; a button is appended at the end automatically (OFFER/VALUE_DELIVERY = product link, TRANSITION = app link). User clicks the button to open the link in a new window.
	
	**7. OFFER MESSAGE DESIGN (CRITICAL FOR PAID PRODUCTS):**
	Each OFFER message must follow this exact 3-part structure:
	
	**🚨 CRITICAL OFFER LINE LIMIT 🚨**
	**OFFER messages MUST NOT exceed 8 lines total**
	**ALL formatting rules (paragraph spacing, mobile formatting, etc.) must stay within this 8-line limit**
	**VIOLATION = REJECTION**
	
	**Part 1: Value Stack (2-3 lines)**
	- Present ONE key benefit/outcome
	- Keep it specific and compelling
	- Bridge to contrast: "But here's the thing..." or "However..."
	
	**Part 2: FOMO + Belonging (2-3 lines)**
	- Create urgency: "There are two types of people:"
	- Contrast: "The Observer" vs "The Action Taker"
	- Make them choose: "Which one will you be?"
	
	**Part 3: Call to Action (2 lines)**
	- Time-sensitive urgency: "If you start now..." vs "If you wait..."
	- Strong CTA: "Seize Your Advantage Now"
	- **LINK RULE**: Do not put [LINK] or links in the message; a button is added automatically at the end
	
	**Example Structure (6-LINE OFFER MESSAGE):**
	"You're ready to transform your sales game! But here's the thing...

	There are two types of people: The Observer watches others succeed. The Action Taker seizes opportunity.

	Which one will you be?

	(A button with the product link is added automatically at the end.)"
	
	---
	
	### FUNNEL GENERATION RULES
	
	1.  **OVERALL GOAL**: Generate a single JSON object that contains the structures for **BOTH** \`FUNNEL_1_TRANSITION_GATE\` and \`FUNNEL_2_USERCHAT_STRATEGY_SESSION\`. The output must be one single, valid JSON object with the standard FunnelFlow structure: \`startBlockId\`, \`stages\`, and \`blocks\`. Both funnels will be combined into this single structure for JSON formatting purposes, but they remain logically separate.
	
	2.  **RESOURCES**: You will be provided with a list of resources, categorized as 'Free Value' or 'Paid Product'.
		 \ ${resourceList}
	
		 **CRITICAL: You MUST preserve the exact resource IDs provided above.**
		 **CRITICAL RESOURCE MAPPING RULES:**
		 - ONE resource = ONE corresponding block (exact 1:1 mapping)
		 - Use EXACT resource names from the list above - NO variations or imaginary products
		 - **CRITICAL**: FREE_VALUE resources → VALUE_DELIVERY blocks ONLY (leads to EXPERIENCE_QUALIFICATION)
		 - **CRITICAL**: PAID resources → OFFER blocks ONLY
		 - **FORBIDDEN**: PAID resources CANNOT be in VALUE_DELIVERY blocks
		 - **FORBIDDEN**: FREE_VALUE resources CANNOT be in OFFER blocks
		 
		 **MANDATORY BLOCK CREATION:**
		 - Create ONE VALUE_DELIVERY block for EACH resource with category "FREE_VALUE"
		 - Create ONE OFFER block for EACH resource with category "PAID"
		 - Each VALUE_DELIVERY block must connect to a corresponding EXPERIENCE_QUALIFICATION block
		 - Each block must have its own unique ID and resourceName field
		 - Do NOT mix resources in the same block
		 - **NO PLACEHOLDERS**: ALL blocks must reference actual products from the provided resource list
	
	3.  **FUNNEL 1: "TRANSITION GATE" STRUCTURE (WEBHOOK TRIGGERED)**
		 * **Goal**: Send initial transition message with chat link, no DM funnel.
		 * **Stages**: TRANSITION (webhook triggered, sends chat link)

	4.  **FUNNEL 2: "STRATEGY SESSION" STRUCTURE (INTERNAL CHAT)**
		 * **Goal**: Qualify user and present targeted paid resources in chat.
		 * **Stages**: WELCOME → VALUE_DELIVERY → EXPERIENCE_QUALIFICATION → PAIN_POINT_QUALIFICATION → OFFER

	5.  **BRANCHING LOGIC - VALUE_DELIVERY TO EXPERIENCE_QUALIFICATION CONNECTIONS**:
		 * **CRITICAL**: Each VALUE_DELIVERY block must have its own corresponding EXPERIENCE_QUALIFICATION block.
		 * **VALUE_DELIVERY Stage**: Should have multiple blocks, each linking to a specific EXPERIENCE_QUALIFICATION block.
		 * **Connection Pattern**: 
			- VALUE_DELIVERY block A → EXPERIENCE_QUALIFICATION block A → PAIN_POINT_QUALIFICATION block A → OFFER block A
			- VALUE_DELIVERY block B → EXPERIENCE_QUALIFICATION block B → PAIN_POINT_QUALIFICATION block B → OFFER block B
		 * **Personalization**: Each EXPERIENCE_QUALIFICATION block should reference the specific free value the user consumed in their VALUE_DELIVERY path.
		 * **Example**: If user chose "Trading" in VALUE_DELIVERY, their EXPERIENCE_QUALIFICATION block should ask about their trading experience level.
	
	6.  **MESSAGE CONSTRUCTION**: Follow the specific formatting rules for each message type (choices, offers, value delivery, etc.) as defined in previous instructions.

	7.  **FLOW STRUCTURE REQUIREMENTS**:
		 * **TRANSITION Stage**: Must be the first stage (startBlockId points to TRANSITION block)
		 * **WELCOME Stage**: Second stage in chat, provides options to users
		 * **VALUE_DELIVERY Stage**: Third stage, delivers free value and connects to EXPERIENCE_QUALIFICATION
		 * **EXPERIENCE_QUALIFICATION Stage**: Fourth stage, qualifies user based on VALUE_DELIVERY choice
		 * **PAIN_POINT_QUALIFICATION Stage**: Fifth stage, identifies user pain points
		 * **OFFER Stage**: Final stage, presents paid products
		 * **CRITICAL**: Each VALUE_DELIVERY block must have a direct connection to its corresponding EXPERIENCE_QUALIFICATION block
		 * **CRITICAL**: The startBlockId must point to a TRANSITION block, not WELCOME
	
	8.  **\`resourceName\` FIELD (CRITICAL - EXACT MATCHING)**:
		 - **EXACT MATCH**: resourceName must be EXACTLY the same as the resource name from the list above
		 - **NO VARIATIONS**: No abbreviations, modifications, or imaginary products allowed
		 - **ONE PER BLOCK**: Each resourceName appears in exactly ONE block (no duplicates)
	
	9.  **RESOURCE ID FORMAT (SECONDARY)**:
		 - Each offer block in \`FUNNEL_2\`'s OFFER stage should have an ID generated from the first two words of the \`resourceName\`.
		 - Example: If \`resourceName\` is "Beginner Dropshipping Course", the offer block ID should be "beginner_dropshipping".
	
	10. **ONE RESOURCE PER OFFER (CRITICAL)**:
		 - Each offer block in Funnel 2 must represent exactly ONE resource with category "PAID".
		 - Never mix multiple resources in a single offer block.
	
	11. **ESCAPE HATCH (CRITICAL RULE)**: The very first block in \`FUNNEL_2\`'s 'WELCOME' stage **MUST** include an option like 'Just exploring for now.' that points to a FREE_VALUE resource from the provided resource list. This option should have a \`nextBlockId\` pointing to a VALUE_DELIVERY block with a free resource that provides general value to anyone exploring.
	
	**CRITICAL**: The escape hatch MUST use an existing FREE_VALUE resource from the provided resource list. DO NOT create imaginary resources like "Crypto Basics Guide" or "Community Discord Access". Only use resources that actually exist in the provided resource list.
	
	**🚨 FINAL WARNING ABOUT IMAGINARY RESOURCES 🚨**
	**If you generate ANY resourceName that is not in the provided list above, the entire funnel will be REJECTED**
	**This includes:**
	- Generic names like "Free Guide", "Premium Course", "Basic Tutorial"
	- Variations of existing names like "Crypto Guide" instead of "The 3 Core Principles of Crypto Charting"
	- Placeholder names like "Resource 1", "Product A"
	- Any name not EXACTLY matching the provided list
	**ZERO TOLERANCE - IMMEDIATE REJECTION**
	
	---
	### VALIDATION
	
	**VERIFY BEFORE RETURNING:**
	- Standard FunnelFlow structure: \`startBlockId\`, \`stages\`, \`blocks\`
	- All stages included: WELCOME, VALUE_DELIVERY, TRANSITION, EXPERIENCE_QUALIFICATION, PAIN_POINT_QUALIFICATION, OFFER
	- Each VALUE_DELIVERY block has corresponding EXPERIENCE_QUALIFICATION block
	- TRANSITION blocks connect to specific EXPERIENCE_QUALIFICATION blocks
	- Every VALUE_DELIVERY/OFFER block has \`"resourceName"\` field with EXACT resource names (no variations allowed)
	- Number of VALUE_DELIVERY blocks = number of FREE resources
	- Number of OFFER blocks = number of PAID resources
	- Each \`resourceName\` appears in exactly ONE block (no duplicates)
	- ALL provided resources represented in funnel
	- First WELCOME block has escape hatch option pointing to a FREE_VALUE resource from the provided list
	- **CRITICAL**: Every resourceName exactly matches a resource name from the provided list
	- **CRITICAL**: NO imaginary products - only use provided resources
	- **CRITICAL**: Each resource has its own individual block - NO mixing
	- **CRITICAL**: FREE_VALUE resources ONLY in VALUE_DELIVERY blocks
	- **CRITICAL**: PAID resources ONLY in OFFER blocks
	- **CRITICAL**: NO placeholder blocks - ALL blocks must reference actual products
	
	---
	### CRITICAL RESOURCE MAPPING EXAMPLE
	
	**CORRECT MAPPING (DO THIS):**
	- Resource with category "FREE_VALUE": "The 3 Core Principles of Crypto Charting" → VALUE_DELIVERY Block: \`resourceName: "The 3 Core Principles of Crypto Charting"\`
	- Resource with category "FREE_VALUE": "Beginner's Trading Checklist" → VALUE_DELIVERY Block: \`resourceName: "Beginner's Trading Checklist"\`
	- Resource with category "PAID": "Crypto Risk Management Workshop" → OFFER Block: \`resourceName: "Crypto Risk Management Workshop"\`
	- Resource with category "PAID": "Advanced Options Trading Course" → OFFER Block: \`resourceName: "Advanced Options Trading Course"\`
	
	**STAGE STRUCTURE EXAMPLE:**
	- VALUE_DELIVERY stage: Contains blocks for ALL FREE_VALUE resources
	- OFFER stage: Contains blocks for ALL PAID resources
	- Each resource gets its own individual block with unique ID
	
	**WRONG MAPPING (NEVER DO THIS):**
	- Resource with category "FREE_VALUE": "The 3 Core Principles of Crypto Charting" → VALUE_DELIVERY Block: \`resourceName: "Crypto Charting Guide"\` ❌ WRONG NAME!
	- Resource with category "PAID": "Crypto Risk Management Workshop" → OFFER Block: \`resourceName: "Risk Management Course"\` ❌ WRONG NAME!
	- Creating VALUE_DELIVERY Block: \`resourceName: "Free Trading Guide"\` ❌ IMAGINARY PRODUCT!
	- Creating OFFER Block: \`resourceName: "Premium Course"\` ❌ IMAGINARY PRODUCT!
	- Resource with category "FREE_VALUE" in OFFER stage ❌ WRONG STAGE!
	- Resource with category "PAID" in VALUE_DELIVERY stage ❌ WRONG STAGE!
	- Resource with category "PAID": "Product A" → Offer Block 1: \`resourceName: "Product A"\`
	- Resource with category "PAID": "Product B" → Offer Block 2: \`resourceName: "Product A"\` ❌ DUPLICATE!
	
	### FINAL VALIDATION CHECKLIST
	
	Before generating the JSON, verify:
	1. **MESSAGE LENGTH**: WELCOME messages must be 1 line only and EXACTLY "[USER], check [WHOP] BEST quick-money paths!"; VALUE_DELIVERY messages must be 6 lines or fewer (not counting empty lines); TRANSITION, EXPERIENCE_QUALIFICATION, PAIN_POINT_QUALIFICATION messages are 5 lines or fewer; OFFER messages MUST be 8 lines or fewer (including all formatting)
	2. **WELCOME MESSAGE ENFORCEMENT**: WELCOME messages must be EXACTLY "[USER], check [WHOP] BEST quick-money paths!" - NO VARIATIONS ALLOWED
	3. **VALUE_DELIVERY STRUCTURE**: VALUE_DELIVERY messages must include [WHOP_OWNER] and [USER] placeholders in the VIP chat invitation section
	4. **EXACT NAMES**: resourceName fields match exactly with provided resource names
	5. **CATEGORY MAPPING**: FREE_VALUE resources ONLY in VALUE_DELIVERY blocks, PAID resources ONLY in OFFER blocks
	6. **NO [LINK] IN MESSAGES**: Do not use [LINK] or link placeholders. A button (product or app link) is added automatically at the end; user clicks to open in new window.
	7. **OFFER STRUCTURE**: OFFER messages follow 3-part structure (Value Stack + FOMO + CTA); button with product link is added automatically.
	8. **TRANSITION MESSAGE ENFORCEMENT**: TRANSITION messages must be EXACTLY "Wait! [WHOP_OWNER] has a gift for you, [USER]!\n\nJoin [WHOP_OWNER] VIP chat to hand-pick your best-fit products together!\n\n[WHOP_OWNER] is waiting!" (no [LINK]; a button with app link is added automatically) - NO VARIATIONS ALLOWED
	9. **NO DUPLICATES**: Each resource appears in exactly one block
	10. **NO IMAGINARY PRODUCTS**: Only use resources from the provided list
	11. **NO PLACEHOLDERS**: ALL blocks must reference actual products from the provided resource list
	
	### JSON OUTPUT STRUCTURE
	
	Generate a clean, raw JSON object. Do not wrap it in markdown. The JSON must have the standard FunnelFlow structure: \`startBlockId\`, \`stages\`, and \`blocks\`. All stages and blocks from both funnels are combined into this single structure.
	
	*Here is a detailed example of the correct, required JSON structure:*
	\`\`\`json
	{
	  "startBlockId": "transition_1",
	  "stages": [
		 {
			"id": "stage-transition",
			"name": "TRANSITION",
			"explanation": "DM in whop native chat with link to this conversation.",
			"blockIds": ["transition_1"]
		 },
		 {
			"id": "stage-welcome",
			"name": "WELCOME",
			"explanation": "Friendly greeting to help customer choose interests.",
			"blockIds": ["welcome_1"]
		 },
		 {
			"id": "stage-value-delivery",
			"name": "VALUE_DELIVERY",
			"explanation": "Give customer free helpful content.",
			"blockIds": ["value_trading_guide"]
		 },
		 {
			"id": "stage-experience",
			"name": "EXPERIENCE_QUALIFICATION",
			"explanation": "Ask about customer's experience level.",
			"blockIds": ["experience_qual_1"]
		 },
		 {
			"id": "stage-pain-point",
			"name": "PAIN_POINT_QUALIFICATION",
			"explanation": "Find out customer's main problems.",
			"blockIds": ["pain_point_1"]
		 },
		 {
			"id": "stage-offer",
			"name": "OFFER",
			"explanation": "Show products that solve problems.",
			"blockIds": ["offer_risk_management"]
		 }
	  ],
	  "blocks": {
		 "transition_1": {
			"id": "transition_1",
			"message": "Wait! [WHOP_OWNER] has a gift for you, [USER]!\\n\\nJoin [WHOP_OWNER] VIP chat to hand-pick your best-fit products together!\\n\\n[WHOP_OWNER] is waiting!",
			"options": [{"text": "Continue to Strategy Session", "nextBlockId": "welcome_1"}]
		 },
		 "welcome_1": {
			"id": "welcome_1",
			"message": "[USER], check [WHOP] BEST quick-money paths!",
			"options": [
			  {"text": "Trading & Investing", "nextBlockId": "value_trading_guide"},
			  {"text": "Just exploring for now", "nextBlockId": "value_crypto_basics"}
			]
		 },
		 // NOTE: "Just exploring for now" points to a FREE_VALUE resource from the provided list
		 // This provides general value to anyone exploring without specific interests
		 "value_trading_guide": {
			"id": "value_trading_guide",
			"message": "Charts help you spot profitable trades.\\n\\nWARNING! [USER], This is just an appetizer.\\n\\nFor PRO users, UNLOCK hidden offers.",
			"resourceName": "The 3 Core Principles of Crypto Charting",
			"options": [{"text": "unlock", "nextBlockId": "experience_qual_1"}]
		 },
		 "value_crypto_basics": {
			"id": "value_crypto_basics",
			"message": "Basics help you avoid costly mistakes.\\n\\nWARNING! [USER], This is just an appetizer.\\n\\nFor PRO users, UNLOCK hidden offers.",
			"resourceName": "[EXAMPLE - Use actual FREE_VALUE resource name from provided list]",
			"options": [{"text": "unlock", "nextBlockId": "experience_qual_1"}]
		 },
		 "experience_qual_1": {
			"id": "experience_qual_1",
			"message": "Welcome, [USER]! Glad you made it. Let's get started.\\n\\nBased on what you've seen so far, where would you place your current skill level?\\n\\n",
			"options": [{"text": "This was mostly new information (Beginner)", "nextBlockId": "pain_point_1"}]
		 },
		 "pain_point_1": {
			"id": "pain_point_1",
			"message": "Got it. That's the perfect place to start.\\n\\nFor beginners, what feels like the biggest hurdle for you right now?",
			"options": [{"text": "Managing the risk of losing money.", "nextBlockId": "offer_risk_management"}]
		 },
		 "offer_risk_management": {
			"id": "offer_risk_management",
			"message": "That makes perfect sense. Managing risk is the #1 skill that separates successful traders from gamblers.\\n\\nBased on everything you've told me, the clear next step is our \\"Crypto Risk Management\\" video workshop.\\n\\nYou can get instant access here:\\nhttps://whop.com/crypto-casey/risk-workshop",
			"resourceName": "Crypto Risk Management Workshop",
			"options": []
		 }
	  }
	}
	\`\`\`
	`;
	

			// Validate environment before making API calls
			validateEnvironment();

			// Initialize the Google Gen AI SDK
			const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

		// Use the official SDK to generate content
		const response = await genAI.models.generateContent({
			model: "gemini-2.5-flash",
			contents: prompt,
		});

			let textToProcess = response.text || "";

			if (!textToProcess || textToProcess.trim() === "") {
				throw new Error("API responded with empty content.");
			}

			if (textToProcess.startsWith("```json")) {
				textToProcess = textToProcess
					.substring(7, textToProcess.length - 3)
					.trim();
			}

			const generatedJson = JSON.parse(textToProcess);

			// Validate and auto-fix the generated funnel using processed resources
			const validatedJson = validateAndFixFunnel(generatedJson, processedResources);
			
			// Calculate available offers for each block
			const jsonWithOffers = calculateAvailableOffers(validatedJson);
			
			// CRITICAL: Final validation to ensure no non-existing resources are used
			// Use original resources for validation, but skip category checks for converted resources
			validateGeneratedFunnelResourcesWithExceptions(jsonWithOffers, resources, processedResources);
			
			// CRITICAL: Additional check for any imaginary resources that might have slipped through
			const allResourceNames = Object.values(jsonWithOffers.blocks)
				.filter(block => block.resourceName)
				.map(block => block.resourceName!);
			
			const validResourceNames = new Set(resources.map(r => r.name));
			const invalidResources = allResourceNames.filter(name => !validResourceNames.has(name));
			
			if (invalidResources.length > 0) {
				throw new ValidationError(
					`CRITICAL ERROR: Generated funnel contains imaginary resources: ${invalidResources.join(', ')}. Only use these exact resources: ${Array.from(validResourceNames).join(', ')}`
				);
			}
			
			console.log(`✅ Funnel generation successful on attempt ${attempt}`);
			return jsonWithOffers;
		} catch (error) {
			lastError = handleSDKError(error);
			console.error(
				`Funnel generation failed on attempt ${attempt}/${maxTries}. Reason: ${lastError.message}`,
				`Resources provided: ${resources.map(r => `${r.name}(${r.category})`).join(', ')}`,
			);
			
			// If this is the last attempt, throw the error
			if (attempt === maxTries) {
				console.error(`❌ All ${maxTries} attempts failed. Giving up.`);
				throw lastError;
			}
			
			// Wait a bit before retrying (exponential backoff)
			const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
			console.log(`⏳ Waiting ${delay}ms before retry...`);
			await new Promise(resolve => setTimeout(resolve, delay));
		}
	}
	
	// This should never be reached, but just in case
	throw lastError || new AIError("Unexpected error: All retry attempts exhausted", "UNKNOWN");
};
