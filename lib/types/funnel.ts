export interface FunnelBlockOption {
  text: string;
  nextBlockId: string | null;
}

export interface FunnelBlock {
  id: string;
  message: string;
  options: FunnelBlockOption[];
  resourceName?: string;
}

export interface FunnelFlow {
  startBlockId: string;
  stages: any[];
  blocks: Record<string, FunnelBlock>;
}

export interface ChatMessage {
  type: 'user' | 'bot';
  text: string;
}

export interface FunnelPreviewChatProps {
  funnelFlow: FunnelFlow | null;
  selectedOffer?: string | null;
  onOfferClick?: (offerId: string) => void;
}
