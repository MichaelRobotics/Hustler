"use client";

import { Text } from "frosted-ui";
import type React from "react";
import type { LiveChatUser } from "../../types/liveChat";

interface TypingIndicatorProps {
	user: LiveChatUser;
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({ user }) => {
	return (
		<div className="flex justify-start">
			<div className="flex items-end gap-2">
				<div className="w-8 h-8 rounded-full bg-violet-500 flex items-center justify-center flex-shrink-0">
					<Text size="1" weight="bold" className="text-white">
						{user.name.charAt(0).toUpperCase()}
					</Text>
				</div>
				<div className="px-4 py-3 bg-white dark:bg-gray-800 border border-border/50 dark:border-border/30 rounded-2xl shadow-sm">
					<div className="flex items-center gap-1">
						<div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
						<div
							className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
							style={{ animationDelay: "0.1s" }}
						/>
						<div
							className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
							style={{ animationDelay: "0.2s" }}
						/>
					</div>
				</div>
			</div>
		</div>
	);
};

export default TypingIndicator;
