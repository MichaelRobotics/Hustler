const CHECKOUT_KEYS = [
	"id",
	"name",
	"type",
	"category",
	"link",
	"description",
	"whopProductId",
	"image",
	"storageUrl",
	"productImages",
	"price",
	"planId",
	"purchaseUrl",
	"checkoutConfigurationId",
	"displayOrder",
	"createdAt",
	"updatedAt",
] as const;

/**
 * Admins and customers both list every resource in the experience.
 * Customers do not get an owner filter. Writes stay on the existing admin checks.
 */
export function resourceListOwnerFilter(accessLevel: string): "none" | "caller" {
	if (accessLevel === "admin" || accessLevel === "customer") return "none";
	return "caller";
}

export function projectCheckoutResource<T extends Record<string, unknown>>(resource: T): T {
	const projected: Record<string, unknown> = { funnels: [] };
	for (const key of CHECKOUT_KEYS) {
		if (key in resource) projected[key] = resource[key];
	}
	return projected as T;
}
