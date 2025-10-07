import type { AuthenticatedUser } from "./user";

export interface Resource {
	id: string;
	name: string;
	link: string;
	type: "AFFILIATE" | "MY_PRODUCTS";
	category: "PAID" | "FREE_VALUE";
	description?: string;
	promoCode?: string;
	productApps?: any; // JSON field for product apps data
}

export interface ResourceFormData {
	id?: string;
	name: string;
	link: string;
	type: "AFFILIATE" | "MY_PRODUCTS";
	category: "PAID" | "FREE_VALUE";
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
	generationStatus?: "idle" | "generating" | "completed" | "failed";
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
	onRemoveFromFunnel?: (resource: Resource) => void;
	onEdit?: () => void;
	onGoToPreview?: (funnel: Funnel) => void;
	onGlobalGeneration: () => Promise<void>;
	isGenerating: boolean | ((funnelId: string) => boolean);
	isAnyFunnelGenerating?: () => boolean;
	onGoToFunnelProducts: () => void;
	onOpenOfflineConfirmation?: () => void;
	onDeploy?: (funnelId: string) => Promise<void>;
	context: "global" | "funnel";
	onModalStateChange?: (isModalOpen: boolean) => void;
	user?: AuthenticatedUser | null;
	// Generation props for funnel context
	isGeneratingFunnel?: (funnelId: string) => boolean;
	onGlobalGenerationFunnel?: (funnelId: string) => Promise<void>;
	// Auto-navigation callback
	onNavigate?: (funnel: Funnel) => void;
	// Deployment state
	isDeploying?: boolean;
	hasAnyLiveFunnel?: boolean;
}


export interface DeleteConfirmation {
	show: boolean;
	resourceId: string | null;
	resourceName: string;
}

// Product limits per funnel
export const PRODUCT_LIMITS = {
	PAID: 5,
	FREE_VALUE: 5,
} as const;

// Global limits for whop owners
export const GLOBAL_LIMITS = {
	FUNNELS: 10,
	PRODUCTS: 20,
} as const;

export interface ProductLimits {
	paid: number;
	freeValue: number;
}
