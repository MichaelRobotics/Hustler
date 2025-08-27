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
        <div className="p-3">
            <label className="text-xs text-gray-400 font-bold mb-1 block">Message</label>
            <AutoResizeTextarea
                className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-white text-sm mb-2 focus:ring-2 focus:ring-violet-500"
                value={editedBlock.message}
                onChange={handleMessageChange}
            />
            {editedBlock.options && editedBlock.options.length > 0 && (
                 <label className="text-xs text-gray-400 font-bold mb-1 block">Options</label>
            )}
            <div className="space-y-2">
                {editedBlock.options && editedBlock.options.map((opt, i) => (
                    <div key={i} className="flex items-center">
                        <span className="text-gray-400 mr-2">{i + 1}.</span>
                        <AutoResizeTextarea
                            className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-white text-xs focus:ring-2 focus:ring-violet-500"
                            value={opt.text}
                            onChange={(e) => handleOptionChange(i, e.target.value)}
                           />
                    </div>
                ))}
            </div>
            <div className="flex justify-end gap-2 mt-3">
                <button onClick={onCancel} className="px-3 py-1 text-xs rounded bg-gray-600 hover:bg-gray-500 font-semibold">Cancel</button>
                <button onClick={() => onSave(editedBlock)} className="px-3 py-1 text-xs rounded bg-green-600 hover:bg-green-500 font-semibold flex items-center gap-1">💾 Save</button>
            </div>
        </div>
    );
};

export default BlockEditor;

