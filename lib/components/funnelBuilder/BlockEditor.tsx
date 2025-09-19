"use client";

import React from "react";
import AutoResizeTextarea from "../common/AutoResizeTextarea";

interface FunnelBlockOption {
	text: string;
	nextBlockId: string | null;
}

interface FunnelBlock {
	id: string;
	message: string;
	options: FunnelBlockOption[];
}

interface BlockEditorProps {
	block: FunnelBlock;
	onSave: (block: FunnelBlock) => void;
	onCancel: () => void;
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
	onSave,
	onCancel,
}) => {
	// State to hold the changes to the block as the user edits it.
	const [editedBlock, setEditedBlock] = React.useState<FunnelBlock>(block);

	// Handler for updating the main message of the block.
	const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		const newMessage = e.target.value;
		setEditedBlock({ ...editedBlock, message: newMessage });
	};

	// Auto-insert [LINK] placeholder if missing for specific block types
	const ensureLinkPlaceholder = (message: string, blockId: string): string => {
		// Check if this is a block that should have [LINK] placeholder
		const shouldHaveLink = blockId.includes('value_delivery') || 
		                      blockId.includes('transition') || 
		                      blockId.includes('offer');
		
		if (!shouldHaveLink) return message;
		
		// Check if [LINK] already exists
		if (message.includes('[LINK]')) return message;
		
		// Add [LINK] placeholder with proper formatting
		const lines = message.split('\n');
		const trimmedLines = lines.map(line => line.trim());
		
		// Find the last non-empty line
		let lastNonEmptyIndex = -1;
		for (let i = trimmedLines.length - 1; i >= 0; i--) {
			if (trimmedLines[i] !== '') {
				lastNonEmptyIndex = i;
				break;
			}
		}
		
		// Insert [LINK] after the last non-empty line with proper spacing
		if (lastNonEmptyIndex >= 0) {
			// Add empty line before [LINK] if the last line doesn't end with empty line
			if (lastNonEmptyIndex < lines.length - 1 || lines[lastNonEmptyIndex] !== '') {
				lines.splice(lastNonEmptyIndex + 1, 0, '');
			}
			// Add [LINK] on its own line
			lines.splice(lastNonEmptyIndex + 2, 0, '[LINK]');
			// Don't add empty line after [LINK] - it should be the end of the message
		} else {
			// If message is empty or only whitespace, just add [LINK]
			lines.push('[LINK]');
		}
		
		return lines.join('\n');
	};

	// Handler for updating the text of a specific option.
	const handleOptionChange = (index: number, value: string) => {
		const newOptions = [...editedBlock.options];
		newOptions[index] = { ...newOptions[index], text: value };
		setEditedBlock({ ...editedBlock, options: newOptions });
	};

	return (
		<div className="p-4 space-y-4">
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
								// Ensure [LINK] placeholder is present before saving
								const messageWithLink = ensureLinkPlaceholder(editedBlock.message, editedBlock.id);
								const updatedBlock = { ...editedBlock, message: messageWithLink };
								onSave(updatedBlock);
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
						(editedBlock.id.includes('value_delivery') || 
						 editedBlock.id.includes('transition') || 
						 editedBlock.id.includes('offer')) && 
						!editedBlock.message.includes('[LINK]') 
							? 'ring-2 ring-amber-500/50 border-amber-300' 
							: ''
					}`}
					value={editedBlock.message}
					onChange={handleMessageChange}
					placeholder="Enter your message..."
					rows={4}
				/>
				{(editedBlock.id.includes('value_delivery') || 
				  editedBlock.id.includes('transition') || 
				  editedBlock.id.includes('offer')) && 
				 !editedBlock.message.includes('[LINK]') && (
					<div className="mt-2 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
						<svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
							<path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
						</svg>
						[LINK] placeholder will be automatically added when saving
					</div>
				)}
			</div>

			{/* Options Section */}
			{editedBlock.options && editedBlock.options.length > 0 && (
				<div>
					<label className="text-xs text-violet-600 dark:text-violet-400 font-bold mb-2 block uppercase tracking-wider">
						Options
					</label>
					<div className="space-y-3">
						{editedBlock.options &&
							editedBlock.options.map((opt, i) => (
								<div key={i} className="flex items-start gap-3">
									<div className="flex-shrink-0 w-6 h-6 bg-violet-100 dark:bg-violet-800/50 border border-violet-200 dark:border-violet-700/50 rounded-full flex items-center justify-center">
										<span className="text-xs font-bold text-violet-600 dark:text-violet-400">
											{i + 1}
										</span>
									</div>
									<div className="flex-1">
										<AutoResizeTextarea
											className="w-full bg-surface/50 dark:bg-surface/30 border border-border/50 dark:border-border/30 rounded-xl p-3 text-foreground text-sm focus:ring-2 focus:ring-violet-500/50 focus:border-violet-300 transition-all duration-200 resize-none"
											value={opt.text}
											onChange={(e) => handleOptionChange(i, e.target.value)}
											placeholder={`Option ${i + 1} text...`}
											rows={2}
										/>
									</div>
								</div>
							))}
					</div>
				</div>
			)}
		</div>
	);
};

export default BlockEditor;
