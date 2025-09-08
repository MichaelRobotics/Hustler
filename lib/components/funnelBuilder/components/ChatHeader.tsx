import { Text } from "frosted-ui";
import type React from "react";

export const ChatHeader: React.FC = () => {
	return (
		<div className="flex-shrink-0 p-0 border-b border-border/30 dark:border-border/20 bg-surface/80 dark:bg-surface/60 backdrop-blur-sm">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<div className="w-2 h-2 bg-violet-500 rounded-full animate-pulse"></div>
					<Text size="3" weight="semi-bold" className="text-foreground">
						AI Funnel Bot
					</Text>
					<div className="px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-700/50">
						<Text
							size="1"
							weight="medium"
							className="text-green-700 dark:text-green-300"
						>
							Online
						</Text>
					</div>
				</div>
			</div>
		</div>
	);
};
