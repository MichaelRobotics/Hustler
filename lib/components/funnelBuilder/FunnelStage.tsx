"use client";

import React from "react";
import { formatStageName } from "../../utils/format-names";

interface FunnelStageProps {
	stageLayouts: Array<{
		id: string;
		name: string;
		explanation: string;
		blockIds: string[];
		y: number;
		height: number;
	}>;
	itemCanvasWidth: number;
	EXPLANATION_AREA_WIDTH: number;
	onStageUpdate?: (stageId: string, updates: { name?: string; explanation?: string; blockIds?: string[] }) => void;
	disableStageEditing?: boolean;
	sendDmCardVisible?: boolean;
}

const FunnelStage: React.FC<FunnelStageProps> = ({
	stageLayouts,
	itemCanvasWidth,
	EXPLANATION_AREA_WIDTH,
	onStageUpdate,
	disableStageEditing = false,
	sendDmCardVisible = false,
}) => {
	const [editingStageId, setEditingStageId] = React.useState<string | null>(null);
	const [editingField, setEditingField] = React.useState<"name" | "explanation" | null>(null);
	const [editValue, setEditValue] = React.useState("");

	const handleStartEdit = (stageId: string, field: "name" | "explanation", currentValue: string) => {
		setEditingStageId(stageId);
		setEditingField(field);
		setEditValue(currentValue);
	};

	const handleSaveEdit = (stageId: string, field: "name" | "explanation") => {
		if (onStageUpdate) {
			// Name requires non-empty; explanation can be cleared
			if (field === "name" && !editValue.trim()) {
				handleCancelEdit();
				return;
			}
			onStageUpdate(stageId, { [field]: field === "name" ? editValue.trim() : editValue });
		}
		setEditingStageId(null);
		setEditingField(null);
		setEditValue("");
	};

	const handleCancelEdit = () => {
		setEditingStageId(null);
		setEditingField(null);
		setEditValue("");
	};

	return (
		<>
			{/* Stage Explanations */}
			{stageLayouts.map((layout, index) => {
				const isSendDm = layout.name === "SEND_DM";
				const isEditingName = editingStageId === layout.id && editingField === "name";
				const isEditingExplanation = editingStageId === layout.id && editingField === "explanation";

				return (
					<React.Fragment key={layout.id}>
						<div
							className="absolute text-left p-4"
							style={{
								left: 0,
								top: `${layout.y}px`,
								width: `${EXPLANATION_AREA_WIDTH}px`,
								height: `${layout.height}px`,
								display: "flex",
								flexDirection: "column",
								justifyContent: "center",
							}}
						>
							{isSendDm ? (
							sendDmCardVisible ? (
								<div className="bg-gradient-to-r from-blue-500/10 to-blue-400/10 dark:from-blue-900/20 dark:to-blue-800/20 border border-blue-200/50 dark:border-blue-700/30 rounded-xl p-3">
									<h3 className="text-lg font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
										{formatStageName(layout.name)}
									</h3>
								</div>
							) : null
						) : (
							<div className="bg-gradient-to-r from-violet-500/10 to-purple-500/10 dark:from-violet-900/20 dark:to-purple-900/20 border border-violet-200/50 dark:border-violet-700/30 rounded-xl p-3">
								{/* Stage Name - Editable */}
								{isEditingName ? (
									<input
										type="text"
										value={editValue}
										onChange={(e) => setEditValue(e.target.value)}
										onBlur={() => handleSaveEdit(layout.id, "name")}
										onKeyDown={(e) => {
											if (e.key === "Enter") {
												e.preventDefault();
												handleSaveEdit(layout.id, "name");
											} else if (e.key === "Escape") {
												handleCancelEdit();
											}
										}}
										autoFocus
										className="w-full text-lg font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider mb-2 bg-transparent border-b-2 border-violet-500 dark:border-violet-400 focus:outline-none"
									/>
								) : (
									<h3
										className={`text-lg font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider mb-2 ${disableStageEditing ? "" : "cursor-pointer hover:underline"}`}
										onClick={disableStageEditing ? undefined : () => onStageUpdate && handleStartEdit(layout.id, "name", layout.name)}
									>
										{formatStageName(layout.name)}
									</h3>
								)}
								
								{/* Stage Explanation - Editable */}
								{isEditingExplanation ? (
									<textarea
										value={editValue}
										onChange={(e) => setEditValue(e.target.value)}
										onBlur={() => handleSaveEdit(layout.id, "explanation")}
										onKeyDown={(e) => {
											if (e.key === "Escape") {
												handleCancelEdit();
											}
										}}
										autoFocus
										rows={3}
										className="w-full text-sm text-muted-foreground leading-relaxed bg-transparent border-2 border-violet-500 dark:border-violet-400 rounded p-2 focus:outline-none resize-none"
									/>
								) : (
									<p
										className={`text-sm text-muted-foreground leading-relaxed min-h-[1.5rem] ${disableStageEditing ? "" : "cursor-pointer hover:underline"}`}
										onClick={disableStageEditing ? undefined : () => onStageUpdate && handleStartEdit(layout.id, "explanation", layout.explanation || "")}
									>
										{layout.explanation || "Click to add description..."}
									</p>
								)}
							</div>
							)}
						</div>
						{index < stageLayouts.length - 1 && (
							<div
								className="absolute border-t-2 border-dashed border-violet-300 dark:border-violet-600 opacity-40"
								style={{
									left: `${EXPLANATION_AREA_WIDTH}px`,
									top: `${layout.y + layout.height + 60}px`,
									width: `${itemCanvasWidth}px`,
									marginLeft: "20px",
									marginRight: "20px",
								}}
							/>
						)}
					</React.Fragment>
				);
			})}
		</>
	);
};

export default FunnelStage;
