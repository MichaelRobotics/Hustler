"use client";

import { Text } from "frosted-ui";
import React from "react";
import type { LiveChatMessage, LiveChatUser } from "../../types/liveChat";
import { renderTextWithLinks } from "../../utils/link-utils";

interface ChatMessageProps {
	message: LiveChatMessage;
	user: LiveChatUser;
}

const ChatMessage: React.FC<ChatMessageProps> = React.memo(
	({ message, user }) => {
		const isUserMessage = message.type === "user";
		const isBotMessage = message.type === "bot";

		return (
			<div
				className={`flex ${isUserMessage ? "justify-start" : "justify-end"} px-4`}
			>
				<div
					className={`flex items-end gap-2 max-w-xs lg:max-w-md ${isUserMessage ? "" : "flex-row-reverse"}`}
				>
					{/* Avatar */}
					<div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-violet-500">
						<Text size="1" weight="bold" className="text-white">
							{isUserMessage ? user.name.charAt(0).toUpperCase() : "You"}
						</Text>
					</div>

					{/* Message Bubble */}
					<div
						className={`px-4 py-3 rounded-2xl shadow-sm ${
							isUserMessage
								? message.text.includes('animated-gold-button')
									? "bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 border-3 border-amber-500 dark:border-amber-400 text-gray-900 dark:text-gray-100 shadow-lg shadow-amber-300/60 dark:shadow-amber-700/60"
									: "bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 shadow-lg shadow-gray-300/50 dark:shadow-gray-800/50"
								: message.text.includes('animated-gold-button')
									? "bg-gradient-to-br from-violet-500 to-violet-600 text-white shadow-lg shadow-violet-500/25 border-3 border-violet-400 dark:border-violet-500"
									: "bg-gradient-to-br from-violet-500 to-violet-600 text-white shadow-lg shadow-violet-500/25"
						}`}
						style={{
							userSelect: "text",
							WebkitUserSelect: "text",
							MozUserSelect: "text",
							msUserSelect: "text",
						}}
					>
						<Text
							size="2"
							className={`whitespace-pre-wrap ${
								isUserMessage ? "text-foreground" : "text-white"
							}`}
						>
							{renderTextWithLinks(message.text)}
						</Text>
					</div>
				</div>
			</div>
		);
	},
);

ChatMessage.displayName = "ChatMessage";

export default ChatMessage;
