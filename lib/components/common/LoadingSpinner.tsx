"use client";

import { Text } from "frosted-ui";
import React from "react";

interface LoadingSpinnerProps {
	size?: "sm" | "md" | "lg";
	text?: string;
	className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = React.memo(
	({ size = "md", text = "Loading...", className = "" }) => {
		const sizeClasses = {
			sm: "w-4 h-4",
			md: "w-6 h-6",
			lg: "w-8 h-8",
		};

		const textSizeClasses = {
			sm: 'size="1"',
			md: 'size="2"',
			lg: 'size="3"',
		};

		return (
			<div className={`flex items-center justify-center gap-2 ${className}`}>
				<div
					className={`${sizeClasses[size]} border-2 border-gray-300 border-t-violet-500 rounded-full animate-spin`}
					role="status"
					aria-label="Loading"
				/>
				{text && (
					<Text
						size={size === "sm" ? "1" : size === "lg" ? "3" : "2"}
						color="gray"
						className="text-muted-foreground"
					>
						{text}
					</Text>
				)}
			</div>
		);
	},
);

LoadingSpinner.displayName = "LoadingSpinner";

export default LoadingSpinner;
