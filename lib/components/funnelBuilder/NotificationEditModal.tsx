"use client";

import React, { useState, useEffect } from "react";
import { Text, Heading, Button } from "frosted-ui";
import { X, Bell, Clock, Trash2 } from "lucide-react";
import type { FunnelNotification, FunnelNotificationInput } from "@/lib/types/funnel";

interface NotificationEditModalProps {
	isOpen: boolean;
	notification?: FunnelNotification; // If provided, editing; otherwise, creating
	stageId: string;
	stageName: string;
	nextSequence: number; // Next sequence number for new notifications
	onSave: (notification: FunnelNotificationInput) => void;
	onDelete?: () => void;
	onClose: () => void;
	funnelId: string;
}

/**
 * NotificationEditModal Component
 * 
 * Modal for creating or editing reminder notifications.
 * Allows setting inactivity time and message content.
 */
const NotificationEditModal: React.FC<NotificationEditModalProps> = ({
	isOpen,
	notification,
	stageId,
	stageName,
	nextSequence,
	onSave,
	onDelete,
	onClose,
	funnelId,
}) => {
	const [inactivityMinutes, setInactivityMinutes] = useState(30);
	const [message, setMessage] = useState("");
	const [timeUnit, setTimeUnit] = useState<"minutes" | "hours">("minutes");

	const isEditing = !!notification;

	// Initialize form when modal opens
	useEffect(() => {
		if (isOpen) {
			if (notification) {
				const mins = notification.inactivityMinutes;
				if (mins >= 60 && mins % 60 === 0) {
					setInactivityMinutes(mins / 60);
					setTimeUnit("hours");
				} else {
					setInactivityMinutes(mins);
					setTimeUnit("minutes");
				}
				setMessage(notification.message);
			} else {
				setInactivityMinutes(30);
				setTimeUnit("minutes");
				setMessage("");
			}
		}
	}, [isOpen, notification]);

	const handleSave = () => {
		const minutesValue = timeUnit === "hours" ? inactivityMinutes * 60 : inactivityMinutes;
		
		onSave({
			funnelId,
			stageId,
			sequence: notification?.sequence ?? nextSequence,
			inactivityMinutes: minutesValue,
			message,
			isReset: false,
		});
		onClose();
	};

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center">
			{/* Backdrop */}
			<div 
				className="absolute inset-0 bg-black/50 backdrop-blur-sm"
				onClick={onClose}
			/>

			{/* Modal */}
			<div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
				{/* Header */}
				<div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/50 rounded-lg flex items-center justify-center">
							<Bell className="w-5 h-5 text-amber-600 dark:text-amber-400" />
						</div>
						<div>
							<Heading size="3" weight="medium">
								{isEditing ? "Edit Notification" : "Add Notification"}
							</Heading>
							<Text size="1" className="text-gray-500 dark:text-gray-400">
								{stageName} Stage
							</Text>
						</div>
					</div>
					<button
						onClick={onClose}
						className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
					>
						<X className="w-5 h-5 text-gray-500" />
					</button>
				</div>

				{/* Content */}
				<div className="p-5 space-y-5">
					{/* Inactivity Time */}
					<div>
						<label className="flex items-center gap-2 mb-2">
							<Clock className="w-4 h-4 text-gray-500" />
							<Text size="2" weight="medium" className="text-gray-700 dark:text-gray-300">
								Send after inactivity of
							</Text>
						</label>
						<div className="flex gap-2">
							<input
								type="number"
								min="1"
								value={inactivityMinutes}
								onChange={(e) => setInactivityMinutes(Math.max(1, parseInt(e.target.value, 10) || 1))}
								className="flex-1 px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/50"
							/>
							<select
								value={timeUnit}
								onChange={(e) => setTimeUnit(e.target.value as "minutes" | "hours")}
								className="px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/50"
							>
								<option value="minutes">Minutes</option>
								<option value="hours">Hours</option>
							</select>
						</div>
						<Text size="1" className="text-gray-500 dark:text-gray-400 mt-1">
							Notification will be sent if user hasn't responded within this time
						</Text>
					</div>

					{/* Message */}
					<div>
						<label className="block mb-2">
							<Text size="2" weight="medium" className="text-gray-700 dark:text-gray-300">
								Notification Message
							</Text>
						</label>
						<textarea
							value={message}
							onChange={(e) => setMessage(e.target.value)}
							placeholder="Hey! Just checking in - did you have any questions about our offer?"
							rows={4}
							className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none"
						/>
						<Text size="1" className="text-gray-500 dark:text-gray-400 mt-1">
							This message will be sent as a DM reminder
						</Text>
					</div>
				</div>

				{/* Footer */}
				<div className="flex items-center justify-between px-5 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
					<div>
						{isEditing && onDelete && (
							<Button
								size="2"
								variant="ghost"
								color="red"
								onClick={() => {
									onDelete();
									onClose();
								}}
								className="gap-1.5"
							>
								<Trash2 className="w-4 h-4" />
								Delete
							</Button>
						)}
					</div>
					<div className="flex gap-2">
						<Button
							size="2"
							variant="soft"
							color="gray"
							onClick={onClose}
						>
							Cancel
						</Button>
						<Button
							size="2"
							color="violet"
							onClick={handleSave}
							disabled={!message.trim()}
						>
							{isEditing ? "Save Changes" : "Add Notification"}
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
};

export default NotificationEditModal;




