export interface FunnelBlockOption {
	text: string;
	nextBlockId: string | null;
}

export interface FunnelBlock {
	id: string;
	message: string;
	options: FunnelBlockOption[];
	resourceName?: string;
	availableOffers?: string[]; // Array of resource names that this block can lead to
}

export interface FunnelStage {
	id: string;
	name: string;
	explanation: string;
	blockIds: string[];
}

export interface FunnelFlow {
	startBlockId: string;
	stages: FunnelStage[];
	blocks: Record<string, FunnelBlock>;
}

export interface ChatMessage {
	type: "user" | "bot" | "system";
	text: string;
}

export interface FunnelPreviewChatProps {
	funnelFlow: FunnelFlow | null;
	selectedOffer?: string | null;
	onOfferClick?: (offerId: string) => void;
}
