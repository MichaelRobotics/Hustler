/**
 * Plan-related types
 */

export interface Plan {
	id: string;
	resourceId: string;
	whopProductId?: string | null;
	checkoutConfigurationId?: string | null;
	planId: string;
	purchaseUrl?: string | null;
	initialPrice?: string | null;
	renewalPrice?: string | null;
	currency?: string | null;
	planType?: string | null;
	createdAt: Date;
	updatedAt: Date;
}

export interface PlanFormData {
	planId: string;
	purchaseUrl?: string;
	initialPrice?: string;
	renewalPrice?: string;
	currency?: string;
	planType?: string;
}







