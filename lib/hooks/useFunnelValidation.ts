"use client";

import React from "react";

interface Funnel {
	id: string;
	name: string;
	flow?: any;
	isDeployed?: boolean;
	wasEverDeployed?: boolean;
	resources?: Resource[];
}

interface Resource {
	id: string;
	type: "AFFILIATE" | "MY_PRODUCTS" | "CONTENT" | "TOOL";
	name: string;
	link: string;
	promoCode?: string;
	category?: string;
}

export const useFunnelValidation = () => {
	const [apiError, setApiError] = React.useState<string | null>(null);
	const [editingBlockId, setEditingBlockId] = React.useState<string | null>(
		null,
	);

	// Get offer blocks for selection - Only OFFER stage blocks, not VALUE_DELIVERY
	const getOfferBlocks = React.useCallback((currentFunnel: Funnel) => {
		if (!currentFunnel.flow) return [];

		// Only get blocks in the OFFER stage with resourceName (paid products)
		return Object.values(currentFunnel.flow.blocks)
			.filter((block: any) => {
				const isOfferBlock = currentFunnel.flow.stages.some(
					(stage: any) =>
						stage.name === "OFFER" && stage.blockIds.includes(block.id),
				);
				return (
					isOfferBlock &&
					block.resourceName &&
					typeof block.resourceName === "string"
				);
			})
			.map((block: any) => ({
				id: block.id,
				name: block.resourceName,
			}));
	}, []);

	return {
		apiError,
		setApiError,
		editingBlockId,
		setEditingBlockId,
		getOfferBlocks,
	};
};
