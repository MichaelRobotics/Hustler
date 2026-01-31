import type { AuthenticatedUser } from "./user";

export interface Resource {
	id: string;
	name: string;
	type: "LINK" | "FILE" | "WHOP";
	link?: string;
	category: "PAID" | "FREE_VALUE";
	description?: string;
	promoCode?: string;
	productApps?: any; // JSON field for product apps data
	image?: string; // Link to icon of app/product/digital resource image
	storageUrl?: string; // Link that triggers digital asset upload
	productImages?: string[]; // Array of up to 3 product image URLs for FILE type products
	price?: string; // Price from access pass plan or user input
	whopProductId?: string; // ID of the actual Whop product/app (for synced products)
	planId?: string; // Whop plan ID associated with this resource
	purchaseUrl?: string; // Purchase URL from plan or checkout configuration
	checkoutConfigurationId?: string; // Checkout configuration ID for resources created via checkout
	displayOrder?: number; // Order for displaying resources in Market Stall
}

export interface ResourceFormData {
	id?: string;
	name: string;
	type: "LINK" | "FILE" | "WHOP";
	link?: string;
	category: "PAID" | "FREE_VALUE";
	description?: string;
	promoCode?: string;
	image?: string;
	storageUrl?: string;
	productImages?: string[]; // Array of up to 3 product image URLs for FILE type products
	price?: string;
	whopProductId?: string; // ID of the actual Whop product/app (for synced products)
	planId?: string; // Whop plan ID associated with this resource
	purchaseUrl?: string; // Purchase URL from plan or checkout configuration
	checkoutConfigurationId?: string; // Checkout configuration ID for resources created via checkout
}

export interface Funnel {
	id: string;
	name: string;
	isDeployed?: boolean;
	wasEverDeployed?: boolean;
	delay?: number;
	resources?: Resource[];
	flow?: any;
	// Trigger configuration
	triggerType?: "on_app_entry" | "membership_valid";
	triggerTimeoutMinutes?: Record<string, number>; // { "on_app_entry": 0, "membership_valid": 30 }
	// Handout configuration
	handoutKeyword?: string;
	handoutAdminNotification?: string;
	handoutUserMessage?: string;
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
	onUserUpdate?: (updates: { subscription?: "Basic" | "Pro" | "Vip" | null; credits?: number; messages?: number; membership?: string | null }) => void;
	onPurchaseSuccess?: (purchaseData: {
		type: 'subscription' | 'credits' | 'messages';
		subscription?: 'Basic' | 'Pro' | 'Vip';
		credits?: number;
		messages?: number;
	}) => void;
	// Generation props for funnel context
	isGeneratingFunnel?: (funnelId: string) => boolean;
	onGlobalGenerationFunnel?: (funnelId: string) => Promise<void>;
	// Auto-navigation callback
	onNavigate?: (funnel: Funnel) => void;
	// Deployment state
	isDeploying?: boolean;
	hasAnyLiveFunnel?: boolean;
	// Create merchant manually callback
	onCreateMerchantManually?: (merchantType: "qualification" | "upsell") => void;
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

export interface CustomerResource {
	customer_resource_id: string; // ID from customers_resources table (NOT the resources table ID)
	company_id: string;
	experience_id: string;
	user_id: string;
	user_name: string;
	membership_plan_id: string;
	membership_product_id?: string;
	download_link?: string;
	product_name: string;
	description?: string;
	image?: string;
	created_at: Date;
	updated_at: Date;
	resourceType?: "WHOP" | "LINK" | "FILE"; // Type from original resource, added by API
	storage_url?: string; // Storage URL from resources table for FILE type downloads
}
