"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { WhopWebsocketProvider } from "./WhopWebsocketProvider";

interface DynamicWebsocketProviderProps {
	children: React.ReactNode;
}

/**
 * DynamicWebsocketProvider - Automatically detects experienceId from URL
 * and provides WebSocket context when needed
 */
export function DynamicWebsocketProvider({ children }: DynamicWebsocketProviderProps) {
	const pathname = usePathname();
	const [experienceId, setExperienceId] = useState<string | null>(null);

	// Extract experienceId from URL path
	useEffect(() => {
		// Match patterns like /experiences/exp_XXXX or /experiences/exp_XXXX/...
		const experienceMatch = pathname.match(/^\/experiences\/(exp_[a-zA-Z0-9]+)/);
		if (experienceMatch) {
			setExperienceId(experienceMatch[1]);
		} else {
			setExperienceId(null);
		}
	}, [pathname]);

	// If we're on an experience page, wrap with WebSocket provider
	if (experienceId) {
		return (
			<WhopWebsocketProvider experienceId={experienceId}>
				{children}
			</WhopWebsocketProvider>
		);
	}

	// Otherwise, just render children without WebSocket provider
	return <>{children}</>;
}

