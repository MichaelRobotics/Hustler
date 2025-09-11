"use client";

import { WhopWebsocketProvider as WhopProvider } from "@whop/react";
import type { proto } from "@whop/api";
import { useCallback } from "react";

interface WhopWebsocketProviderProps {
	children: React.ReactNode;
	experienceId: string;
	onAppMessage?: (message: proto.common.AppMessage) => void;
}

export function WhopWebsocketProvider({ 
	children, 
	experienceId,
	onAppMessage 
}: WhopWebsocketProviderProps) {
	const handleAppMessage = useCallback((message: proto.common.AppMessage) => {
		console.log("Received app message:", message);
		
		// Call the custom handler if provided
		onAppMessage?.(message);
		
		// You can add additional message handling logic here
		// For example, dispatching to a global state manager
	}, [onAppMessage]);

	return (
		<WhopProvider
			joinExperience={experienceId}
			joinCustom={`livechat:${experienceId}`}
			onAppMessage={handleAppMessage}
		>
			{children}
		</WhopProvider>
	);
}

