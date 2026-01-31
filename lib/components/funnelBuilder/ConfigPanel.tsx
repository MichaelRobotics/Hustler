"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Text, Heading } from "frosted-ui";
import { Search, X } from "lucide-react";
import type { FunnelNotification, FunnelFlow } from "@/lib/types/funnel";
import { NOTIFICATION_TYPE_OPTIONS, type NotificationTypeOption } from "./NotificationTypes";
import { RESET_TYPE_OPTIONS, type ResetTypeOption } from "./ResetTypes";

interface Stage {
	id: string;
	name: string;
	explanation: string;
	blockIds: string[];
}

interface ConfigPanelProps {
	isOpen: boolean;
	funnelId: string;
	stages: Stage[];
	notifications: FunnelNotification[];
	selectedNotificationId?: string; // Notification being configured
	selectedResetId?: string; // Reset being configured
	selectedNotificationSequence?: number; // Sequence number for new notification
	selectedNotificationStageId?: string; // Stage ID for notification being configured
	selectedResetStageId?: string; // Stage ID for reset being configured
	funnelFlow?: FunnelFlow; // Needed to get last bot message for Standard type
	onNotificationTypeSelect: (notificationId: string | null, stageId: string, sequence: number, type: "standard" | "custom") => void;
	onResetTypeSelect: (resetId: string | null, stageId: string, type: "delete" | "complete") => void;
	onClose: () => void;
}

/**
 * ConfigPanel Component - Type Selection Only (like TriggerPanel)
 * 
 * Simple sidebar for selecting notification/reset types.
 * All editing happens on canvas.
 */
const ConfigPanel: React.FC<ConfigPanelProps> = ({
	isOpen,
	funnelId,
	stages,
	notifications,
	selectedNotificationId,
	selectedResetId,
	selectedNotificationSequence,
	selectedNotificationStageId,
	selectedResetStageId,
	onNotificationTypeSelect,
	onResetTypeSelect,
	onClose,
}) => {
	const [searchQuery, setSearchQuery] = useState("");

	// Get current notification/reset being configured
	const currentNotification = selectedNotificationId
		? notifications.find((n) => n.id === selectedNotificationId)
		: null;
	const currentReset = selectedResetId
		? notifications.find((n) => n.id === selectedResetId)
		: null;

	// Get stage info
	const notificationStage = currentNotification
		? stages.find((s) => s.id === currentNotification.stageId)
		: selectedNotificationStageId
			? stages.find((s) => s.id === selectedNotificationStageId)
			: null;

	const resetStage = selectedResetStageId
		? stages.find((s) => s.id === selectedResetStageId)
		: null;

	// Determine what we're selecting
	const isSelectingNotification = (selectedNotificationId !== undefined && selectedNotificationId !== null) || 
		(selectedNotificationSequence !== undefined && selectedNotificationSequence !== null && 
		 selectedNotificationStageId !== undefined && selectedNotificationStageId !== null);
	const isSelectingReset = (selectedResetId !== undefined && selectedResetId !== null) || 
		(selectedResetStageId !== undefined && selectedResetStageId !== null);

	// Close sidebar if no selection
	useEffect(() => {
		if (isOpen && !isSelectingNotification && !isSelectingReset) {
			onClose();
		}
	}, [isOpen, isSelectingNotification, isSelectingReset, onClose]);

	// Handle notification type selection
	const handleNotificationTypeClick = (type: "standard" | "custom") => {
		if (!notificationStage) return;
		
		const sequence = currentNotification?.sequence ?? selectedNotificationSequence ?? 1;
		onNotificationTypeSelect(selectedNotificationId || null, notificationStage.id, sequence, type);
	};

	// Handle reset type selection
	const handleResetTypeClick = (type: "delete" | "complete") => {
		if (!resetStage) return;
		
		onResetTypeSelect(selectedResetId || null, resetStage.id, type);
	};

	// Filter options based on search
	const filteredNotificationOptions = useMemo(() => {
		if (!isSelectingNotification) return [];
		return NOTIFICATION_TYPE_OPTIONS.filter((option) =>
			option.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			option.description.toLowerCase().includes(searchQuery.toLowerCase())
		);
	}, [isSelectingNotification, searchQuery]);

	const filteredResetOptions = useMemo(() => {
		if (!isSelectingReset) return [];
		return RESET_TYPE_OPTIONS.filter((option) =>
			option.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			option.description.toLowerCase().includes(searchQuery.toLowerCase())
		);
	}, [isSelectingReset, searchQuery]);

	if (!isOpen) return null;

	return (
		<div 
			className="fixed right-0 top-0 h-screen w-[400px] bg-white dark:bg-gray-900 border-l border-gray-300 dark:border-gray-600 flex flex-col overflow-hidden z-30"
		>
			{/* Top Section: Title */}
			<div className="flex items-center justify-between px-4 pt-3 mb-4">
				<Heading size="6" weight="bold" className="text-black dark:text-white">
					{isSelectingNotification
						? "Select Notification Type"
						: isSelectingReset
							? "Select Reset Type"
							: "Configuration"}
				</Heading>
				<button
					onClick={onClose}
					className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
				>
					<X className="w-4 h-4 text-gray-500" />
				</button>
			</div>

			{/* Subtle Separator Line */}
			<div className="w-full h-0.5 bg-gradient-to-r from-transparent via-violet-300/40 dark:via-violet-600/40 to-transparent mb-4 px-4 mt-[3px]" />

			{/* Search Input - Aligned with header buttons */}
			<div className="px-4 pb-4 border-b border-gray-200 dark:border-gray-700 mt-[5px]">
				<div className="relative">
					<div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
						<Search className="w-4 h-4" />
					</div>
					<input
						type="text"
						placeholder="Search..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="w-full pl-9 pr-3 py-2 text-sm bg-gray-100 dark:bg-gray-800 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 placeholder-gray-400"
					/>
				</div>
			</div>

			{/* Type Selector - Aligned with main navbar bottom */}
			{isSelectingNotification && (
				<div className="absolute top-[139px] left-0 right-0 bg-white dark:bg-gray-900 z-10">
					{filteredNotificationOptions.length > 0 ? (
						filteredNotificationOptions.map((typeOption) => {
							const isSelected = currentNotification?.notificationType === typeOption.id ||
								(!currentNotification && typeOption.id === "standard");
							
							return (
								<TypeOptionItem
									key={typeOption.id}
									typeOption={typeOption}
									isSelected={isSelected}
									onSelect={() => handleNotificationTypeClick(typeOption.id)}
									color="amber"
								/>
							);
						})
					) : (
						<div className="flex items-center justify-center h-32 text-gray-500 dark:text-gray-400 px-4">
							<Text size="2">No options found</Text>
						</div>
					)}
				</div>
			)}

			{isSelectingReset && (
				<div className="absolute top-[139px] left-0 right-0 bg-white dark:bg-gray-900 z-10">
					{filteredResetOptions.length > 0 ? (
						filteredResetOptions.map((typeOption) => {
							const isSelected = currentReset?.resetAction === typeOption.id ||
								(!currentReset && typeOption.id === "delete");
							
							return (
								<TypeOptionItem
									key={typeOption.id}
									typeOption={typeOption}
									isSelected={isSelected}
									onSelect={() => handleResetTypeClick(typeOption.id)}
									color="red"
								/>
							);
						})
					) : (
						<div className="flex items-center justify-center h-32 text-gray-500 dark:text-gray-400 px-4">
							<Text size="2">No options found</Text>
						</div>
					)}
				</div>
			)}

			{/* Content */}
			<div className="flex flex-col flex-1 pt-[60px] overflow-y-auto">

				{/* Empty State */}
				{!isSelectingNotification && !isSelectingReset && (
					<div className="flex items-center justify-center h-32 text-gray-500 dark:text-gray-400 px-4">
						<Text size="2" className="text-center">
							Click a notification or reset card on the canvas to configure
						</Text>
					</div>
				)}
			</div>
		</div>
	);
};

interface TypeOptionItemProps {
	typeOption: NotificationTypeOption | ResetTypeOption;
	isSelected: boolean;
	onSelect: () => void;
	color: "amber" | "red";
}

const TypeOptionItem: React.FC<TypeOptionItemProps> = ({ typeOption, isSelected, onSelect, color }) => {
	const Icon = typeOption.icon;

	const colorClasses = {
		amber: {
			iconBorder: "border-amber-200 dark:border-amber-700/50",
			iconBg: "bg-amber-100 dark:bg-amber-800/50",
			iconText: "text-amber-600 dark:text-amber-400",
		},
		red: {
			iconBorder: "border-red-200 dark:border-red-700/50",
			iconBg: "bg-red-100 dark:bg-red-800/50",
			iconText: "text-red-600 dark:text-red-400",
		},
	};

	const colors = colorClasses[color];

	return (
		<div className={`${isSelected ? "bg-gray-100 dark:bg-gray-800" : ""}`}>
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
						{typeOption.name}
					</Text>
					<Text size="2" className="text-gray-500 dark:text-gray-400 truncate text-[13px]">
						{typeOption.description}
					</Text>
				</div>
			</button>
		</div>
	);
};

export default ConfigPanel;
