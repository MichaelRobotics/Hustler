"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Text, Heading } from "frosted-ui";
import { Search, X } from "lucide-react";
import { type TriggerType, type TriggerOption, TRIGGER_OPTIONS } from "./TriggerBlock";
import type { TriggerConfig } from "@/lib/types/funnel";


interface Resource {
	id: string;
	name: string;
}

interface Funnel {
	id: string;
	name: string;
}

interface TriggerPanelProps {
	isOpen: boolean;
	selectedCategory?: "Membership" | "App"; // Category being edited
	selectedTrigger?: TriggerType; // Backward compatibility
	membershipTrigger?: TriggerType; // Membership category trigger
	appTrigger?: TriggerType; // App category trigger
	triggerConfig?: TriggerConfig; // Backward compatibility
	membershipTriggerConfig?: TriggerConfig; // Config for membership trigger
	appTriggerConfig?: TriggerConfig; // Config for app trigger
	experienceId?: string;
	onSelect: (category: "Membership" | "App", triggerId?: TriggerType, config?: TriggerConfig) => void;
	onSave?: (category: "Membership" | "App", triggerId: TriggerType, config?: TriggerConfig) => void;
	onClose: () => void;
}

/**
 * TriggerPanel Component
 * 
 * A right-side panel for selecting conversation triggers.
 * This is an inline panel that takes up space in the layout (not an overlay).
 * Features search, category filtering, trigger selection, and timeout configuration.
 */
const TriggerPanel: React.FC<TriggerPanelProps> = ({
	isOpen,
	selectedCategory = "App", // Default to App if not specified
	selectedTrigger, // Backward compatibility
	membershipTrigger,
	appTrigger,
	triggerConfig = {}, // Backward compatibility
	membershipTriggerConfig = {},
	appTriggerConfig = {},
	experienceId,
	onSelect,
	onSave,
	onClose,
}) => {
	const [searchQuery, setSearchQuery] = useState("");
	const [resources, setResources] = useState<Resource[]>([]);
	const [funnels, setFunnels] = useState<Funnel[]>([]);
	const [loadingResources, setLoadingResources] = useState(false);
	const [loadingFunnels, setLoadingFunnels] = useState(false);
	
	// Determine current trigger based on selected category
	const currentTrigger = selectedCategory === "Membership" 
		? (membershipTrigger || selectedTrigger) 
		: (appTrigger || selectedTrigger);
	const currentConfig = selectedCategory === "Membership"
		? (membershipTriggerConfig || triggerConfig)
		: (appTriggerConfig || triggerConfig);
	
	// Local state for trigger selection and config
	const [localSelectedTrigger, setLocalSelectedTrigger] = useState<TriggerType>(currentTrigger || "on_app_entry");

	// Sync local state when props change
	useEffect(() => {
		const trigger = selectedCategory === "Membership" 
			? (membershipTrigger || selectedTrigger) 
			: (appTrigger || selectedTrigger);
		const config = selectedCategory === "Membership"
			? (membershipTriggerConfig || triggerConfig)
			: (appTriggerConfig || triggerConfig);
		setLocalSelectedTrigger(trigger || "on_app_entry");
	}, [selectedCategory, selectedTrigger, membershipTrigger, appTrigger, triggerConfig, membershipTriggerConfig, appTriggerConfig]);

	// Fetch resources when panel opens and experienceId is available
	useEffect(() => {
		if (isOpen && experienceId) {
			setLoadingResources(true);
			fetch(`/api/resources?experienceId=${experienceId}&limit=100`)
				.then((res) => res.json())
				.then((data) => {
					if (data.success && data.data?.resources) {
						setResources(data.data.resources.map((r: any) => ({ id: r.id, name: r.name })));
					}
				})
				.catch((err) => console.error("Error fetching resources:", err))
				.finally(() => setLoadingResources(false));
		}
	}, [isOpen, experienceId]);

	// Fetch funnels when panel opens and experienceId is available
	useEffect(() => {
		if (isOpen && experienceId) {
			setLoadingFunnels(true);
			fetch(`/api/funnels?limit=100`)
				.then((res) => res.json())
				.then((data) => {
					if (data.success && data.data?.funnels) {
						setFunnels(data.data.funnels.map((f: any) => ({ id: f.id, name: f.name })));
					}
				})
				.catch((err) => console.error("Error fetching funnels:", err))
				.finally(() => setLoadingFunnels(false));
		}
	}, [isOpen, experienceId]);

	// Filter triggers based on search and selected category
	const filteredTriggers = useMemo(() => {
		return TRIGGER_OPTIONS.filter((trigger) => {
			const matchesSearch =
				trigger.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
				trigger.description.toLowerCase().includes(searchQuery.toLowerCase());
			const matchesCategory = selectedCategory ? trigger.category === selectedCategory : true;
			return matchesSearch && matchesCategory;
		});
	}, [searchQuery, selectedCategory]);

	const handleTriggerClick = (triggerId: TriggerType) => {
		// Ensure trigger is from the correct category
		const triggerOption = TRIGGER_OPTIONS.find((t) => t.id === triggerId);
		if (triggerOption && selectedCategory && triggerOption.category !== selectedCategory) {
			// Don't allow selecting trigger from wrong category
			return;
		}
		
		// If clicking on already selected trigger, deselect it
		if (localSelectedTrigger === triggerId) {
			const category = selectedCategory || (triggerOption?.category === "Membership" ? "Membership" : "App");
			setLocalSelectedTrigger("on_app_entry"); // Reset to default for UI
			onSelect(category, undefined, undefined);
			return;
		}
		
		setLocalSelectedTrigger(triggerId);
		
		// Calculate config for new trigger (config selection happens on canvas, not sidebar)
		let config: TriggerConfig | undefined;
		if (triggerId === "membership_buy" || triggerId === "cancel_membership") {
			// These triggers need resourceId, but selection happens on canvas
			config = currentConfig.resourceId ? { resourceId: currentConfig.resourceId } : undefined;
		} else if (
			triggerId === "qualification_merchant_complete" || 
			triggerId === "upsell_merchant_complete" || 
			triggerId === "delete_merchant_conversation"
		) {
			// These triggers need funnelId, but selection happens on canvas
			config = currentConfig.funnelId ? { funnelId: currentConfig.funnelId } : undefined;
		} else if (triggerId === "any_cancel_membership") {
			// No config needed for any_cancel_membership
			config = undefined;
		}
		
		// Immediately update canvas - pass category
		const category = selectedCategory || (triggerOption?.category === "Membership" ? "Membership" : "App");
		onSelect(category, triggerId, config);
	};


	if (!isOpen) return null;

	return (
		<div 
			className="fixed right-0 top-0 h-screen w-[400px] bg-white dark:bg-gray-900 border-l border-gray-300 dark:border-gray-600 flex flex-col overflow-hidden z-30"
		>
			{/* Top Section: Title */}
			<div className="flex items-center justify-between px-4 pt-3 mb-4">
				<Heading size="6" weight="bold" className="text-black dark:text-white">
					Select {selectedCategory || "trigger"}
				</Heading>
				<button
					onClick={onClose}
					className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
				>
					<X className="w-4 h-4 text-gray-500" />
				</button>
			</div>

			{/* Subtle Separator Line */}
			<div className="w-full h-0.5 bg-gradient-to-r from-transparent via-violet-300/40 dark:via-violet-600/40 to-transparent mb-4 px-4 mt-[1px]" />

			{/* Search Input */}
			<div className="px-4 pb-4 border-b border-gray-200 dark:border-gray-700">
				<div className="relative">
					<div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
						<Search className="w-4 h-4" />
					</div>
					<input
						type="text"
						placeholder="Search triggers..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="w-full pl-9 pr-3 py-2 text-sm bg-gray-100 dark:bg-gray-800 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 placeholder-gray-400"
					/>
				</div>
			</div>


			{/* Trigger List */}
			<div className="flex flex-col flex-1 overflow-y-auto">
				{filteredTriggers.map((trigger) => (
						<TriggerItem
							key={trigger.id}
							trigger={trigger}
							isSelected={localSelectedTrigger === trigger.id}
							onSelect={() => handleTriggerClick(trigger.id)}
						/>
					))}

				{filteredTriggers.length === 0 && (
					<div className="flex items-center justify-center h-32 text-gray-500 dark:text-gray-400">
						<Text size="2">No triggers found</Text>
					</div>
				)}
			</div>
		</div>
	);
};

interface TriggerItemProps {
	trigger: TriggerOption;
	isSelected: boolean;
	onSelect: () => void;
}

const TriggerItem: React.FC<TriggerItemProps> = ({
	trigger,
	isSelected,
	onSelect,
}) => {
	const Icon = trigger.icon;

	const colorClasses = {
		blue: {
			iconBorder: "border-blue-200 dark:border-blue-700/50",
			iconBg: "bg-blue-100 dark:bg-blue-800/50",
			iconText: "text-blue-600 dark:text-blue-400",
			badgeBg: "bg-blue-100 dark:bg-blue-800/50",
			badgeText: "text-blue-600 dark:text-blue-400",
		},
		green: {
			iconBorder: "border-green-200 dark:border-green-700/50",
			iconBg: "bg-green-100 dark:bg-green-800/50",
			iconText: "text-green-600 dark:text-green-400",
			badgeBg: "bg-green-100 dark:bg-green-800/50",
			badgeText: "text-green-600 dark:text-green-400",
		},
	};

	const colors = colorClasses[trigger.color];

	return (
		<div className={`${isSelected ? "bg-gray-100 dark:bg-gray-800" : ""}`}>
			{/* Main trigger row */}
			<button
				type="button"
				onClick={onSelect}
				className={`
					hover:bg-gray-100 dark:hover:bg-gray-800 text-start cursor-pointer 
					flex items-center gap-3 py-2.5 px-4 transition-colors w-full
				`}
			>
				{/* Icon Container */}
				<div
					className={`
						w-[39px] h-[39px] border rounded-[10px] flex p-[1px] flex-shrink-0
						${colors.iconBorder}
					`}
				>
					<div
						className={`
							w-full h-full rounded-[8px] flex items-center justify-center
							${colors.iconBg} ${colors.iconText}
						`}
					>
						<Icon className="w-5 h-5" />
					</div>
				</div>

				{/* Content */}
				<div className="flex flex-col min-w-0 mr-auto">
					<Text size="2" weight="medium" className="text-gray-900 dark:text-white">
						{trigger.name}
					</Text>
					<Text size="2" className="text-gray-500 dark:text-gray-400 truncate text-[13px]">
						{trigger.description}
					</Text>
				</div>

				{/* Category Badge */}
				<div
					className={`
						self-start mt-[3px] h-[23px] rounded-[7px] px-[10px] flex items-center
						${colors.badgeBg} ${colors.badgeText}
					`}
				>
					<Text size="2" weight="medium" className="text-[13px]">
						{trigger.category}
					</Text>
				</div>
			</button>
		</div>
	);
};

export default TriggerPanel;

