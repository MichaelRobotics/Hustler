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
		console.log("🔌 [WhopWebsocketProvider] Received app message:", {
			message,
			experienceId,
			channels: [`experience:${experienceId}`, `livechat:${experienceId}`]
		});
		
		// Call the custom handler if provided
		onAppMessage?.(message);
		
		// You can add additional message handling logic here
		// For example, dispatching to a global state manager
	}, [onAppMessage, experienceId]);

	console.log("🔌 [WhopWebsocketProvider] Configuring WebSocket provider:", {
		experienceId,
		channels: [`experience:${experienceId}`, `livechat:${experienceId}`],
		joinExperience: experienceId,
		joinCustom: `livechat:${experienceId}`
	});
	
	return (
		<WhopProvider
			joinExperience={experienceId} // ✅ Primary channel for experience-wide updates
			joinCustom={`livechat:${experienceId}`} // ✅ Secondary channel for LiveChat-specific updates
			onAppMessage={handleAppMessage}
		>
			{children}
		</WhopProvider>
	);
}

