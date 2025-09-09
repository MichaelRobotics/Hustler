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

**REQUIRED STRUCTURE:**
- FUNNEL_1: WELCOME → VALUE_DELIVERY → TRANSITION
- FUNNEL_2: EXPERIENCE_QUALIFICATION → PAIN_POINT_QUALIFICATION → OFFER
- VALUE_DELIVERY blocks: ONLY use resources with category "FREE_VALUE"
- OFFER blocks: ONLY use resources with category "PAID"
- **FORBIDDEN**: PAID resources CANNOT be in VALUE_DELIVERY blocks
- **FORBIDDEN**: FREE_VALUE resources CANNOT be in OFFER blocks
- Each VALUE_DELIVERY block MUST have "resourceName" field with exact resource name from category FREE_VALUE
- Each OFFER block MUST have "resourceName" field with exact resource name from category PAID
- TRANSITION blocks must link to corresponding EXPERIENCE_QUALIFICATION blocks
- First WELCOME block must have option with "nextBlockId": null
- NO imaginary products - only use exact resource names from provided list

**CATEGORY-BASED RESOURCE PLACEMENT:**
- VALUE_DELIVERY blocks: Use resources with category "FREE_VALUE" only
- OFFER blocks: Use resources with category "PAID" only
- **FORBIDDEN**: PAID resources CANNOT be in VALUE_DELIVERY blocks
- **FORBIDDEN**: FREE_VALUE resources CANNOT be in OFFER blocks
- resourceName must exactly match the resource name from the provided list
- NO imaginary or made-up product names

**CORRECT JSON STRUCTURE:**
\`\`\`json
{
  "startBlockId": "welcome_1",
  "stages": [
    {
      "id": "stage-welcome",
      "name": "WELCOME",
      "explanation": "[F1] Initial greeting and user segmentation.",
      "blockIds": ["welcome_1"]
    },
    {
      "id": "stage-value-delivery",
      "name": "VALUE_DELIVERY",
      "explanation": "[F1] Deliver resources with category FREE_VALUE to build trust.",
      "blockIds": ["value_trading_guide"]
    },
    {
      "id": "stage-transition",
      "name": "TRANSITION",
      "explanation": "[F1] Ends the first funnel and directs user to an external link.",
      "blockIds": ["transition_to_vip_chat"]
    },
    {
      "id": "stage-experience",
      "name": "EXPERIENCE_QUALIFICATION",
      "explanation": "[F2] Qualify user's skill level. Assumes they are coming from Funnel 1.",
      "blockIds": ["experience_qual_1"]
    },
    {
      "id": "stage-pain-point",
      "name": "PAIN_POINT_QUALIFICATION",
      "explanation": "[F2] Identify the user's primary challenge.",
      "blockIds": ["pain_point_1"]
    },
    {
      "id": "stage-offer",
      "name": "OFFER",
      "explanation": "[F2] Present resources with category PAID as the solution.",
      "blockIds": ["offer_risk_management"]
    }
  ],
  "blocks": {
    "welcome_1": {
      "id": "welcome_1",
      "message": "Welcome, [Username]!\\n\\nTo start, what's your main interest in crypto?\\n\\nAnswer by pasting one of those numbers",
      "options": [
        {"text": "Trading & Investing", "nextBlockId": "value_trading_guide"},
        {"text": "Just exploring for now", "nextBlockId": null}
      ]
    },
    "value_trading_guide": {
      "id": "value_trading_guide",
      "message": "Perfect. Trading is where the action is.\\n\\nHere is our free guide: \\"The 3 Core Principles of Crypto Charting.\\"\\n\\nHere is the link: https://caseyscrypto.com/free-charting-guide\\n\\nPlease review it, because the next step is where we build your personal plan. Reply with 'done' when you're ready.",
      "resourceName": "The 3 Core Principles of Crypto Charting",
      "options": [{"text": "done", "nextBlockId": "transition_to_vip_chat"}]
    },
    "transition_to_vip_chat": {
      "id": "transition_to_vip_chat",
      "message": "Excellent. You've completed the first step. ✅\\n\\nNow it's time to build your personal strategy plan. To do that, I've prepared a private, unlimited chat session just for you.\\n\\nClick below to begin your Personal Strategy Session now.\\n\\n➡️ [LINK_TO_PRIVATE_CHAT] ⬅️",
      "options": [{"text": "Continue to Strategy Session", "nextBlockId": "experience_qual_1"}]
    },
    "experience_qual_1": {
      "id": "experience_qual_1",
      "message": "Welcome, @[Username]! Glad you made it. Let's get started.\\n\\nBased on the charting guide you just saw, where would you place your current skill level?\\n\\n",
      "options": [{"text": "This was mostly new information (Beginner)", "nextBlockId": "pain_point_1"}]
    },
    "pain_point_1": {
      "id": "pain_point_1",
      "message": "Got it. That's the perfect place to start.\\n\\nFor beginners, what feels like the biggest hurdle for you right now?\\n\\n",
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

			// If no match found by name, try to find any resource with correct category
			if (!bestMatch) {
				bestMatch = resources.find(r => r.category === expectedCategory) || null;
			}

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
	
	**CRITICAL INSTRUCTION**: You MUST create separate blocks for each resource based on their category:
	- Each resource with category "FREE_VALUE" gets its own VALUE_DELIVERY block
	- Each resource with category "PAID" gets its own OFFER block
	- **FORBIDDEN**: PAID resources CANNOT be in VALUE_DELIVERY blocks
	- **FORBIDDEN**: FREE_VALUE resources CANNOT be in OFFER blocks
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
	The 'message' string must be structured exactly like this:
	- **Line 1**: A short, impactful headline.
	- **Line 2**: An empty line for spacing.
	- **Line 3**: The instruction: "Answer by pasting one of those numbers".
	
	*Example Message for Funnel 1:*
	"Welcome! What's your main goal?
	
	Answer by pasting one of those numbers"
	
	**IMPORTANT**: Do NOT include the numbered options in the message text. The options are defined in the 'options' array.
	
	**2. FOR ITEMS WITH CHOICES (in \`FUNNEL_2_STRATEGY_SESSION\`):**
	The 'message' string for qualification stages (\`EXPERIENCE_QUALIFICATION\`, \`PAIN_POINT_QUALIFICATION\`) should be direct and concise. It must be structured exactly like this:
	- **Line 1**: A direct question as the headline.
	- **Line 2**: An empty line for spacing.
	
	**CRITICAL**: This message format must NOT include the "Answer by..." instruction line.
	
	*Example Message for Funnel 2:*
	"Based on the guide you just saw, where would you place your current skill level?
	
	"
	
	**3. FOR ITEMS IN \`FUNNEL_1\`'s 'VALUE_DELIVERY' STAGE:**
	The message must present a resource with category "FREE_VALUE" and instruct the user to reply "done" to proceed, creating the "Open Loop".
	*Example:* "Perfect. Here is our free guide... Please review it... Reply with 'done' when you're ready."
	**CRITICAL BLOCK RULE**: The block for this stage MUST have exactly one option in its 'options' array, with the text 'done' (or similar), which points its 'nextBlockId' to the 'TRANSITION' stage.
	**CRITICAL RESOURCE RULE**: ONLY use resources with category "FREE_VALUE" in VALUE_DELIVERY blocks.
	
	**4. FOR ITEMS IN \`FUNNEL_1\`'s 'TRANSITION' STAGE:**
	This is the final block of Funnel 1. The message must congratulate the user and provide a compelling reason to move to the second chat, along with a placeholder link.
	*Example:* "Excellent. You've completed the first step... Click below to begin your Personal Strategy Session... ➡️ [LINK_TO_PRIVATE_CHAT] ⬅️"
	**CRITICAL BLOCK RULE**: The block for this stage MUST have options that connect to the corresponding EXPERIENCE_QUALIFICATION blocks in Funnel 2. These options should have generic connector text like "Continue" or "Start Session" - they are system connectors only and will not be displayed as user choices in the preview chat.
	
	**5. FOR ITEMS WITH AN OFFER (in \`FUNNEL_2\`'s 'OFFER' stage):**
	The 'message' string must be a compelling sales message for ONE specific resource with category "PAID".
	- **Opening**: A congratulatory message.
	- **Resource Details**: Include the resource name and link.
	- **Closing**: An encouraging call to action.
	**CRITICAL RESOURCE RULE**: ONLY use resources with category "PAID" in OFFER blocks.
	
	---
	
	### FUNNEL GENERATION RULES
	
	1.  **OVERALL GOAL**: Generate a single JSON object that contains the structures for **BOTH** \`FUNNEL_1_WELCOME_GATE\` and \`FUNNEL_2_STRATEGY_SESSION\`. The output must be one single, valid JSON object with the standard FunnelFlow structure: \`startBlockId\`, \`stages\`, and \`blocks\`. Both funnels will be combined into this single structure for JSON formatting purposes, but they remain logically separate.
	
	2.  **RESOURCES**: You will be provided with a list of resources, categorized as 'Free Value' or 'Paid Product'.
		 \ ${resourceList}
	
		 **CRITICAL: You MUST preserve the exact resource IDs provided above.**
		 **CRITICAL RESOURCE MAPPING RULES:**
		 - Resources with category "FREE_VALUE" → VALUE_DELIVERY blocks ONLY
		 - Resources with category "PAID" → OFFER blocks ONLY
		 - **FORBIDDEN**: PAID resources CANNOT be in VALUE_DELIVERY blocks
		 - **FORBIDDEN**: FREE_VALUE resources CANNOT be in OFFER blocks
		 - ONE resource = ONE corresponding block (exact 1:1 mapping)
		 - Use EXACT resource names from the list above - NO variations or imaginary products
		 - If no resources provided, create placeholder messages without resourceName fields
		 
		 **MANDATORY BLOCK CREATION:**
		 - Create ONE VALUE_DELIVERY block for EACH resource with category "FREE_VALUE"
		 - Create ONE OFFER block for EACH resource with category "PAID"
		 - Each block must have its own unique ID and resourceName field
		 - Do NOT mix resources in the same block
	
	3.  **FUNNEL 1: "WELCOME GATE" STRUCTURE (CHAT 1)**
		 * **Goal**: To hook the user, deliver resources with category "FREE_VALUE", and transition them to Funnel 2.
		 * **STAGES Order**: \`WELCOME\` -> \`VALUE_DELIVERY\` -> \`TRANSITION\`.
		 * **\`WELCOME\` Stage**: Greets the user and asks the first question (e.g., niche).
		 * **\`VALUE_DELIVERY\` Stage**: Contains ONE block for EACH resource with category "FREE_VALUE". Each block presents its specific resource and instructs the user to reply 'done' to continue. Each block must have one option like \`{"text": "done", "nextBlockId": "..."}\`.
		 * **\`TRANSITION\` Stage**: This is the final stage of Funnel 1. Its message must contain the congratulatory text and a placeholder link (e.g., \`[LINK_TO_PRIVATE_CHAT]\`) to the second chat. It has no options.
	
	4.  **FUNNEL 2: "STRATEGY SESSION" STRUCTURE (CHAT 2)**
		 * **Goal**: To perform a deep qualification of the user and present hyper-targeted resources with category "PAID".
		 * **STAGES Order**: \`EXPERIENCE_QUALIFICATION\` -> \`PAIN_POINT_QUALIFICATION\` -> \`OFFER\`.
		 * **\`EXPERIENCE_QUALIFICATION\` Stage**: This is the starting point of Funnel 2. It re-welcomes the user and asks about their experience level in relation to the FREE_VALUE resource they just consumed. **CRITICAL**: Each VALUE_DELIVERY path must have its own specific EXPERIENCE_QUALIFICATION block that the TRANSITION stage links to.
		 * **\`PAIN_POINT_QUALIFICATION\` Stage**: Asks the user to identify their biggest challenge.
		 * **\`OFFER\` Stage**: Contains ONE block for EACH resource with category "PAID". Each block presents its specific resource that solves the user's stated pain point.
	
	5.  **BRANCHING LOGIC - TRANSITION TO EXPERIENCE_QUALIFICATION CONNECTIONS**:
		 * **CRITICAL**: Each VALUE_DELIVERY block must have its own corresponding EXPERIENCE_QUALIFICATION block.
		 * **TRANSITION Stage**: Should have multiple blocks, each linking to a specific EXPERIENCE_QUALIFICATION block based on the user's VALUE_DELIVERY path.
		 * **Connection Pattern**: 
			- VALUE_DELIVERY block A → TRANSITION block A → EXPERIENCE_QUALIFICATION block A
			- VALUE_DELIVERY block B → TRANSITION block B → EXPERIENCE_QUALIFICATION block B
		 * **Personalization**: Each EXPERIENCE_QUALIFICATION block should reference the specific free value the user consumed in their VALUE_DELIVERY path.
		 * **Example**: If user chose "Trading" in VALUE_DELIVERY, their TRANSITION link should lead to an EXPERIENCE_QUALIFICATION block that asks about their trading experience level.
	
	6.  **MESSAGE CONSTRUCTION**: Follow the specific formatting rules for each message type (choices, offers, value delivery, etc.) as defined in previous instructions.
	
	7.  **\`resourceName\` FIELD (CRITICAL - EXACT MATCHING)**:
		 - **VALUE_DELIVERY blocks**: Use resources with category "FREE_VALUE" only
		 - **OFFER blocks**: Use resources with category "PAID" only
		 - **FORBIDDEN**: PAID resources CANNOT be in VALUE_DELIVERY blocks
		 - **FORBIDDEN**: FREE_VALUE resources CANNOT be in OFFER blocks
		 - **EXACT MATCH**: resourceName must be EXACTLY the same as the resource name from the list above
		 - **NO VARIATIONS**: No abbreviations, modifications, or imaginary products allowed
		 - **ONE PER BLOCK**: Each resourceName appears in exactly ONE block (no duplicates)
	
	8.  **RESOURCE ID FORMAT (SECONDARY)**:
		 - Each offer block in \`FUNNEL_2\`'s OFFER stage should have an ID generated from the first two words of the \`resourceName\`.
		 - Example: If \`resourceName\` is "Beginner Dropshipping Course", the offer block ID should be "beginner_dropshipping".
	
	9.  **ONE RESOURCE PER OFFER (CRITICAL)**:
		 - Each offer block in Funnel 2 must represent exactly ONE resource with category "PAID".
		 - Never mix multiple resources in a single offer block.
	
	10. **ESCAPE HATCH (CRITICAL RULE)**: The very first block in \`FUNNEL_1\`'s 'WELCOME' stage **MUST** include an option like 'Just exploring for now.' with \`nextBlockId: null\`.
	
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
	- First WELCOME block has option with \`nextBlockId: null\`
	- **CRITICAL**: Resources with category "FREE_VALUE" ONLY in VALUE_DELIVERY blocks
	- **CRITICAL**: Resources with category "PAID" ONLY in OFFER blocks
	- **CRITICAL**: PAID resources CANNOT be in VALUE_DELIVERY blocks
	- **CRITICAL**: FREE_VALUE resources CANNOT be in OFFER blocks
	- **CRITICAL**: Every resourceName exactly matches a resource name from the provided list
	- **CRITICAL**: NO imaginary products - only use provided resources
	- **CRITICAL**: VALUE_DELIVERY stage contains blocks for ALL FREE_VALUE resources
	- **CRITICAL**: OFFER stage contains blocks for ALL PAID resources
	- **CRITICAL**: Each resource has its own individual block - NO mixing
	
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
	
	### JSON OUTPUT STRUCTURE
	
	Generate a clean, raw JSON object. Do not wrap it in markdown. The JSON must have the standard FunnelFlow structure: \`startBlockId\`, \`stages\`, and \`blocks\`. All stages and blocks from both funnels are combined into this single structure.
	
	*Here is a detailed example of the correct, required JSON structure:*
	\`\`\`json
	{
	  "startBlockId": "welcome_1",
	  "stages": [
		 {
			"id": "stage-welcome",
			"name": "WELCOME",
			"explanation": "[F1] Initial greeting and user segmentation.",
			"blockIds": ["welcome_1"]
		 },
		 {
			"id": "stage-value-delivery",
			"name": "VALUE_DELIVERY",
			"explanation": "[F1] Deliver resources with category FREE_VALUE to build trust.",
			"blockIds": ["value_trading_guide"]
		 },
		 {
			"id": "stage-transition",
			"name": "TRANSITION",
			"explanation": "[F1] Ends the first funnel and directs user to an external link.",
			"blockIds": ["transition_to_vip_chat"]
		 },
		 {
			"id": "stage-experience",
			"name": "EXPERIENCE_QUALIFICATION",
			"explanation": "[F2] Qualify user's skill level. Assumes they are coming from Funnel 1.",
			"blockIds": ["experience_qual_1"]
		 },
		 {
			"id": "stage-pain-point",
			"name": "PAIN_POINT_QUALIFICATION",
			"explanation": "[F2] Identify the user's primary challenge.",
			"blockIds": ["pain_point_1"]
		 },
		 {
			"id": "stage-offer",
			"name": "OFFER",
			"explanation": "[F2] Present resources with category PAID as the solution.",
			"blockIds": ["offer_risk_management"]
		 }
	  ],
	  "blocks": {
		 "welcome_1": {
			"id": "welcome_1",
			"message": "Welcome, [Username]!\\n\\nTo start, what's your main interest in crypto?\\n\\nAnswer by pasting one of those numbers",
			"options": [
			  {"text": "Trading & Investing", "nextBlockId": "value_trading_guide"},
			  {"text": "Just exploring for now", "nextBlockId": null}
			]
		 },
		 "value_trading_guide": {
			"id": "value_trading_guide",
			"message": "Perfect. Trading is where the action is.\\n\\nHere is our free guide: \\"The 3 Core Principles of Crypto Charting.\\"\\n\\nHere is the link: https://caseyscrypto.com/free-charting-guide\\n\\nPlease review it, because the next step is where we build your personal plan. Reply with 'done' when you're ready.",
			"resourceName": "The 3 Core Principles of Crypto Charting",
			"options": [{"text": "done", "nextBlockId": "transition_to_vip_chat"}]
		 },
		 "transition_to_vip_chat": {
			"id": "transition_to_vip_chat",
			"message": "Excellent. You've completed the first step. ✅\\n\\nNow it's time to build your personal strategy plan. To do that, I've prepared a private, unlimited chat session just for you.\\n\\nClick below to begin your Personal Strategy Session now.\\n\\n➡️ [LINK_TO_PRIVATE_CHAT] ⬅️",
			"options": [{"text": "Continue to Strategy Session", "nextBlockId": "experience_qual_1"}]
		 },
		 "experience_qual_1": {
			"id": "experience_qual_1",
			"message": "Welcome, @[Username]! Glad you made it. Let's get started.\\n\\nBased on the charting guide you just saw, where would you place your current skill level?\\n\\n",
			"options": [{"text": "This was mostly new information (Beginner)", "nextBlockId": "pain_point_1"}]
		 },
		 "pain_point_1": {
			"id": "pain_point_1",
			"message": "Got it. That's the perfect place to start.\\n\\nFor beginners, what feels like the biggest hurdle for you right now?\\n\\n",
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
