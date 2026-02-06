"use client";

import React from "react";
import { Text, Heading } from "frosted-ui";
import { X } from "lucide-react";

interface ChatConfigPanelProps {
	isOpen: boolean;
	funnelId: string;
	onClose: () => void;
}

/**
 * ChatConfigPanel Component
 *
 * Right-side panel for configuring AI chat in PreviewChat.
 * Handout configuration has been removed; handover to admin happens on any user message.
 */
const ChatConfigPanel: React.FC<ChatConfigPanelProps> = ({
	isOpen,
	onClose,
}) => {
	if (!isOpen) return null;

	return (
		<div
			className="fixed right-0 top-0 h-screen w-[400px] bg-white dark:bg-gray-900 border-l border-gray-300 dark:border-gray-600 flex flex-col overflow-hidden z-30"
		>
			<div className="flex flex-col px-4 pt-4 pb-4 border-b border-gray-200 dark:border-gray-700">
				<div className="flex items-center justify-between mb-1">
					<Heading size="3" weight="medium" className="text-[15px]">
						Configuration
					</Heading>
					<button
						onClick={onClose}
						className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
					>
						<X className="w-4 h-4 text-gray-500" />
					</button>
				</div>
				<Text size="2" className="text-gray-500 dark:text-gray-400 mb-4">
					Configure AI chat
				</Text>
			</div>
			<div className="flex flex-col flex-1 pt-2.5 overflow-y-auto px-4 py-4">
				<Text size="2" className="text-gray-600 dark:text-gray-400">
					AI chat is driven by the funnel flow. When a user sends a message in chat, the conversation is handed to admin (live chat).
				</Text>
			</div>
		</div>
	);
};

export default ChatConfigPanel;
