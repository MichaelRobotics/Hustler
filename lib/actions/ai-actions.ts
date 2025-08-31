/**
 * AI Actions - Gemini AI Integration
 * 
 * Contains all AI generation functionality for funnel creation and JSON repair.
 * Uses the official @google/genai SDK.
 */

import { GoogleGenAI } from '@google/genai';

interface Resource {
  id: string;
  type: string;
  name: string;
  link: string;
  code: string;
  category: string;
}

interface FunnelFlow {
  startBlockId: string;
  stages: any[];
  blocks: Record<string, any>;
}

// Custom error types for better error handling
export class AIError extends Error {
  constructor(message: string, public type: 'AUTHENTICATION' | 'NETWORK' | 'CONTENT' | 'RATE_LIMIT' | 'UNKNOWN') {
    super(message);
    this.name = 'AIError';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Validates the API key and environment setup
 * @throws {ValidationError} If API key is missing or invalid
 */
const validateEnvironment = (): void => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    throw new ValidationError('GEMINI_API_KEY is not configured. Please check your environment variables.');
  }
  if (apiKey === 'your_gemini_api_key_here' || apiKey.includes('test-key')) {
    throw new ValidationError('Please configure a valid GEMINI_API_KEY in your environment variables.');
  }
};

/**
 * Handles specific Google Gen AI SDK errors
 * @param error - The error from the SDK
 * @returns {AIError} A categorized error
 */
const handleSDKError = (error: any): AIError => {
  const errorMessage = error.message || error.toString();
  
  // Check for specific error types
  if (errorMessage.includes('API key') || errorMessage.includes('authentication')) {
    return new AIError('Authentication failed. Please check your API key.', 'AUTHENTICATION');
  }
  
  if (errorMessage.includes('rate limit') || errorMessage.includes('quota')) {
    return new AIError('Rate limit exceeded. Please try again later.', 'RATE_LIMIT');
  }
  
  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return new AIError('Network error. Please check your connection and try again.', 'NETWORK');
  }
  
  if (errorMessage.includes('content') || errorMessage.includes('response')) {
    return new AIError('Content generation failed. Please try again.', 'CONTENT');
  }
  
  return new AIError(`Unexpected error: ${errorMessage}`, 'UNKNOWN');
};

/**
 * Repairs malformed JSON using AI
 * @param badJson - The malformed JSON string to repair
 * @param maxTries - Maximum number of repair attempts (default: 3)
 * @returns Promise with the repaired JSON object
 */
export const repairFunnelJson = async (badJson: string, maxTries = 3): Promise<any> => {
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
          "nextBlockId": "niche_ds"
        },
        {
          "text": "SMMA",
          "nextBlockId": "niche_smma"
        }
      ]
    },
    "niche_ds": {
      "id": "niche_ds",
      "message": "Great! Are you a beginner or advanced?\\n\\nAnswer by pasting one of those numbers",
      "options": [
        {
          "text": "Beginner",
          "nextBlockId": "offer_ds_final"
        }
      ]
    },
    "niche_smma": {
      "id": "niche_smma",
      "message": "Excellent. Need help finding clients?\\n\\nAnswer by pasting one of those numbers",
      "options": [
        {
          "text": "Yes",
          "nextBlockId": "offer_smma_final"
        }
      ]
    },
    "offer_ds_final": {
      "id": "offer_ds_final",
      "message": " Congrats! Here is your offer for Dropshipping...\\n https://example.com/ds-beg",
      "options": []
    },
    "offer_smma_final": {
      "id": "offer_smma_final",
      "message": " Congrats! Here is your offer for SMMA...\\n https://example.com/smma-tool",
      "options": []
    }
  }
}
\`\`\`
`;

            // Use the official SDK to generate content
            const response = await genAI.models.generateContent({
                model: 'gemini-2.5-flash-preview-05-20',
                contents: repairPrompt,
            });

            let repairedText = response.text;
            if (repairedText) {
                if (repairedText.startsWith("```json")) {
                    repairedText = repairedText.substring(7, repairedText.length - 3).trim();
                }
                // Attempt to parse the repaired JSON to see if it's valid
                const repairedJson = JSON.parse(repairedText);
                return repairedJson; // Success!
            }
        } catch (error) {
            lastError = handleSDKError(error);
            console.error(`Repair attempt ${i + 1} failed:`, lastError.message);
        }
    }
    throw lastError; // All repair attempts failed
};

/**
 * Generates a funnel flow using AI based on provided resources
 * @param resources - Array of resources to include in the funnel
 * @returns Promise with the generated funnel flow
 */
export const generateFunnelFlow = async (resources: Resource[]): Promise<FunnelFlow> => {
    // Debug: Log the resources being passed to Gemini
    console.log('=== RESOURCES PASSED TO GEMINI ===');
    console.log('Number of resources:', resources.length);
    console.log('Resources:', JSON.stringify(resources, null, 2));
    console.log('=== END RESOURCES ===');

    const resourceList = resources.map(r => {
        let categoryLabel = r.category === 'PAID_PRODUCT' ? 'Paid Product' : 'Free Value';
        let details = `${r.name} (Category: ${categoryLabel}, Type: ${r.type})`;
        if (r.code) {
            details += ` [Promo Code: ${r.code}]`;
        }
        return `- ${details}`;
    }).join('\n');

    const prompt = `
You are an expert marketing funnel strategist. Your task is to create a branching chatbot conversation flow in a hierarchical JSON format based on the following rules and resources.

---
### CORE CONCEPTS

1.  **STAGES**: These represent the major vertical steps of the funnel (e.g., WELCOME, QUALIFICATION, OFFER). Each stage is a distinct layer.
2.  **ITEMS (BLOCKS)**: These are the individual chat messages within a Stage. A stage can have one or more items.

---
### ITEM MESSAGE CONSTRUCTION

**1. FOR ITEMS WITH CHOICES (items in any stage except 'OFFER'):**
The 'message' string must be structured exactly like this:
- **Line 1**: A short, impactful headline.
- **Line 2**: An empty line for spacing.
- **Line 3**: The instruction: "Answer by pasting one of those numbers".

*Example Message with Choices:*
"What's your main goal?

Answer by pasting one of those numbers"

**IMPORTANT**: Do NOT include the numbered options in the message text. The options are already defined in the 'options' array and will be displayed separately by the UI.

**2. FOR ITEMS WITH AN OFFER (items in the 'OFFER' stage):**
The 'message' string must be a compelling sales message. Use emojis to make it engaging. It must follow this structure:
- **Opening**: A congratulatory message.
- **Recommendations Headline**: Something like "✨ Your Tailored Recommendations ✨".
- **Resource Details**: For each recommended resource, include:
    - ✅ The resource name.
    - The resource link.
    -️ The promo code, if available.
- **Closing**: An encouraging call to action with a sense of urgency.

*Example Offer Message:*
" Excellent! Based on your selections, here are some highly recommended resources:

✨ Your Tailored Recommendations ✨

✅ Beginner Dropshipping Course:
 [https://example.com/ds-beg](https://example.com/ds-beg)
️ Promo Code: SAVE10 (Limited Time Only!)

 Your Solution Awaits!
Don't miss out on these valuable resources. Act fast – this promo code is for a limited time only! ⏳"

---
### FUNNEL GENERATION RULES

1.  **RESOURCES**: You will be provided with a list of resources, categorized as either 'Free Value' or 'Paid Product'.
    ${resourceList}

2.  **GOAL**: Create a branching chatbot flow that qualifies users and directs them to the most suitable resource from the list.

3.  **HIERARCHICAL STRUCTURE**: The funnel must be structured into the SAME logical STAGES for all users, regardless of their choices. A typical structure would be: WELCOME -> NICHE -> EXPERIENCE -> PAIN_POINT -> OFFER. All paths must go through these stages in this exact order.

4.  **STAGE-TO-STAGE TRANSITIONS**: An item's 'nextBlockId' MUST point to an item in the immediately following stage. No skipping stages.

5.  **BRANCHING WITHIN STAGES**:
    * The **WELCOME** stage will have one block with options that lead to different blocks in the **NICHE** stage.
    * The **NICHE** stage can have multiple blocks. The options in these blocks will lead to different blocks in the **EXPERIENCE** stage.
    * This branching continues through the qualification stages. The goal is to create different paths based on user answers.
    * The **OFFER** stage will contain multiple, unique offer blocks—one for each resource. The path a user takes through the qualification stages will determine which final offer block they see.

6.  **UNIQUE ENDPOINTS**: Each path through the funnel must end at a different block in the final **OFFER** stage. Two different qualification paths cannot lead to the same offer.

7.  **ESCAPE HATCH (CRITICAL RULE)**: The very first block in the 'WELCOME' stage **MUST** include an option like 'Just exploring for now.' or 'Skip for now'. This option's \`nextBlockId\` must be \`null\`.

8.  **VALUE-FIRST APPROACH**: Your primary goal is to guide users to a relevant 'Free Value' resource first. If a path leads to a 'Paid Product', try to also include a related 'Free Value' resource in the same offer message to maximize helpfulness.

---
### JSON OUTPUT STRUCTURE

Generate a clean, raw JSON object. Do not wrap it in markdown. The JSON must have three top-level keys: 'startBlockId', 'stages', and 'blocks'.

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
          "nextBlockId": "niche_ds"
        },
        {
          "text": "SMMA",
          "nextBlockId": "niche_smma"
        },
        {
          "text": "Just exploring",
          "nextBlockId": null
        }
      ]
    },
    "niche_ds": {
      "id": "niche_ds",
      "message": "Great! Are you a beginner or advanced?\\n\\nAnswer by pasting one of those numbers",
      "options": [
        {
          "text": "Beginner",
          "nextBlockId": "offer_ds_final"
        }
      ]
    },
    "niche_smma": {
      "id": "niche_smma",
      "message": "Excellent. Need help finding clients?\\n\\nAnswer by pasting one of those numbers",
      "options": [
        {
          "text": "Yes",
          "nextBlockId": "offer_smma_final"
        }
      ]
    },
    "offer_ds_final": {
      "id": "offer_ds_final",
      "message": " Congrats! Here is your offer for Dropshipping...\\n [https://example.com/ds-beg](https://example.com/ds-beg)",
      "options": []
    },
    "offer_smma_final": {
      "id": "offer_smma_final",
      "message": " Congrats! Here is your offer for SMMA...\\n [https://example.com/smma-tool](https://example.com/smma-tool)",
      "options": []
    }
  }
}
\`\`\`
`;

    let textToProcess: string = '';
    try {
        // Validate environment before making API calls
        validateEnvironment();
        
        // Initialize the Google Gen AI SDK
        const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        
        // Use the official SDK to generate content
        const response = await genAI.models.generateContent({
            model: 'gemini-2.5-flash-preview-05-20',
            contents: prompt,
        });

        textToProcess = response.text || '';

        // Debug: Log the raw response from Gemini
        console.log('=== GEMINI RAW RESPONSE ===');
        console.log('Response text length:', textToProcess?.length || 0);
        console.log('Response text preview:', textToProcess?.substring(0, 500) + '...');
        console.log('=== END GEMINI RESPONSE ===');

        if (!textToProcess || textToProcess.trim() === '') {
            throw new Error("API responded with empty content.");
        }

        if (textToProcess.startsWith("```json")) {
            textToProcess = textToProcess.substring(7, textToProcess.length - 3).trim();
        }

        const generatedJson = JSON.parse(textToProcess);
        return generatedJson;

    } catch (error) {
        const aiError = handleSDKError(error);
        console.error("Funnel generation failed on first attempt. Reason:", aiError.message);

        if (textToProcess) {
            console.log("Attempting to repair the following text:", textToProcess);
            try {
                const repairedJson = await repairFunnelJson(textToProcess);
                return repairedJson;
            } catch (repairError) {
                console.error("Failed to repair JSON after multiple attempts:", repairError);
                throw new AIError("The AI returned an invalid response that could not be repaired. Please try generating again.", 'CONTENT');
            }
        } else {
            throw aiError; // Re-throw the categorized error
        }
    }
};
