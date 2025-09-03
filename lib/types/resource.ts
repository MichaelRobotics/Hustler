

export interface Resource {
  id: string;
  name: string;
  link: string;
  type: 'AFFILIATE' | 'MY_PRODUCTS';
  price: 'PAID' | 'FREE_VALUE';
  description?: string;
  promoCode?: string;
}

export interface ResourceFormData {
  id?: string;
  name: string;
  link: string;
  type: 'AFFILIATE' | 'MY_PRODUCTS';
  price: 'PAID' | 'FREE_VALUE';
  description?: string;
  promoCode?: string;
}

export interface Funnel {
  id: string;
  name: string;
  isDeployed?: boolean;
  wasEverDeployed?: boolean;
  delay?: number;
  resources?: Resource[];
  flow?: any;
  // Generation-related properties
  generationStatus?: 'idle' | 'generating' | 'completed' | 'failed';
  generationError?: string;
  lastGeneratedAt?: number;
}

export interface ResourceLibraryProps {
  funnel?: Funnel;
  allResources: Resource[];
  allFunnels?: Funnel[];
  setAllResources: (resources: Resource[]) => void;
  onBack?: () => void;
  onAddToFunnel?: (resource: Resource) => void;
  onEdit?: () => void;
  onGoToPreview?: (funnel: Funnel) => void;
  onGlobalGeneration: () => Promise<void>;
  isGenerating: boolean;
  onGoToFunnelProducts: () => void;
  context: 'global' | 'funnel';
}

export interface ResourcePageProps {
  funnel: Funnel;
  onBack: () => void;
  onUpdateFunnel: (updatedFunnel: Funnel) => void;
  onEdit: () => void;
  onGoToBuilder: (updatedFunnel?: Funnel) => void;
  onGoToPreview: (funnel: Funnel) => void;
  onOpenResourceLibrary: () => void;
  onGlobalGeneration: (funnelId: string) => Promise<void>;
  isGenerating: (funnelId: string) => boolean;
  onGoToFunnelProducts: () => void;
}

export interface DeleteConfirmation {
  show: boolean;
  resourceId: string | null;
  resourceName: string;
}
