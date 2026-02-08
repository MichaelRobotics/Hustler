"use client";

import React from "react";
import { Bell } from "lucide-react";
import { Heading, Text, Button } from "frosted-ui";

import UnifiedNavigation from "../common/UnifiedNavigation";
import { FunnelBuilderHeader } from "./FunnelBuilderHeader";
// Core Components
import FunnelVisualizer from "./FunnelVisualizer";
import { type TriggerType } from "./TriggerBlock";
import type { TriggerConfig } from "@/lib/types/funnel";
import TriggerPanel from "./TriggerPanel";
import ConfigPanel from "./ConfigPanel";
import NotificationCanvasView from "./NotificationCanvasView";

import { ApiErrorModal } from "./modals/ApiErrorModal";
// Modal Components
import { DeploymentModal } from "./modals/DeploymentModal";
import { OfflineConfirmationModal } from "./modals/OfflineConfirmationModal";
import { ValidationModal } from "./modals/ValidationModal";

// Custom Hooks
import { useFunnelDeployment } from "../../hooks/useFunnelDeployment";
import { useFunnelValidation } from "../../hooks/useFunnelValidation";
import { useModalManagement } from "../../hooks/useModalManagement";

// Types
import type { FunnelNotification, FunnelNotificationInput, FunnelProductFaq, FunnelProductFaqInput } from "@/lib/types/funnel";
import { SEND_DM_STAGE_NAME } from "@/lib/types/funnel";
import { getLastBotMessageFromStage, createMinimalFlow, getUpsellBlockOptions, ensureSendDmStage } from "../../utils/funnelUtils";
import { apiGet, apiPost, apiDelete } from "../../utils/api-client";
import { pickRandomUnusedCrossStageStyle } from "../../utils/crossStageStyles";

// Type definitions
interface Funnel {
	id: string;
	name: string;
	flow?: any;
	membershipTriggerType?: TriggerType; // Membership category trigger
	appTriggerType?: TriggerType; // App category trigger
	membershipTriggerConfig?: TriggerConfig; // Config for membership trigger
	appTriggerConfig?: TriggerConfig; // Config for app trigger
	delayMinutes?: number; // App trigger delay (backward compatibility)
	membershipDelayMinutes?: number; // Membership trigger delay
	isDeployed?: boolean;
	wasEverDeployed?: boolean; // Track if funnel was ever live
	isDraft?: boolean; // Draft mode - prevents deployment when new cards don't have complete connections
	resources?: Resource[];
	merchantType?: "qualification" | "upsell"; // Merchant type: qualification or upsell
}

interface Resource {
	id: string;
	type: "AFFILIATE" | "MY_PRODUCTS" | "CONTENT" | "TOOL";
	name: string;
	link: string;
	promoCode?: string; // Keep original field name for consistency with AdminPanel
	category?: string;
	description?: string;
}

interface AIFunnelBuilderPageProps {
	funnel: Funnel;
	onBack: () => void;
	onUpdate: (funnel: Funnel) => void;
	onGoToFunnelProducts: () => void;
	onGoToPreview?: () => void; // New: Navigate to separate preview page
	onGenerationComplete?: (funnelId: string) => void; // New: callback when generation is fully complete
	onGenerationError?: (funnelId: string, error: Error) => void; // New: callback when generation fails
	user?: { experienceId?: string; experience?: { id: string } } | null;
	hasAnyLiveFunnel?: boolean; // New: indicates if any funnel is live globally
	isSingleMerchant?: boolean; // New: indicates if there's only 1 merchant card
	/** Pre-loaded resources (e.g. from AdminPanel allResources). When set, avoids a separate /api/resources fetch for card product dropdown. */
	allResources?: Array<{ id: string; name: string }>;
}

/**
 * AI Funnel Builder Page Component
 *
 * Main component for creating and editing marketing funnels. Orchestrates:
 * - Resource management sidebar
 * - Main canvas for visualization
 * - All modals for resources and generations
 * - Core AI interaction logic for funnel flow generation
 */
const AIFunnelBuilderPage: React.FC<AIFunnelBuilderPageProps> = ({
	funnel,
	onBack,
	onUpdate,
	onGoToFunnelProducts,
	onGoToPreview,
	onGenerationComplete,
	onGenerationError,
	user,
	hasAnyLiveFunnel = false, // Default to false if not provided
	isSingleMerchant = false, // Default to false if not provided
	allResources: allResourcesProp,
}) => {
	// State Management
	const [currentFunnel, setCurrentFunnel] = React.useState<Funnel>(funnel);
	const [showTriggerPanel, setShowTriggerPanel] = React.useState(false);
	const [triggerPanelCategory, setTriggerPanelCategory] = React.useState<"Membership" | "App" | null>(null);
	const [hasUnsavedAppTriggerConfig, setHasUnsavedAppTriggerConfig] = React.useState(false);
	const [hasUnsavedMembershipTriggerConfig, setHasUnsavedMembershipTriggerConfig] = React.useState(false);
	const [showConfigureView, setShowConfigureView] = React.useState(false); // Configure mode for notification canvas
	const [showConfigPanel, setShowConfigPanel] = React.useState(true); // Show config panel in Configure view
	
	// Get merchant type from funnel (default to "qualification" for backward compatibility)
	const merchantType = currentFunnel.merchantType || "qualification";
	const hasFlow = !!currentFunnel.flow;
	
	// Get flow to use (actual flow or minimal flow). For upsell, normalize block options from upsellBlockId/downsellBlockId.
	// Pass validBlockIds so options never point to missing blocks (avoids "Invalid option connections" draft).
	// Always ensure a SEND_DM stage exists so the DM icon/card is available for all funnels.
	const flowToUse = React.useMemo(() => {
		let raw = hasFlow ? currentFunnel.flow : createMinimalFlow(currentFunnel.id, merchantType);
		if (!raw) return raw;
		// Ensure SEND_DM stage is present (for old funnels that don't have one)
		raw = ensureSendDmStage(raw, currentFunnel.id);
		if (merchantType !== "upsell") return raw;
		const validBlockIds = new Set(Object.keys(raw.blocks ?? {}));
		const blocks = { ...raw.blocks };
		Object.keys(blocks).forEach((id) => {
			const b = blocks[id] as any;
			if (b && (b.upsellBlockId !== undefined || b.downsellBlockId !== undefined)) {
				blocks[id] = { ...b, options: getUpsellBlockOptions(b, validBlockIds) };
			}
		});
		return { ...raw, blocks };
	}, [hasFlow, currentFunnel.flow, currentFunnel.id, merchantType, createMinimalFlow]);
	
	// Notification state
	const [notifications, setNotifications] = React.useState<FunnelNotification[]>([]);
	// Ref to avoid applying stale preload when funnel changes before fetch completes
	const notificationsFunnelIdRef = React.useRef<string | null>(null);
	// Ref to hold remaining stage notifications after delete (for renumber + persist)
	const remainingAfterDeleteRef = React.useRef<FunnelNotification[] | null>(null);

	// Sort so reset (delete/complete) cards appear last in the list
	const sortNotificationsWithResetLast = React.useCallback((list: FunnelNotification[]) => {
		return [...list].sort((a, b) => {
			if (a.isReset !== b.isReset) return a.isReset ? 1 : -1;
			if (a.stageId !== b.stageId) return a.stageId.localeCompare(b.stageId);
			return a.sequence - b.sequence;
		});
	}, []);

	// Selection state for notifications and resets
	const [selectedNotificationId, setSelectedNotificationId] = React.useState<string | null>(null);
	const [selectedNotificationSequence, setSelectedNotificationSequence] = React.useState<number | null>(null);
	const [selectedNotificationStageId, setSelectedNotificationStageId] = React.useState<string | null>(null);
	const [selectedResetId, setSelectedResetId] = React.useState<string | null>(null);
	const [selectedResetStageId, setSelectedResetStageId] = React.useState<string | null>(null);
	
	// Product FAQs state
	const [productFaqs, setProductFaqs] = React.useState<FunnelProductFaq[]>([]);
	
	// Resources and funnels state for trigger selection
	const [resources, setResources] = React.useState<Array<{ id: string; name: string }>>([]);
	const [funnels, setFunnels] = React.useState<Array<{ id: string; name: string }>>([]);
	const [qualificationFunnels, setQualificationFunnels] = React.useState<Array<{ id: string; name: string }>>([]);
	const [upsellFunnels, setUpsellFunnels] = React.useState<Array<{ id: string; name: string }>>([]);
	const [loadingResources, setLoadingResources] = React.useState(false);
	const [loadingFunnels, setLoadingFunnels] = React.useState(false);

	// State for pending option selection (selection mode)
	const [pendingOptionSelection, setPendingOptionSelection] = React.useState<{
		isActive: boolean;
		sourceBlockId: string;
		optionText: string;
		newBlockId: string;
		nextStageBlockIds: string[];
		/** When set, selection sets source block's upsellBlockId or downsellBlockId instead of adding option */
		upsellKind?: "upsell" | "downsell";
		/** When true (last-stage upsell/downsell), only the new placeholder may be selected; above-stage cards blocked */
		onlyPlaceholderSelectable?: boolean;
		/** When set, reconnecting existing option (change connection); update options[optionIndex] instead of adding option */
		optionIndex?: number;
		/** Option's nextBlockId before we set it to new block; restored on cancel */
		previousNextBlockId?: string | null;
	} | null>(null);

	// State for pending delete
	const [pendingDelete, setPendingDelete] = React.useState<{
		blockId: string;
		affectedOptions: Array<{ blockId: string; optionIndex: number }>; // Options leading TO deleted card
		outgoingConnections: Array<{ targetBlockId: string }>; // Options FROM deleted card
		orphanedNextStageCards: string[]; // Cards in next stage with no incoming connections
		brokenPreviousStageCards: string[]; // Cards in previous stage with no outgoing connections
		invalidOptions: Array<{ blockId: string; optionIndex: number; reason: string }>; // Invalid option connections
	} | null>(null);

	// State for pending card type selection (when creating new stage)
	const [pendingCardTypeSelection, setPendingCardTypeSelection] = React.useState<{
		newBlockId: string;
		newStageId: string;
		sourceBlockId: string;
		optionText: string;
		/** When set, reconnecting existing option (change connection); after type selection set options[optionIndex].nextBlockId */
		optionIndex?: number;
	} | null>(null);

	// Refs
	const funnelVisualizerRef = React.useRef<{
		handleBlockClick: (blockId: string) => void;
		enableCalculationsForGoLive: () => void;
	}>(null);

	// Custom Hooks
	const deployment = useFunnelDeployment(currentFunnel, (updatedFunnel) => {
		// Update local state immediately for UI responsiveness
		setCurrentFunnel(updatedFunnel);
		// Also update parent component
		onUpdate(updatedFunnel);
	}, () =>
		funnelVisualizerRef.current?.enableCalculationsForGoLive?.(),
		user,
	);
	const validation = useFunnelValidation();
	const modals = useModalManagement();

	// Effects
	React.useEffect(() => {
		setCurrentFunnel(funnel);
		setHasUnsavedAppTriggerConfig(false);
		setHasUnsavedMembershipTriggerConfig(false);
	}, [funnel]);

	// Recompute orphaned/broken and draft whenever current flow changes (so abandoned block gets red highlight after connection change).
	// Use flowToUse (normalized for upsell: options synced from upsellBlockId/downsellBlockId) so validation matches what we display and cross-connections are respected.
	// Skip error check while user is in Upsell/Downsell or qualification selection mode; run after they have made a selection.
	React.useEffect(() => {
		if (!currentFunnel.flow || !currentFunnel.id) return;
		if (pendingOptionSelection?.isActive || pendingCardTypeSelection) return;
		const flowToValidate = flowToUse ?? currentFunnel.flow;

		// Find invalid options
		const invalidOptions = findInvalidOptions(flowToValidate);

		// Find orphaned cards (cards with no normal incoming connection: must have at least one inbound from previous stage; cross-only inbounds don't count)
		const orphanedCards: string[] = [];
		for (let stageIndex = 0; stageIndex < flowToValidate.stages.length; stageIndex++) {
			const stage = flowToValidate.stages[stageIndex];
			if (!stage || !stage.blockIds || !Array.isArray(stage.blockIds)) continue;
			if (stageIndex === 0) continue; // First stage has no previous stage

			const previousStage = flowToValidate.stages[stageIndex - 1];
			if (!previousStage?.blockIds?.length) continue;

			for (const cardId of stage.blockIds) {
				const hasNormalIncoming = previousStage.blockIds.some((prevBlockId: string) => {
					const block = flowToValidate.blocks[prevBlockId] as any;
					if (!block || !block.options || !Array.isArray(block.options)) return false;
					return block.options.some((opt: any) => opt.nextBlockId === cardId);
				});
				if (!hasNormalIncoming) {
					orphanedCards.push(cardId);
				}
			}
		}

		// Find broken cards (cards with no outgoing connections to next stage)
		const brokenCards: string[] = [];
		for (let stageIndex = 0; stageIndex < flowToValidate.stages.length - 1; stageIndex++) {
			const stage = flowToValidate.stages[stageIndex];
			const nextStage = flowToValidate.stages[stageIndex + 1];
			if (!stage || !stage.blockIds || !Array.isArray(stage.blockIds)) continue;
			if (!nextStage) continue; // No next stage = OK (last stage)

			// If next stage is empty, all cards in current stage are broken
			if (!nextStage.blockIds || nextStage.blockIds.length === 0) {
				// All cards in current stage are broken (no valid next stage)
				for (const cardId of stage.blockIds) {
					brokenCards.push(cardId);
				}
				continue;
			}

			for (const cardId of stage.blockIds) {
				const block = flowToValidate.blocks[cardId];
				if (!block || !block.options || !Array.isArray(block.options)) {
					brokenCards.push(cardId);
					continue;
				}

				// Normal connection: option pointing to a card in the next stage
				const hasNormalConnection = block.options.some((opt: any) =>
					opt.nextBlockId && nextStage.blockIds.includes(opt.nextBlockId)
				);
				// Cross-stage outbound: upsell/downsell pointing to a block not in the next stage (treat as valid outbound)
				const hasCrossStageOutbound = (block as any).upsellBlockId && !nextStage.blockIds.includes((block as any).upsellBlockId)
					|| (block as any).downsellBlockId && !nextStage.blockIds.includes((block as any).downsellBlockId);
				if (!hasNormalConnection && !hasCrossStageOutbound) {
					brokenCards.push(cardId);
				}
			}
		}

		// If there are any issues, set pendingDelete to show red highlights (including abandoned block after connection change)
		if (invalidOptions.length > 0 || orphanedCards.length > 0 || brokenCards.length > 0) {
			setPendingDelete({
				blockId: '', // No specific block being deleted
				affectedOptions: [],
				outgoingConnections: [],
				orphanedNextStageCards: orphanedCards,
				brokenPreviousStageCards: brokenCards,
				invalidOptions,
			});
		} else {
			// Clear pending delete if no issues
			setPendingDelete(null);
		}

		// Recalculate and update draft status (use same normalized flow for consistency)
		const draftResult = checkDraftStatus(flowToValidate, currentFunnel);
		logDraftStatus(draftResult);
		if (currentFunnel.isDraft !== draftResult.isDraft) {
			const funnelWithDraft = { ...currentFunnel, isDraft: draftResult.isDraft };
			setCurrentFunnel(funnelWithDraft);
			onUpdate(funnelWithDraft);
		}
	}, [currentFunnel.id, currentFunnel.flow, flowToUse, pendingOptionSelection?.isActive, !!pendingCardTypeSelection]); // Run after flow change or when selection ends (so error check runs after user selects a card)

	// Helper function to find invalid option connections.
	// For upsell/downsell options (option index 0 or 1 on blocks with upsellBlockId/downsellBlockId), only "target does not exist" is invalid;
	// "target not in any stage" and "target in earlier stage" are allowed so 2 cross-connections don't trigger draft.
	const findInvalidOptions = (flow: any): Array<{ blockId: string; optionIndex: number; reason: string }> => {
		const invalidOptions: Array<{ blockId: string; optionIndex: number; reason: string }> = [];
		
		if (!flow || !flow.blocks || !flow.stages) return invalidOptions;

		Object.values(flow.blocks).forEach((block: any) => {
			if (!block || !block.options || !Array.isArray(block.options)) return;

			const isUpsellBlock = (block.upsellBlockId !== undefined || block.downsellBlockId !== undefined);
			
			// Find which stage this block is in
			const blockStage = flow.stages.find((s: any) =>
				s && s.blockIds && Array.isArray(s.blockIds) && s.blockIds.includes(block.id)
			);
			if (!blockStage) return;
			const blockStageIndex = flow.stages.indexOf(blockStage);
			
			block.options.forEach((opt: any, index: number) => {
				if (!opt.nextBlockId) return;
				
				// Check if target block exists (always invalid if missing)
				const targetBlock = flow.blocks[opt.nextBlockId];
				if (!targetBlock) {
					invalidOptions.push({
						blockId: block.id,
						optionIndex: index,
						reason: 'Target block does not exist'
					});
					return;
				}
				
				// For upsell/downsell cross-connections (option 0 or 1 on upsell block), skip stage checks so 2 cross outbounds don't trigger draft
				if (isUpsellBlock && (index === 0 || index === 1)) return;
				
				// Check if target block is in a valid stage (must be in next stage or later)
				const targetStage = flow.stages.find((s: any) =>
					s && s.blockIds && Array.isArray(s.blockIds) && s.blockIds.includes(opt.nextBlockId)
				);
				if (!targetStage) {
					invalidOptions.push({
						blockId: block.id,
						optionIndex: index,
						reason: 'Target block not in any stage'
					});
					return;
				}
				
				const targetStageIndex = flow.stages.indexOf(targetStage);
				
				// Option must point to a block in the same stage or later (only earlier stage is invalid; same-stage upsell/downsell is allowed)
				if (targetStageIndex < blockStageIndex) {
					invalidOptions.push({
						blockId: block.id,
						optionIndex: index,
						reason: 'Target block is in earlier stage'
					});
				}
			});
		});
		
		return invalidOptions;
	};

	const handleBlockUpdate = (updatedBlock: any) => {
		if (!updatedBlock) return;

		// --- SEND_DM block: add/remove from actual flow on demand ---
		const isSendDmBlock = !!updatedBlock.sendDmBlock;
		const dmHasRealMessage = !!(updatedBlock.message && updatedBlock.message !== "Write DM there...");

		if (isSendDmBlock) {
			const sendDmBlockId = updatedBlock.id;
			const sendDmStageId = `send-dm-stage-${currentFunnel.id}`;
			const existingFlow = currentFunnel.flow;

			if (dmHasRealMessage) {
				// User saved a real DM message → ensure SEND_DM stage exists in actual flow
				if (existingFlow) {
					const hasSendDmStage = existingFlow.stages?.some((s: any) => s.name === SEND_DM_STAGE_NAME);
					const newFlow = { ...existingFlow };
					if (!hasSendDmStage) {
						// Inject SEND_DM stage + block into the actual flow
						newFlow.stages = [
							{ id: sendDmStageId, name: SEND_DM_STAGE_NAME, blockIds: [sendDmBlockId], explanation: "Send DM to user (Whop native chat); not shown in-app" },
							...existingFlow.stages,
						];
						newFlow.blocks = { ...existingFlow.blocks, [sendDmBlockId]: updatedBlock };
						newFlow.startBlockId = sendDmBlockId;
						// Point DM block option to original startBlockId
						if (!updatedBlock.options?.[0]?.nextBlockId) {
							newFlow.blocks[sendDmBlockId] = { ...updatedBlock, options: [{ text: "Continue", nextBlockId: existingFlow.startBlockId }] };
						}
					} else {
						// Stage already exists, just update the block
						newFlow.blocks = { ...existingFlow.blocks, [sendDmBlockId]: updatedBlock };
					}
					const updatedFunnel = { ...currentFunnel, flow: newFlow };
					setCurrentFunnel(updatedFunnel);
					onUpdate(updatedFunnel);
					validation.setEditingBlockId(null);
				} else {
					// No flow yet: create minimal flow with the DM message
					const minimalFlow = createMinimalFlow(currentFunnel.id, merchantType);
					minimalFlow.blocks[sendDmBlockId] = updatedBlock;
					const updatedFunnel = { ...currentFunnel, flow: minimalFlow };
					setCurrentFunnel(updatedFunnel);
					onUpdate(updatedFunnel);
					validation.setEditingBlockId(null);
				}
			} else {
				// User deleted/reset the DM → remove SEND_DM stage + block from actual flow
				if (existingFlow) {
					const newFlow = { ...existingFlow };
					// Find the DM block's next target so we can restore startBlockId
					const dmBlock = existingFlow.blocks?.[sendDmBlockId];
					const nextBlockId = dmBlock?.options?.[0]?.nextBlockId ?? existingFlow.startBlockId;
					// Remove stage and block
					newFlow.stages = existingFlow.stages.filter((s: any) => s.name !== SEND_DM_STAGE_NAME);
					const { [sendDmBlockId]: _removed, ...remainingBlocks } = existingFlow.blocks;
					newFlow.blocks = remainingBlocks;
					// Restore startBlockId to the next real block
					if (existingFlow.startBlockId === sendDmBlockId) {
						newFlow.startBlockId = nextBlockId;
					}
					const updatedFunnel = { ...currentFunnel, flow: newFlow };
					setCurrentFunnel(updatedFunnel);
					onUpdate(updatedFunnel);
					validation.setEditingBlockId(null);
				}
				// If no flow, nothing to remove
			}
			return;
		}

		// For upsell blocks, keep options in sync with upsellBlockId/downsellBlockId (for layout/lines)
		if (merchantType === "upsell" && (updatedBlock.upsellBlockId !== undefined || updatedBlock.downsellBlockId !== undefined)) {
			updatedBlock = {
				...updatedBlock,
				options: getUpsellBlockOptions(updatedBlock),
			};
		}
		
		// If flow is null and we're working with minimal flow, save the welcome message (same for qualification and upsell)
		if (!hasFlow) {
			// Update the minimal flow structure
			const minimalFlow = createMinimalFlow(currentFunnel.id, merchantType);
			const updatedMinimalFlow = {
				...minimalFlow,
				blocks: {
					...minimalFlow.blocks,
					[updatedBlock.id]: updatedBlock
				}
			};
			
			// Save welcome message to funnel (store it in the flow field as the minimal flow structure)
			const updatedFunnel = {
				...currentFunnel,
				flow: updatedMinimalFlow
			};
			setCurrentFunnel(updatedFunnel);
			onUpdate(updatedFunnel);
			validation.setEditingBlockId(null);
			return;
		}
		
		// Original logic for when flow exists
		const newFlow = { ...currentFunnel.flow };
		newFlow.blocks[updatedBlock.id] = updatedBlock;

		let updatedFunnel = { ...currentFunnel, flow: newFlow };

		// Sync card product selection to app and membership trigger filters (qualification/upsell only)
		if (merchantType === "qualification" || merchantType === "upsell") {
			const collectedIds: string[] = [];
			const blocks = Object.values(newFlow.blocks) as Array<{ id: string; resourceId?: string | null }>;
			for (const block of blocks) {
				if (!block?.resourceId) continue;
				if (merchantType === "upsell") {
					collectedIds.push(block.resourceId);
				} else {
					const stage = newFlow.stages?.find((s: any) => s?.blockIds?.includes(block.id));
					if (stage?.cardType === "product") collectedIds.push(block.resourceId);
				}
			}
			const filterIds = collectedIds.length ? [...new Set(collectedIds)] : undefined;
			updatedFunnel = {
				...updatedFunnel,
				appTriggerConfig: { ...currentFunnel.appTriggerConfig, filterResourceIdsRequired: filterIds },
				membershipTriggerConfig: { ...currentFunnel.membershipTriggerConfig, filterResourceIdsRequired: filterIds },
			};
		}

		setCurrentFunnel(updatedFunnel);
		onUpdate(updatedFunnel);
		validation.setEditingBlockId(null);
		
		// Check draft status after block update (use normalized flow for upsell so cross-connections are respected)
		const flowForDraft =
			merchantType === "upsell"
				? (() => {
						const validBlockIds = new Set(Object.keys(newFlow.blocks ?? {}));
						const blocks = { ...newFlow.blocks };
						Object.keys(blocks).forEach((id) => {
							const b = (blocks as any)[id];
							if (b && (b.upsellBlockId !== undefined || b.downsellBlockId !== undefined)) {
								(blocks as any)[id] = { ...b, options: getUpsellBlockOptions(b, validBlockIds) };
							}
						});
						return { ...newFlow, blocks };
					})()
				: newFlow;
		const draftResult = checkDraftStatus(flowForDraft, updatedFunnel);
		logDraftStatus(draftResult);
		if (updatedFunnel.isDraft !== draftResult.isDraft) {
			const funnelWithDraft = { ...updatedFunnel, isDraft: draftResult.isDraft };
			setCurrentFunnel(funnelWithDraft);
			onUpdate(funnelWithDraft);
		}

		// Check if pending delete issues are resolved (use normalized flow for upsell so cross-connections are respected)
		if (pendingDelete) {
			const flowToValidate =
				merchantType === "upsell"
					? (() => {
							const validBlockIds = new Set(Object.keys(newFlow.blocks ?? {}));
							const blocks = { ...newFlow.blocks };
							Object.keys(blocks).forEach((id) => {
								const b = (blocks as any)[id];
								if (b && (b.upsellBlockId !== undefined || b.downsellBlockId !== undefined)) {
									(blocks as any)[id] = { ...b, options: getUpsellBlockOptions(b, validBlockIds) };
								}
							});
							return { ...newFlow, blocks };
						})()
					: newFlow;

			// Recalculate orphaned and broken cards
			const orphanedCards: string[] = [];
			const brokenCards: string[] = [];

			// Find orphaned cards (no normal incoming: must have at least one inbound from previous stage)
			for (let stageIndex = 0; stageIndex < flowToValidate.stages.length; stageIndex++) {
				const stage = flowToValidate.stages[stageIndex];
				if (!stage || !stage.blockIds || !Array.isArray(stage.blockIds)) continue;
				if (stageIndex === 0) continue;

				const previousStage = flowToValidate.stages[stageIndex - 1];
				if (!previousStage?.blockIds?.length) continue;

				for (const cardId of stage.blockIds) {
					const hasNormalIncoming = previousStage.blockIds.some((prevBlockId: string) => {
						const block = flowToValidate.blocks[prevBlockId] as any;
						if (!block || !block.options || !Array.isArray(block.options)) return false;
						return block.options.some((opt: any) => opt.nextBlockId === cardId);
					});
					if (!hasNormalIncoming) orphanedCards.push(cardId);
				}
			}

			// Find broken cards (cards with no outgoing connections to next stage)
			for (let stageIndex = 0; stageIndex < flowToValidate.stages.length - 1; stageIndex++) {
				const stage = flowToValidate.stages[stageIndex];
				const nextStage = flowToValidate.stages[stageIndex + 1];
				if (!stage || !stage.blockIds || !Array.isArray(stage.blockIds)) continue;
				if (!nextStage) continue; // No next stage = OK

				// If next stage is empty, mark all cards as broken
				if (!nextStage.blockIds || nextStage.blockIds.length === 0) {
					for (const cardId of stage.blockIds) {
						brokenCards.push(cardId);
					}
					continue;
				}

				for (const cardId of stage.blockIds) {
					const block = flowToValidate.blocks[cardId];
					if (!block || !block.options || !Array.isArray(block.options)) {
						brokenCards.push(cardId);
						continue;
					}

					const hasNormalConnection = block.options.some((opt: any) =>
						opt.nextBlockId && nextStage.blockIds.includes(opt.nextBlockId)
					);
					const hasCrossStageOutbound = (block as any).upsellBlockId && !nextStage.blockIds.includes((block as any).upsellBlockId)
						|| (block as any).downsellBlockId && !nextStage.blockIds.includes((block as any).downsellBlockId);
					if (!hasNormalConnection && !hasCrossStageOutbound) {
						brokenCards.push(cardId);
					}
				}
			}

			// Recalculate invalid options
			const invalidOptions = findInvalidOptions(flowToValidate);

			// If no orphaned, broken cards, or invalid options remain, clear pending delete
			if (orphanedCards.length === 0 && brokenCards.length === 0 && invalidOptions.length === 0) {
				setPendingDelete(null);
			} else {
				// Update pending delete with current state
				setPendingDelete({
					...pendingDelete,
					orphanedNextStageCards: orphanedCards,
					brokenPreviousStageCards: brokenCards,
					invalidOptions,
				});
			}
		}
	};

	// Check draft status function; returns isDraft and reason (when draft) for logging
	const checkDraftStatus = (flow: any, funnel?: Funnel): { isDraft: boolean; reason?: string } => {
		// Check if at least one trigger is set
		if (funnel) {
			const hasMembershipTrigger = !!funnel.membershipTriggerType;
			const hasAppTrigger = !!funnel.appTriggerType;
			if (!hasMembershipTrigger && !hasAppTrigger) {
				return { isDraft: true, reason: "No trigger set (set Membership or App trigger)" };
			}
		}

		if (!flow || !flow.blocks || !flow.stages) return { isDraft: false };

		// Check for empty stages (broken flow indicator)
		for (let i = 0; i < flow.stages.length; i++) {
			const stage = flow.stages[i];
			if (i === 0) continue;
			if (i === flow.stages.length - 1) continue;
			if (!stage.blockIds || stage.blockIds.length === 0) {
				return { isDraft: true, reason: "Empty stage in the middle of the funnel" };
			}
		}

		const invalidOptions = findInvalidOptions(flow);
		if (invalidOptions.length > 0) {
			return { isDraft: true, reason: "Invalid option connections (options point to missing blocks)" };
		}

		const allBlocks = Object.values(flow.blocks) as Array<any>;
		const newBlocks = allBlocks.filter(
			(block: any) => block && block.id && typeof block.id === 'string' && block.id.startsWith('new_block_')
		);

		if (newBlocks.length > 0) {
			for (const newBlock of newBlocks) {
				if (!newBlock || !newBlock.id) continue;
				const newBlockStage = flow.stages.find((s: any) =>
					s && s.blockIds && Array.isArray(s.blockIds) && s.blockIds.includes(newBlock.id)
				);
				if (!newBlockStage) continue;
				const stageIndex = flow.stages.indexOf(newBlockStage);
				const nextStage = flow.stages[stageIndex + 1];
				if (!nextStage) continue;
				if (!nextStage.blockIds || nextStage.blockIds.length === 0) {
					return { isDraft: true, reason: "New card's next stage is empty" };
				}
				const nextNextStage = flow.stages[stageIndex + 2];
				if (!nextNextStage) {
					if (nextStage.blockIds && nextStage.blockIds.length > 0) continue;
					return { isDraft: true, reason: "New card's next stage is empty" };
				}
				const hasNextStageConnection = newBlock.options && Array.isArray(newBlock.options) && newBlock.options.some((opt: any) => {
					if (!opt || !opt.nextBlockId) return false;
					return nextStage.blockIds && Array.isArray(nextStage.blockIds) && nextStage.blockIds.includes(opt.nextBlockId);
				});
				if (!hasNextStageConnection) {
					return { isDraft: true, reason: `New card "${newBlock.id}" has no connection to the next stage` };
				}
			}
		}

		// Orphaned cards: each block must have at least one normal (non-cross) incoming connection from the previous stage
		for (let stageIndex = 0; stageIndex < flow.stages.length; stageIndex++) {
			const stage = flow.stages[stageIndex];
			if (!stage || !stage.blockIds || !Array.isArray(stage.blockIds)) continue;
			if (stageIndex === 0) continue;

			const previousStage = flow.stages[stageIndex - 1];
			if (!previousStage?.blockIds?.length) continue;

			for (const cardId of stage.blockIds) {
				const hasNormalIncoming = previousStage.blockIds.some((prevBlockId: string) => {
					const block = flow.blocks[prevBlockId] as any;
					if (!block || !block.options || !Array.isArray(block.options)) return false;
					return block.options.some((opt: any) => opt.nextBlockId === cardId);
				});
				if (!hasNormalIncoming) {
					return { isDraft: true, reason: `Card "${cardId}" has no normal incoming connection (need at least one from previous stage)` };
				}
			}
		}

		// Broken cards
		for (let stageIndex = 0; stageIndex < flow.stages.length - 1; stageIndex++) {
			const stage = flow.stages[stageIndex];
			const nextStage = flow.stages[stageIndex + 1];
			if (!stage || !stage.blockIds || !Array.isArray(stage.blockIds)) continue;
			if (!nextStage) continue;
			if (!nextStage.blockIds || nextStage.blockIds.length === 0) {
				return { isDraft: true, reason: "Empty next stage (cards in previous stage have no valid target)" };
			}
			for (const cardId of stage.blockIds) {
				const block = flow.blocks[cardId];
				if (!block || !block.options || !Array.isArray(block.options)) {
					return { isDraft: true, reason: `Card "${cardId}" has no options` };
				}
				const hasNormalConnection = block.options.some((opt: any) =>
					opt.nextBlockId && nextStage.blockIds.includes(opt.nextBlockId)
				);
				const hasCrossStageOutbound = (block as any).upsellBlockId && !nextStage.blockIds.includes((block as any).upsellBlockId)
					|| (block as any).downsellBlockId && !nextStage.blockIds.includes((block as any).downsellBlockId);
				if (!hasNormalConnection && !hasCrossStageOutbound) {
					return { isDraft: true, reason: `Card "${cardId}" has no connection to the next stage` };
				}
			}
		}

		// Draft when any product-selectable card has no product selected
		if (flow.blocks && flow.stages && funnel) {
			const mt = funnel.merchantType ?? "qualification";
			for (const block of Object.values(flow.blocks) as Array<any>) {
				if (!block?.id) continue;
				const stage = flow.stages.find((s: any) => s?.blockIds?.includes(block.id));
				const hasProductSelection = mt === "upsell" || stage?.cardType === "product";
				if (hasProductSelection && !block.resourceId) {
					return { isDraft: true, reason: "Select a product for all product cards" };
				}
			}
		}

		return { isDraft: false };
	};

	const logDraftStatus = (result: { isDraft: boolean; reason?: string }) => {
		if (result.isDraft) {
			console.log("[Funnel] Draft —", result.reason ?? "Unknown reason");
		} else {
			console.log("[Funnel] Go Live — ready to deploy");
		}
	};

	// Change connection: same flow as add-new-option (show new placeholder + existing cards; user picks new or existing)
	const handleOptionConnectRequest = (blockId: string, optionIndex: number) => {
		if (!currentFunnel.flow) return;
		const block = currentFunnel.flow.blocks[blockId];
		if (!block?.options?.[optionIndex]) return;

		const optionText = block.options[optionIndex].text;
		const previousNextBlockId = block.options[optionIndex].nextBlockId ?? null;

		const currentStage = currentFunnel.flow.stages.find((stage: any) =>
			stage.blockIds && stage.blockIds.includes(blockId)
		);
		if (!currentStage) return;

		const currentStageIndex = currentFunnel.flow.stages.indexOf(currentStage);
		const nextStage = currentFunnel.flow.stages[currentStageIndex + 1];

		// No next stage: create new stage + placeholder, show card type selection
		if (!nextStage) {
			const newStageId = `stage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
			const newBlockId = `new_block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
			const placeholderBlock = {
				id: newBlockId,
				message: "",
				options: [],
			};
			const newFlow = { ...currentFunnel.flow };
			newFlow.blocks[newBlockId] = placeholderBlock;
			const newStage: any = {
				id: newStageId,
				name: "New Stage",
				explanation: "",
				blockIds: [newBlockId],
			};
			newFlow.stages.push(newStage);
			const updatedFunnel = { ...currentFunnel, flow: newFlow };
			setCurrentFunnel(updatedFunnel);
			setPendingCardTypeSelection({
				newBlockId,
				newStageId,
				sourceBlockId: blockId,
				optionText,
				optionIndex,
			});
			return;
		}

		// Next stage exists: create new block (stage type), add to next stage, enter selection mode (do not set option yet; arrow stays on old connection until user selects)
		const stageCardType = nextStage.cardType ||
			(nextStage.name === "OFFER" || nextStage.name === "VALUE_DELIVERY" || nextStage.name === "TRANSITION" || nextStage.name === "SEND_DM"
				? "product"
				: "qualification");

		const newBlockId = `new_block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
		const newBlock = {
			id: newBlockId,
			message: "New conversation block",
			options: [],
			...(stageCardType === "product" ? { resourceName: undefined } : {}),
		};

		const newFlow = { ...currentFunnel.flow };
		newFlow.blocks[newBlockId] = newBlock;
		const updatedNextStage = {
			...nextStage,
			blockIds: [...(nextStage.blockIds || []), newBlockId],
		};
		newFlow.stages[currentStageIndex + 1] = updatedNextStage;

		const updatedFunnel = { ...currentFunnel, flow: newFlow };
		setCurrentFunnel(updatedFunnel);

		const existingNextStageBlockIds = (nextStage.blockIds || []).filter((id: string) => id !== newBlockId);
		setPendingOptionSelection({
			isActive: true,
			sourceBlockId: blockId,
			optionText,
			newBlockId,
			nextStageBlockIds: existingNextStageBlockIds,
			optionIndex,
			previousNextBlockId,
		});
	};

	// Handle adding new option - immediately create new card and enter selection mode
	const handleAddNewOption = (blockId: string, optionText: string) => {
		if (!currentFunnel.flow) return;

		// Find current block's stage
		const currentStage = currentFunnel.flow.stages.find((stage: any) =>
			stage.blockIds && stage.blockIds.includes(blockId)
		);
		if (!currentStage) return;

		const currentStageIndex = currentFunnel.flow.stages.indexOf(currentStage);
		const nextStage = currentFunnel.flow.stages[currentStageIndex + 1];

		// If no next stage, create a new stage
		if (!nextStage) {
			// Create new stage
			const newStageId = `stage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
			// Generate new block ID
			const newBlockId = `new_block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
			
			// Create a placeholder block so the card can be rendered with card type selection UI
			const placeholderBlock = {
				id: newBlockId,
				message: "", // Empty message - will be set when card type is selected
				options: [],
			};
			
			const newFlow = { ...currentFunnel.flow };
			newFlow.blocks[newBlockId] = placeholderBlock;
			
			const newStage: any = {
				id: newStageId,
				name: "New Stage",
				explanation: "",
				blockIds: [newBlockId],
			};
			
			newFlow.stages.push(newStage);
			
			// Update local state only; persist only after user selects type and then card
			const updatedFunnel = { ...currentFunnel, flow: newFlow };
			setCurrentFunnel(updatedFunnel);
			
			// Show card type selection (block already exists, so it will render)
			setPendingCardTypeSelection({
				newBlockId,
				newStageId,
				sourceBlockId: blockId,
				optionText: optionText,
			});
			return;
		}

		// Determine card type from existing stage
		const stageCardType = nextStage.cardType || 
			(nextStage.name === "OFFER" || nextStage.name === "VALUE_DELIVERY" || nextStage.name === "TRANSITION" || nextStage.name === "SEND_DM" 
				? "product" 
				: "qualification");

		// Generate unique block ID for new card
		const newBlockId = `new_block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

		// Create new block based on stage card type
		const newBlock = {
			id: newBlockId,
			message: "New conversation block",
			options: [],
			...(stageCardType === "product" ? { resourceName: undefined } : {}),
		};

		// Add new block to flow
		const newFlow = { ...currentFunnel.flow };
		newFlow.blocks[newBlockId] = newBlock;

		// Add block to next stage
		const updatedNextStage = {
			...nextStage,
			blockIds: [...(nextStage.blockIds || []), newBlockId],
		};
		newFlow.stages[currentStageIndex + 1] = updatedNextStage;

		// Update local state only; persist when user selects card in handleCardSelection
		const updatedFunnel = { ...currentFunnel, flow: newFlow };
		setCurrentFunnel(updatedFunnel);

		// Enter selection mode - highlight new card and existing cards in next stage
		// Get existing block IDs (before adding the new one)
		const existingNextStageBlockIds = (nextStage.blockIds || []).filter((id: string) => id !== newBlockId);
		
		setPendingOptionSelection({
			isActive: true,
			sourceBlockId: blockId,
			optionText: optionText,
			newBlockId: newBlockId,
			nextStageBlockIds: existingNextStageBlockIds,
		});
	};

	// Upsell flow: add/create Upsell or Downsell target and enter selection mode (no card type modal)
	const handleUpsellDownsellClick = (blockId: string, kind: "upsell" | "downsell") => {
		// If this button already generated a placeholder and connection is not yet specified, do not create another card
		if (
			pendingOptionSelection?.isActive &&
			pendingOptionSelection.sourceBlockId === blockId &&
			pendingOptionSelection.upsellKind === kind
		) {
			return; // Re-clicking same Upsell/Downsell while selection is active: no-op, keep existing placeholder
		}

		let flow = currentFunnel.flow ?? (hasFlow ? undefined : createMinimalFlow(currentFunnel.id, merchantType));
		if (!flow) return;

		// Switching from Upsell to Downsell (or vice versa): remove the previous placeholder so only one exists
		if (pendingOptionSelection?.isActive && pendingOptionSelection.upsellKind !== kind) {
			const oldPlaceholderId = pendingOptionSelection.newBlockId;
			const newBlocks = { ...flow.blocks };
			delete newBlocks[oldPlaceholderId];
			const newStages = flow.stages.map((s: any) =>
				s.blockIds && s.blockIds.includes(oldPlaceholderId)
					? { ...s, blockIds: s.blockIds.filter((id: string) => id !== oldPlaceholderId) }
					: s
			);
			flow = { ...flow, blocks: newBlocks, stages: newStages };
		}

		const currentStage = flow.stages.find((s: any) => s.blockIds && s.blockIds.includes(blockId));
		if (!currentStage) return;

		const currentStageIndex = flow.stages.indexOf(currentStage);
		const nextStage = flow.stages[currentStageIndex + 1];
		const optionText = kind === "upsell" ? "Upsell" : "Downsell";

		const newBlockId = `new_block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
		const defaultBlockMessage = kind === "downsell" ? "New downsell block" : "New upsell block";
		const newUpsellBlock = {
			id: newBlockId,
			message: defaultBlockMessage,
			options: [
				{ text: "Upsell", nextBlockId: null },
				{ text: "Downsell", nextBlockId: null },
			],
		};

		if (!nextStage) {
			const newStageId = `stage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
			const newStage: any = {
				id: newStageId,
				name: "OFFER",
				explanation: "",
				blockIds: [newBlockId],
				cardType: "product",
			};
			const newFlow = { ...flow };
			newFlow.blocks[newBlockId] = newUpsellBlock;
			newFlow.stages = [...flow.stages, newStage];
			const updatedFunnel = { ...currentFunnel, flow: newFlow };
			setCurrentFunnel(updatedFunnel);
			onUpdate(updatedFunnel);
			setPendingOptionSelection({
				isActive: true,
				sourceBlockId: blockId,
				optionText,
				newBlockId,
				nextStageBlockIds: [],
				upsellKind: kind,
				onlyPlaceholderSelectable: true,
			});
			return;
		}

		const newFlow = { ...flow };
		newFlow.blocks[newBlockId] = newUpsellBlock;
		const updatedNextStage = { ...nextStage, blockIds: [...(nextStage.blockIds || []), newBlockId] };
		newFlow.stages[currentStageIndex + 1] = updatedNextStage;
		const existingNextStageBlockIds = (nextStage.blockIds || []).filter((id: string) => id !== newBlockId);
		const updatedFunnel = { ...currentFunnel, flow: newFlow };
		setCurrentFunnel(updatedFunnel);
		onUpdate(updatedFunnel);
		setPendingOptionSelection({
			isActive: true,
			sourceBlockId: blockId,
			optionText,
			newBlockId,
			nextStageBlockIds: existingNextStageBlockIds,
			upsellKind: kind,
			onlyPlaceholderSelectable: false,
		});
	};

	// Handle card type selection (for new stages)
	const handleCardTypeSelection = (cardType: "qualification" | "product") => {
		if (!pendingCardTypeSelection || !currentFunnel.flow) return;
		
		// Create a proper copy of the flow with updated stage
		const newFlow = {
			...currentFunnel.flow,
			stages: currentFunnel.flow.stages.map((s: any) => 
				s.id === pendingCardTypeSelection.newStageId
					? { ...s, cardType } // Create new stage object with cardType, preserving all other fields
					: s
			),
		};
		
		const newStage = newFlow.stages.find((s: any) => s.id === pendingCardTypeSelection.newStageId);
		
		// Create block based on card type
		// Product/OFFER cards: no [LINK] in message; backend adds button at bottom with selected product link
		const defaultMessage = merchantType === "upsell" ? "New upsell block" : "New conversation block";
		
		const newBlock = {
			id: pendingCardTypeSelection.newBlockId,
			message: defaultMessage,
			options: [],
			...(cardType === "product" ? { resourceName: undefined } : {}), // Product cards may need resourceName
		};
		
		newFlow.blocks[pendingCardTypeSelection.newBlockId] = newBlock;
		
		// Add block to new stage (block already exists, just ensure it's in the stage)
		if (newStage && !newStage.blockIds.includes(pendingCardTypeSelection.newBlockId)) {
			newStage.blockIds = [...newStage.blockIds, pendingCardTypeSelection.newBlockId];
		}

		// Change connection (reconnect existing option): set option's nextBlockId and done; no selection mode
		if (pendingCardTypeSelection.optionIndex != null) {
			const sourceBlock = newFlow.blocks[pendingCardTypeSelection.sourceBlockId];
			if (sourceBlock?.options?.[pendingCardTypeSelection.optionIndex]) {
				const opts = [...sourceBlock.options];
				opts[pendingCardTypeSelection.optionIndex] = {
					...opts[pendingCardTypeSelection.optionIndex],
					nextBlockId: pendingCardTypeSelection.newBlockId,
				};
				newFlow.blocks[pendingCardTypeSelection.sourceBlockId] = { ...sourceBlock, options: opts };
			}
			const updatedFunnel = { ...currentFunnel, flow: newFlow };
			setCurrentFunnel(updatedFunnel);
			onUpdate(updatedFunnel);
			setPendingCardTypeSelection(null);
			return;
		}

		// New option: enter selection mode for connecting option
		const updatedFunnel = { ...currentFunnel, flow: newFlow };
		setCurrentFunnel(updatedFunnel);
		setPendingOptionSelection({
			isActive: true,
			sourceBlockId: pendingCardTypeSelection.sourceBlockId,
			optionText: pendingCardTypeSelection.optionText,
			newBlockId: pendingCardTypeSelection.newBlockId,
			nextStageBlockIds: [], // New stage, no existing cards
		});
		setPendingCardTypeSelection(null);
	};

	// Handle card selection - connect option to selected card (or set upsellBlockId/downsellBlockId for upsell)
	const handleCardSelection = (selectedBlockId: string) => {
		if (!pendingOptionSelection || !currentFunnel.flow) return;

		const sourceBlock = currentFunnel.flow.blocks[pendingOptionSelection.sourceBlockId];
		if (!sourceBlock) return;

		// Check if user selected an existing card (not the new card)
		const isExistingCard = selectedBlockId !== pendingOptionSelection.newBlockId;

		// If existing card was selected, remove the new card that was created (and remove stage if it becomes empty)
		if (isExistingCard) {
			const newFlow = { ...currentFunnel.flow };
			
			// Remove new block from blocks
			delete newFlow.blocks[pendingOptionSelection.newBlockId];

			// Remove new block from its stage; if stage is now empty, remove the stage label too
			const stageWithNewBlockIndex = newFlow.stages.findIndex((stage: any) =>
				stage.blockIds && stage.blockIds.includes(pendingOptionSelection.newBlockId)
			);
			if (stageWithNewBlockIndex >= 0) {
				const stageWithNewBlock = newFlow.stages[stageWithNewBlockIndex];
				stageWithNewBlock.blockIds = stageWithNewBlock.blockIds.filter(
					(id: string) => id !== pendingOptionSelection.newBlockId
				);
				if (stageWithNewBlock.blockIds.length === 0 && stageWithNewBlockIndex > 0) {
					newFlow.stages = newFlow.stages.filter((_: any, index: number) => index !== stageWithNewBlockIndex);
				}
			}

			// Change connection: update source block's option to point to selected card
			if (pendingOptionSelection.optionIndex != null) {
				const sourceBlock = newFlow.blocks[pendingOptionSelection.sourceBlockId];
				if (sourceBlock?.options?.[pendingOptionSelection.optionIndex]) {
					const opts = [...sourceBlock.options];
					opts[pendingOptionSelection.optionIndex] = {
						...opts[pendingOptionSelection.optionIndex],
						nextBlockId: selectedBlockId,
					};
					newFlow.blocks[pendingOptionSelection.sourceBlockId] = { ...sourceBlock, options: opts };
				}
			}

			// Update funnel without the new card
			const updatedFunnel = { ...currentFunnel, flow: newFlow };
			setCurrentFunnel(updatedFunnel);
			onUpdate(updatedFunnel);
			// Change connection: we updated the option and removed new block; done
			if (pendingOptionSelection.optionIndex != null) {
				setPendingOptionSelection(null);
				return;
			}
		}

		// Upsell flow: set upsellBlockId or downsellBlockId and sync options; same card cannot be both upsell and downsell
		if (pendingOptionSelection.upsellKind) {
			const flow = currentFunnel.flow;
			const getStageIndex = (blockId: string) =>
				flow.stages.findIndex((s: any) => s.blockIds && s.blockIds.includes(blockId));
			// Last-stage case: only placeholder is valid; reject wrong block or selection from above stage
			if (pendingOptionSelection.onlyPlaceholderSelectable) {
				if (selectedBlockId !== pendingOptionSelection.newBlockId) {
					setPendingOptionSelection(null);
					return;
				}
				const sourceStageIndex = getStageIndex(pendingOptionSelection.sourceBlockId);
				const targetStageIndex = getStageIndex(selectedBlockId);
				if (targetStageIndex >= 0 && sourceStageIndex >= 0 && targetStageIndex < sourceStageIndex) {
					setPendingOptionSelection(null);
					return;
				}
			}
			const targetStage = flow.stages.find((s: any) => s.blockIds && s.blockIds.includes(selectedBlockId));
			if (targetStage?.name === "WELCOME") {
				setPendingOptionSelection(null);
				return;
			}
			const sourceStageIndex = getStageIndex(pendingOptionSelection.sourceBlockId);
			const targetStageIndex = getStageIndex(selectedBlockId);
			const isCrossStage = sourceStageIndex >= 0 && targetStageIndex >= 0 && targetStageIndex !== sourceStageIndex + 1;

			const style = isCrossStage ? pickRandomUnusedCrossStageStyle(flow) : null;

			const updatedBlock = {
				...sourceBlock,
				...(pendingOptionSelection.upsellKind === "upsell"
					? {
							upsellBlockId: selectedBlockId,
							downsellBlockId: sourceBlock.downsellBlockId === selectedBlockId ? null : sourceBlock.downsellBlockId,
							upsellCrossStageStyle: isCrossStage && style ? style : null,
						}
					: {
							downsellBlockId: selectedBlockId,
							upsellBlockId: sourceBlock.upsellBlockId === selectedBlockId ? null : sourceBlock.upsellBlockId,
							downsellCrossStageStyle: isCrossStage && style ? style : null,
						}),
			};
			handleBlockUpdate(updatedBlock);
			setPendingOptionSelection(null);
			return;
		}

		// Change connection: user selected the new card; set option to point to it, persist, then clear
		if (pendingOptionSelection.optionIndex != null) {
			const newFlow = { ...currentFunnel.flow };
			const sourceBlockForUpdate = newFlow.blocks[pendingOptionSelection.sourceBlockId];
			if (sourceBlockForUpdate?.options?.[pendingOptionSelection.optionIndex]) {
				const opts = [...sourceBlockForUpdate.options];
				opts[pendingOptionSelection.optionIndex] = {
					...opts[pendingOptionSelection.optionIndex],
					nextBlockId: pendingOptionSelection.newBlockId,
				};
				newFlow.blocks[pendingOptionSelection.sourceBlockId] = { ...sourceBlockForUpdate, options: opts };
			}
			const updatedFunnel = { ...currentFunnel, flow: newFlow };
			setCurrentFunnel(updatedFunnel);
			onUpdate(updatedFunnel);
			setPendingOptionSelection(null);
			return;
		}

		// Qualification flow (add new option): add new option to source block pointing to selected card
		const newOption = {
			text: pendingOptionSelection.optionText,
			nextBlockId: selectedBlockId,
		};

		const updatedBlock = {
			...sourceBlock,
			options: [...(sourceBlock.options || []), newOption],
		};

		handleBlockUpdate(updatedBlock);
		setPendingOptionSelection(null);
	};

	// Handle delete click - first click: calculate affected connections and show highlights
	const handleDeleteClick = (blockId: string) => {
		if (!currentFunnel.flow) return;

		const blockToDelete = currentFunnel.flow.blocks[blockId];
		if (!blockToDelete) return;

		// Find options leading TO deleted card (and upsell blocks: upsellBlockId/downsellBlockId/referencedBlockId)
		const affectedOptions: Array<{ blockId: string; optionIndex: number }> = [];
		Object.values(currentFunnel.flow.blocks).forEach((block: any) => {
			if (block.options && Array.isArray(block.options)) {
				block.options.forEach((opt: any, index: number) => {
					if (opt.nextBlockId === blockId) {
						affectedOptions.push({ blockId: block.id, optionIndex: index });
					}
				});
			}
			// Upsell: blocks pointing to this block via upsellBlockId, downsellBlockId, or referencedBlockId
			if (block.upsellBlockId === blockId) {
				affectedOptions.push({ blockId: block.id, optionIndex: 0 }); // Upsell is index 0
			}
			if (block.downsellBlockId === blockId) {
				affectedOptions.push({ blockId: block.id, optionIndex: 1 }); // Downsell is index 1
			}
		});

		// Find outgoing connections FROM deleted card
		const outgoingConnections: Array<{ targetBlockId: string }> = [];
		if (blockToDelete.options && Array.isArray(blockToDelete.options)) {
			blockToDelete.options.forEach((opt: any) => {
				if (opt.nextBlockId) {
					outgoingConnections.push({ targetBlockId: opt.nextBlockId });
				}
			});
		}

		// Find the stage containing the block to delete
		const blockStage = currentFunnel.flow.stages.find((stage: any) =>
			stage.blockIds && stage.blockIds.includes(blockId)
		);
		if (!blockStage) return;

		const stageIndex = currentFunnel.flow.stages.indexOf(blockStage);
		const nextStage = currentFunnel.flow.stages[stageIndex + 1];
		const previousStage = currentFunnel.flow.stages[stageIndex - 1];

		// Find orphaned cards in next stage (will be calculated after deletion)
		const orphanedNextStageCards: string[] = [];

		// Find broken cards in previous stage (will be calculated after deletion)
		const brokenPreviousStageCards: string[] = [];

		// Find invalid options
		const invalidOptions = findInvalidOptions(currentFunnel.flow);

		setPendingDelete({
			blockId,
			affectedOptions,
			outgoingConnections,
			orphanedNextStageCards,
			brokenPreviousStageCards,
			invalidOptions,
		});
	};

	// Handle confirm delete - second click: actually delete the card
	const handleConfirmDelete = () => {
		if (!pendingDelete || !currentFunnel.flow) return;

		const newFlow = { ...currentFunnel.flow };

		// Find the stage that contained the deleted block BEFORE removing it
		const deletedStageIndex = newFlow.stages.findIndex((stage: any) =>
			stage.blockIds && stage.blockIds.includes(pendingDelete.blockId)
		);
		const deletedStage = deletedStageIndex >= 0 ? newFlow.stages[deletedStageIndex] : null;
		const nextStage = deletedStageIndex >= 0 ? newFlow.stages[deletedStageIndex + 1] : null;
		const previousStage = deletedStageIndex >= 0 ? newFlow.stages[deletedStageIndex - 1] : null;

		// Remove options leading to deleted card
		pendingDelete.affectedOptions.forEach(({ blockId, optionIndex }) => {
			const block = newFlow.blocks[blockId];
			if (block && block.options && Array.isArray(block.options)) {
				block.options = block.options.filter((_: any, index: number) => index !== optionIndex);
			}
		});

		// Upsell: clear upsellBlockId, downsellBlockId, or referencedBlockId pointing to deleted block
		Object.keys(newFlow.blocks).forEach((bid) => {
			const b = newFlow.blocks[bid] as any;
			if (!b) return;
			let changed = false;
			if (b.upsellBlockId === pendingDelete.blockId) {
				b.upsellBlockId = null;
				changed = true;
			}
			if (b.downsellBlockId === pendingDelete.blockId) {
				b.downsellBlockId = null;
				changed = true;
			}
			if (b.referencedBlockId === pendingDelete.blockId) {
				b.referencedBlockId = null;
				changed = true;
			}
			if (changed && (b.upsellBlockId !== undefined || b.downsellBlockId !== undefined)) {
				b.options = getUpsellBlockOptions(b);
			}
		});

		// Remove deleted block from flow
		delete newFlow.blocks[pendingDelete.blockId];

		// Remove block ID from its stage
		if (deletedStage) {
			deletedStage.blockIds = deletedStage.blockIds.filter(
				(id: string) => id !== pendingDelete.blockId
			);
			
			// If stage is now empty (and not first stage), remove it
			if (deletedStage.blockIds.length === 0 && deletedStageIndex > 0) {
				// Remove stage from stages array
				newFlow.stages = newFlow.stages.filter((_: any, index: number) => index !== deletedStageIndex);
				
				// Previous stage is now the last stage
				// No additional action needed - it's already the last
			}
		}

		// Use normalized flow for upsell so cross-connections are respected when recalculating orphaned/broken
		const flowAfterDelete =
			merchantType === "upsell"
				? (() => {
						const validBlockIds = new Set(Object.keys(newFlow.blocks ?? {}));
						const blocks = { ...newFlow.blocks };
						Object.keys(blocks).forEach((id) => {
							const b = (blocks as any)[id];
							if (b && (b.upsellBlockId !== undefined || b.downsellBlockId !== undefined)) {
								(blocks as any)[id] = { ...b, options: getUpsellBlockOptions(b, validBlockIds) };
							}
						});
						return { ...newFlow, blocks };
					})()
				: newFlow;

		// Find ALL orphaned cards (no normal incoming: must have at least one inbound from previous stage)
		const orphanedNextStageCards: string[] = [];
		for (let stageIndex = 0; stageIndex < flowAfterDelete.stages.length; stageIndex++) {
			const stage = flowAfterDelete.stages[stageIndex];
			if (!stage || !stage.blockIds || !Array.isArray(stage.blockIds)) continue;
			if (stageIndex === 0) continue;

			const previousStage = flowAfterDelete.stages[stageIndex - 1];
			if (!previousStage?.blockIds?.length) continue;

			for (const cardId of stage.blockIds) {
				const hasNormalIncoming = previousStage.blockIds.some((prevBlockId: string) => {
					const block = flowAfterDelete.blocks[prevBlockId] as any;
					if (!block || !block.options || !Array.isArray(block.options)) return false;
					return block.options.some((opt: any) => opt.nextBlockId === cardId);
				});
				if (!hasNormalIncoming) orphanedNextStageCards.push(cardId);
			}
		}

		// Find ALL broken cards (cards with no outgoing connections to next stage) - check all stages
		const brokenPreviousStageCards: string[] = [];
		for (let stageIndex = 0; stageIndex < flowAfterDelete.stages.length - 1; stageIndex++) {
			const stage = flowAfterDelete.stages[stageIndex];
			const nextStage = flowAfterDelete.stages[stageIndex + 1];
			if (!stage || !stage.blockIds || !Array.isArray(stage.blockIds)) continue;
			if (!nextStage) continue; // No next stage = OK (last stage)

			// If next stage is empty, all cards in current stage are broken
			if (!nextStage.blockIds || nextStage.blockIds.length === 0) {
				// All cards in current stage are broken (no valid next stage)
				for (const cardId of stage.blockIds) {
					brokenPreviousStageCards.push(cardId);
				}
				continue;
			}

			for (const cardId of stage.blockIds) {
				const block = flowAfterDelete.blocks[cardId];
				if (!block || !block.options || !Array.isArray(block.options)) {
					brokenPreviousStageCards.push(cardId);
					continue;
				}

				const hasNormalConnection = block.options.some((opt: any) =>
					opt.nextBlockId && nextStage.blockIds.includes(opt.nextBlockId)
				);
				const hasCrossStageOutbound = (block as any).upsellBlockId && !nextStage.blockIds.includes((block as any).upsellBlockId)
					|| (block as any).downsellBlockId && !nextStage.blockIds.includes((block as any).downsellBlockId);
				if (!hasNormalConnection && !hasCrossStageOutbound) {
					brokenPreviousStageCards.push(cardId);
				}
			}
		}

		// Update flow
		const updatedFunnel = { ...currentFunnel, flow: newFlow };
		setCurrentFunnel(updatedFunnel);
		onUpdate(updatedFunnel);

		// Find invalid options after deletion
		const invalidOptions = findInvalidOptions(flowAfterDelete);

		// Update pendingDelete with current orphaned/broken cards and invalid options (highlights persist)
		setPendingDelete({
			blockId: pendingDelete.blockId, // Keep for reference
			affectedOptions: [], // No longer relevant after deletion
			outgoingConnections: [], // No longer relevant after deletion
			orphanedNextStageCards,
			brokenPreviousStageCards,
			invalidOptions,
		});

		// Recalculate draft status
		const draftResult = checkDraftStatus(newFlow, updatedFunnel);
		logDraftStatus(draftResult);
		if (updatedFunnel.isDraft !== draftResult.isDraft) {
			const funnelWithDraft = { ...updatedFunnel, isDraft: draftResult.isDraft };
			setCurrentFunnel(funnelWithDraft);
			onUpdate(funnelWithDraft);
		}
		
		// If stage was removed, check if previous stage is now last
		// (No additional action needed - it's already the last)
	};

	// Handle cancel delete - clear pending deletion
	const handleCancelDelete = () => {
		setPendingDelete(null);
	};

	// Handle stage update (name, explanation, or block order)
	const handleStageUpdate = (stageId: string, updates: { name?: string; explanation?: string; blockIds?: string[] }) => {
		if (!currentFunnel.flow) return;

		// Create a proper copy of the flow with new stages array
		const newFlow = {
			...currentFunnel.flow,
			stages: currentFunnel.flow.stages.map((s: any) =>
				s.id === stageId
					? { ...s, ...updates } // Create new stage object with updates, preserving cardType
					: s
			),
		};

		const updatedFunnel = { ...currentFunnel, flow: newFlow };
		setCurrentFunnel(updatedFunnel);
		onUpdate(updatedFunnel);
	};

	// Use pre-loaded allResources when provided (from AdminPanel); otherwise fetch resources for card product dropdown and trigger panel
	React.useEffect(() => {
		if (allResourcesProp?.length) {
			setResources(allResourcesProp.map((r) => ({ id: r.id, name: r.name })));
			setLoadingResources(false);
			return;
		}
		if (user?.experienceId) {
			setLoadingResources(true);
			apiGet(`/api/resources?experienceId=${user.experienceId}&limit=100`, user.experienceId)
				.then((res) => res.json())
				.then((data) => {
					if (data.success && data.data?.resources) {
						setResources(data.data.resources.map((r: any) => ({ id: r.id, name: r.name })));
					}
				})
				.catch((err) => console.error("Error fetching resources:", err))
				.finally(() => setLoadingResources(false));
		}
	}, [user?.experienceId, allResourcesProp]);

	// Fetch funnels by type for app trigger dropdown (qualification vs upsell)
	// Qualification trigger → qualification-type funnels; upsell trigger → upsell-type funnels
	const experienceId = user?.experience?.id ?? user?.experienceId;
	React.useEffect(() => {
		if (!experienceId) return;
		setLoadingFunnels(true);
		const sortByName = (list: Array<{ id: string; name: string }>) =>
			[...list].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
		Promise.all([
			apiGet(`/api/funnels?limit=100&merchantType=qualification`, experienceId).then((r) => r.json()),
			apiGet(`/api/funnels?limit=100&merchantType=upsell`, experienceId).then((r) => r.json()),
		])
			.then(([qualData, upsellData]) => {
				if (qualData.success && qualData.data?.funnels) {
					setQualificationFunnels(sortByName(qualData.data.funnels.map((f: any) => ({ id: f.id, name: f.name ?? "" }))));
				}
				if (upsellData.success && upsellData.data?.funnels) {
					setUpsellFunnels(sortByName(upsellData.data.funnels.map((f: any) => ({ id: f.id, name: f.name ?? "" }))));
				}
				// Merged list for delete_merchant_conversation and any other use
				const all = [
					...(qualData.success && qualData.data?.funnels ? qualData.data.funnels.map((f: any) => ({ id: f.id, name: f.name ?? "" })) : []),
					...(upsellData.success && upsellData.data?.funnels ? upsellData.data.funnels.map((f: any) => ({ id: f.id, name: f.name ?? "" })) : []),
				];
				setFunnels(sortByName(all));
			})
			.catch((err) => console.error("Error fetching funnels:", err))
			.finally(() => setLoadingFunnels(false));
	}, [experienceId]);

	// Handle trigger type selection (just for UI, doesn't save)
	const handleTriggerSelect = (category: "Membership" | "App", triggerId?: TriggerType, config?: TriggerConfig) => {
		// Update canvas immediately (optimistic update)
		const updatedFunnel = { 
			...currentFunnel, 
			[`${category.toLowerCase()}TriggerType`]: triggerId,
			[`${category.toLowerCase()}TriggerConfig`]: config || {},
		};
		setCurrentFunnel(updatedFunnel);
		
		// Check draft status after trigger change
		const draftResult = checkDraftStatus(updatedFunnel.flow, updatedFunnel);
		logDraftStatus(draftResult);
		if (updatedFunnel.isDraft !== draftResult.isDraft) {
			const funnelWithDraft = { ...updatedFunnel, isDraft: draftResult.isDraft };
			setCurrentFunnel(funnelWithDraft);
		}
		
		// Don't save yet - save happens via handleTriggerSave
	};

	// Handle resource change (for membership_buy and cancel_membership triggers)
	const handleResourceChange = (resourceId: string) => {
		setHasUnsavedMembershipTriggerConfig(true);
		const membershipTrigger = currentFunnel.membershipTriggerType;
		const config: TriggerConfig = { ...currentFunnel.membershipTriggerConfig, resourceId: resourceId || undefined };
		handleTriggerSelect("Membership", membershipTrigger || "membership_buy", config);
	};

	// Handle membership filter change (filterResourceIdsRequired / filterResourceIdsExclude)
	const handleMembershipFilterChange = (updates: { filterResourceIdsRequired?: string[]; filterResourceIdsExclude?: string[] }) => {
		setHasUnsavedMembershipTriggerConfig(true);
		const membershipTrigger = currentFunnel.membershipTriggerType;
		const merged: TriggerConfig = { ...currentFunnel.membershipTriggerConfig, ...updates };
		handleTriggerSelect("Membership", membershipTrigger || "membership_buy", merged);
	};

	// Handle funnel change (for qualification/upsell/delete_merchant_conversation triggers)
	const handleFunnelChange = (funnelId: string) => {
		setHasUnsavedAppTriggerConfig(true);
		const config: TriggerConfig = { ...currentFunnel.appTriggerConfig, funnelId: funnelId || undefined };
		const appTrigger = currentFunnel.appTriggerType ?? "on_app_entry";
		handleTriggerSelect("App", appTrigger, config);
	};

	// Handle qualification profile change (qualification_merchant_complete: trigger when user has this profile)
	const handleQualificationProfileChange = (profileId: string) => {
		setHasUnsavedAppTriggerConfig(true);
		const appTrigger = currentFunnel.appTriggerType ?? "on_app_entry";
		const config: TriggerConfig = { ...currentFunnel.appTriggerConfig, profileId: profileId || undefined };
		handleTriggerSelect("App", appTrigger, config);
	};

	// Handle app trigger filter change (filterResourceIdsRequired / filterResourceIdsExclude)
	const handleAppFilterChange = (updates: { filterResourceIdsRequired?: string[]; filterResourceIdsExclude?: string[] }) => {
		setHasUnsavedAppTriggerConfig(true);
		const appTrigger = currentFunnel.appTriggerType ?? "on_app_entry";
		const merged: TriggerConfig = { ...currentFunnel.appTriggerConfig, ...updates };
		handleTriggerSelect("App", appTrigger, merged);
	};

	// Handle trigger save (saves trigger selection and config)
	const handleTriggerSave = (category: "Membership" | "App", triggerId?: TriggerType, config?: TriggerConfig) => {
		const updatedFunnel = { 
			...currentFunnel, 
			[`${category.toLowerCase()}TriggerType`]: triggerId,
			[`${category.toLowerCase()}TriggerConfig`]: config || {},
		};
		
		// Check draft status after trigger save
		const draftResult = checkDraftStatus(updatedFunnel.flow, updatedFunnel);
		logDraftStatus(draftResult);
		const funnelWithDraft = { ...updatedFunnel, isDraft: draftResult.isDraft };
		
		setCurrentFunnel(funnelWithDraft);
		onUpdate(funnelWithDraft);
		setHasUnsavedAppTriggerConfig(false);
		setHasUnsavedMembershipTriggerConfig(false);
		setShowTriggerPanel(false);
		setTriggerPanelCategory(null);
	};

	// Save trigger config (product, filter, funnel, profile) from the block without closing panel. category = which trigger's Save was clicked.
	const handleTriggerConfigSave = (category?: "App" | "Membership") => {
		onUpdate(currentFunnel);
		if (category === "App") {
			setHasUnsavedAppTriggerConfig(false);
		} else if (category === "Membership") {
			setHasUnsavedMembershipTriggerConfig(false);
		} else {
			setHasUnsavedAppTriggerConfig(false);
			setHasUnsavedMembershipTriggerConfig(false);
		}
	};

	// Handle app delay change (just for UI, doesn't save)
	const handleDelayChange = (minutes: number) => {
		// This is called when delay input changes, but doesn't save
		// Save happens via handleDelaySave
	};

	// Handle app delay save (saves delay value)
	const handleDelaySave = (minutes: number) => {
		const updatedFunnel = { 
			...currentFunnel, 
			delayMinutes: minutes,
		};
		setCurrentFunnel(updatedFunnel);
		onUpdate(updatedFunnel);
	};

	// Handle membership delay change (just for UI, doesn't save)
	const handleMembershipDelayChange = (minutes: number) => {
		// This is called when delay input changes, but doesn't save
		// Save happens via handleMembershipDelaySave
	};

	// Handle membership delay save (saves delay value)
	const handleMembershipDelaySave = (minutes: number) => {
		const updatedFunnel = { 
			...currentFunnel, 
			membershipDelayMinutes: minutes,
		};
		setCurrentFunnel(updatedFunnel);
		onUpdate(updatedFunnel);
	};

	// Handle notification change - optimistic update (updates canvas immediately, no backend)
	const handleNotificationChange = (input: FunnelNotificationInput) => {
		// Create a temporary notification object for display
		const tempNotification: FunnelNotification = {
			id: selectedNotificationId || `temp-${input.stageId}-${input.sequence}`,
			funnelId: input.funnelId,
			stageId: input.stageId,
			sequence: input.sequence,
			message: input.message,
			inactivityMinutes: input.inactivityMinutes,
			notificationType: input.notificationType,
			isReset: false,
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		// Update local state immediately (optimistic update)
		setNotifications((prev) => {
			// Try to find existing by ID
			if (selectedNotificationId) {
				const existing = prev.find((n) => n.id === selectedNotificationId);
				if (existing) {
					return prev.map((n) => (n.id === selectedNotificationId ? tempNotification : n));
				}
			}

			// Try to find by stageId and sequence
			const existingIndex = prev.findIndex(
				(n) => n.stageId === input.stageId && n.sequence === input.sequence && !n.isReset
			);
			if (existingIndex >= 0) {
				return prev.map((n, i) => (i === existingIndex ? tempNotification : n));
			} else {
				// New notification - add it
				return [...prev, tempNotification];
			}
		});
	};

	// Handle notification save - optimistic update, then persist in DB
	const handleNotificationSave = async (input: FunnelNotificationInput) => {
		const optimisticPayload: FunnelNotification = {
			id: selectedNotificationId || `temp-${input.stageId}-${input.sequence}`,
			funnelId: input.funnelId,
			stageId: input.stageId,
			sequence: input.sequence,
			inactivityMinutes: input.inactivityMinutes,
			message: input.message,
			notificationType: input.notificationType,
			isReset: false,
			createdAt: new Date(),
			updatedAt: new Date(),
		};
		// Capture previous for revert
		let previousNotification: FunnelNotification | null = null;
		setNotifications((prev) => {
			const existing = prev.find((n) => n.id === selectedNotificationId) ?? prev.find((n) => n.stageId === input.stageId && n.sequence === input.sequence && !n.isReset);
			if (existing) previousNotification = existing;
			if (existing) {
				return prev.map((n) => (n.id === existing.id ? { ...optimisticPayload, id: n.id, createdAt: n.createdAt } : n));
			}
			const filtered = prev.filter((n) => !(n.stageId === input.stageId && n.sequence === input.sequence && !n.isReset));
			return sortNotificationsWithResetLast([...filtered, optimisticPayload]);
		});
		try {
			const response = await apiPost(`/api/funnels/${currentFunnel.id}/notifications`, input, user?.experienceId);
			const data = await response.json().catch(() => ({}));
			if (!response.ok) {
				const message = (data && typeof data.error === "string") ? data.error : `HTTP ${response.status}`;
				throw new Error(message);
			}
			if (data.success && data.data) {
				setNotifications((prev) => {
					const byId = prev.find((n) => n.id === data.data.id);
					const bySelected = selectedNotificationId ? prev.find((n) => n.id === selectedNotificationId) : null;
					const byStageSeq = prev.findIndex((n) => n.stageId === input.stageId && n.sequence === input.sequence && !n.isReset);
					if (byId) return prev.map((n) => (n.id === data.data.id ? { ...data.data } : n));
					if (bySelected) return prev.map((n) => (n.id === selectedNotificationId ? { ...data.data } : n));
					if (byStageSeq >= 0) return prev.map((n, i) => (i === byStageSeq ? { ...data.data } : n));
					const filtered = prev.filter((n) => !(n.stageId === input.stageId && n.sequence === input.sequence && !n.isReset && n.id !== data.data.id));
					return sortNotificationsWithResetLast([...filtered, data.data]);
				});
				handleNotificationClose();
			}
		} catch (error) {
			// Revert to previous
			if (previousNotification) {
				setNotifications((prev) => {
					const target = prev.find((n) => n.id === previousNotification!.id) ?? prev.find((n) => n.stageId === input.stageId && n.sequence === input.sequence && !n.isReset);
					if (!target) return prev;
					return prev.map((n) => (n.id === target.id ? previousNotification! : n));
				});
			}
			console.error("Error saving notification:", error);
			throw error;
		}
	};


	// Handle notification delete - optimistic remove, revert on error
	const handleNotificationDelete = async (notificationId: string) => {
		// Temp IDs (never saved to DB): remove from local state only
		if (notificationId.startsWith("temp-")) {
			setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
			if (selectedNotificationId === notificationId) {
				setSelectedNotificationId(null);
				setSelectedNotificationSequence(null);
				setSelectedNotificationStageId(null);
			}
			return;
		}
		// Capture for revert and for renumber (remaining in same stage)
		let removed: FunnelNotification | null = null;
		setNotifications((prev) => {
			const found = prev.find((n) => n.id === notificationId);
			if (found) {
				removed = found;
				const afterRemove = prev.filter((n) => n.id !== notificationId);
				remainingAfterDeleteRef.current = afterRemove
					.filter((n) => n.stageId === found.stageId && !n.isReset)
					.sort((a, b) => a.sequence - b.sequence);
			} else {
				remainingAfterDeleteRef.current = null;
			}
			return prev.filter((n) => n.id !== notificationId);
		});
		if (selectedNotificationId === notificationId) {
			setSelectedNotificationId(null);
			setSelectedNotificationSequence(null);
			setSelectedNotificationStageId(null);
		}
		try {
			const response = await apiDelete(
				`/api/funnels/${currentFunnel.id}/notifications?notificationId=${encodeURIComponent(notificationId)}`,
				user?.experienceId
			);
			const data = await response.json().catch(() => ({}));
			if (!response.ok) {
				const message = (data && typeof data.error === "string") ? data.error : `HTTP ${response.status}`;
				throw new Error(message);
			}
			// Renumber remaining notifications in this stage to 1, 2, 3...
			const stageId = removed!.stageId;
			const stageNotifs = remainingAfterDeleteRef.current ?? [];
			remainingAfterDeleteRef.current = null;
			if (stageNotifs.length > 0) {
				const renumbered = stageNotifs.map((n, i) => ({ ...n, sequence: i + 1 }));
				setNotifications((prev) => {
					const byId = new Map(renumbered.map((n) => [n.id, n]));
					return sortNotificationsWithResetLast(
						prev.map((n) => (n.stageId === stageId && !n.isReset ? byId.get(n.id) ?? n : n))
					);
				});
				// Persist new sequences to backend (update by id so 3 -> 2 after deleting 2)
				renumbered.forEach((n) => {
					apiPost(
						`/api/funnels/${currentFunnel.id}/notifications`,
						{
							id: n.id,
							funnelId: n.funnelId,
							stageId: n.stageId,
							sequence: n.sequence,
							inactivityMinutes: n.inactivityMinutes,
							message: n.message,
							notificationType: n.notificationType,
							isReset: false,
						},
						user?.experienceId
					)
						.then((res) => res.json())
						.then((data) => {
							if (data?.success && data?.data) {
								setNotifications((prev) => prev.map((notif) => (notif.id === n.id ? { ...notif, ...data.data } : notif)));
							}
						})
						.catch(() => {});
				});
			}
		} catch (error) {
			// Revert: re-add the notification
			if (removed) {
				setNotifications((prev) => sortNotificationsWithResetLast([...prev, removed!]));
			}
			console.error("Error deleting notification:", error);
			throw error;
		}
	};

	// Add notification: optimistic add, then create in DB (called when + is clicked)
	const handleAddNotification = async (stageId: string) => {
		const stageNotifs = notifications.filter((n) => n.stageId === stageId && !n.isReset);
		const nextSequence = stageNotifs.length + 1;
		if (nextSequence > 3) return;
		const lastMessage = getLastBotMessageFromStage(stageId, currentFunnel.flow);
		const tempId = `temp-add-${stageId}-${nextSequence}-${Date.now()}`;
		const optimistic: FunnelNotification = {
			id: tempId,
			funnelId: currentFunnel.id,
			stageId,
			sequence: nextSequence,
			inactivityMinutes: 30,
			message: lastMessage || "Reminder message",
			notificationType: "standard",
			isReset: false,
			createdAt: new Date(),
			updatedAt: new Date(),
		};
		// Optimistic: add to state and open panel immediately
		setNotifications((prev) => sortNotificationsWithResetLast([...prev, optimistic]));
		setSelectedNotificationId(tempId);
		setSelectedNotificationStageId(stageId);
		setSelectedNotificationSequence(null);
		setSelectedResetId(null);
		setSelectedResetStageId(null);
		setShowConfigPanel(true);
		try {
			const response = await apiPost(
				`/api/funnels/${currentFunnel.id}/notifications`,
				{
					funnelId: currentFunnel.id,
					stageId,
					sequence: nextSequence,
					inactivityMinutes: 30,
					message: lastMessage || "Reminder message",
					notificationType: "standard",
					isReset: false,
				},
				user?.experienceId
			);
			const data = await response.json().catch(() => ({}));
			if (!response.ok) {
				const message = (data && typeof data.error === "string") ? data.error : `HTTP ${response.status}`;
				throw new Error(message);
			}
			if (data.success && data.data) {
				setNotifications((prev) => {
					const withoutTemp = prev.filter((n) => n.id !== tempId);
					return sortNotificationsWithResetLast([...withoutTemp, data.data]);
				});
				setSelectedNotificationId(data.data.id);
			}
		} catch (error) {
			// Revert: remove optimistic notification
			setNotifications((prev) => prev.filter((n) => n.id !== tempId));
			if (selectedNotificationId === tempId) {
				setSelectedNotificationId(null);
				setSelectedNotificationStageId(null);
				setSelectedNotificationSequence(null);
			}
			console.error("Error creating notification:", error);
			throw error;
		}
	};

	// Handle notification click from canvas (select existing; add is via handleAddNotification)
	const handleNotificationClick = (notification: FunnelNotification | null, stageId: string, sequence: number) => {
		if (notification) {
			setSelectedNotificationId(notification.id);
			setSelectedNotificationSequence(null);
			setSelectedNotificationStageId(stageId);
		}
		setSelectedResetId(null);
		setSelectedResetStageId(null);
		setShowConfigPanel(true);
	};

	// Handle notification close (deselect)
	const handleNotificationClose = () => {
		setSelectedNotificationId(null);
		setSelectedNotificationSequence(null);
		setSelectedNotificationStageId(null);
	};

	// Handle reset click from canvas
	const handleResetClick = (reset: FunnelNotification | null, stageId: string) => {
		// CRITICAL: Always set selectedResetStageId, even if reset doesn't exist yet
		setSelectedResetId(reset?.id || null);
		setSelectedResetStageId(stageId); // Must be set for sidebar to show reset options
		setSelectedNotificationId(null);
		setSelectedNotificationSequence(null);
		setSelectedNotificationStageId(null);
		setShowConfigPanel(true);
	};


	// Handle reset change - optimistic update (updates canvas immediately, no backend)
	const handleResetChange = (stageId: string, resetAction: "delete" | "complete", delayMinutes: number) => {
		// Find existing reset notification for this stage
		const existingReset = notifications.find((n) => n.stageId === stageId && n.isReset);

		// Get max sequence for this stage
		const stageNotifications = notifications.filter((n) => n.stageId === stageId && !n.isReset);
		const maxSequence = stageNotifications.length > 0 
			? Math.max(...stageNotifications.map((n) => n.sequence))
			: 0;

		// Create temporary reset object for display
		const tempReset: FunnelNotification = {
			id: existingReset?.id || `temp-reset-${stageId}`,
			funnelId: currentFunnel.id,
			stageId,
			sequence: existingReset?.sequence ?? maxSequence + 1,
			inactivityMinutes: 0,
			message: resetAction === "delete" ? "Delete conversation" : "Mark as completed",
			isReset: true,
			resetAction,
			delayMinutes,
			createdAt: existingReset?.createdAt || new Date(),
			updatedAt: new Date(),
		};

		// Update local state immediately (optimistic update)
		setNotifications((prev) => {
			if (existingReset) {
				return prev.map((n) => (n.id === existingReset.id ? tempReset : n));
			} else {
				// Remove any temp reset for this stage
				const filtered = prev.filter((n) => !(n.stageId === stageId && n.isReset && n.id.startsWith("temp-")));
				return [...filtered, tempReset];
			}
		});
	};

	// Handle reset save - optimistic update, then persist in DB
	const handleResetSave = async (stageId: string, resetAction: "delete" | "complete", delayMinutes: number) => {
		const existingReset = notifications.find((n) => n.stageId === stageId && n.isReset);

		if (delayMinutes === 0 && existingReset) {
			await handleNotificationDelete(existingReset.id);
			setSelectedResetId(null);
			setSelectedResetStageId(null);
			return;
		}

		const stageNotifications = notifications.filter((n) => n.stageId === stageId && !n.isReset);
		const maxSequence = stageNotifications.length > 0 ? Math.max(...stageNotifications.map((n) => n.sequence)) : 0;
		const sequence = existingReset?.sequence ?? maxSequence + 1;

		const optimisticReset: FunnelNotification = {
			id: existingReset?.id ?? `temp-reset-${stageId}`,
			funnelId: currentFunnel.id,
			stageId,
			sequence,
			inactivityMinutes: 0,
			message: resetAction === "delete" ? "Delete conversation" : "Mark as completed",
			isReset: true,
			resetAction,
			delayMinutes,
			createdAt: existingReset?.createdAt ?? new Date(),
			updatedAt: new Date(),
		};

		let previousReset: FunnelNotification | null = existingReset ?? null;
		// Optimistic update
		setNotifications((prev) => {
			if (existingReset) {
				return prev.map((n) => (n.id === existingReset.id ? optimisticReset : n));
			}
			const filtered = prev.filter((n) => !(n.stageId === stageId && n.isReset && n.id.startsWith("temp-")));
			return sortNotificationsWithResetLast([...filtered, optimisticReset]);
		});
		setSelectedResetId(optimisticReset.id);

		try {
			const input: FunnelNotificationInput = {
				funnelId: currentFunnel.id,
				stageId,
				sequence,
				inactivityMinutes: 0,
				message: resetAction === "delete" ? "Delete conversation" : "Mark as completed",
				isReset: true,
				resetAction,
				delayMinutes,
			};
			const response = await apiPost(`/api/funnels/${currentFunnel.id}/notifications`, input, user?.experienceId);
			const data = await response.json().catch(() => ({}));
			if (!response.ok) throw new Error("Failed to save reset");
			if (data.success && data.data) {
				setNotifications((prev) => {
					const byId = prev.find((n) => n.id === data.data.id);
					const byStageReset = prev.find((n) => n.stageId === stageId && n.isReset);
					if (byId) return prev.map((n) => (n.id === data.data.id ? { ...data.data } : n));
					if (byStageReset) return prev.map((n) => (n.id === byStageReset.id ? { ...data.data } : n));
					const filtered = prev.filter((n) => !(n.stageId === stageId && n.isReset && n.id.startsWith("temp-")));
					return sortNotificationsWithResetLast([...filtered, data.data]);
				});
				setSelectedResetId(data.data.id);
			}
		} catch (error) {
			// Revert
			if (previousReset) {
				setNotifications((prev) => {
					const current = prev.find((n) => n.stageId === stageId && n.isReset);
					if (!current) return prev;
					return prev.map((n) => (n.id === current.id ? previousReset! : n));
				});
				setSelectedResetId(previousReset.id);
			}
			console.error("Error saving reset:", error);
			throw error;
		}
	};

	// Handle product FAQ change
	const handleProductFaqChange = async (input: FunnelProductFaqInput) => {
		try {
			const response = await fetch(`/api/funnels/${currentFunnel.id}/product-faqs`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(input),
			});
			
			if (!response.ok) {
				const errorData = await response.json().catch(() => ({ error: `HTTP error! status: ${response.status}` }));
				console.error("Product FAQ API error:", errorData);
				return; // Don't throw, just log and return
			}
			
			const data = await response.json();
			if (data.success && data.data) {
				// Update local state
				const existingIndex = productFaqs.findIndex((f) => f.resourceId === input.resourceId);
				if (existingIndex >= 0) {
					setProductFaqs(productFaqs.map((f, i) => (i === existingIndex ? data.data : f)));
				} else {
					setProductFaqs([...productFaqs, data.data]);
				}
			}
		} catch (error) {
			console.error("Error saving product FAQ:", error);
		}
	};

	// Keep ref in sync so preload callback can avoid applying stale results when funnel changes
	React.useEffect(() => {
		notificationsFunnelIdRef.current = currentFunnel.id ?? null;
	}, [currentFunnel.id]);

	// Preload notifications when editor has a funnel so data is in browser before user clicks Notifications
	React.useEffect(() => {
		if (!currentFunnel.id || !currentFunnel.flow?.stages || !user?.experienceId) return;
		const funnelId = currentFunnel.id;
		const experienceId = user.experienceId;
		notificationsFunnelIdRef.current = funnelId;
		setNotifications((prev) => prev.filter((n) => n.funnelId === funnelId));

		apiGet(`/api/funnels/${funnelId}/notifications`, experienceId)
			.then((res) => {
				if (!res.ok) {
					if (res.status === 400 || res.status === 401) {
						return res.json().then((errorData) => {
							throw new Error(errorData.error || `HTTP error! status: ${res.status}`);
						}).catch(() => {
							throw new Error(`HTTP error! status: ${res.status}`);
						});
					}
					throw new Error(`HTTP error! status: ${res.status}`);
				}
				const contentType = res.headers.get("content-type");
				if (!contentType || !contentType.includes("application/json")) {
					throw new Error("Response is not JSON");
				}
				return res.json();
			})
			.then((data) => {
				if (!data.success || !data.data) return;
				if (notificationsFunnelIdRef.current !== funnelId) return;
				const fetchedNotifications = data.data;
				const stages = currentFunnel.flow!.stages;
				const optimisticDefaults: FunnelNotification[] = [];
				for (const stage of stages) {
					const hasNotification = fetchedNotifications.some(
						(n: FunnelNotification) => n.stageId === stage.id && !n.isReset && n.sequence === 1
					);
					const hasReset = fetchedNotifications.some(
						(n: FunnelNotification) => n.stageId === stage.id && n.isReset
					);
					if (!hasNotification) {
						const lastMessage = getLastBotMessageFromStage(stage.id, currentFunnel.flow!);
						optimisticDefaults.push({
							id: `temp-notif-${stage.id}-1`,
							funnelId,
							stageId: stage.id,
							sequence: 1,
							inactivityMinutes: 30,
							message: lastMessage || "Reminder message",
							notificationType: "standard",
							isReset: false,
							createdAt: new Date(),
							updatedAt: new Date(),
						});
					}
					if (!hasReset) {
						const stageNotifs = fetchedNotifications.filter(
							(n: FunnelNotification) => n.stageId === stage.id && !n.isReset
						);
						const maxSequence = stageNotifs.length > 0
							? Math.max(...stageNotifs.map((n: FunnelNotification) => n.sequence))
							: 0;
						optimisticDefaults.push({
							id: `temp-reset-${stage.id}`,
							funnelId,
							stageId: stage.id,
							sequence: maxSequence + 1,
							inactivityMinutes: 0,
							message: "",
							isReset: true,
							resetAction: "delete",
							delayMinutes: 60,
							createdAt: new Date(),
							updatedAt: new Date(),
						});
					}
				}
				setNotifications((prev) => {
					if (notificationsFunnelIdRef.current !== funnelId) return prev;
					const allNotifications = [...fetchedNotifications, ...optimisticDefaults];
					const uniqueNotifications = allNotifications.reduce((acc: FunnelNotification[], notif: FunnelNotification) => {
						const existing = acc.find((n: FunnelNotification) => n.id === notif.id ||
							(n.stageId === notif.stageId && n.sequence === notif.sequence && n.isReset === notif.isReset));
						if (!existing) acc.push(notif);
						else if (!notif.id.startsWith("temp-")) acc[acc.indexOf(existing)] = notif;
						return acc;
					}, [] as FunnelNotification[]);
					return sortNotificationsWithResetLast(uniqueNotifications);
				});
				for (const stage of stages) {
					const hasNotification = fetchedNotifications.some(
						(n: FunnelNotification) => n.stageId === stage.id && !n.isReset && n.sequence === 1
					);
					const hasReset = fetchedNotifications.some(
						(n: FunnelNotification) => n.stageId === stage.id && n.isReset
					);
					if (!hasNotification) {
						const lastMessage = getLastBotMessageFromStage(stage.id, currentFunnel.flow!);
						apiPost(`/api/funnels/${funnelId}/notifications`, {
							funnelId,
							stageId: stage.id,
							sequence: 1,
							inactivityMinutes: 30,
							message: lastMessage || "Reminder message",
							notificationType: "standard",
							isReset: false,
						}, experienceId)
							.then((res) => res.json())
							.then((result) => {
								if (result.success && result.data) {
									setNotifications((prev) => {
										const withoutTemp = prev.filter((n) =>
											!(n.id.startsWith("temp-notif-") && n.stageId === stage.id && n.sequence === 1)
										);
										const existing = withoutTemp.find((n) => n.id === result.data.id);
										const next = existing ? withoutTemp.map((n) => n.id === result.data.id ? result.data : n) : [...withoutTemp, result.data];
										return sortNotificationsWithResetLast(next);
									});
								}
							})
							.catch(() => {});
					}
					if (!hasReset) {
						const stageNotifs = fetchedNotifications.filter(
							(n: FunnelNotification) => n.stageId === stage.id && !n.isReset
						);
						const maxSequence = stageNotifs.length > 0
							? Math.max(...stageNotifs.map((n: FunnelNotification) => n.sequence))
							: 0;
						apiPost(`/api/funnels/${funnelId}/notifications`, {
							funnelId,
							stageId: stage.id,
							sequence: maxSequence + 1,
							inactivityMinutes: 0,
							message: "",
							isReset: true,
							resetAction: "delete",
							delayMinutes: 60,
						}, experienceId)
							.then((res) => res.json())
							.then((result) => {
								if (result.success && result.data) {
									setNotifications((prev) => {
										const withoutTemp = prev.filter((n) =>
											!(n.id.startsWith("temp-reset-") && n.stageId === stage.id)
										);
										const existing = withoutTemp.find((n) => n.id === result.data.id);
										const next = existing ? withoutTemp.map((n) => n.id === result.data.id ? result.data : n) : [...withoutTemp, result.data];
										return sortNotificationsWithResetLast(next);
									});
								}
							})
							.catch(() => {});
					}
				}
			})
			.catch(() => {});
	}, [currentFunnel.id, currentFunnel.flow, user?.experienceId, sortNotificationsWithResetLast]);

	// When loading Notification view: first load notifications (always fetch); then if delete/complete not selected, auto-select delete and load it after notifs.
	React.useEffect(() => {
		if (!showConfigureView || !currentFunnel.id || !user?.experienceId || !currentFunnel.flow?.stages) {
			return;
		}
		// Always fetch notifications when opening Notification view (even if we have one default from preload)
		apiGet(`/api/funnels/${currentFunnel.id}/notifications`, user?.experienceId)
			.then(async (res) => {
					if (!res.ok) {
						let message = `HTTP error! status: ${res.status}`;
						if (res.status === 400 || res.status === 401) {
							try {
								const errorData = await res.json();
								if (typeof (errorData as { error?: string })?.error === "string") {
									message = (errorData as { error: string }).error;
								}
							} catch {
								// ignore non-JSON body
							}
						}
						throw new Error(message);
					}
					const contentType = res.headers.get("content-type");
					if (!contentType || !contentType.includes("application/json")) {
						throw new Error("Response is not JSON");
					}
					return res.json();
				})
				.then(async (data) => {
					if (data.success && data.data) {
						const fetchedNotifications = data.data;
						const stages = currentFunnel.flow.stages;

						// 1) First load notifications only (even if there is one default)
						setNotifications(sortNotificationsWithResetLast(fetchedNotifications));

						// 2) Add default notification (seq 1) if missing
						const optimisticNotifs: FunnelNotification[] = [];
						for (const stage of stages) {
							const hasNotification = fetchedNotifications.some(
								(n: FunnelNotification) => n.stageId === stage.id && !n.isReset && n.sequence === 1
							);
							if (!hasNotification) {
								const lastMessage = getLastBotMessageFromStage(stage.id, currentFunnel.flow);
								optimisticNotifs.push({
									id: `temp-notif-${stage.id}-1`,
									funnelId: currentFunnel.id,
									stageId: stage.id,
									sequence: 1,
									inactivityMinutes: 30,
									message: lastMessage || "Reminder message",
									notificationType: "standard",
									isReset: false,
									createdAt: new Date(),
									updatedAt: new Date(),
								});
							}
						}
						if (optimisticNotifs.length > 0) {
							setNotifications((prev) => sortNotificationsWithResetLast([...prev, ...optimisticNotifs]));
							for (const stage of stages) {
								const hasNotification = fetchedNotifications.some(
									(n: FunnelNotification) => n.stageId === stage.id && !n.isReset && n.sequence === 1
								);
								if (!hasNotification) {
									const lastMessage = getLastBotMessageFromStage(stage.id, currentFunnel.flow);
									apiPost(`/api/funnels/${currentFunnel.id}/notifications`, {
										funnelId: currentFunnel.id,
										stageId: stage.id,
										sequence: 1,
										inactivityMinutes: 30,
										message: lastMessage || "Reminder message",
										notificationType: "standard",
										isReset: false,
									}, user?.experienceId)
										.then((res) => res.json())
										.then((result) => {
											if (result.success && result.data) {
												setNotifications((prev) => {
													const withoutTemp = prev.filter((n) =>
														!(n.id.startsWith("temp-notif-") && n.stageId === stage.id && n.sequence === 1)
													);
													const existing = withoutTemp.find((n) => n.id === result.data.id);
													const next = !existing ? [...withoutTemp, result.data] : withoutTemp.map((n) => n.id === result.data.id ? result.data : n);
													return sortNotificationsWithResetLast(next);
												});
											}
										})
										.catch((err) => console.error("Error creating default notification:", err));
								}
							}
						}

						// 3) After notifs are loaded: if delete/complete not selected, auto-select delete and load it (persist after notifs)
						const stagesMissingReset = stages.filter(
							(stage: { id: string }) => !fetchedNotifications.some(
								(n: FunnelNotification) => n.stageId === stage.id && n.isReset
							)
						);
						if (stagesMissingReset.length > 0) {
							const optimisticResets: FunnelNotification[] = stagesMissingReset.map((stage: { id: string }) => {
								const stageNotifs = fetchedNotifications.filter(
									(n: FunnelNotification) => n.stageId === stage.id && !n.isReset
								);
								const maxSequence = stageNotifs.length > 0
									? Math.max(...stageNotifs.map((n: FunnelNotification) => n.sequence))
									: 0;
								return {
									id: `temp-reset-${stage.id}`,
									funnelId: currentFunnel.id,
									stageId: stage.id,
									sequence: maxSequence + 1,
									inactivityMinutes: 0,
									message: "",
									isReset: true,
									resetAction: "delete" as const,
									delayMinutes: 60,
									createdAt: new Date(),
									updatedAt: new Date(),
								};
							});
							setNotifications((prev) => sortNotificationsWithResetLast([...prev, ...optimisticResets]));
							for (const stage of stagesMissingReset) {
								const stageNotifs = fetchedNotifications.filter(
									(n: FunnelNotification) => n.stageId === stage.id && !n.isReset
								);
								const maxSequence = stageNotifs.length > 0
									? Math.max(...stageNotifs.map((n: FunnelNotification) => n.sequence))
									: 0;
								apiPost(`/api/funnels/${currentFunnel.id}/notifications`, {
									funnelId: currentFunnel.id,
									stageId: stage.id,
									sequence: maxSequence + 1,
									inactivityMinutes: 0,
									message: "",
									isReset: true,
									resetAction: "delete",
									delayMinutes: 60,
								}, user?.experienceId)
									.then((res) => res.json())
									.then((result) => {
										if (result.success && result.data) {
											setNotifications((prev) => {
												const withoutTemp = prev.filter((n) =>
													!(n.id.startsWith("temp-reset-") && n.stageId === stage.id)
												);
												const existing = withoutTemp.find((n) => n.id === result.data.id);
												const next = !existing ? [...withoutTemp, result.data] : withoutTemp.map((n) => n.id === result.data.id ? result.data : n);
												return sortNotificationsWithResetLast(next);
											});
										}
									})
									.catch((err) => {
										console.error("Error creating default reset:", err);
									});
							}
						}
					}
				})
				.catch((err) => {
					console.error("Error fetching notifications:", err);
					// On error, still create optimistic defaults so UI works
					if (currentFunnel.flow?.stages) {
						const stages = currentFunnel.flow.stages;
						const optimisticDefaults: FunnelNotification[] = [];
						
						for (const stage of stages) {
							// Create optimistic default notification (Standard)
							const lastMessage = getLastBotMessageFromStage(stage.id, currentFunnel.flow);
							optimisticDefaults.push({
								id: `temp-notif-${stage.id}-1`,
								funnelId: currentFunnel.id,
								stageId: stage.id,
								sequence: 1,
								inactivityMinutes: 30,
								message: lastMessage || "Reminder message",
								notificationType: "standard",
								isReset: false,
								createdAt: new Date(),
								updatedAt: new Date(),
							});
							
							// Create optimistic default reset (Delete)
							optimisticDefaults.push({
								id: `temp-reset-${stage.id}`,
								funnelId: currentFunnel.id,
								stageId: stage.id,
								sequence: 2,
								inactivityMinutes: 0,
								message: "",
								isReset: true,
								resetAction: "delete",
								delayMinutes: 60,
								createdAt: new Date(),
								updatedAt: new Date(),
							});
						}
						
						setNotifications(sortNotificationsWithResetLast(optimisticDefaults));
					} else {
						setNotifications([]);
					}
				});
	}, [showConfigureView, currentFunnel.id, currentFunnel.flow, user?.experienceId, sortNotificationsWithResetLast]);

	// Get stages from flow for ConfigPanel
	const getStagesForConfig = () => {
		if (!currentFunnel.flow?.stages) return [];
		return currentFunnel.flow.stages
			.filter((s: { name: string }) => s.name !== "SEND_DM") // DM fires once after trigger; no notifications needed
			.map((s: { id: string; name: string; explanation?: string; blockIds: string[] }) => ({
				id: s.id,
				name: s.name,
				explanation: s.explanation || "",
				blockIds: s.blockIds || [],
			}));
	};

	// Deployment logic is now handled by useFunnelDeployment hook

	// Handle successful generation - don't automatically switch context
	const handleGenerationSuccess = () => {
		// Don't automatically switch context - let user stay in their current view
		// User can manually navigate to preview when ready
	};

	// Cleanup is now handled by useFunnelDeployment hook

	// Header height for canvas offset (fixed header)
	const HEADER_HEIGHT = 140; // Approximate header height in pixels

	// If in configure mode, show the notification canvas view
	if (showConfigureView) {
		return (
			<div className="h-screen overflow-hidden bg-gradient-to-br from-surface via-surface/95 to-surface/90 font-sans transition-all duration-300">
				{/* Whop Design System Background Pattern */}
				<div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(120,119,198,0.08)_1px,transparent_0)] dark:bg-[radial-gradient(circle_at_1px_1px,rgba(120,119,198,0.15)_1px,transparent_0)] bg-[length:24px_24px] pointer-events-none" />
				
				{/* Header */}
				<FunnelBuilderHeader
					onBack={onBack}
					isDeployed={currentFunnel.isDeployed || false}
					hasFlow={!!currentFunnel.flow}
					hasApiError={!!validation.apiError}
					onOpenConfiguration={() => {
						setShowConfigureView(false);
						setShowConfigPanel(false);
					}}
					onOpenOfflineConfirmation={modals.openOfflineConfirmation}
					onDeploy={deployment.handleDeploy}
					hasAnyLiveFunnel={hasAnyLiveFunnel}
					isPanelOpen={showConfigPanel}
					showMerchantButton={true}
					isDraft={currentFunnel.isDraft}
				/>

				{/* Main Layout Container */}
				<div 
					className="relative flex"
					style={{ 
						height: `calc(100vh - ${HEADER_HEIGHT}px)`,
						marginTop: `${HEADER_HEIGHT}px`
					}}
				>
					{/* Canvas Area - Notification Canvas View */}
					<div className="flex-1 min-w-0 transition-all duration-300 ease-in-out overflow-hidden">
					<NotificationCanvasView
						funnelId={currentFunnel.id}
						stages={getStagesForConfig()}
						notifications={notifications}
						selectedNotificationId={selectedNotificationId || undefined}
						selectedNotificationSequence={selectedNotificationSequence ?? undefined}
						selectedNotificationStageId={selectedNotificationStageId ?? undefined}
						selectedResetId={selectedResetId || undefined}
						selectedResetStageId={selectedResetStageId || undefined}
						isDeployed={!!currentFunnel.isDeployed}
						onAddNotification={handleAddNotification}
						onNotificationClick={handleNotificationClick}
						onNotificationClose={handleNotificationClose}
						onResetClick={handleResetClick}
						onNotificationDelete={handleNotificationDelete}
						onNotificationChange={handleNotificationChange}
						onNotificationSave={handleNotificationSave}
						onResetChange={handleResetChange}
						onResetSave={handleResetSave}
					/>
					</div>

					{/* Right Side Panel - Notification and Reset Type Selection */}
					<ConfigPanel
						isOpen={showConfigPanel}
						funnelId={currentFunnel.id}
						stages={getStagesForConfig()}
						notifications={notifications}
						selectedNotificationId={selectedNotificationId ?? undefined}
						selectedResetId={selectedResetId ?? undefined}
						selectedNotificationSequence={selectedNotificationSequence ?? undefined}
						selectedNotificationStageId={selectedNotificationStageId ?? undefined}
						selectedResetStageId={selectedResetStageId ?? undefined}
						funnelFlow={currentFunnel.flow}
						onNotificationTypeSelect={(notificationId, stageId, sequence, type) => {
							// Find or create notification and update type
							const existing = notificationId 
								? notifications.find((n) => n.id === notificationId)
								: notifications.find((n) => n.stageId === stageId && n.sequence === sequence && !n.isReset);
							
							if (existing) {
								handleNotificationChange({
									funnelId: currentFunnel.id,
									stageId: existing.stageId,
									sequence: existing.sequence,
									inactivityMinutes: existing.inactivityMinutes,
									message: existing.message,
									notificationType: type,
									isReset: false,
								});
							} else {
								// New notification - create with defaults
								handleNotificationChange({
									funnelId: currentFunnel.id,
									stageId,
									sequence,
									inactivityMinutes: 30,
									message: type === "standard" ? "Reminder message" : "Enter your notification message",
									notificationType: type,
									isReset: false,
								});
							}
						}}
						onResetTypeSelect={(resetId, stageId, type) => {
							// Find or create reset and update type
							const existing = resetId
								? notifications.find((n) => n.id === resetId)
								: notifications.find((n) => n.stageId === stageId && n.isReset);
							const delayMinutes = existing?.delayMinutes ?? 60;
							handleResetChange(stageId, type, delayMinutes);
							// Persist type change (delete ↔ complete) to backend
							handleResetSave(stageId, type, delayMinutes);
						}}
						onClose={() => {
							setShowConfigPanel(false);
							setSelectedNotificationId(null);
							setSelectedNotificationSequence(null);
							setSelectedNotificationStageId(null);
							setSelectedResetId(null);
							setSelectedResetStageId(null);
						}}
					/>
				</div>
			</div>
		);
	}

	return (
		<div className="h-screen overflow-hidden bg-gradient-to-br from-surface via-surface/95 to-surface/90 font-sans transition-all duration-300">
			{/* Whop Design System Background Pattern */}
			<div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(120,119,198,0.08)_1px,transparent_0)] dark:bg-[radial-gradient(circle_at_1px_1px,rgba(120,119,198,0.15)_1px,transparent_0)] bg-[length:24px_24px] pointer-events-none" />

			{/* Fixed Header - Always visible at top, shrinks when panel is open */}
					{!validation.editingBlockId && (
						<FunnelBuilderHeader
							onBack={onBack}
							isDeployed={!!currentFunnel.isDeployed}
							hasFlow={!!currentFunnel.flow}
							hasApiError={!!validation.apiError}
							onOpenConfiguration={() => {
								setShowConfigureView(true);
								setShowTriggerPanel(false);
							}}
							onOpenOfflineConfirmation={modals.openOfflineConfirmation}
							onDeploy={deployment.handleDeploy}
							hasAnyLiveFunnel={hasAnyLiveFunnel}
							isPanelOpen={showTriggerPanel}
							isDraft={currentFunnel.isDraft}
						/>
					)}

			{/* Main Layout Container - Flex row for canvas + sidebar panel */}
			<div 
				className="relative flex"
				style={{ 
					height: validation.editingBlockId ? '100vh' : `calc(100vh - ${HEADER_HEIGHT}px)`,
					marginTop: validation.editingBlockId ? 0 : `${HEADER_HEIGHT}px`
				}}
			>
				{/* Canvas Area - Full remaining viewport */}
				<div className={`flex-1 min-w-0 transition-all duration-300 ease-in-out overflow-hidden`}>
					{/* API Error Modal */}
					<ApiErrorModal
						error={validation.apiError}
						onClose={() => validation.setApiError(null)}
					/>

					{/* Render FunnelVisualizer with actual flow or minimal flow */}
					<FunnelVisualizer
										funnelFlow={flowToUse}
										editingBlockId={validation.editingBlockId}
										setEditingBlockId={validation.setEditingBlockId}
										onBlockUpdate={handleBlockUpdate}
										selectedOffer={modals.selectedOffer}
										onOfferSelect={(offerId) =>
											modals.setSelectedOffer(offerId)
										}
										funnelId={currentFunnel.id}
										user={user}
										isDeployed={currentFunnel.isDeployed}
										selectedCategory={triggerPanelCategory}
										membershipTriggerType={currentFunnel.membershipTriggerType}
										appTriggerType={currentFunnel.appTriggerType}
										membershipTriggerConfig={currentFunnel.membershipTriggerConfig}
										appTriggerConfig={currentFunnel.appTriggerConfig}
										delayMinutes={currentFunnel.delayMinutes || 0} // App trigger delay (backward compatibility)
										membershipDelayMinutes={currentFunnel.membershipDelayMinutes || 0} // Membership trigger delay
										resources={resources}
										funnels={funnels}
										qualificationFunnels={qualificationFunnels}
										upsellFunnels={upsellFunnels}
										loadingResources={loadingResources}
										loadingFunnels={loadingFunnels}
										onResourceChange={handleResourceChange}
										onFunnelChange={handleFunnelChange}
										onMembershipFilterChange={handleMembershipFilterChange}
										onAppFilterChange={handleAppFilterChange}
										profiles={[]}
										onQualificationProfileChange={handleQualificationProfileChange}
										onMembershipTriggerClick={() => {
											setTriggerPanelCategory("Membership");
											setShowTriggerPanel(true);
										}}
										onAppTriggerClick={() => {
											setTriggerPanelCategory("App");
											setShowTriggerPanel(true);
										}}
										onTriggerClick={() => {
											// Backward compatibility - default to App
											setTriggerPanelCategory("App");
											setShowTriggerPanel(true);
										}}
										onDelayChange={handleDelayChange} // App trigger delay
										onMembershipDelayChange={handleMembershipDelayChange} // Membership trigger delay
										onDelaySave={handleDelaySave} // App trigger delay
										onMembershipDelaySave={handleMembershipDelaySave} // Membership trigger delay
										hasUnsavedAppTriggerConfig={hasUnsavedAppTriggerConfig}
										hasUnsavedMembershipTriggerConfig={hasUnsavedMembershipTriggerConfig}
										onAppTriggerConfigSave={() => handleTriggerConfigSave("App")}
										onMembershipTriggerConfigSave={() => handleTriggerConfigSave("Membership")}
										merchantType={merchantType}
										onUpsellClick={(blockId: string) => handleUpsellDownsellClick(blockId, "upsell")}
										onDownsellClick={(blockId: string) => handleUpsellDownsellClick(blockId, "downsell")}
										onAddNewOption={merchantType === "qualification" ? handleAddNewOption : undefined}
										pendingOptionSelection={pendingOptionSelection}
										pendingCardTypeSelection={pendingCardTypeSelection}
										onCardTypeSelection={handleCardTypeSelection}
										onOptionConnectRequest={handleOptionConnectRequest}
										onCardSelection={handleCardSelection}
										onClearCardSelection={() => {
											// Card-type selection (qualification new stage): remove placeholder and new stage if empty
											if (pendingCardTypeSelection) {
												if (!currentFunnel.flow) {
													setPendingCardTypeSelection(null);
													return;
												}
												const newFlow = { ...currentFunnel.flow };
												delete newFlow.blocks[pendingCardTypeSelection.newBlockId];
												const stageWithNewBlockIndex = newFlow.stages.findIndex((stage: any) =>
													stage.blockIds && stage.blockIds.includes(pendingCardTypeSelection!.newBlockId)
												);
												if (stageWithNewBlockIndex >= 0) {
													const stageWithNewBlock = newFlow.stages[stageWithNewBlockIndex];
													stageWithNewBlock.blockIds = stageWithNewBlock.blockIds.filter(
														(id: string) => id !== pendingCardTypeSelection!.newBlockId
													);
													if (stageWithNewBlock.blockIds.length === 0 && stageWithNewBlockIndex > 0) {
														newFlow.stages = newFlow.stages.filter((_: any, index: number) => index !== stageWithNewBlockIndex);
													}
												}
												// Revert local state only; placeholder was never persisted
												const updatedFunnel = { ...currentFunnel, flow: newFlow };
												setCurrentFunnel(updatedFunnel);
												setPendingCardTypeSelection(null);
												return;
											}
											// Qualification option selection (new block in existing stage or change connection): remove placeholder, restore option if change connection
											if (pendingOptionSelection?.isActive && !pendingOptionSelection?.upsellKind) {
												if (!currentFunnel.flow || !pendingOptionSelection.newBlockId) {
													setPendingOptionSelection(null);
													return;
												}
												const newFlow = { ...currentFunnel.flow };
												delete newFlow.blocks[pendingOptionSelection.newBlockId];
												const stageWithNewBlockIndex = newFlow.stages.findIndex((stage: any) =>
													stage.blockIds && stage.blockIds.includes(pendingOptionSelection.newBlockId)
												);
												if (stageWithNewBlockIndex >= 0) {
													const stageWithNewBlock = newFlow.stages[stageWithNewBlockIndex];
													stageWithNewBlock.blockIds = stageWithNewBlock.blockIds.filter(
														(id: string) => id !== pendingOptionSelection.newBlockId
													);
													if (stageWithNewBlock.blockIds.length === 0 && stageWithNewBlockIndex > 0) {
														newFlow.stages = newFlow.stages.filter((_: any, index: number) => index !== stageWithNewBlockIndex);
													}
												}
												// Change connection: restore option's nextBlockId to previous value
												if (pendingOptionSelection.optionIndex != null && pendingOptionSelection.previousNextBlockId !== undefined) {
													const sourceBlock = newFlow.blocks[pendingOptionSelection.sourceBlockId];
													if (sourceBlock?.options?.[pendingOptionSelection.optionIndex]) {
														const opts = [...sourceBlock.options];
														opts[pendingOptionSelection.optionIndex] = {
															...opts[pendingOptionSelection.optionIndex],
															nextBlockId: pendingOptionSelection.previousNextBlockId,
														};
														newFlow.blocks[pendingOptionSelection.sourceBlockId] = { ...sourceBlock, options: opts };
													}
												}
												const updatedFunnel = { ...currentFunnel, flow: newFlow };
												setCurrentFunnel(updatedFunnel);
												setPendingOptionSelection(null);
												return;
											}
											// Upsell/downsell: remove placeholder and new stage if empty
											if (!pendingOptionSelection?.isActive || !pendingOptionSelection?.upsellKind) return;
											if (!currentFunnel.flow || !pendingOptionSelection.newBlockId) {
												setPendingOptionSelection(null);
												return;
											}
											const newFlow = { ...currentFunnel.flow };
											delete newFlow.blocks[pendingOptionSelection.newBlockId];
											const stageWithNewBlockIndex = newFlow.stages.findIndex((stage: any) =>
												stage.blockIds && stage.blockIds.includes(pendingOptionSelection.newBlockId)
											);
											if (stageWithNewBlockIndex >= 0) {
												const stageWithNewBlock = newFlow.stages[stageWithNewBlockIndex];
												stageWithNewBlock.blockIds = stageWithNewBlock.blockIds.filter(
													(id: string) => id !== pendingOptionSelection.newBlockId
												);
												if (stageWithNewBlock.blockIds.length === 0 && stageWithNewBlockIndex > 0) {
													newFlow.stages = newFlow.stages.filter((_: any, index: number) => index !== stageWithNewBlockIndex);
												}
											}
											const updatedFunnel = { ...currentFunnel, flow: newFlow };
											setCurrentFunnel(updatedFunnel);
											onUpdate(updatedFunnel);
											setPendingOptionSelection(null);
										}}
										pendingDelete={pendingDelete}
										onDeleteClick={handleDeleteClick}
										onConfirmDelete={handleConfirmDelete}
										onCancelDelete={handleCancelDelete}
										onStageUpdate={handleStageUpdate}
										ref={funnelVisualizerRef}
									/>
				</div>

				{/* Trigger Selection Panel - Slides in from right as part of layout */}
				<TriggerPanel
					isOpen={showTriggerPanel}
					selectedCategory={triggerPanelCategory || undefined}
					selectedTrigger={triggerPanelCategory === "App" ? (currentFunnel.appTriggerType ?? "on_app_entry") : (currentFunnel.membershipTriggerType)}
					membershipTrigger={currentFunnel.membershipTriggerType}
					appTrigger={currentFunnel.appTriggerType}
					triggerConfig={triggerPanelCategory === "App" ? (currentFunnel.appTriggerConfig ?? {}) : (currentFunnel.membershipTriggerConfig ?? {})}
					membershipTriggerConfig={currentFunnel.membershipTriggerConfig}
					appTriggerConfig={currentFunnel.appTriggerConfig}
					experienceId={user?.experience?.id ?? user?.experienceId}
					onSelect={handleTriggerSelect}
					onSave={handleTriggerSave}
					onClose={() => {
						setShowTriggerPanel(false);
						setTriggerPanelCategory(null);
					}}
				/>
					</div>

			{/* Modals - Positioned outside main layout */}
					<DeploymentModal
						isDeploying={deployment.isDeploying}
						deploymentLog={deployment.deploymentLog}
						action={deployment.deploymentAction}
					/>

					{/* Offline Confirmation Modal */}
					<OfflineConfirmationModal
						isOpen={modals.offlineConfirmation}
						onClose={modals.closeOfflineConfirmation}
						onConfirm={async () => {
							await deployment.handleUndeploy();
							modals.closeOfflineConfirmation();
						}}
					/>

					{/* Deployment Validation Modal */}
					{deployment.deploymentValidation &&
						!deployment.deploymentValidation.isValid && (
							<ValidationModal
								validation={deployment.deploymentValidation}
								resources={currentFunnel.resources || []}
								onClose={() => deployment.setDeploymentValidation(null)}
								onGoToProducts={onGoToFunnelProducts}
							/>
						)}

					{/* Unified Navigation */}
					<UnifiedNavigation
						onPreview={onGoToPreview}
						onFunnelProducts={onGoToFunnelProducts}
						onEdit={() => {}} // No-op since we're always in edit mode
						onGeneration={handleGenerationSuccess}
						isGenerated={!!currentFunnel.flow}
						user={null}
						isGenerating={false}
						isDeployed={currentFunnel.isDeployed}
						showOnPage="aibuilder"
						isFunnelBuilder={true}
						isSingleMerchant={isSingleMerchant}
					/>

		</div>
	);
};

export default AIFunnelBuilderPage;
