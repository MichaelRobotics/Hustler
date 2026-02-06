export interface FunnelBlockOption {
	text: string;
	nextBlockId: string | null;
}

/** How product was selected for an upsell card */
export type UpsellProductSelectionType = "ai_suggested" | "manual" | "from_stage";

/**
 * A message block in a funnel. Blocks do not have a type; card type is determined by the
 * stage they belong to (FunnelStage.cardType). Use isProductCardBlock(blockId, flow) to
 * check if a block is in a product-card stage.
 */
export interface FunnelBlock {
	id: string;
	/** Optional display headline for the card (editable); falls back to id when unset */
	headline?: string | null;
	message: string;
	options: FunnelBlockOption[];
	resourceName?: string;
	availableOffers?: string[]; // Array of resource names that this block can lead to
	// Upsell-only fields
	upsellBlockId?: string | null;
	downsellBlockId?: string | null;
	/** Assigned color+shape for cross-stage upsell target (no arrow); set when target is not in next stage */
	upsellCrossStageStyle?: { colorId: string; shapeId: string } | null;
	/** Assigned color+shape for cross-stage downsell target (no arrow); set when target is not in next stage */
	downsellCrossStageStyle?: { colorId: string; shapeId: string } | null;
	/** After user clicks Upsell/Downsell, wait this many minutes then show next product */
	timeoutMinutes?: number | null;
	resourceId?: string | null; // Selected product resource ID (for manual or from_stage)
	productSelectionType?: UpsellProductSelectionType;
	/** When productSelectionType === "from_stage", the block ID of the card this product references */
	referencedBlockId?: string | null;
}

export interface FunnelStage {
	id: string;
	/** Display name only (e.g. progress bar, admin UI). Do not use for control flow; use cardType instead. */
	name: string;
	explanation: string;
	blockIds: string[];
	/** Card type for this stage: "product" = product CTA (always show button; grey if no link), "qualification" = options-based. Single source of truth for card behavior. */
	cardType?: "qualification" | "product";
}

export interface FunnelFlow {
	startBlockId: string;
	stages: FunnelStage[];
	blocks: Record<string, FunnelBlock>;
}

export interface ChatMessage {
	type: "user" | "bot" | "system";
	text: string;
	metadata?: { blockId?: string };
}

export interface FunnelPreviewChatProps {
	funnelFlow: FunnelFlow | null;
	selectedOffer?: string | null;
	onOfferClick?: (offerId: string) => void;
}

// ===== FUNNEL CONFIGURATION TYPES =====

// Trigger type definition
export type TriggerType = 
	| "on_app_entry"
	| "any_membership_buy"
	| "membership_buy"
	| "no_active_conversation"
	| "qualification_merchant_complete"
	| "upsell_merchant_complete"
	| "delete_merchant_conversation"
	| "cancel_membership"
	| "any_cancel_membership";

// Trigger configuration - stores trigger-specific settings
export interface TriggerConfig {
	resourceId?: string; // For membership_buy, cancel_membership - specific resource/product
	funnelId?: string; // For qualification_merchant_complete, upsell_merchant_complete, delete_merchant_conversation triggers
	// Qualification merchant complete: only trigger when user has this profile (optional; profile creation logic added later)
	profileId?: string;
	// Membership filter: only trigger when member satisfies these (optional)
	filterResourceIdsRequired?: string[]; // Resources the member must have bought (one or more)
	filterResourceIdsExclude?: string[]; // Resources the member must not have bought (one or more)
}

// Trigger timeout configuration per trigger type (deprecated - use delayMinutes instead)
export interface TriggerTimeoutConfig {
	on_app_entry?: number; // Minutes before conversation starts for app entry
}

// Funnel notification (reminder notifications per stage)
export interface FunnelNotification {
	id: string;
	funnelId: string;
	stageId: string; // References stage ID in funnel flow
	sequence: number; // 1, 2, or 3 (max 3 per stage)
	inactivityMinutes: number; // Time before notification triggers
	message: string; // Notification content
	notificationType?: "standard" | "custom"; // Type of notification: standard (copies from last bot message) or custom
	isReset: boolean; // If true, this is a reset card
	resetAction?: "delete" | "complete"; // Action for reset card: delete conversations or mark as completed
	delayMinutes?: number; // Delay in minutes for reset card (after all notifications)
	createdAt: Date;
	updatedAt: Date;
}

// Input for creating/updating a notification
export interface FunnelNotificationInput {
	funnelId: string;
	stageId: string;
	sequence: number;
	inactivityMinutes: number;
	message: string;
	notificationType?: "standard" | "custom"; // Type of notification
	isReset?: boolean;
	resetAction?: "delete" | "complete";
	delayMinutes?: number;
}

// Product FAQ and objection handling
export interface FunnelProductFaq {
	id: string;
	funnelId: string;
	resourceId: string;
	faqContent?: string; // FAQ text or document content
	objectionHandling?: string; // Objection handling guidelines
	createdAt: Date;
	updatedAt: Date;
}

// Input for creating/updating product FAQ
export interface FunnelProductFaqInput {
	funnelId: string;
	resourceId: string;
	faqContent?: string;
	objectionHandling?: string;
}

// Extended funnel type with configuration
export interface FunnelWithConfig {
	id: string;
	name: string;
	description?: string;
	flow?: FunnelFlow;
	membershipTriggerType?: TriggerType; // Membership category trigger
	appTriggerType?: TriggerType; // App category trigger
	membershipTriggerConfig?: TriggerConfig; // Config for membership trigger
	appTriggerConfig?: TriggerConfig; // Config for app trigger
	delayMinutes?: number; // App trigger delay (backward compatibility)
	membershipDelayMinutes?: number; // Membership trigger delay
	merchantType?: "qualification" | "upsell"; // Merchant type: qualification or upsell
	isDeployed?: boolean;
	wasEverDeployed?: boolean;
	isDraft?: boolean; // Draft mode - prevents deployment when new cards don't have complete connections
	notifications?: FunnelNotification[];
	productFaqs?: FunnelProductFaq[];
}
