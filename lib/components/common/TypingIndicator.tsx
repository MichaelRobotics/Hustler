"use client";

import type React from "react";

interface TypingIndicatorProps {
	isVisible?: boolean;
	className?: string;
	text?: string;
	showText?: boolean;
}

/**
 * Typing Indicator Component
 *
 * Shows animated dots when user is typing, similar to Messenger/WhatsApp
 * Uses CSS animations for optimal performance
 */
const TypingIndicator: React.FC<TypingIndicatorProps> = ({
	isVisible = true,
	className = "",
	text = "is typing...",
	showText = true,
}) => {
	if (!isVisible) return null;

	return (
		<div className={`flex items-center gap-1 ${className}`}>
			<div className="flex items-center gap-1">
				<div className="typing-dot typing-dot-1" />
				<div className="typing-dot typing-dot-2" />
				<div className="typing-dot typing-dot-3" />
			</div>
			{showText && (
				<span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
					{text}
				</span>
			)}
		</div>
	);
};

export default TypingIndicator;
