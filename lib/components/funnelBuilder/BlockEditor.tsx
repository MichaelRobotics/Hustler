'use client';

import React from 'react';
import AutoResizeTextarea from '../common/AutoResizeTextarea';

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
const BlockEditor: React.FC<BlockEditorProps> = ({ block, onSave, onCancel }) => {
    // State to hold the changes to the block as the user edits it.
    const [editedBlock, setEditedBlock] = React.useState<FunnelBlock>(block);

    // Handler for updating the main message of the block.
    const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setEditedBlock({ ...editedBlock, message: e.target.value });
    };

    // Handler for updating the text of a specific option.
    const handleOptionChange = (index: number, value: string) => {
        const newOptions = [...editedBlock.options];
        newOptions[index] = { ...newOptions[index], text: value };
        setEditedBlock({ ...editedBlock, options: newOptions });
    };

    return (
        <div className="p-4 space-y-4">
            {/* Message Section */}
            <div>
                <label className="text-xs text-violet-600 dark:text-violet-400 font-bold mb-2 block uppercase tracking-wider">
                    Message
                </label>
                <AutoResizeTextarea
                    className="w-full bg-surface/50 dark:bg-surface/30 border border-border/50 dark:border-border/30 rounded-xl p-3 text-foreground text-sm focus:ring-2 focus:ring-violet-500/50 focus:border-violet-300 transition-all duration-200 resize-none"
                    value={editedBlock.message}
                    onChange={handleMessageChange}
                    placeholder="Enter your message..."
                    rows={4}
                />
            </div>

            {/* Options Section */}
            {editedBlock.options && editedBlock.options.length > 0 && (
                <div>
                    <label className="text-xs text-violet-600 dark:text-violet-400 font-bold mb-2 block uppercase tracking-wider">
                        Options
                    </label>
                    <div className="space-y-3">
                        {editedBlock.options && editedBlock.options.map((opt, i) => (
                            <div key={i} className="flex items-start gap-3">
                                <div className="flex-shrink-0 w-6 h-6 bg-violet-100 dark:bg-violet-800/50 border border-violet-200 dark:border-violet-700/50 rounded-full flex items-center justify-center">
                                    <span className="text-xs font-bold text-violet-600 dark:text-violet-400">{i + 1}</span>
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

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-2">
                <button 
                    onClick={onCancel} 
                    className="px-4 py-2 text-sm rounded-xl bg-surface/50 dark:bg-surface/30 border border-border/50 dark:border-border/30 text-muted-foreground hover:text-foreground hover:bg-surface/60 dark:hover:bg-surface/40 transition-all duration-200 font-medium"
                >
                    Cancel
                </button>
                <button 
                    onClick={() => onSave(editedBlock)} 
                    className="px-4 py-2 text-sm rounded-xl bg-violet-500 hover:bg-violet-600 dark:bg-violet-600 dark:hover:bg-violet-700 text-white font-medium transition-all duration-200 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 flex items-center gap-2"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    Save Changes
                </button>
            </div>
        </div>
    );
};

export default BlockEditor;



