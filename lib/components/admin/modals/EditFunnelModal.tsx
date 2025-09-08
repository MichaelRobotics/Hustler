"use client";

import { Button } from "frosted-ui";
import { Check, X } from "lucide-react";
import React, { useState, useEffect } from "react";

interface EditFunnelModalProps {
	funnelId: string;
	currentName: string;
	isEditing: boolean;
	onSave: (funnelId: string, newName: string) => void;
	onCancel: () => void;
}

export default function EditFunnelModal({
	funnelId,
	currentName,
	isEditing,
	onSave,
	onCancel,
}: EditFunnelModalProps) {
	const [editName, setEditName] = useState(currentName);

	useEffect(() => {
		setEditName(currentName);
	}, [currentName]);

	const handleSave = () => {
		if (editName.trim() && editName !== currentName) {
			onSave(funnelId, editName.trim());
		}
	};

	const handleCancel = () => {
		setEditName(currentName);
		onCancel();
	};

	if (!isEditing) return null;

	return (
		<div className="flex items-center gap-2">
			<input
				type="text"
				value={editName}
				onChange={(e) => setEditName(e.target.value)}
				className="px-3 py-1 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all duration-200 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
				autoFocus
			/>
			<Button
				size="1"
				color="green"
				onClick={handleSave}
				disabled={!editName.trim() || editName === currentName}
				className="p-1 h-8 w-8"
			>
				<Check size={14} />
			</Button>
			<Button
				size="1"
				variant="ghost"
				color="gray"
				onClick={handleCancel}
				className="p-1 h-8 w-8"
			>
				<X size={14} />
			</Button>
		</div>
	);
}
