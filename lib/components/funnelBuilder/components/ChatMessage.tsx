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

		if (message.type === "system") {
			// Special handling for live chat redirect marker
			if (message.text === "redirect_to_live_chat") {
				return (
					<div className="relative my-6 flex items-center">
						{/* Left line */}
						<div className="flex-1 h-px bg-gradient-to-r from-transparent via-violet-300 dark:via-violet-600 to-transparent"></div>
						
						{/* Center text on line */}
						<div className="px-4 py-1 bg-gradient-to-r from-violet-100 to-purple-100 dark:from-violet-900/40 dark:to-purple-900/40 border border-violet-300 dark:border-violet-700/50 rounded-full shadow-sm backdrop-blur-sm mx-2">
							<div className="flex items-center gap-2">
								<div className="w-2 h-2 bg-violet-500 rounded-full animate-pulse"></div>
								<Text size="1" weight="medium" className="text-violet-700 dark:text-violet-300 whitespace-nowrap">
									Redirecting to Live Chat
								</Text>
								<div className="w-2 h-2 bg-violet-500 rounded-full animate-pulse"></div>
							</div>
						</div>
						
						{/* Right line */}
						<div className="flex-1 h-px bg-gradient-to-r from-transparent via-violet-300 dark:via-violet-600 to-transparent"></div>
					</div>
				);
			}
			
			// Default system message styling
			return (
				<div className="flex justify-center my-4">
					<div className="px-4 py-2 bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 border border-amber-300 dark:border-amber-700/50 rounded-full shadow-sm">
						<Text size="1" weight="medium" className="text-amber-700 dark:text-amber-300 text-center">
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
