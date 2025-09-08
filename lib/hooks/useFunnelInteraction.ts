import React from "react";

interface FunnelBlock {
	id: string;
	message: string;
	options: {
		text: string;
		nextBlockId: string | null;
	}[];
}

interface FunnelFlow {
	startBlockId: string;
	stages: FunnelStage[];
	blocks: Record<string, FunnelBlock>;
}

interface FunnelStage {
	id: string;
	name: string;
	explanation: string;
	blockIds: string[];
}

export const useFunnelInteraction = (
	funnelFlow: FunnelFlow | null,
	editingBlockId: string | null,
	setEditingBlockId: (blockId: string | null) => void,
	selectedOffer?: string | null,
	performanceMode?: boolean,
	enableCalculationsForOfferSelection?: () => void,
	enableCalculationsForBlockHighlight?: () => void,
) => {
	// State for user interaction
	const [selectedOfferBlockId, setSelectedOfferBlockId] = React.useState<
		string | null
	>(null);
	const [selectedBlockForHighlight, setSelectedBlockForHighlight] =
		React.useState<string | null>(null);

	// Memoized calculation to find all blocks in the 'OFFER' stage.
	const offerBlocks = React.useMemo(() => {
		if (!funnelFlow || !funnelFlow.stages) return [];
		const offerStage = funnelFlow.stages.find((s) =>
			s.name.toUpperCase().includes("OFFER"),
		);
		if (!offerStage) return [];
		return offerStage.blockIds.map((id) => funnelFlow.blocks[id]);
	}, [funnelFlow]);

	// Memoized calculation to determine the path to a highlighted block.
	const highlightedPath = React.useMemo(() => {
		const path = { blocks: new Set<string>(), options: new Set<string>() };
		if (!funnelFlow || !selectedBlockForHighlight) return path;

		const reverseMap: Record<string, string[]> = {};
		Object.values(funnelFlow.blocks).forEach((block) => {
			if (block.options) {
				block.options.forEach((opt) => {
					if (opt.nextBlockId) {
						if (!reverseMap[opt.nextBlockId]) reverseMap[opt.nextBlockId] = [];
						reverseMap[opt.nextBlockId].push(block.id);
					}
				});
			}
		});

		const queue = [selectedBlockForHighlight];
		const visited = new Set([selectedBlockForHighlight]);
		path.blocks.add(selectedBlockForHighlight);

		while (queue.length > 0) {
			const currentId = queue.shift()!;
			const parents = reverseMap[currentId] || [];
			for (const parentId of parents) {
				if (!visited.has(parentId)) {
					visited.add(parentId);
					path.blocks.add(parentId);
					path.options.add(`${parentId}_${currentId}`);
					queue.push(parentId);
				}
			}
		}
		return path;
	}, [funnelFlow, selectedBlockForHighlight]);

	const handleBlockClick = (blockId: string) => {
		if (editingBlockId) return; // Don't allow highlighting when editing

		// Check if this is an offer block
		const isOfferBlock = offerBlocks.some((offer) => offer.id === blockId);

		if (isOfferBlock) {
			// If it's an offer block, enable calculations and set both states
			if (performanceMode && enableCalculationsForOfferSelection) {
				enableCalculationsForOfferSelection();
			}
			setSelectedOfferBlockId(blockId);
			setSelectedBlockForHighlight(blockId);
		} else {
			// For non-offer blocks, enable calculations and toggle highlight
			if (performanceMode && enableCalculationsForBlockHighlight) {
				enableCalculationsForBlockHighlight();
			}
			setSelectedBlockForHighlight((prev) =>
				prev === blockId ? null : blockId,
			);
		}
	};

	// Effect to set the default selected offer for the mobile view.
	React.useEffect(() => {
		if (
			offerBlocks.length > 0 &&
			!offerBlocks.some((b) => b.id === selectedOfferBlockId)
		) {
			setSelectedOfferBlockId(offerBlocks[0].id);
		}
	}, [offerBlocks, selectedOfferBlockId]);

	// Effect to update selected offer when prop changes (for web view highlighting)
	React.useEffect(() => {
		if (selectedOffer) {
			// Enable calculations when offer is selected externally
			if (performanceMode && enableCalculationsForOfferSelection) {
				enableCalculationsForOfferSelection();
			}
			setSelectedOfferBlockId(selectedOffer);
		}
	}, [selectedOffer, performanceMode, enableCalculationsForOfferSelection]);

	// Memoized calculation for the path in the mobile view.
	const selectedPath = React.useMemo(() => {
		const path = { blocks: new Set<string>(), options: new Set<string>() };
		if (!funnelFlow || !selectedOfferBlockId) return path;
		const reverseMap: Record<string, string[]> = {};
		Object.values(funnelFlow.blocks).forEach((block) => {
			if (block.options) {
				block.options.forEach((opt) => {
					if (opt.nextBlockId) {
						if (!reverseMap[opt.nextBlockId]) reverseMap[opt.nextBlockId] = [];
						reverseMap[opt.nextBlockId].push(block.id);
					}
				});
			}
		});
		const queue = [selectedOfferBlockId];
		const visited = new Set<string>();
		while (queue.length > 0) {
			const currentId = queue.shift()!;
			if (visited.has(currentId)) continue;
			visited.add(currentId);
			path.blocks.add(currentId);
			const parents = reverseMap[currentId] || [];
			parents.forEach((parentId) => {
				if (!visited.has(parentId)) {
					path.options.add(`${parentId}_${currentId}`);
					queue.push(parentId);
				}
			});
		}
		return path;
	}, [funnelFlow, selectedOfferBlockId]);

	return {
		selectedOfferBlockId,
		setSelectedOfferBlockId,
		selectedBlockForHighlight,
		setSelectedBlockForHighlight,
		offerBlocks,
		highlightedPath,
		selectedPath,
		handleBlockClick,
	};
};
