import { Button } from "frosted-ui";
import React from "react";

interface ChatRestartButtonProps {
	onRestart: () => void;
}

export const ChatRestartButton: React.FC<ChatRestartButtonProps> = React.memo(
	({ onRestart }) => {
		return (
			<div className="flex-shrink-0 p-0 border-t border-border/30 dark:border-border/20 bg-surface/50 dark:bg-surface/30">
				<div className="flex justify-center py-4">
					<Button
						size="2"
						color="violet"
						onClick={onRestart}
						className="px-6 py-2 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-105 transition-all duration-300"
					>
						Start Over
					</Button>
				</div>
			</div>
		);
	},
);

ChatRestartButton.displayName = "ChatRestartButton";
