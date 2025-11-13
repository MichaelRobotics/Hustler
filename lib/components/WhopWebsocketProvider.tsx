"use client";

// DISABLED: WebSocket provider is disabled to prevent automatic connections
// import { WhopWebsocketProvider as WhopProvider } from "@whop/react";
// import type { proto } from "@whop/api";
// import { useCallback } from "react";

interface WhopWebsocketProviderProps {
	children: React.ReactNode;
	experienceId: string;
	onAppMessage?: (message: any) => void;
}

/**
 * DISABLED: WhopWebsocketProvider is currently disabled to prevent automatic WebSocket connections
 * This component now acts as a pass-through and does not establish WebSocket connections
 */
export function WhopWebsocketProvider({ 
	children, 
	experienceId,
	onAppMessage 
}: WhopWebsocketProviderProps) {
	// DISABLED: All WebSocket functionality is disabled
	// const handleAppMessage = useCallback((message: proto.common.AppMessage) => {
	// 	console.log("🔌 [WhopWebsocketProvider] Received app message:", {
	// 		message,
	// 		experienceId,
	// 		channels: [`experience:${experienceId}`, `livechat:${experienceId}`]
	// 	});
	// 	
	// 	// Call the custom handler if provided
	// 	onAppMessage?.(message);
	// 	
	// 	// You can add additional message handling logic here
	// 	// For example, dispatching to a global state manager
	// }, [onAppMessage, experienceId]);

	// DISABLED: WebSocket configuration logging
	// console.log("🔌 [WhopWebsocketProvider] Configuring WebSocket provider:", {
	// 	experienceId,
	// 	channels: [`experience:${experienceId}`, `livechat:${experienceId}`],
	// 	joinExperience: experienceId,
	// 	joinCustom: `livechat:${experienceId}`
	// });
	
	// DISABLED: Return children directly without WebSocket provider
	// return (
	// 	<WhopProvider
	// 		joinExperience={experienceId} // ✅ Primary channel for experience-wide updates
	// 		joinCustom={`livechat:${experienceId}`} // ✅ Secondary channel for LiveChat-specific updates
	// 		onAppMessage={handleAppMessage}
	// 	>
	// 		{children}
	// 	</WhopProvider>
	// );
	
	// Return children directly without WebSocket connection
	return <>{children}</>;
}

