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

	// Get offer blocks for selection - Both OFFER and VALUE_DELIVERY stage blocks
	const getOfferBlocks = React.useCallback((currentFunnel: Funnel) => {
		if (!currentFunnel.flow) return [];

		// Get blocks in both OFFER and VALUE_DELIVERY stages with resourceName
		return Object.values(currentFunnel.flow.blocks)
			.filter((block: any) => {
				const isRelevantBlock = currentFunnel.flow.stages.some(
					(stage: any) =>
						stage.cardType === "product" && stage.blockIds.includes(block.id),
				);
				return (
					isRelevantBlock &&
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
