import { Text } from "frosted-ui";
import React from "react";
import type { ChatMessage as ChatMessageType } from "../../../types/funnel";

interface ChatMessageProps {
	message: ChatMessageType;
}

export const ChatMessage: React.FC<ChatMessageProps> = React.memo(
	({ message }) => {
		if (message.type === "bot") {
			return (
				<div className="flex items-end gap-2">
					<div className="w-8 h-8 rounded-full bg-violet-500 flex items-center justify-center flex-shrink-0">
						<Text size="1" weight="bold" className="text-white">
							AI
						</Text>
					</div>
					<div className="max-w-xs lg:max-w-md px-4 py-3 bg-white dark:bg-gray-800 border border-border/50 dark:border-border/30 rounded-2xl shadow-sm">
						<Text size="2" className="text-foreground whitespace-pre-wrap">
							{message.text}
						</Text>
					</div>
				</div>
			);
		}

		return (
			<div className="flex items-end gap-2">
				<div className="w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center flex-shrink-0">
					<Text size="1" weight="bold" className="text-white">
						You
					</Text>
				</div>
				<div className="max-w-xs lg:max-w-md px-4 py-3 bg-violet-500 text-white rounded-2xl shadow-sm">
					<Text size="2" className="text-white whitespace-pre-wrap">
						{message.text}
					</Text>
				</div>
			</div>
		);
	},
);

ChatMessage.displayName = "ChatMessage";
