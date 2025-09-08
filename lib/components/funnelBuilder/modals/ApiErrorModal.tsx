"use client";

import { Button, Card, Heading, Text } from "frosted-ui";
import type React from "react";

interface ApiErrorModalProps {
	error: string | null;
	onClose: () => void;
}

export const ApiErrorModal: React.FC<ApiErrorModalProps> = ({
	error,
	onClose,
}) => {
	if (!error) return null;

	return (
		<div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-20 p-4">
			<Card className="bg-red-900/50 border border-red-700 p-0 rounded-lg max-w-md text-center shadow-2xl">
				<Heading
					size="4"
					weight="bold"
					color="red"
					className="dark:text-red-300 mb-3"
				>
					Generation Failed
				</Heading>
				<Text color="red" className="mb-4 text-red-200">
					{error}
				</Text>
				<Button size="3" color="red" onClick={onClose} className="px-4 py-2">
					Close
				</Button>
			</Card>
		</div>
	);
};
