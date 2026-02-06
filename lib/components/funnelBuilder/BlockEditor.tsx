"use client";

import React from "react";
import { Trash2, Clock } from "lucide-react";
import AutoResizeTextarea from "../common/AutoResizeTextarea";

interface FunnelBlockOption {
	text: string;
	nextBlockId: string | null;
}

interface FunnelBlock {
	id: string;
	headline?: string | null;
	message: string;
	options: FunnelBlockOption[];
	upsellBlockId?: string | null;
	downsellBlockId?: string | null;
	timeoutMinutes?: number | null;
	resourceId?: string | null;
	productSelectionType?: "ai_suggested" | "manual" | "from_stage";
	referencedBlockId?: string | null;
}

interface FunnelFlow {
	stages: Array<{
		name: string;
		blockIds: string[];
	}>;
	blocks: Record<string, FunnelBlock>;
}

interface BlockEditorProps {
	block: FunnelBlock;
	funnelFlow?: FunnelFlow;
	onSave: (block: FunnelBlock) => void;
	onCancel: () => void;
	onAddNewOption?: (blockId: string, optionText: string) => void; // Callback for adding new option
	onOptionConnectRequest?: (blockId: string, optionIndex: number) => void; // Callback to change option connection (closes editor, enters connect mode)
	merchantType?: "qualification" | "upsell";
	resources?: Array<{ id: string; name: string }>; // For upsell: select product from resources
	pendingDelete?: {
		blockId: string;
		affectedOptions: Array<{ blockId: string; optionIndex: number }>;
		outgoingConnections: Array<{ targetBlockId: string }>;
		orphanedNextStageCards: string[];
		brokenPreviousStageCards: string[];
		invalidOptions: Array<{ blockId: string; optionIndex: number; reason: string }>;
	} | null; // Pending delete state
}

/**
 * --- Block Editor Component ---
 * This component provides an inline editing interface for a single funnel block.
 * It allows the user to modify the block's message and the text of its options.
 * It uses the AutoResizeTextarea component to ensure the input fields are always perfectly sized.
 *
 * @param {BlockEditorProps} props - The props passed to the component.
 * @param {FunnelBlock} props.block - The funnel block object to be edited.
 * @param {function} props.onSave - The callback function to save the updated block.
 * @param {function} props.onCancel - The callback function to cancel the edit.
 * @returns {JSX.Element} The rendered BlockEditor component.
 */
const BlockEditor: React.FC<BlockEditorProps> = ({
	block,
	funnelFlow,
	onSave,
	onCancel,
	onAddNewOption,
	onOptionConnectRequest,
	merchantType = "qualification",
	resources = [],
	pendingDelete,
}) => {
	// State to hold the changes to the block as the user edits it.
	const [editedBlock, setEditedBlock] = React.useState<FunnelBlock>(block);
	const [newOptionText, setNewOptionText] = React.useState("");
	const isUpsell = merchantType === "upsell";

	// Timeout UX (upsell): same pattern as trigger delay - value + unit + Save
	type TimeUnit = "minutes" | "hours" | "days";
	const getBestUnit = (minutes: number): { value: number; unit: TimeUnit } => {
		if (minutes === 0) return { value: 0, unit: "minutes" };
		if (minutes % (24 * 60) === 0) return { value: minutes / (24 * 60), unit: "days" };
		if (minutes % 60 === 0) return { value: minutes / 60, unit: "hours" };
		return { value: minutes, unit: "minutes" };
	};
	const convertToMinutes = (value: number, unit: TimeUnit): number => {
		switch (unit) {
			case "days": return value * 24 * 60;
			case "hours": return value * 60;
			default: return value;
		}
	};
	const timeoutMinutes = editedBlock.timeoutMinutes ?? 0;
	const initialTimeoutDisplay = getBestUnit(timeoutMinutes);
	const [localTimeoutValue, setLocalTimeoutValue] = React.useState(initialTimeoutDisplay.value);
	const [localTimeoutUnit, setLocalTimeoutUnit] = React.useState<TimeUnit>(initialTimeoutDisplay.unit);
	const [timeoutHasUnsaved, setTimeoutHasUnsaved] = React.useState(false);
	React.useEffect(() => {
		const display = getBestUnit(editedBlock.timeoutMinutes ?? 0);
		setLocalTimeoutValue(display.value);
		setLocalTimeoutUnit(display.unit);
		setTimeoutHasUnsaved(false);
	}, [editedBlock.timeoutMinutes]);

	React.useEffect(() => {
		setEditedBlock(block);
	}, [block]);

	// Handler for updating the main message of the block.
	const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		const newMessage = e.target.value;
		setEditedBlock({ ...editedBlock, message: newMessage });
	};

	// No [LINK] placeholder: product link is resolved from the card's selected resource; backend appends button at end.

	// Auto-insert [USER] placeholder if missing for WELCOME blocks. [WHOP] is resolved when generating merchant, not in card text.
	const ensureUserPlaceholder = (message: string, blockId: string): string => {
		let shouldHaveUser = false;
		if (funnelFlow) {
			const blockStage = funnelFlow.stages.find(stage => stage.blockIds.includes(blockId));
			if (blockStage) shouldHaveUser = blockStage.name === "WELCOME";
		} else {
			shouldHaveUser = blockId.includes("welcome");
		}
		if (!shouldHaveUser) return message;
		if (message.includes("[USER]")) return message;
		const trimmed = message.trim();
		return trimmed ? `[USER], ${trimmed}` : "[USER]";
	};

	// Handler for updating the text of a specific option.
	const handleOptionChange = (index: number, value: string) => {
		const newOptions = [...editedBlock.options];
		newOptions[index] = { ...newOptions[index], text: value };
		setEditedBlock({ ...editedBlock, options: newOptions });
	};

	// Check if an option can be deleted (only if multiple options lead to the same nextBlockId)
	const canDeleteOption = (optionIndex: number): boolean => {
		if (!editedBlock.options || editedBlock.options.length === 0) return false;
		const targetBlockId = editedBlock.options[optionIndex]?.nextBlockId;
		if (!targetBlockId) return false;
		
		const optionsLeadingToSameBlock = editedBlock.options.filter(
			opt => opt.nextBlockId === targetBlockId
		).length;
		
		return optionsLeadingToSameBlock > 1;
	};

	// Handler for deleting an option
	const handleOptionDelete = (index: number) => {
		if (!canDeleteOption(index)) return;
		
		const newOptions = editedBlock.options.filter((_, i) => i !== index);
		setEditedBlock({ ...editedBlock, options: newOptions });
	};

	return (
		<div className="p-4 space-y-4">
			{/* Headline (card title) */}
			<div>
				<label className="block text-xs text-violet-600 dark:text-violet-400 font-bold uppercase tracking-wider mb-2">
					Headline
				</label>
				<input
					type="text"
					value={editedBlock.headline ?? ""}
					onChange={(e) => setEditedBlock({ ...editedBlock, headline: e.target.value || null })}
					placeholder={editedBlock.id}
					className="w-full bg-surface/50 dark:bg-surface/30 border border-border/50 dark:border-border/30 rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-violet-500/50 focus:border-violet-300 transition-all duration-200"
				/>
			</div>
			{/* Message Section with Action Buttons */}
			<div>
				<div className="flex justify-between items-center mb-2">
					<label className="text-xs text-violet-600 dark:text-violet-400 font-bold uppercase tracking-wider">
						Message
					</label>
					<div className="flex gap-2">
						<button
							onClick={onCancel}
							className="px-3 py-1.5 text-xs rounded-lg bg-surface/50 dark:bg-surface/30 border border-border/50 dark:border-border/30 text-muted-foreground hover:text-foreground hover:bg-surface/60 dark:hover:bg-surface/40 transition-all duration-200 font-medium"
						>
							Cancel
						</button>
						<button
							onClick={() => {
								// Ensure [USER] placeholder for WELCOME blocks ([WHOP] resolved when generating merchant). No [LINK]; button added by backend from card's resource.
								const messageWithPlaceholders = ensureUserPlaceholder(editedBlock.message, editedBlock.id);
								const timeoutMinutes = isUpsell ? convertToMinutes(localTimeoutValue, localTimeoutUnit) : editedBlock.timeoutMinutes;
								const updatedBlock = {
									...editedBlock,
									message: messageWithPlaceholders,
									...(isUpsell ? { timeoutMinutes } : {}),
								};
								onSave(updatedBlock);
								if (isUpsell) setTimeoutHasUnsaved(false);
							}}
							className="px-3 py-1.5 text-xs rounded-lg bg-violet-500 hover:bg-violet-600 dark:bg-violet-600 dark:hover:bg-violet-700 text-white font-medium transition-all duration-200 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 flex items-center gap-1.5"
						>
							<svg
								className="w-3 h-3"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth="2"
									d="M5 13l4 4L19 7"
								/>
							</svg>
							Save
						</button>
					</div>
				</div>
				<AutoResizeTextarea
					className={`w-full bg-surface/50 dark:bg-surface/30 border border-border/50 dark:border-border/30 rounded-xl p-3 text-foreground text-sm focus:ring-2 focus:ring-violet-500/50 focus:border-violet-300 transition-all duration-200 resize-none ${
						(() => {
							let requiresUser = false;
							if (funnelFlow) {
								const blockStage = funnelFlow.stages.find(stage => stage.blockIds.includes(editedBlock.id));
								if (blockStage) requiresUser = blockStage.name === "WELCOME";
							} else {
								requiresUser = editedBlock.id.includes("welcome");
							}
							const missingUser = requiresUser && !editedBlock.message.includes("[USER]");
							return missingUser ? 'ring-2 ring-amber-500/50 border-amber-300' : '';
						})()
					}`}
					value={editedBlock.message}
					onChange={handleMessageChange}
					placeholder="Enter your message..."
					rows={4}
				/>
				{(() => {
					let requiresUser = false;
					if (funnelFlow) {
						const blockStage = funnelFlow.stages.find(stage => stage.blockIds.includes(editedBlock.id));
						if (blockStage) requiresUser = blockStage.name === "WELCOME";
					} else {
						requiresUser = editedBlock.id.includes("welcome");
					}
					const missingUser = requiresUser && !editedBlock.message.includes("[USER]");
					if (!missingUser) return null;
					return (
						<div className="mt-2 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
							<svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
								<path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
							</svg>
							[USER] placeholder will be automatically added when saving
						</div>
					);
				})()}
			</div>

			{/* Upsell: Timeout (Product is shown on card above Upsell/Downsell) */}
			{isUpsell && (
				<>
					<div>
						<div
							className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface/50 dark:bg-surface/30 border border-border/50 dark:border-border/30"
						>
							<Clock className="w-4 h-4 text-violet-500 dark:text-violet-400 flex-shrink-0" />
							<span className="text-xs text-violet-600 dark:text-violet-400 font-medium">Delay</span>
							<input
								type="number"
								min={0}
								step={localTimeoutUnit === "minutes" ? "1" : "0.01"}
								value={localTimeoutValue}
								onChange={(e) => {
									const value = parseInt(e.target.value, 10);
									const newValue = isNaN(value) ? 0 : Math.max(0, value);
									setLocalTimeoutValue(newValue);
									const minutesValue = convertToMinutes(newValue, localTimeoutUnit);
									setTimeoutHasUnsaved(minutesValue !== (editedBlock.timeoutMinutes ?? 0));
								}}
								className="w-16 px-2 py-1.5 text-sm bg-background border border-border/50 dark:border-border/30 rounded-lg focus:ring-2 focus:ring-violet-500/50"
							/>
							<select
								value={localTimeoutUnit}
								onChange={(e) => {
									const newUnit = e.target.value as TimeUnit;
									const currentMinutes = convertToMinutes(localTimeoutValue, localTimeoutUnit);
									const display = getBestUnit(currentMinutes);
									let newDisplayValue = localTimeoutValue;
									if (newUnit === "minutes") newDisplayValue = currentMinutes;
									else if (newUnit === "hours") newDisplayValue = currentMinutes / 60;
									else if (newUnit === "days") newDisplayValue = currentMinutes / (24 * 60);
									setLocalTimeoutValue(Math.round(newDisplayValue * 100) / 100);
									setLocalTimeoutUnit(newUnit);
									const minutesValue = convertToMinutes(newDisplayValue, newUnit);
									setTimeoutHasUnsaved(minutesValue !== (editedBlock.timeoutMinutes ?? 0));
								}}
								className="px-2 py-1 text-xs bg-background border border-border/50 dark:border-border/30 rounded-lg focus:ring-2 focus:ring-violet-500/50"
							>
								<option value="minutes">min</option>
								<option value="hours">hours</option>
								<option value="days">days</option>
							</select>
						</div>
					</div>
				</>
			)}

			{/* Options Section (qualification only; upsell uses fixed Upsell/Downsell on canvas) */}
			{!isUpsell && (
			<div>
				<label className="text-xs text-violet-600 dark:text-violet-400 font-bold mb-2 block uppercase tracking-wider">
					Options
				</label>
				<div className="space-y-3">
					{editedBlock.options && editedBlock.options.length > 0 && (
						<>
							{editedBlock.options.map((opt, i) => {
								const canDelete = canDeleteOption(i);
								// Check if this option is invalid
								const isInvalidOption = pendingDelete && pendingDelete.invalidOptions.some(
									invalid => invalid.blockId === block.id && invalid.optionIndex === i
								);
								// Check if this option is affected by pending delete (leads to deleted card)
								const isAffectedOption = pendingDelete && pendingDelete.affectedOptions.some(
									affected => affected.blockId === block.id && affected.optionIndex === i
								);
								
								return (
									<div key={i} className="flex items-start gap-3">
										{onOptionConnectRequest && !isUpsell ? (
											<button
												type="button"
												onClick={() => onOptionConnectRequest(block.id, i)}
												className="flex-shrink-0 w-6 h-6 bg-violet-100 dark:bg-violet-800/50 border border-violet-200 dark:border-violet-700/50 rounded-full flex items-center justify-center hover:bg-violet-200 dark:hover:bg-violet-700/50 hover:border-violet-400 transition-colors cursor-pointer"
												title="Change connection"
											>
												<span className="text-xs font-bold text-violet-600 dark:text-violet-400">
													{i + 1}
												</span>
											</button>
										) : (
											<div className="flex-shrink-0 w-6 h-6 bg-violet-100 dark:bg-violet-800/50 border border-violet-200 dark:border-violet-700/50 rounded-full flex items-center justify-center">
												<span className="text-xs font-bold text-violet-600 dark:text-violet-400">
													{i + 1}
												</span>
											</div>
										)}
										<div className="flex-1">
											<AutoResizeTextarea
												className={`w-full rounded-xl p-3 text-foreground text-sm focus:ring-2 transition-all duration-200 resize-none ${
													isInvalidOption || isAffectedOption
														? "bg-red-500/10 border-red-500 ring-2 ring-red-500 focus:ring-red-500/50 focus:border-red-300"
														: "bg-surface/50 dark:bg-surface/30 border border-border/50 dark:border-border/30 focus:ring-violet-500/50 focus:border-violet-300"
												}`}
												value={opt.text}
												onChange={(e) => handleOptionChange(i, e.target.value)}
												placeholder={`Option ${i + 1} text...`}
												rows={2}
											/>
										</div>
										{canDelete && (
											<button
												onClick={() => handleOptionDelete(i)}
												className="flex-shrink-0 p-1.5 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors duration-200"
												title="Delete option"
											>
												<Trash2 className="w-4 h-4" />
											</button>
										)}
									</div>
								);
							})}
						</>
					)}
					{/* Always visible "+" option with input field */}
					{onAddNewOption && (
						<div className="flex items-center gap-3">
							<div className="flex-shrink-0 w-6 h-6 bg-violet-100 dark:bg-violet-800/50 border border-violet-200 dark:border-violet-700/50 rounded-full flex items-center justify-center">
								<span className="text-xs font-bold text-violet-600 dark:text-violet-400">
									+
								</span>
							</div>
							<div className="flex-1 flex items-center gap-2">
								<AutoResizeTextarea
									className="w-full bg-surface/50 dark:bg-surface/30 border border-border/50 dark:border-border/30 rounded-xl p-3 text-foreground text-sm focus:ring-2 focus:ring-violet-500/50 focus:border-violet-300 transition-all duration-200 resize-none"
									value={newOptionText}
									onChange={(e) => setNewOptionText(e.target.value)}
									placeholder="Add new option..."
									rows={2}
									onKeyDown={(e) => {
										if (e.key === "Enter" && newOptionText.trim() && !e.shiftKey) {
											e.preventDefault();
											onAddNewOption(block.id, newOptionText.trim());
											setNewOptionText("");
										}
									}}
								/>
								<button
									onClick={() => {
										if (newOptionText.trim()) {
											onAddNewOption(block.id, newOptionText.trim());
											setNewOptionText("");
										}
									}}
									disabled={!newOptionText.trim()}
									className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 ${
										newOptionText.trim()
											? "bg-violet-500 hover:bg-violet-600 dark:bg-violet-600 dark:hover:bg-violet-700 text-white cursor-pointer"
											: "bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
									}`}
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										className="w-4 h-4"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth="2"
											d="M12 4v16m8-8H4"
										/>
									</svg>
								</button>
							</div>
						</div>
					)}
				</div>
			</div>
			)}
		</div>
	);
};

export default BlockEditor;
