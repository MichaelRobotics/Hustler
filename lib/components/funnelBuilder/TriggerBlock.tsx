"use client";

import React, { useState, useEffect } from "react";
import { UserPlus, UserCheck, ChevronRight, ChevronDown, ShoppingCart, MessageSquare, CheckCircle, ArrowUpCircle, Clock, Trash2, XCircle, X } from "lucide-react";
import type { TriggerType, TriggerConfig } from "@/lib/types/funnel";

// Re-export TriggerType for backward compatibility
export type { TriggerType };

export interface TriggerOption {
	id: TriggerType;
	name: string;
	description: string;
	category: "App" | "Membership";
	color: "blue" | "green";
	icon: typeof UserPlus;
}

export const TRIGGER_OPTIONS: TriggerOption[] = [
	{
		id: "on_app_entry",
		name: "App Entry",
		description: "Start conversation when user first opens the app",
		category: "App",
		color: "blue",
		icon: UserPlus,
	},
	{
		id: "any_membership_buy",
		name: "Any membership buy",
		description: "Start conversation when any membership is purchased",
		category: "Membership",
		color: "green",
		icon: ShoppingCart,
	},
	{
		id: "membership_buy",
		name: "Membership buy",
		description: "Start conversation when a specific membership is purchased",
		category: "Membership",
		color: "green",
		icon: ShoppingCart,
	},
	{
		id: "no_active_conversation",
		name: "No active conversation",
		description: "Start conversation when there is no active conversation",
		category: "App",
		color: "blue",
		icon: MessageSquare,
	},
	{
		id: "qualification_merchant_complete",
		name: "Qualification merchant complete",
		description: "Start conversation when qualification merchant is completed",
		category: "App",
		color: "blue",
		icon: CheckCircle,
	},
	{
		id: "upsell_merchant_complete",
		name: "Upsell merchant complete",
		description: "Start conversation when upsell merchant is completed",
		category: "App",
		color: "blue",
		icon: ArrowUpCircle,
	},
	{
		id: "delete_merchant_conversation",
		name: "Delete merchant conversation",
		description: "Start conversation when merchant conversation is deleted",
		category: "App",
		color: "blue",
		icon: Trash2,
	},
	{
		id: "any_cancel_membership",
		name: "Any membership cancel",
		description: "Start conversation when any membership is cancelled",
		category: "Membership",
		color: "green",
		icon: XCircle,
	},
	{
		id: "cancel_membership",
		name: "Cancel Membership",
		description: "Start conversation when a specific membership is cancelled",
		category: "Membership",
		color: "green",
		icon: XCircle,
	},
];

interface TriggerBlockProps {
	selectedTrigger?: TriggerType; // Backward compatibility
	membershipTrigger?: TriggerType; // Membership category trigger
	appTrigger?: TriggerType; // App category trigger
	triggerConfig?: TriggerConfig; // Backward compatibility
	membershipTriggerConfig?: TriggerConfig; // Config for membership trigger
	appTriggerConfig?: TriggerConfig; // Config for app trigger
	delayMinutes?: number; // App trigger delay (backward compatibility)
	membershipDelayMinutes?: number; // Membership trigger delay
	experienceId?: string;
	resources?: Array<{ id: string; name: string }>; // For membership_buy
	funnels?: Array<{ id: string; name: string }>; // All (e.g. delete_merchant_conversation)
	qualificationFunnels?: Array<{ id: string; name: string }>; // Qualification-type for qualification_merchant_complete
	upsellFunnels?: Array<{ id: string; name: string }>; // Upsell-type for upsell_merchant_complete
	loadingResources?: boolean;
	loadingFunnels?: boolean;
	onClick?: () => void; // Backward compatibility
	onMembershipTriggerClick?: () => void; // Click handler for membership trigger
	onAppTriggerClick?: () => void; // Click handler for app trigger
	onDelayChange?: (minutes: number) => void; // App trigger delay (backward compatibility)
	onMembershipDelayChange?: (minutes: number) => void; // Membership trigger delay
	onDelaySave?: (minutes: number) => void; // App trigger delay (backward compatibility)
	onMembershipDelaySave?: (minutes: number) => void; // Membership trigger delay
	onResourceChange?: (resourceId: string) => void; // For membership_buy, cancel_membership
	onFunnelChange?: (funnelId: string) => void; // For qualification/upsell/delete_merchant_conversation
	onMembershipFilterChange?: (updates: { filterResourceIdsRequired?: string[]; filterResourceIdsExclude?: string[] }) => void;
	onAppFilterChange?: (updates: { filterResourceIdsRequired?: string[]; filterResourceIdsExclude?: string[] }) => void;
	profiles?: Array<{ id: string; name: string }>; // For qualification_merchant_complete - profile to match
	onQualificationProfileChange?: (profileId: string) => void;
	/** @deprecated Use hasUnsavedAppTriggerConfig / hasUnsavedMembershipTriggerConfig for per-trigger Save */
	hasUnsavedTriggerConfig?: boolean;
	/** @deprecated Use onAppTriggerConfigSave / onMembershipTriggerConfigSave for per-trigger Save */
	onTriggerConfigSave?: () => void;
	hasUnsavedAppTriggerConfig?: boolean;
	hasUnsavedMembershipTriggerConfig?: boolean;
	onAppTriggerConfigSave?: () => void;
	onMembershipTriggerConfigSave?: () => void;
}

/**
 * TriggerBlock Component
 * 
 * A clickable block that displays the currently selected trigger for conversation creation.
 * When clicked, it opens the TriggerPanel for selection.
 */
const TriggerBlock: React.FC<TriggerBlockProps> = ({
	selectedTrigger, // Backward compatibility
	membershipTrigger,
	appTrigger,
	triggerConfig = {}, // Backward compatibility
	membershipTriggerConfig = {},
	appTriggerConfig = {},
	delayMinutes = 0, // App trigger delay (backward compatibility)
	membershipDelayMinutes = 0, // Membership trigger delay
	experienceId,
	resources = [],
	funnels = [],
	qualificationFunnels = [],
	upsellFunnels = [],
	loadingResources = false,
	loadingFunnels = false,
	onClick, // Backward compatibility
	onMembershipTriggerClick,
	onAppTriggerClick,
	onDelayChange, // App trigger delay (backward compatibility)
	onMembershipDelayChange,
	onDelaySave, // App trigger delay (backward compatibility)
	onMembershipDelaySave,
	onResourceChange,
	onFunnelChange,
	onMembershipFilterChange,
	onAppFilterChange,
	profiles = [],
	onQualificationProfileChange,
	hasUnsavedTriggerConfig = false,
	onTriggerConfigSave,
	hasUnsavedAppTriggerConfig = false,
	hasUnsavedMembershipTriggerConfig = false,
	onAppTriggerConfigSave,
	onMembershipTriggerConfigSave,
}) => {
	// Per-trigger unsaved/save: use new props when provided, else fall back to legacy single flag/callback
	const appUnsaved = hasUnsavedAppTriggerConfig ?? hasUnsavedTriggerConfig;
	const membershipUnsaved = hasUnsavedMembershipTriggerConfig ?? hasUnsavedTriggerConfig;
	const onAppSave = onAppTriggerConfigSave ?? onTriggerConfigSave;
	const onMembershipSave = onMembershipTriggerConfigSave ?? onTriggerConfigSave;
	// Support both old single trigger and new dual trigger format
	// Always show dual triggers if both click handlers are provided (Merchant Conversation Editor mode)
	const useDualTriggers = (onMembershipTriggerClick !== undefined && onAppTriggerClick !== undefined) || 
	                        membershipTrigger !== undefined || 
	                        appTrigger !== undefined;
	const membershipTriggerOption: TriggerOption | null = membershipTrigger ? (TRIGGER_OPTIONS.find((t) => t.id === membershipTrigger) || null) : null;
	const appTriggerOption: TriggerOption | null = appTrigger ? (TRIGGER_OPTIONS.find((t) => t.id === appTrigger) || null) : null;
	const legacyTrigger = selectedTrigger ? TRIGGER_OPTIONS.find((t) => t.id === selectedTrigger) || TRIGGER_OPTIONS[0] : null;
	const trigger = legacyTrigger || appTriggerOption || membershipTriggerOption || TRIGGER_OPTIONS[0];
	const Icon = trigger.icon;

	// Time unit type
	type TimeUnit = "minutes" | "hours" | "days";
	
	// Helper function to determine best unit for display
	const getBestUnit = (minutes: number): { value: number; unit: TimeUnit } => {
		if (minutes === 0) return { value: 0, unit: "minutes" };
		if (minutes % (24 * 60) === 0) {
			return { value: minutes / (24 * 60), unit: "days" };
		}
		if (minutes % 60 === 0) {
			return { value: minutes / 60, unit: "hours" };
		}
		return { value: minutes, unit: "minutes" };
	};

	// Helper function to convert to minutes
	const convertToMinutes = (value: number, unit: TimeUnit): number => {
		switch (unit) {
			case "days":
				return value * 24 * 60;
			case "hours":
				return value * 60;
			case "minutes":
			default:
				return value;
		}
	};

	// Initialize display value and unit
	const initialDisplay = getBestUnit(delayMinutes);
	const [localDisplayValue, setLocalDisplayValue] = useState(initialDisplay.value);
	const [localTimeUnit, setLocalTimeUnit] = useState<TimeUnit>(initialDisplay.unit);
	const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

	// Filter section expand/collapse. In Merchant Conversation Editor (useDualTriggers), keep filter section collapsed when filters are selected so the trigger doesn't unwrap on enter.
	const hasMembershipFilter = (membershipTriggerConfig?.filterResourceIdsRequired?.length ?? 0) + (membershipTriggerConfig?.filterResourceIdsExclude?.length ?? 0) > 0;
	const hasAppFilter = (appTriggerConfig?.filterResourceIdsRequired?.length ?? 0) + (appTriggerConfig?.filterResourceIdsExclude?.length ?? 0) > 0;
	const [filterExpandedMembership, setFilterExpandedMembership] = useState(
		useDualTriggers && hasMembershipFilter ? false : hasMembershipFilter
	);
	const [filterExpandedApp, setFilterExpandedApp] = useState(
		useDualTriggers && hasAppFilter ? false : hasAppFilter
	);
	const hasSingleFilter = (triggerConfig?.filterResourceIdsRequired?.length ?? 0) + (triggerConfig?.filterResourceIdsExclude?.length ?? 0) > 0;
	const [filterExpandedSingle, setFilterExpandedSingle] = useState(hasSingleFilter);

	// Sync local state when prop changes
	useEffect(() => {
		const display = getBestUnit(delayMinutes);
		setLocalDisplayValue(display.value);
		setLocalTimeUnit(display.unit);
		setHasUnsavedChanges(false);
	}, [delayMinutes]);

	const handleResourceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		const resourceId = e.target.value;
		onResourceChange?.(resourceId);
	};

	const handleFunnelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		const funnelId = e.target.value;
		onFunnelChange?.(funnelId);
	};

	const colorClasses = {
		blue: {
			bg: "bg-blue-50 dark:bg-blue-900/20",
			border: "border-blue-200 dark:border-blue-700/50",
			iconBg: "bg-blue-100 dark:bg-blue-800/50",
			iconText: "text-blue-600 dark:text-blue-400",
			text: "text-blue-700 dark:text-blue-300",
		},
		green: {
			bg: "bg-green-50 dark:bg-green-900/20",
			border: "border-green-200 dark:border-green-700/50",
			iconBg: "bg-green-100 dark:bg-green-800/50",
			iconText: "text-green-600 dark:text-green-400",
			text: "text-green-700 dark:text-green-300",
		},
	};

	const colors = colorClasses[trigger.color];

	const handleDelayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = parseInt(e.target.value, 10);
		const newValue = isNaN(value) ? 0 : Math.max(0, value);
		setLocalDisplayValue(newValue);
		const minutesValue = convertToMinutes(newValue, localTimeUnit);
		setHasUnsavedChanges(minutesValue !== delayMinutes);
		// No auto-save - changes only saved when user clicks Save button
	};

	const handleUnitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		const newUnit = e.target.value as TimeUnit;
		// Convert current display value to minutes, then to new unit
		const currentMinutes = convertToMinutes(localDisplayValue, localTimeUnit);
		const display = getBestUnit(currentMinutes);
		// If the current value fits nicely in the new unit, use that, otherwise convert
		let newDisplayValue = localDisplayValue;
		if (newUnit === "days" && currentMinutes % (24 * 60) === 0) {
			newDisplayValue = currentMinutes / (24 * 60);
		} else if (newUnit === "hours" && currentMinutes % 60 === 0) {
			newDisplayValue = currentMinutes / 60;
		} else if (newUnit === "minutes") {
			newDisplayValue = currentMinutes;
		} else {
			// Convert to new unit (may have decimals)
			if (newUnit === "days") {
				newDisplayValue = currentMinutes / (24 * 60);
			} else if (newUnit === "hours") {
				newDisplayValue = currentMinutes / 60;
			}
		}
		setLocalDisplayValue(Math.round(newDisplayValue * 100) / 100); // Round to 2 decimals
		setLocalTimeUnit(newUnit);
		const minutesValue = convertToMinutes(newDisplayValue, newUnit);
		setHasUnsavedChanges(minutesValue !== delayMinutes);
		// No auto-save - changes only saved when user clicks Save button
	};

	const handleSave = () => {
		if (hasUnsavedChanges && onDelaySave) {
			const minutesValue = convertToMinutes(localDisplayValue, localTimeUnit);
			onDelaySave(minutesValue);
			setHasUnsavedChanges(false);
		}
		if (appUnsaved && onAppSave) {
			onAppSave();
		}
	};

	// Membership delay state
	const membershipInitialDisplay = getBestUnit(membershipDelayMinutes);
	const [membershipLocalDisplayValue, setMembershipLocalDisplayValue] = useState(membershipInitialDisplay.value);
	const [membershipLocalTimeUnit, setMembershipLocalTimeUnit] = useState<TimeUnit>(membershipInitialDisplay.unit);
	const [membershipHasUnsavedChanges, setMembershipHasUnsavedChanges] = useState(false);

	useEffect(() => {
		const display = getBestUnit(membershipDelayMinutes);
		setMembershipLocalDisplayValue(display.value);
		setMembershipLocalTimeUnit(display.unit);
		setMembershipHasUnsavedChanges(false);
	}, [membershipDelayMinutes]);

	const handleMembershipDelayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = parseInt(e.target.value, 10);
		const newValue = isNaN(value) ? 0 : Math.max(0, value);
		setMembershipLocalDisplayValue(newValue);
		const minutesValue = convertToMinutes(newValue, membershipLocalTimeUnit);
		setMembershipHasUnsavedChanges(minutesValue !== membershipDelayMinutes);
		onMembershipDelayChange?.(minutesValue);
	};

	const handleMembershipUnitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		const newUnit = e.target.value as TimeUnit;
		const currentMinutes = convertToMinutes(membershipLocalDisplayValue, membershipLocalTimeUnit);
		const display = getBestUnit(currentMinutes);
		let newDisplayValue = membershipLocalDisplayValue;
		if (newUnit === "days" && currentMinutes % (24 * 60) === 0) {
			newDisplayValue = currentMinutes / (24 * 60);
		} else if (newUnit === "hours" && currentMinutes % 60 === 0) {
			newDisplayValue = currentMinutes / 60;
		} else if (newUnit === "minutes") {
			newDisplayValue = currentMinutes;
		} else {
			if (newUnit === "days") {
				newDisplayValue = currentMinutes / (24 * 60);
			} else if (newUnit === "hours") {
				newDisplayValue = currentMinutes / 60;
			}
		}
		setMembershipLocalDisplayValue(Math.round(newDisplayValue * 100) / 100);
		setMembershipLocalTimeUnit(newUnit);
		const minutesValue = convertToMinutes(newDisplayValue, newUnit);
		setMembershipHasUnsavedChanges(minutesValue !== membershipDelayMinutes);
		onMembershipDelayChange?.(minutesValue);
	};

	const handleMembershipSave = () => {
		if (membershipHasUnsavedChanges && onMembershipDelaySave) {
			const minutesValue = convertToMinutes(membershipLocalDisplayValue, membershipLocalTimeUnit);
			onMembershipDelaySave(minutesValue);
			setMembershipHasUnsavedChanges(false);
		}
		if (membershipUnsaved && onMembershipSave) {
			onMembershipSave();
		}
	};

	// Helper function to render a single trigger block
	const renderTriggerBlock = (
		triggerOption: TriggerOption | null,
		triggerId: TriggerType | undefined,
		config: TriggerConfig,
		onClickHandler: (() => void) | undefined,
		category: "Membership" | "App",
		onResourceChangeHandler?: (resourceId: string) => void,
		onFunnelChangeHandler?: (funnelId: string) => void,
		resourcesList?: Array<{ id: string; name: string }>,
		funnelsList?: Array<{ id: string; name: string }>,
		loadingResourcesState?: boolean,
		loadingFunnelsState?: boolean,
		onMembershipFilterChangeHandler?: (updates: { filterResourceIdsRequired?: string[]; filterResourceIdsExclude?: string[] }) => void,
		onAppFilterChangeHandler?: (updates: { filterResourceIdsRequired?: string[]; filterResourceIdsExclude?: string[] }) => void,
		profilesList?: Array<{ id: string; name: string }>,
		onQualificationProfileChangeHandler?: (profileId: string) => void,
		filterExpanded?: boolean,
		onFilterToggle?: () => void
	) => {
		if (!triggerOption && !triggerId) {
			// Empty trigger - show placeholder
			return (
				<div className="flex flex-col gap-2 w-full">
					<div className="group flex flex-col gap-3 px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all duration-200 w-full">
						<button
							onClick={onClickHandler}
							className="flex items-center gap-3 cursor-pointer w-full"
						>
							<div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center bg-gray-100 dark:bg-gray-700 text-gray-400">
								<ChevronRight className="w-5 h-5" />
							</div>
							<div className="flex flex-col items-start flex-1 min-w-0">
								<span className="text-sm font-medium text-gray-500 dark:text-gray-400">
									Select {category} trigger
								</span>
								<span className="text-xs text-gray-400 dark:text-gray-500 truncate w-full text-left">
									Click to choose a trigger
								</span>
							</div>
							<ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors flex-shrink-0" />
						</button>
					</div>
				</div>
			);
		}

		const t = triggerOption || TRIGGER_OPTIONS[0];
		const IconComponent = t.icon;
		const triggerColors = colorClasses[t.color];

		return (
			<div className="flex flex-col gap-2 w-full">
				<div className={`
					group flex flex-col gap-3 px-4 py-3 rounded-xl
					${triggerColors.bg} ${triggerColors.border} border
					hover:shadow-md transition-all duration-200
					w-full
				`}>
					<button
						onClick={onClickHandler}
						className="flex items-center gap-3 cursor-pointer w-full"
					>
						<div className={`
							flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center
							${triggerColors.iconBg} ${triggerColors.iconText}
						`}>
							<IconComponent className="w-5 h-5" />
						</div>
						<div className="flex flex-col items-start flex-1 min-w-0">
							<span className={`text-sm font-medium ${triggerColors.text}`}>
								{t.name}
							</span>
							<span className="text-xs text-gray-500 dark:text-gray-400 truncate w-full text-left">
								{t.description}
							</span>
						</div>
						<ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors flex-shrink-0" />
					</button>

						{/* Resource Selection (if membership_buy) - inside card */}
						{triggerId === "membership_buy" && (
							<div 
								className="w-full"
								onClick={(e) => e.stopPropagation()}
							>
								<select
									value={config.resourceId || ""}
									onChange={(e) => {
										const resourceId = e.target.value;
										onResourceChangeHandler?.(resourceId);
									}}
									disabled={loadingResourcesState}
									className="w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/50"
								>
									<option value="">Select a product...</option>
									{(resourcesList || resources).map((resource) => (
										<option key={resource.id} value={resource.id}>
											{resource.name}
										</option>
									))}
								</select>
							</div>
						)}

						{/* Funnel Selection (if qualification/upsell/delete_merchant_conversation) - inside card */}
						{(triggerId === "qualification_merchant_complete" || triggerId === "upsell_merchant_complete" || triggerId === "delete_merchant_conversation") && (
							<div 
								className="w-full"
								onClick={(e) => e.stopPropagation()}
							>
								<select
									value={config.funnelId || ""}
									onChange={(e) => onFunnelChangeHandler?.(e.target.value)}
									disabled={loadingFunnelsState}
									className="w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/50"
								>
									<option value="">Select a funnel...</option>
									{(funnelsList || funnels).map((funnel) => (
										<option key={funnel.id} value={funnel.id}>
											{funnel.name}
										</option>
									))}
								</select>
							</div>
						)}

						{/* Profile Selection (qualification_merchant_complete only: trigger when user has this profile) */}
						{category === "App" && triggerId === "qualification_merchant_complete" && onQualificationProfileChangeHandler && (
							<div 
								className="w-full"
								onClick={(e) => e.stopPropagation()}
							>
								<select
									value={config.profileId || ""}
									onChange={(e) => onQualificationProfileChangeHandler?.(e.target.value)}
									className="w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/50"
								>
									<option value="">Select a profile...</option>
									{(profilesList || profiles).map((profile) => (
										<option key={profile.id} value={profile.id}>
											{profile.name}
										</option>
									))}
								</select>
							</div>
						)}

						{/* Resource Selection (if cancel_membership - specific only) - inside card */}
						{triggerId === "cancel_membership" && (
							<div 
								className="w-full"
								onClick={(e) => e.stopPropagation()}
							>
								<select
									value={config.resourceId || ""}
									onChange={(e) => onResourceChangeHandler?.(e.target.value)}
									disabled={loadingResourcesState}
									className="w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/50"
								>
									<option value="">Select a product...</option>
									{(resourcesList || resources).map((resource) => (
										<option key={resource.id} value={resource.id}>
											{resource.name}
										</option>
									))}
								</select>
							</div>
						)}

						{/* Filter (collapsible, Membership or App) */}
						{((category === "Membership" && (triggerId === "any_membership_buy" || triggerId === "membership_buy" || triggerId === "any_cancel_membership" || triggerId === "cancel_membership") && onMembershipFilterChangeHandler) || (category === "App" && onAppFilterChangeHandler)) && (resourcesList || resources).length > 0 && onFilterToggle && (() => {
							const resList = resourcesList || resources;
							const requiredIds = config.filterResourceIdsRequired ?? [];
							const excludeIds = config.filterResourceIdsExclude ?? [];
							const requiredAvailable = resList.filter((r) => !requiredIds.includes(r.id));
							const excludeAvailable = resList.filter((r) => !excludeIds.includes(r.id));
							const isMembership = category === "Membership" && onMembershipFilterChangeHandler;
							const onRequiredAdd = (id: string) => isMembership ? onMembershipFilterChangeHandler!({ filterResourceIdsRequired: [...requiredIds, id] }) : onAppFilterChangeHandler!({ filterResourceIdsRequired: [...requiredIds, id] });
							const onRequiredRemove = (id: string) => { const next = requiredIds.filter((x) => x !== id); (isMembership ? onMembershipFilterChangeHandler! : onAppFilterChangeHandler!)({ filterResourceIdsRequired: next.length ? next : undefined }); };
							const onExcludeAdd = (id: string) => isMembership ? onMembershipFilterChangeHandler!({ filterResourceIdsExclude: [...excludeIds, id] }) : onAppFilterChangeHandler!({ filterResourceIdsExclude: [...excludeIds, id] });
							const onExcludeRemove = (id: string) => { const next = excludeIds.filter((x) => x !== id); (isMembership ? onMembershipFilterChangeHandler! : onAppFilterChangeHandler!)({ filterResourceIdsExclude: next.length ? next : undefined }); };
							const expanded = filterExpanded ?? false;
							return (
								<div className="w-full" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
									<button
										type="button"
										onClick={onFilterToggle}
										className="flex items-center gap-2 w-full py-1.5 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
									>
										<span>Filter</span>
										<span className={`flex-shrink-0 transition-transform duration-200 ease-out ${expanded ? "rotate-0" : "-rotate-90"}`}>
											<ChevronDown className="w-4 h-4" />
										</span>
									</button>
									<div
										className="overflow-hidden transition-[max-height] duration-200 ease-out"
										style={{ maxHeight: expanded ? "400px" : "0" }}
									>
										<div className="w-full space-y-3 pt-2">
											<div>
												<div className="flex items-center gap-1.5 text-xs font-medium text-green-700 dark:text-green-400 mb-1">
													<CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
													Member must have bought
												</div>
												<select
													value=""
													onChange={(e) => {
														const id = e.target.value;
														if (!id) return;
														onRequiredAdd(id);
														e.target.value = "";
													}}
													className="w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-900 border border-green-200 dark:border-green-800 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500/50"
												>
													<option value="">Add product...</option>
													{requiredAvailable.map((r) => (
														<option key={r.id} value={r.id}>{r.name}</option>
													))}
												</select>
												{requiredIds.length > 0 && (
													<div className="mt-1.5 flex flex-wrap gap-1.5">
														{requiredIds.map((id) => {
															const r = resList.find((x) => x.id === id);
															return (
																<div key={id} className="flex items-center gap-1.5 text-xs bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200 rounded-md pl-1.5 pr-1 py-1">
																	<CheckCircle className="w-3.5 h-3.5 text-green-600 dark:text-green-400 flex-shrink-0" />
																	<span className="truncate max-w-[120px]">{r?.name ?? id}</span>
																	<button type="button" onClick={() => onRequiredRemove(id)} className="p-0.5 rounded hover:bg-green-200 dark:hover:bg-green-800/50 text-green-700 dark:text-green-300" aria-label="Remove"><X className="w-3 h-3" /></button>
																</div>
															);
														})}
													</div>
												)}
											</div>
											<div>
												<div className="flex items-center gap-1.5 text-xs font-medium text-red-700 dark:text-red-400 mb-1">
													<XCircle className="w-3.5 h-3.5 flex-shrink-0" />
													Member must not have bought
												</div>
												<select
													value=""
													onChange={(e) => {
														const id = e.target.value;
														if (!id) return;
														onExcludeAdd(id);
														e.target.value = "";
													}}
													className="w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-900 border border-red-200 dark:border-red-800 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500/50"
												>
													<option value="">Add product...</option>
													{excludeAvailable.map((r) => (
														<option key={r.id} value={r.id}>{r.name}</option>
													))}
												</select>
												{excludeIds.length > 0 && (
													<div className="mt-1.5 flex flex-wrap gap-1.5">
														{excludeIds.map((id) => {
															const r = resList.find((x) => x.id === id);
															return (
																<div key={id} className="flex items-center gap-1.5 text-xs bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 rounded-md pl-1.5 pr-1 py-1">
																	<XCircle className="w-3.5 h-3.5 text-red-600 dark:text-red-400 flex-shrink-0" />
																	<span className="truncate max-w-[120px]">{r?.name ?? id}</span>
																	<button type="button" onClick={() => onExcludeRemove(id)} className="p-0.5 rounded hover:bg-red-200 dark:hover:bg-red-800/50 text-red-700 dark:text-red-300" aria-label="Remove"><X className="w-3 h-3" /></button>
																</div>
															);
														})}
													</div>
												)}
											</div>
										</div>
									</div>
								</div>
							);
						})()}
				</div>
			</div>
		);
	};

	// If using dual triggers, render both
	if (useDualTriggers) {
		return (
			<div className="flex flex-col gap-4 w-full max-w-[320px]">
				{/* Membership Trigger */}
				<div>
					<div className="text-xs font-semibold text-green-600 dark:text-green-400 mb-2 uppercase tracking-wider">
						Membership Trigger
					</div>
					{renderTriggerBlock(
						membershipTriggerOption || null,
						membershipTrigger,
						membershipTriggerConfig,
						onMembershipTriggerClick,
						"Membership",
						onResourceChange,
						onFunnelChange,
						resources,
						funnels,
						loadingResources,
						loadingFunnels,
						onMembershipFilterChange,
						undefined,
						undefined,
						onQualificationProfileChange,
						filterExpandedMembership,
						() => setFilterExpandedMembership((p) => !p)
					)}
				</div>

				{/* Membership Delay Input */}
				<div>
					<div 
						className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700"
						onClick={(e) => e.stopPropagation()}
					>
						<Clock className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
						<span className="text-xs text-gray-600 dark:text-gray-400">Delay</span>
						<input
							type="number"
							min="0"
							step={membershipLocalTimeUnit === "minutes" ? "1" : "0.01"}
							value={membershipLocalDisplayValue}
							onChange={handleMembershipDelayChange}
							onClick={(e) => e.stopPropagation()}
							className="w-16 px-2 py-1 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/50"
						/>
						<select
							value={membershipLocalTimeUnit}
							onChange={handleMembershipUnitChange}
							onClick={(e) => e.stopPropagation()}
							className="px-2 py-1 text-xs bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/50"
						>
							<option value="minutes">min</option>
							<option value="hours">hours</option>
							<option value="days">days</option>
						</select>
						{(membershipHasUnsavedChanges || membershipUnsaved) && (onMembershipDelaySave || onMembershipSave) && (
							<button
								onClick={handleMembershipSave}
								className="ml-auto px-3 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-md transition-colors"
							>
								Save
							</button>
						)}
					</div>
				</div>

				{/* App Trigger - qualification shows qualification funnels, upsell shows upsell funnels */}
				<div>
					<div className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 mb-2 uppercase tracking-wider">
						<MessageSquare className="w-3.5 h-3.5" />
						App Trigger
					</div>
					{renderTriggerBlock(
						appTriggerOption || null,
						appTrigger,
						appTriggerConfig,
						onAppTriggerClick,
						"App",
						onResourceChange,
						onFunnelChange,
						resources,
						appTrigger === "qualification_merchant_complete"
							? (qualificationFunnels?.length ? qualificationFunnels : funnels)
							: appTrigger === "upsell_merchant_complete"
								? (upsellFunnels?.length ? upsellFunnels : funnels)
								: funnels,
						loadingResources,
						loadingFunnels,
						undefined,
						onAppFilterChange,
						profiles,
						onQualificationProfileChange,
						filterExpandedApp,
						() => setFilterExpandedApp((p) => !p)
					)}
				</div>

				{/* App Delay Input */}
				<div>
					<div 
						className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700"
						onClick={(e) => e.stopPropagation()}
					>
						<Clock className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
						<span className="text-xs text-gray-600 dark:text-gray-400">Delay</span>
						<input
							type="number"
							min="0"
							step={localTimeUnit === "minutes" ? "1" : "0.01"}
							value={localDisplayValue}
							onChange={handleDelayChange}
							onClick={(e) => e.stopPropagation()}
							className="w-16 px-2 py-1 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/50"
						/>
						<select
							value={localTimeUnit}
							onChange={handleUnitChange}
							onClick={(e) => e.stopPropagation()}
							className="px-2 py-1 text-xs bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/50"
						>
							<option value="minutes">min</option>
							<option value="hours">hours</option>
							<option value="days">days</option>
						</select>
						{(hasUnsavedChanges || appUnsaved) && (onDelaySave || onAppSave) && (
							<button
								onClick={handleSave}
								className="ml-auto px-3 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-md transition-colors"
							>
								Save
							</button>
						)}
					</div>
				</div>
			</div>
		);
	}

	// Backward compatibility: single trigger mode
	return (
		<div className="flex flex-col gap-2 w-full max-w-[320px]">
			<div
				className={`
					group flex flex-col gap-3 px-4 py-3 rounded-xl
					${colors.bg} ${colors.border} border
					hover:shadow-md transition-all duration-200
					w-full
				`}
			>
				{/* Top row: Icon, Content, Chevron */}
				<button
					onClick={onClick}
					className="flex items-center gap-3 cursor-pointer w-full"
				>
					{/* Icon */}
					<div className={`
						flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center
						${colors.iconBg} ${colors.iconText}
					`}>
						<Icon className="w-5 h-5" />
					</div>

					{/* Content */}
					<div className="flex flex-col items-start flex-1 min-w-0">
						<span className={`text-sm font-medium ${colors.text}`}>
							{trigger.name}
						</span>
						<span className="text-xs text-gray-500 dark:text-gray-400 truncate w-full text-left">
							{trigger.description}
						</span>
					</div>

					{/* Chevron */}
					<ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors flex-shrink-0" />
				</button>

				{/* Resource Selection (if membership_buy) - inside card */}
				{selectedTrigger === "membership_buy" && (
					<div 
						className="w-full"
						onClick={(e) => e.stopPropagation()}
					>
						<select
							value={triggerConfig.resourceId || ""}
							onChange={handleResourceChange}
							disabled={loadingResources}
							className="w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/50"
						>
							<option value="">Select a product...</option>
							{resources.map((resource) => (
								<option key={resource.id} value={resource.id}>
									{resource.name}
								</option>
							))}
						</select>
					</div>
				)}

				{/* Funnel Selection (if qualification/upsell/delete_merchant_conversation) - inside card */}
				{(selectedTrigger === "qualification_merchant_complete" || selectedTrigger === "upsell_merchant_complete" || selectedTrigger === "delete_merchant_conversation") && (
					<div 
						className="w-full"
						onClick={(e) => e.stopPropagation()}
					>
						<select
							value={triggerConfig.funnelId || ""}
							onChange={handleFunnelChange}
							disabled={loadingFunnels}
							className="w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/50"
						>
							<option value="">Select a funnel...</option>
							{(selectedTrigger === "qualification_merchant_complete"
								? (qualificationFunnels?.length ? qualificationFunnels : funnels)
								: selectedTrigger === "upsell_merchant_complete"
									? (upsellFunnels?.length ? upsellFunnels : funnels)
									: funnels
							).map((funnel) => (
								<option key={funnel.id} value={funnel.id}>
									{funnel.name}
								</option>
							))}
						</select>
					</div>
				)}

				{/* Profile Selection (qualification_merchant_complete only - single-trigger mode) */}
				{selectedTrigger === "qualification_merchant_complete" && onQualificationProfileChange && (
					<div 
						className="w-full"
						onClick={(e) => e.stopPropagation()}
					>
						<select
							value={triggerConfig.profileId || ""}
							onChange={(e) => onQualificationProfileChange(e.target.value)}
							className="w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/50"
						>
							<option value="">Select a profile...</option>
							{profiles.map((profile) => (
								<option key={profile.id} value={profile.id}>
									{profile.name}
								</option>
							))}
						</select>
					</div>
				)}

				{/* Filter (single-trigger mode, collapsible; membership or app) */}
				{(((selectedTrigger === "any_membership_buy" || selectedTrigger === "membership_buy" || selectedTrigger === "any_cancel_membership" || selectedTrigger === "cancel_membership") && onMembershipFilterChange) || (["on_app_entry", "no_active_conversation", "qualification_merchant_complete", "upsell_merchant_complete", "delete_merchant_conversation"].includes(selectedTrigger ?? "") && onAppFilterChange)) && resources.length > 0 && (() => {
					const requiredIds = triggerConfig.filterResourceIdsRequired ?? [];
					const excludeIds = triggerConfig.filterResourceIdsExclude ?? [];
					const requiredAvailable = resources.filter((r) => !requiredIds.includes(r.id));
					const excludeAvailable = resources.filter((r) => !excludeIds.includes(r.id));
					const isMembership = (selectedTrigger === "any_membership_buy" || selectedTrigger === "membership_buy" || selectedTrigger === "any_cancel_membership" || selectedTrigger === "cancel_membership") && onMembershipFilterChange;
					const onFilterChange = isMembership ? onMembershipFilterChange! : onAppFilterChange!;
					const expanded = filterExpandedSingle;
					return (
						<div className="w-full" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
							<button
								type="button"
								onClick={() => setFilterExpandedSingle((p) => !p)}
								className="flex items-center gap-2 w-full py-1.5 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
							>
								<span>Filter</span>
								<span className={`flex-shrink-0 transition-transform duration-200 ease-out ${expanded ? "rotate-0" : "-rotate-90"}`}>
									<ChevronDown className="w-4 h-4" />
								</span>
							</button>
							<div
								className="overflow-hidden transition-[max-height] duration-200 ease-out"
								style={{ maxHeight: expanded ? "400px" : "0" }}
							>
								<div className="w-full space-y-3 pt-2">
									<div>
										<div className="flex items-center gap-1.5 text-xs font-medium text-green-700 dark:text-green-400 mb-1">
											<CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
											Member must have bought
										</div>
										<select
											value=""
											onChange={(e) => {
												const id = e.target.value;
												if (!id) return;
												onFilterChange({ filterResourceIdsRequired: [...requiredIds, id] });
												e.target.value = "";
											}}
											className="w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-900 border border-green-200 dark:border-green-800 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500/50"
										>
											<option value="">Add product...</option>
											{requiredAvailable.map((r) => (
												<option key={r.id} value={r.id}>{r.name}</option>
											))}
										</select>
										{requiredIds.length > 0 && (
											<div className="mt-1.5 flex flex-wrap gap-1.5">
												{requiredIds.map((id) => {
													const r = resources.find((x) => x.id === id);
													return (
														<div key={id} className="flex items-center gap-1.5 text-xs bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200 rounded-md pl-1.5 pr-1 py-1">
															<CheckCircle className="w-3.5 h-3.5 text-green-600 dark:text-green-400 flex-shrink-0" />
															<span className="truncate max-w-[120px]">{r?.name ?? id}</span>
															<button type="button" onClick={() => { const next = requiredIds.filter((x) => x !== id); onFilterChange({ filterResourceIdsRequired: next.length ? next : undefined }); }} className="p-0.5 rounded hover:bg-green-200 dark:hover:bg-green-800/50 text-green-700 dark:text-green-300" aria-label="Remove"><X className="w-3 h-3" /></button>
														</div>
													);
												})}
											</div>
										)}
									</div>
									<div>
										<div className="flex items-center gap-1.5 text-xs font-medium text-red-700 dark:text-red-400 mb-1">
											<XCircle className="w-3.5 h-3.5 flex-shrink-0" />
											Member must not have bought
										</div>
										<select
											value=""
											onChange={(e) => {
												const id = e.target.value;
												if (!id) return;
												onFilterChange({ filterResourceIdsExclude: [...excludeIds, id] });
												e.target.value = "";
											}}
											className="w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-900 border border-red-200 dark:border-red-800 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500/50"
										>
											<option value="">Add product...</option>
											{excludeAvailable.map((r) => (
												<option key={r.id} value={r.id}>{r.name}</option>
											))}
										</select>
										{excludeIds.length > 0 && (
											<div className="mt-1.5 flex flex-wrap gap-1.5">
												{excludeIds.map((id) => {
													const r = resources.find((x) => x.id === id);
													return (
														<div key={id} className="flex items-center gap-1.5 text-xs bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 rounded-md pl-1.5 pr-1 py-1">
															<XCircle className="w-3.5 h-3.5 text-red-600 dark:text-red-400 flex-shrink-0" />
															<span className="truncate max-w-[120px]">{r?.name ?? id}</span>
															<button type="button" onClick={() => { const next = excludeIds.filter((x) => x !== id); onFilterChange({ filterResourceIdsExclude: next.length ? next : undefined }); }} className="p-0.5 rounded hover:bg-red-200 dark:hover:bg-red-800/50 text-red-700 dark:text-red-300" aria-label="Remove"><X className="w-3 h-3" /></button>
														</div>
													);
												})}
											</div>
										)}
									</div>
								</div>
							</div>
						</div>
					);
				})()}
			</div>

			{/* Delay Input */}
			<div 
				className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700"
				onClick={(e) => e.stopPropagation()}
			>
				<Clock className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
				<span className="text-xs text-gray-600 dark:text-gray-400">Delay</span>
				<input
					type="number"
					min="0"
					step={localTimeUnit === "minutes" ? "1" : "0.01"}
					value={localDisplayValue}
					onChange={handleDelayChange}
					onClick={(e) => e.stopPropagation()}
					className="w-16 px-2 py-1 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/50"
				/>
				<select
					value={localTimeUnit}
					onChange={handleUnitChange}
					onClick={(e) => e.stopPropagation()}
					className="px-2 py-1 text-xs bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/50"
				>
					<option value="minutes">min</option>
					<option value="hours">hours</option>
					<option value="days">days</option>
				</select>
				{(hasUnsavedChanges || hasUnsavedTriggerConfig) && (onDelaySave || onTriggerConfigSave) && (
					<button
						onClick={handleSave}
						className="ml-auto px-3 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-md transition-colors"
					>
						Save
					</button>
				)}
			</div>
		</div>
	);
};

export default TriggerBlock;



